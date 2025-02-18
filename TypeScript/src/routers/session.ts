import express, { Request, Response, NextFunction } from 'express'; // Express framework
import { User, Session, events, Identifier, Model, SecondaryBroadcaster } from '../database'; // Database models and utilities
import { authenticateToken, authenticateHost, authenticateTokenFromQuery } from '../authentication.js'; // Authentication middleware
import { WebRTCConnection } from '../webrtc'; // WebRTC connection class
import { raise404 } from '../utils'; // Utility function for raising 404 errors

export const session_router = express.Router(); // Create an Express router for session-related routes

/**
 * Middleware to parse the session identifier from the request parameters and attach the session object to the request.
 * If the session is not found, responds with a 404 error.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @param next - The next middleware function.
 */
const parseSession = (req: Request, res: Response, next: NextFunction) => {
    const session_identifier = req.params.session; // Get the session identifier from the request parameters

    if (session_identifier != undefined) {
        const session = Session.get(session_identifier) as Session; // Fetch the session by identifier
        if (session) {
            req.session = session; // Attach the session to the request object
        } else {
            raise404(res, 'Session not found'); // Respond with a 404 error if the session is not found
            return;
        }
    }
    next(); // Proceed to the next middleware or route handler
};

/**
 * Route to retrieve all sessions.
 * Responds with a JSON array of session objects.
 * 
 * @param _ - The request object (not used).
 * @param res - The response object.
 */
session_router.get('/', async (_, res: Response) => {
    res.json(Session.all()); // Send all sessions as a JSON response
});

/**
 * Route to retrieve a specific session by its identifier.
 * Responds with the serialized session object.
 * 
 * @param session - The session object attached to the request.
 * @param res - The response object.
 */
session_router.get('/:session', parseSession, async ({ session }, res) => {
    res.json(session ? session.serialize() : {}); // Send the serialized session as a JSON response
});

/**
 * Route to establish a Server-Sent Events (SSE) connection for streaming session events.
 * 
 * @param req - The request object.
 * @param res - The response object.
 */
session_router.get('/:session/events', parseSession, authenticateTokenFromQuery, authenticateHost, (req: Request, res: Response) => {
    const headers = {
        'Content-Type': 'text/event-stream', // Set the content type to SSE
        'Connection': 'keep-alive', // Keep the connection alive
        'Cache-Control': 'no-cache', // Disable caching
    };
    res.writeHead(200, headers); // Set the response headers

    if (!req.session) throw new Error('This is impossible!'); // Ensure the session is attached to the request
    const session = req.session;

    // Event handler for session updates
    const handleUpdated = (data: Model) => {
        if (data.id === session.id) {
            res.write(`data: ${JSON.stringify(session.serialize())}\n\n`); // Send the updated session data
        }
    };

    events.on('updated', handleUpdated); // Listen for 'updated' events

    // Cleanup on client disconnect
    req.on('close', () => {
        events.off('updated', handleUpdated); // Stop listening for 'updated' events
    });
});

/**
 * Route to establish a Server-Sent Events (SSE) connection for streaming session start events to viewers.
 * 
 * @param req - The request object.
 * @param res - The response object.
 */
// session_router.get('/:session/started-events', parseSession, authenticateTokenFromQuery, (req: Request, res: Response) => {
//     const headers = {
//         'Content-Type': 'text/event-stream', // Set the content type to SSE
//         'Connection': 'keep-alive', // Keep the connection alive
//         'Cache-Control': 'no-cache', // Disable caching
//     };
//     res.writeHead(200, headers); // Set the response headers

//     if (!req.session) throw new Error('This is impossible!'); // Ensure the session is attached to the request
//     const session = req.session;

//     // Event handler for session start events
//     const handleStarted = (data: Model) => { 
//         if (data.id === session.id) {
//             res.write(`data: ${JSON.stringify(session?.serialize())}\n\n`); // Send the session data
//         }
//     };

//     events.on('started', handleStarted); // Listen for 'started' events

//     // Cleanup on client disconnect
//     req.on('close', () => {
//         events.off('started', handleStarted); // Stop listening for 'started' events
//     });
// });

/**
 * Route to create a new session.
 * 
 * @param user - The authenticated user creating the session.
 * @param body - The request body containing the session name.
 * @param res - The response object.
 */
