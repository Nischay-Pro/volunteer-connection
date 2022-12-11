var express = require('express');
const { PrismaClient } = require("@prisma/client");
const Joi = require('joi');
const bcrypt = require('bcrypt');
const saltRounds = 10;
var router = express.Router();
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const jwtMiddleware = require('../middlewares/jwt');
const { createClient } = require('redis');
const { reduceEachTrailingCommentRange } = require('typescript');

dotenv.config();

const redis = createClient({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });


const prisma = new PrismaClient();
  

function generateAccessToken(username) {
    return jwt.sign(username, process.env.TOKEN_SECRET, { expiresIn: '3600s' });
}
  
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({ title: 'Volunteer Connection' });
  return;
});

router.get('/verify', jwtMiddleware, async function(req, res, next) {
    res.json({ message: 'Token verified' , user: req.decoded});
    return;
});

router.post('/login', async function(req, res, next) {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
        res.status(422).json({ error: error.details[0].message });
        return
    }

    const user = await prisma.users.findUnique({
        where: {
            email: value.email,
        }
    });

    if (user) {
        const match = await bcrypt.compare(value.password, user.password);
        if (match) {
            const token = generateAccessToken({ username: user.email });
            res.status(200).json({ message: 'Login successful' , token: token, user_type: user.user_type});
            return;
        } else {
            res.status(401).json({ error: 'Invalid credentials specified' });
            return;
        }
    }
    else {
        res.status(401).json({ error: 'Invalid credentials specified' });
        return;
    }

});

router.get('/logout', async function(req, res, next) {
    const token = req.headers['x-access-token'];
    const decoded = jwt.decode(token);
    const maxAge = decoded.exp - decoded.iat;
    await redis.connect();
    await redis.set(token, 'true');
    await redis.expire(token, maxAge);
    await redis.disconnect();
    res.json({ message: 'Logout successful' });
    return;
});

router.post('/register', async function(req, res, next) {

    const roles = ['admin', 'volunteer', 'coordinator'];

    const schema = Joi.object({
        name: Joi.string().min(3).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        phone: Joi.string().min(10).required(),
        address: Joi.string().min(1).required(),
        city: Joi.string().min(1).required(),
        state: Joi.string().min(1).required(),
        zip: Joi.string().min(1).required(),
        country: Joi.string().min(1).required(),
        age: Joi.number().min(18).required(),
        marketing: Joi.boolean().required(),
        company: Joi.string().min(0).optional(),
        employee_id: Joi.string().min(0).optional(),
        user_type: Joi.any().valid(...roles).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        res.status(422).json({ error: error.details[0].message });
        return;
    }
    
    value['password'] = bcrypt.hashSync(value['password'], saltRounds);

    try {
        const users = await prisma.users.create({
            data: value,
        });
        res.status(200).json({ message: 'User created successfully' });
        return;
    } catch (err) {
        if (err.code === 'P2002') {
            res.status(401).json({ error: 'Email already exists' });
            return;
        }
        else {
            res.status(401).json({ error: err.message });
            return;
        }
    }
});

module.exports = router;
