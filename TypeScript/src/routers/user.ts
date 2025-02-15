/**
 * Express router for user-related routes.
 * 
 * @module routers/user
 */

import express, {Request, Response, NextFunction } from "express"

import { User, Session, events, Identifier } from "../database"
import { generateToken, authenticateToken, authenticateHost, authenticateTokenFromQuery} from '../authentication.js'

import { raise404 } from "../utils"


/**
 * Router for user-related endpoints.
 * 
 * @constant
 * @type {Router}
 */
export const user_router = express.Router()

/**
 * Register a new user.
 * 
 * @name POST/
 * @function
 * @memberof module:routers/user~user_router
 * @inner
 * @param {Request} req - Express request object containing the username in the body.
 * @param {Response} res - Express response object.
 * @returns {void}
 */
user_router.post('/', async ({body : {username}} : Request, res : Response) => {
    
    const user = new User({username})
    const token = generateToken(user);
    
    res.json({ 
        token : token,
        detail : 'User registered successfully' 
    });
});


/**
 * Validate the authentication token.
 * 
 * @name GET/validate-token
 * @function
 * @memberof module:routers/user~user_router
 * @inner
 * @param {Request} req - Express request object with authenticated user.
 * @param {Response} res - Express response object.
 * @returns {void}
 */
user_router.get('/validate-token', authenticateToken, async ({user} : Request, res : Response) => {
    res.json({
        detail : "valid token"
    })
})

/**
 * Update user information.
 * 
 * @name PATCH/
 * @function
 * @memberof module:routers/user~user_router
 * @inner
 * @param {Request} req - Express request object containing the user and new viewing information in the body.
 * @param {Response} res - Express response object.
 * @returns {void}
 */
user_router.patch('/', authenticateToken, async ({user, body : {viewing}} : Request, res : Response) => {
    
    if(user && user.viewing !== viewing){
        user.viewing = viewing
    }
    res.json({
        detail : 'User updated successfully'
    })
} )

