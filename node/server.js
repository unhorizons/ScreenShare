
require('dotenv').config();
const express = require('express')
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser')
const fs = require('fs')
const https = require('https')

const { exec } = require('child_process');
const cors = require("cors");


const { User } = require('./src/database.js')
const { createPeer, broadcaster } = require('./src/webrtc.js')
const { authenticateToken, generateToken, generateHostAccessCode } = require('./src/authentication.js');
const { session_router } = require('./src/session_router.js');
const { user_router } = require('./src/user_router.js');

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



app.post('/consumer', async ({body}, res) => {
    const peer = await createPeer('viewer', body.sdp)
    const payload = {
        sdp: peer.localDescription
    }

    res.json(payload)
})


app.post('/broadcast', async ({body}, res) => {
    const peer = await createPeer('broadcaster', body.sdp)
    const payload = {
        sdp: peer.localDescription
    }

    res.json(payload)
})

app.post('/host-login', ({body : {username, code}}, res) => {
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


app.get('/:session_slug', ({params : {session_slug}}, res) => {
    res.redirect(301, `/ui/client/pseudo.html?session_id=${session_slug}`)
})


const options = {
    key : fs.readFileSync("key.pem"),
    cert : fs.readFileSync("cert.pem")
}

https.createServer(options, app).listen(443, '0.0.0.0', () => {
    console.log('Server started')

    access_code = generateHostAccessCode()
    // clipboardy.writeSync(access_code); // Copy the code to the clipboard
    console.log(`Your access code is : "${access_code}"` )
    
    access_code_renewer = setInterval(() => {
        access_code = generateHostAccessCode()
        // clipboardy.writeSync(access_code); // Copy the code to the clipboard

        console.log(`Renewed access code : "${access_code}"` )

    }, 30000)

    const url = `https://screenshare.net${HOST_ACCESS_PATH}.html`;
    if (process.platform === 'win32') {
        exec(`start ${url}`); // Windows
    } else if (process.platform === 'darwin') {
        exec(`open ${url}`); // macOS
    } else {
        exec(`xdg-open ${url}`); // Linux
    }

})

// app.listen(PORT, '0.0.0.0', () => {
    
//     console.log('Server started')

//     access_code = generateHostAccessCode()
//     // clipboardy.writeSync(access_code); // Copy the code to the clipboard
//     console.log(`Your access code is : "${access_code}"` )
    
//     access_code_renewer = setInterval(() => {
//         access_code = generateHostAccessCode()
//         // clipboardy.writeSync(access_code); // Copy the code to the clipboard

//         console.log(`Renewed access code : "${access_code}"` )

//     }, 30000)

//     const url = `http://localhost:${PORT}${HOST_ACCESS_PATH}.html`;
//     if (process.platform === 'win32') {
//         exec(`start ${url}`); // Windows
//     } else if (process.platform === 'darwin') {
//         exec(`open ${url}`); // macOS
//     } else {
//         exec(`xdg-open ${url}`); // Linux
//     }

    
// })


// // User
// {
//     name : 'Franck',
//     password : 'secret' | null, 
//     role : 'admin' | 'user',
//     score : 48,
// }

// // Quiz
// {
//     id : 0,
//     name : 'blabla',
//     questions : [
//         {
//             id : 0,
//             question : 'bla?',
//             img : url,
//             possibilities : ['sd', 'sf', 'fuck'],
//             answer : 1
//         },
//         {
//             id : 1,
//             question : 'bla?',
//             img : url,
//             possibilities : ['sd', 'sf', 'fuck'],
//             answer : 0
//         }
//     ],
//     users : [],
// }

// /response
// {
//     quizz_id : 0,
//     quesrion_id : 1,
//     answer : 2
// }

// {
//     result : false,
//     corret_answer : 1
// }

// // // /quizzes/0
// // {
// //     name : 'new name'
// //     // questions : [
// //     //     {
// //     //         id : 1,
// //     //         question : 'new question?'
// //     //     }
// //     // ]
// // }