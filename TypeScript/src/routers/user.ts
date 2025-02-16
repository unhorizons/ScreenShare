/**
 * Express router for user-related routes.
 * 
 * @module routers/user
 */

import express, { Request, Response, NextFunction } from 'express'; // Express framework
import { User, Session, events, Identifier } from '../database'; // Database models and utilities
import { generateToken, authenticateToken, authenticateHost, authenticateTokenFromQuery } from '../authentication.js'; // Authentication utilities
import { raise404 } from '../utils'; // Utility function for raising 404 errors

/**
 * Router for user-related endpoints.
 * 
 * @constant
 * @type {Router}
 */
export const user_router = express.Router();

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
user_router.post('/', async ({ body: { username } }: Request, res: Response) => {
    // Create a new user with the provided username
    const user = new User({ username });

    // Generate a token for the new user
    const token = generateToken(user);

    // Respond with the token and a success message
    res.json({
        token: token,
        detail: 'User registered successfully',
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
user_router.get('/validate-token', authenticateToken, async ({ user }: Request, res: Response) => {
    // Respond with a success message if the token is valid
    res.json({
        detail: 'valid token',
    });
});

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
user_router.patch('/', authenticateToken, async ({ user, body: { viewing } }: Request, res: Response) => {
    // Update the user's viewing status if it has changed
    if (user && user.viewing !== viewing) {
        user.viewing = viewing;
    }

    // Respond with a success message
    res.json({
        detail: 'User updated successfully',
    });
});