session_router.post('/', authenticateToken, authenticateHost, async ({ user, body: { name } }, res) => {
    if (!user) {
        throw new Error('If you get this error, you are cursed'); // Ensure the user is authenticated
    }

    try {
        const session = new Session({ name, host: user.username }); // Create a new session
        res.json(session.serialize()); // Send the serialized session as a JSON response
    } catch (err) {
        res.status(400); // Respond with a 400 error if the session already exists
        res.json({
            detail: `A session for "${name}" already exists`,
        });
    }
});

// /**
//  * Route to start a broadcast for a specific session.
//  * 
//  * @param body - The request body containing the SDP.
//  * @param session - The session object attached to the request.
//  * @param res - The response object.
//  */
// session_router.post('/start-broadcast/:session', parseSession, authenticateToken, authenticateHost, async ({ body: { sdp }, session }: Request, res: Response) => {
//     if (!session) throw new Error('If you get this error, you are cursed'); // Ensure the session is attached to the request

//     if (session.active === true) {
//         res.json({
//             detail: 'No change made to the session', // Respond if the session is already active
//         });
//         return;
//     }

//     const connection = new WebRTCConnection({
//         sdp: sdp,
//         type: 'broadcaster', // Create a WebRTC connection for broadcasting
//     });
//     await connection.open(session); // Open the WebRTC connection

//     session.active = true; // Mark the session as active
//     res.json({
//         detail: 'Session started successfully',
//         sdp: connection.peer?.localDescription, // Send the local SDP as a response
//     });
// });



/**
 * Route to end a broadcast for a specific session.
 * 
 * @param session - The session object attached to the request.
 * @param res - The response object.
 */
session_router.post('/end-broadcast/:session', parseSession, authenticateToken, authenticateHost, async ({ session }: Request, res: Response) => {
    if (!session) throw new Error('If you get this error, you are cursed'); // Ensure the session is attached to the request

    if (session.active === false) {
        res.json({
            detail: 'No change made to the session', // Respond if the session is already inactive
        });
        return;
    }

    for (const user of session.users) {
        user._viewing = false; // Mark all users as not viewing
    }
    session.active = false; // Mark the session as inactive

    session.broadcaster?.close(); // Close the WebRTC connection

    session.end_time = new Date(); // Set the session end time

    res.json({
        detail: 'Session ended successfully', // Respond with success message
    });
});

/**
 * Route to join a broadcast for a specific session.
 * 
 * @param user - The authenticated user joining the session.
 * @param session - The session object attached to the request.
 * @param body - The request body containing the SDP.
 * @param res - The response object.
 */

// let counter = 0

// session_router.post('/join-broadcast/:session', parseSession, authenticateToken, async ({ user, session, body: { sdp } }: Request, res: Response) => {
//     if (!session || !user) throw new Error('If you get this error, you are cursed'); // Ensure the session and user are attached to the request

//     user.session = session; // Assign the session to the user

//     if (session.active === true) {
//         if(counter < 2){
//             const connection = new WebRTCConnection({
//                 sdp: sdp,
//                 type: 'viewer', // Create a WebRTC connection for viewing
//             });
//             await connection.open(session); // Open the WebRTC connection
    
//             user.peer_connection = connection
    
//             const payload = {
//                 sdp: connection.peer?.localDescription, // Send the local SDP as a response
//                 secondary_broadcaster : false,
//                 detail: 'Session joined successfully',
//             };
    
//             res.json(payload);
//             counter++;
//             return;
//         }else{
//             console.log("Server capacity exeded, re-routing connection to a user...")
            
//             let secondary_broadcaster : SecondaryBroadcaster | null = null

//             for (const _secondary_broadcaster of session.secondary_broadcaster){
//                 if( _secondary_broadcaster.count < 1){
//                     secondary_broadcaster = _secondary_broadcaster
//                     break
//                 }
//             }

//             if(!secondary_broadcaster){
//                 res.status(503)
//                 res.json({
//                     detail : "Server capacity exeded, no secondary broadcaster available"
//                 })
//                 return
//             }
//             secondary_broadcaster.ws.send(JSON.stringify(sdp))

//             const payload = {
//                 sdp : secondary_broadcaster.sdp,
//                 secondary_broadcaster : true,
//                 detail : "Let's see if it works"
//             } 
//             res.json(payload)
//             return;
//         }
//     }

//     res.json({
//         detail: 'Session not yet started', // Respond if the session is not active
//     });
// });