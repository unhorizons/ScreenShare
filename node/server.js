
require('dotenv').config();
const express = require('express')
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
const fs = require('fs')
const https = require('https')
const http = require('http');

const { exec } = require('child_process');
const cors = require("cors");


const { User } = require('./src/database.js')
const { createPeer, broadcaster } = require('./src/webrtc.js')
const { authenticateToken, generateToken, generateHostAccessCode } = require('./src/authentication.js');
const { session_router } = require('./src/session_router.js');
const { user_router } = require('./src/user_router.js');



const dns = require('dns')
const os = require('os')


const app = express()
app.use(cors())

const PORT = 5000 
let access_code
let access_code_renewer
let host_logged_in = false
let HOST_ACCESS_PATH = '/host-login'


// Log all incoming requests
app.use((req, res, next) => {

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
        msg = "Server locked down until the host login"
        console.log(msg)
        return res.json({
            detail : msg
        })
    }
    next()
})

app.use('/sessions', session_router)
app.use('/users', user_router)


app.post('/host-login', ({body : {username, code}}, res) => {
    if(host_logged_in){
        return res.sendStatus(403)
    }
    if(code === access_code){

        const user = new User({username, role : 'host'})
        const token = generateToken(user);

        host_logged_in = true
        clearInterval(access_code_renewer)
        return res.json({
            token : token,
            detail : "Host logged in, the server has been unlocked"
        })
    }
    res.status(400)
    return res.json({
        detail : "Invalid access code"
    })
})


app.get('/live/:session', ({params : {session}}, res) => {
    res.redirect(301, `/?route=user-login/${session}`)
})
app.get('/:route', ({params : {route}}, res) => {
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
    for(const config of iface){
        if(config.family === 'IPv4' && !config.internal){
            hostaddress = config.address
            // console.log(`Local IP: ${config.address}`)
        }
    }
}


const client_config_path = "./public/config.js";

function updateApiUrl(newUrl) {
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

    http.createServer((req, res) => {
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
    }).listen(80, () => {
        console.log('Redirecting HTTP to HTTPS');
    });
})
