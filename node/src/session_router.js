
const express = require('express')

const { User, Session } = require('./database.js')
const { WebRTCConnection } = require('./webrtc.js')
const { authenticateToken, authenticateHost} = require('./authentication.js')
const { raise404 } = require('./utils.js')

const session_router = express.Router()

// This is not working
parseSession = (req, res, next)=>{

    const session_id_or_slug = req.params.session
    
    if(session_id_or_slug != undefined){
        const session = Session.get(session_id_or_slug)
        if(session)
            req.session = session
        else
            return raise404(res, "Session not found")
    }
    next()
}


// List all sessions
session_router.get('/', async (_, res) => {
    res.json(Session.all())
})

// Get a session
session_router.get('/:session', parseSession, async ({session}, res) => {
    
    users = []
    for(user of User.all()){
        if(user.session == session){
            users.push(user)
        }
    } 
    res.json({
        id: session.id,
        workshop: session.workshop,
        lead: session.lead,
        start_time: session.start_time,
        end_time: session.end_time,
        active: session.active,
        slug: session.slug,
        users: users
    })
})

// Create a new session
session_router.post('/', authenticateToken, authenticateHost, async ({user, body : {workshop}}, res) => {
    
    try{

        const session = new Session({workshop, lead : user.username})
        res.json({
            session_id : session.id, 
            session : {
                id: session.id,
                workshop: session.workshop,
                lead: session.lead,
                start_time: session.start_time,
                end_time: session.end_time,
                active: session.active,
                slug: session.slug,
                users: []
            },
            detail : "Session created successfully"
        })

    }catch (err){
        res.status(400)
        res.json({
            detail : `A session for "${workshop}" already exists` 
        })
    }
})

// Start a broadcast
session_router.post('/start-broadcast/:session', parseSession, authenticateToken, authenticateHost, async ({body : {sdp}, session}, res) => {
   
    console.log("Hi, this is session control")
    if(session.active === true){
        console.log("Looks like there is nothing to do")
        return res.json({
            detail : "No change made to the session"
        })
    }
  
    console.log("Let's start a session")
    
    const connection = new WebRTCConnection({
        sdp : sdp,
        type : 'broadcaster'
    })
    await connection.open({session})

    session.active = true
    res.json({
        detail : "Session started successfully",
        sdp: connection.peer.localDescription
    })
    
})

// End a broadcast
session_router.post('/end-broadcast/:session', parseSession, authenticateToken, authenticateHost, async ({session}, res) => {
    console.log("Hi, this is session control")
    if(session.active === false){
        console.log("Looks like there is nothing to do")
        return res.json({
            detail : "No change made to the session"
        })
    }


    console.log("Let's close a session")
    session.active = false

    session.broadcaster.close()

    session.end_time = new Date()

    res.json({
        detail : "Session ended successfully"
    })
    
})

// Join a broadcast
session_router.post('/join-broadcast/:session', parseSession, authenticateToken, async ({user, session, body : {sdp}}, res) => {
    
    user.session = session

    if(session.active === true){
       
        const connection = new WebRTCConnection({
            sdp : sdp,
            type : 'viewer'
        })
        await connection.open({session})

        const payload = {
            sdp: connection.peer.localDescription,
            detail: "Session joined successfully"
        }
    
        return res.json(payload)
        
    }

    res.json({
        detail: 'Session not yet started'
    })
})


module.exports = {
    session_router
}
