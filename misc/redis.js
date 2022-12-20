const dotenv = require('dotenv');
const { createClient } = require('redis');

dotenv.config();

const redis = createClient({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });

async function isTokenBlacklisted(token){
    await redis.connect();
    response = await redis.get(token);
    await redis.quit();
    if (response === null) {
        return false;
    }
    else {
        return true;
    }
};

module.exports = {
    isTokenBlacklisted
};