import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import * as jwt from 'jsonwebtoken'; // JSON Web Token library for authentication
import { Request, Response, NextFunction } from 'express'; // Express framework

import { User } from './database'; // User model

/**
 * Generates a random access code for host login.
 * 
 * @returns {string} A 6-character random access code.
 */
export function generateHostAccessCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$'; // Allowed characters
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length)); // Randomly pick characters
    }
    return code;
}

/**
 * Generates a JWT token for a user.
 * 
 * @param {User} user - The user object for whom the token is generated.
 * @returns {string} The generated JWT token.
 * @throws {Error} If the JWT_SECRET environment variable is not defined.
 */
export function generateToken(user: User): string {
    const secret = process.env.JWT_SECRET; // Get the JWT secret from environment variables
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in the environment variables');
    }
    return jwt.sign({ id: user.id }, secret, { expiresIn: '3h' }); // Sign the token with the user ID and expiration time
}

/**
 * Internal function to authenticate a JWT token.
 * 
 * @param {string} token - The JWT token to authenticate.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @returns {void}
 */
async function _authenticateToken(token: string, req: Request, res: Response, next : NextFunction) {
    if (!token) return res.sendStatus(401); // Unauthorized if no token is provided

    const secret = process.env.JWT_SECRET; // Get the JWT secret from environment variables
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    try {
        // Verify the token
        const userdata = jwt.verify(token, secret);
        if (typeof userdata === 'string') {
            res.sendStatus(403); // Forbidden if the token is invalid
            return;
        }

        // Fetch the user from the database using the ID in the token
        const user = User.get(userdata.id);
        if (!user) {
            res.sendStatus(401); // Unauthorized if the user does not exist
            return;
        }

        // Attach the user to the request object
        req.user = user as User;
    } catch (err) {

        // console.error(err); // Log the error
        res.sendStatus(403); // Forbidden if token verification fails
        return
    }
    next(); // Proceed to the next middleware
}

/**
 * Middleware to authenticate a token passed as a query parameter.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 * @returns {void}
 */
export async function authenticateTokenFromQuery(req: Request, res: Response, next: NextFunction) {
    if (typeof req.query.token !== 'string') {
        res.sendStatus(401); // Unauthorized if the token is not provided in the query
        return;
    }
    const token = req.query.token; // Get the token from the query

    _authenticateToken(token, req, res, next); // Authenticate the token
}

/**
 * Middleware to authenticate a token passed in the Authorization header.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 * @returns {void}
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['authorization']?.split(' ')[1]; // Get the token from the Authorization header
    if (typeof token !== 'string') {
        res.sendStatus(401); // Unauthorized if the token is not provided
        return;
    }
    _authenticateToken(token, req, res, next); // Authenticate the token

}

/**
 * Middleware to ensure the user is a host.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 * @returns {void}
 */
export function authenticateHost(req: Request, res: Response, next: NextFunction) {
    if (!req.user || req.user.role != 'host') {
        res.status(403); // Forbidden if the user is not a host
        res.json({
            detail: 'Only a host can perform this action',
        });
        return;
    }
    next(); // Proceed to the next middleware
}