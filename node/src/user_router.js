
const express = require('express')

const { User } = require('./database.js')
const { authenticateToken, generateToken } = require('./authentication.js');


const user_router = express.Router()


// Register a user
user_router.post('/', async ({body : {username}}, res) => {
    const user = new User({username})
    const token = generateToken(user);
    
    res.json({ 
        token : token,
        detail : 'User registered successfully' 
    });
});

user_router.get('/validate-token', authenticateToken, async ({user}, res) => {
    res.json({
        detail : "valid token"
    })
})

user_router.patch('/', authenticateToken, async ({user, body : {viewing}}, res) => {
    if(user.viewing !== viewing){
        user.viewing = viewing
    }
    res.json({
        detail : 'User updated successfully'
    })
} )

module.exports = {
    user_router
}