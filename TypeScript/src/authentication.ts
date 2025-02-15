import dotenv from 'dotenv'
dotenv.config()

import * as jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'

import { User } from './database'

export function generateHostAccessCode() : string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export function generateToken(user: User): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in the environment variables');
    }
    return jwt.sign({ id: user.id }, secret, { expiresIn: '3h' });
}

async function _authenticateToken(token : string , req : Request, res : Response) {

    if (!token) return res.sendStatus(401);

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in the environment variables');
    }

    try {
        let userdata = jwt.verify(token, secret)
        if (typeof userdata === 'string') {
            res.sendStatus(403);
            return 
        }
        const user = User.get(userdata.id)
    
        if(!user) {
            res.sendStatus(401)
            return 
        }
    
        req.user = user as User;

    } catch(err) {
        console.log(err)
        res.sendStatus(403)
    }
}


export async function authenticateTokenFromQuery(req : Request, res : Response, next: NextFunction) {
    if(typeof req.query.token !== 'string'){
        res.sendStatus(401);
        return
    } 
    const token = req.query.token

    _authenticateToken(token, req, res)
    next()
}

export async function authenticateToken(req : Request, res : Response, next : NextFunction) {
    const token = req.headers['authorization']?.split(' ')[1];;
    if (typeof token !== 'string') {
        res.sendStatus(401);
        return
    }
    _authenticateToken(token, req, res)
    next()
}

export function authenticateHost(req : Request, res : Response, next : NextFunction) {

    if(!req.user || req.user.role != 'host'){
        res.status(403)
        res.json({
            detail : "Only a host can perform this action"
        })
        return 
    }
    next();
}