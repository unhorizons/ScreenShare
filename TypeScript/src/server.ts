import dotenv from 'dotenv'
dotenv.config()


import express, { NextFunction, Request, Response } from 'express'

import bodyParser from 'body-parser'
import cors from 'cors'

import fs from 'fs'
import https from 'https'
import http from 'http'
import dns from 'dns'
import os from 'os'
import { exec } from 'child_process'

import { User } from './database'
import { generateHostAccessCode, generateToken } from './authentication'
import { session_router } from './routers/session'
import { user_router } from './routers/user'



const app = express();
app.use(cors())

let access_code : string
let access_code_renewer : NodeJS.Timeout
let host_logged_in = false
let HOST_ACCESS_PATH = '/users/host-login'


// Log all incoming requests
app.use((req : Request, res : Response, next : NextFunction) => {
    console.log(`[${new Date().toLocaleString()}] [${req.method}] : ${req.path}`)
    next()
})

app.use(express.static('public'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended : true}))

// Prevents all access before the host has logged in
app.use((req, res, next) => {
    if(!host_logged_in && req.path != HOST_ACCESS_PATH){
        res.status(403)
        let msg = "Server locked down until the host login"
        console.log(msg)
        res.json({
            detail : msg
        })
        return 
    }
    next()
})

app.use('/sessions', session_router)
app.use('/users', user_router)


app.post(HOST_ACCESS_PATH, ({body : {username, code}} : Request, res : Response) => {
    if(host_logged_in){
        res.sendStatus(403)
        return 
    }
    if(code === access_code){

        const user = new User({username, role : 'host'})
        const token = generateToken(user);

        host_logged_in = true
        clearInterval(access_code_renewer)
        res.json({
            token : token,
            detail : "Host logged in, the server has been unlocked"
        })
        return 
    }
    res.status(400)
    res.json({
        detail : "Invalid access code"
    })
    return 
})

app.get('/live/:session', ({params : {session}} : Request, res : Response) => {
    res.redirect(301, `/?route=user-login/${session}`)
})
app.get('/:route', ({params : {route}} : Request, res : Response) => {
    res.redirect(301, `/?route=${route}`)
})

const options = {
    key : fs.readFileSync("key.pem"),
    cert : fs.readFileSync("cert.pem")
}

let domain = `www.screenshare.net`;
let hostaddress = undefined

const interfaces = os.networkInterfaces()
for(const iface of Object.values(interfaces)){
    if(iface){
        for(const config of iface){
            if(config.family === 'IPv4' && !config.internal){
                hostaddress = config.address
                // console.log(`Local IP: ${config.address}`)
            }
        }
    }
}

const client_config_path = "./public/config.js";

function updateApiUrl(newUrl : string) {
    let content = fs.readFileSync(client_config_path, "utf8");

    content = content.replace(
        /"apiurl"\s*:\s*".*?"/,
        `"apiurl": "${newUrl}"`
    );

    fs.writeFileSync(client_config_path, content, "utf8");

}


dns.lookup(domain, (err, address) => {
    if(err){
        domain = hostaddress ? hostaddress : 'localhost'
    }else{
        if(hostaddress && hostaddress === address)
            domain = 'www.screenshare.net'
        else
        domain = hostaddress ? hostaddress : 'localhost'
    }
    const url = `https://${domain}`
    console.log(`Server will be listening at ${url}`)
    updateApiUrl(url);

    https.createServer(options, app).listen(443, '0.0.0.0', () => {
        console.log('Server started')

        access_code = generateHostAccessCode()

        console.log(`Your access code is : "${access_code}"` )
        
        access_code_renewer = setInterval(() => {
            access_code = generateHostAccessCode()

            console.log(`Renewed access code : "${access_code}"` )

        }, 60000)


        if (process.platform === 'win32') {
            exec(`start ${url}`); // Windows
        } else if (process.platform === 'darwin') {
            exec(`open ${url}`); // macOS
        } else {
            exec(`xdg-open ${url}`); // Linux
        }

    })

    http.createServer((req : http.IncomingMessage, res : http.ServerResponse) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
    }).listen(80, () => {
        console.log('Redirecting HTTP to HTTPS');
    });
})
