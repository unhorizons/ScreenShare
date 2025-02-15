import express, {Request, Response, NextFunction } from "express"

import { User, Session, events, Identifier, Model } from "../database"
import { authenticateToken, authenticateHost, authenticateTokenFromQuery} from '../authentication.js'
import { WebRTCConnection } from "../webrtc"

import { raise404 } from "../utils"

export const session_router = express.Router()


/**
 * Parses the session identifier from the request parameters and attaches the session object to the request.
 * If the session is not found, responds with a 404 error.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
const parseSession = (req : Request, res : Response, next : NextFunction) => {
    const session_identifier = req.params.session

    if (session_identifier != undefined){
        const session = Session.get(session_identifier) as Session
        if(session)
            req.session = session
        else{
            raise404(res, "Session not found")   
            return
        } 
    }
    next()
}

/**
 * Retrieves all sessions and responds with a JSON array of session objects.
 * 
 * @param _ - The request object (not used).
 * @param res - The response object.
 */
session_router.get('/', async (_, res : Response) => {
    res.json(Session.all())
})


/**
 * Retrieves a specific session by its identifier and responds with the serialized session object.
 * 
 * @param session - The session object attached to the request.
 * @param res - The response object.
 */
session_router.get('/:session', parseSession, async ({session}, res) => {
    res.json( session ? session.serialize() : {})
}) 


/**
 * Establishes a Server-Sent Events (SSE) connection to stream session events.
 * 
 * @param req - The request object.
 * @param res - The response object.
 */
session_router.get("/:session/events", parseSession, authenticateTokenFromQuery, authenticateHost, (req : Request, res : Response) => {
    
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    
    if(!req.session) throw Error("This is imposible!")
    const session = req.session

    const handleUpdated = (data : Model) => {
        if(data.id === session.id){
            res.write(`data: ${JSON.stringify(session.serialize())}\n\n`);
        }
    }

    events.on('updated', handleUpdated)

    // Cleanup on client disconnect
    req.on("close", () => {
        events.off('updated', handleUpdated)
    });
});

/**
 * Establishes a Server-Sent Events (SSE) connection to stream session start event to viewers.
 * 
 * @param req - The request object.
 * @param res - The response object.
 */
session_router.get("/:session/started-events", parseSession, authenticateTokenFromQuery, (req : Request, res : Response) => {
    
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    
    if(!req.session) throw Error("This is imposible!")
    const session = req.session

    const handleStarted = (data : Model) => {
        if(data.id === session.id){
            res.write(`data: ${JSON.stringify(session?.serialize())}\n\n`);
        }
    }

    events.on('started', handleStarted)

    // Cleanup on client disconnect
    req.on("close", () => {
        events.off('started', handleStarted)
    });
});



/**
 * Creates a new session with the specified name and host.
 * 
 * @param user - The authenticated user creating the session.
 * @param body - The request body containing the session name.
 * @param res - The response object.
 */
session_router.post('/', authenticateToken, authenticateHost, async ({user, body : {name}}, res) => {
    if(!user) {throw Error("If you get this error, you are cursed")}
    
    try{

        const session = new Session({name, host : user.username})
        res.json(session.serialize())

    }catch (err){
        res.status(400)
        res.json({
            detail : `A session for "${name}" already exists` 
        })
    }
})


/**
 * Starts a broadcast for a specific session with the provided SDP.
 * 
 * @param body - The request body containing the SDP.
 * @param session - The session object attached to the request.
 * @param res - The response object.
 */
session_router.post('/start-broadcast/:session', parseSession, authenticateToken, authenticateHost, async ({body : {sdp}, session} : Request, res : Response) => {
    
    if(!session) throw Error("If you get this error, you are cursed")

    if(session.active === true){
        res.json({
            detail : "No change made to the session"
        })
        return 
    }
    
    const connection = new WebRTCConnection({
        sdp : sdp,
        type : 'broadcaster'
    })
    await connection.open(session)

    session.active = true
    res.json({
        detail : "Session started successfully",
        sdp: connection.peer?.localDescription
    })
    
})


/**
 * Ends a broadcast for a specific session.
 * 
 * @param session - The session object attached to the request.
 * @param res - The response object.
 */
session_router.post('/end-broadcast/:session', parseSession, authenticateToken, authenticateHost, async ({session} : Request, res : Response) => {
    
    if(!session) throw Error("If you get this error, you are cursed")
    
    if(session.active === false){
        res.json({
            detail : "No change made to the session"
        })
        return 
    }

    for(const user of session.users){
        user._viewing = false
    }
    session.active = false

    session.broadcaster?.close()

    session.end_time = new Date()

    res.json({
        detail : "Session ended successfully"
    })
    
})



/**
 * Joins a broadcast for a specific session with the provided SDP.
 * 
 * @param user - The authenticated user joining the session.
 * @param session - The session object attached to the request.
 * @param body - The request body containing the SDP.
 * @param res - The response object.
 */
session_router.post('/join-broadcast/:session', parseSession, authenticateToken, async ({user, session, body : {sdp}} : Request, res : Response) => {
    
    if(!session || !user) throw Error("If you get this error, you are cursed")

    user.session = session

    if(session.active === true){
       
        const connection = new WebRTCConnection({
            sdp : sdp,
            type : 'viewer'
        })
        await connection.open(session)

        const payload = {
            sdp: connection.peer?.localDescription,
            detail: "Session joined successfully"
        }
    
        res.json(payload)
        return 
    }

    res.json({
        detail: 'Session not yet started'
    })
})