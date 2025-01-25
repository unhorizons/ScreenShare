
const express = require('express')

const { User, Session } = require('./database.js')
const { createPeer, broadcaster } = require('./webrtc.js')
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
            detail : "Session created successfully"
        })

    }catch (err){
        res.status(400)
        res.json({
            detail : `A session for "${workshop}" already exists` 
        })
    }
})

// Start or end a session
session_router.patch('/:session', parseSession, authenticateToken, authenticateHost, async({body : {active, sdp}, session}, res) => {

    if(active === session.active){
        res.json({
            detail : "No change made to the session"
        })
        return
    }
    if(active === true){

        const peer = await createPeer('broadcaster', sdp)
    
        session.active = true
        res.json({
            detail : "Session started successfully",
            sdp: peer.localDescription
        })

        return
    }
    if(active === false){
        session.active = false

        broadcaster.close()

        res.json({
            detail : "Session ended successfully"
        })
    }
})

// Join a session
session_router.post('/:session', parseSession, authenticateToken, async ({user, session, body : {sdp}}, res) => {
    
    user.session = session

    if(session.active === true){
        const peer = await createPeer('viewer', sdp)
        const payload = {
            sdp: peer.localDescription,
            detail: "Session joined successfully"
        }
    
        res.json(payload)
        return
    }

    res.json({
        detail: 'Session not yet started'
    })
})


module.exports = {
    session_router
}
