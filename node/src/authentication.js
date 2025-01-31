
require('dotenv').config();

const jwt = require('jsonwebtoken');


const { User } = require('./database.js')


function generateHostAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate JWT Token
function generateToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '3h' });
}

async function sseAuthenticateToken(req, res, next) {
    const token = req.query.token;
    if (!token) return res.status(401).end();
    
    try {
        userdata = jwt.verify(token, process.env.JWT_SECRET)
        const user = User.get(userdata.id)
    
        if(!user) return res.sendStatus(401)
    
        req.user = user;

    } catch(err) {
        console.log(err)
        return res.sendStatus(403)
    }
    next()
}

// Middleware to Verify Token
async function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);
    
    try {
        userdata = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET)
        const user = User.get(userdata.id)
    
        if(!user) return res.sendStatus(401)
    
        req.user = user;

    } catch(err) {
        console.log(err)
        return res.sendStatus(403)
    }
    next();
}

// Middleware to Verify Token
function authenticateHost(req, res, next) {

    if(req.user.role != 'host'){
        res.status(403)
        return res.json({
            detail : "Only a host can perform this action"
        })
    }
    next();
}



module.exports = {
    generateToken, authenticateToken, generateHostAccessCode, authenticateHost, sseAuthenticateToken
}