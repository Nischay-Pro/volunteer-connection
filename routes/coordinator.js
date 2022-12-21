var express = require('express');
const { PrismaClient } = require("@prisma/client");
var router = express.Router();
const userTypeMiddleware = require('../middlewares/userType');
const jwtMiddleware = require('../middlewares/jwt');
const isUserType = require('../misc/istype').isUserType;
const userTypes = require('../misc/enum').userType;
const shiftTypes = require('../misc/enum').shiftType;
const Joi = require('joi');

const prisma = new PrismaClient();

router.get('/getusers', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {

    if (isUserType(req, userTypes.coordinator)) {
        const employee_id = await prisma.users.findUnique({
            where: {
                email: req.decoded.username,
            },
            select: {
                employee_id: true,
            }
        });
        
        const users = await prisma.users.findMany({
            where: {
                employee_id: employee_id.employee_id,
                user_type: userTypes.volunteer,
            },
            select: {
                id: true,
                name: true,
                email: true,
                city: true,
                phone: true,
            }
        });
        res.json({ users: users });
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

router.post('/deleteuser/:id', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.coordinator)) {
        const user = await prisma.users.findUnique({
            where: {
                id: Number(req.params.id),
            },
            select: {
                user_type: true,
                employee_id: true,
            }
        });
        const employee_id = await prisma.users.findUnique({
            where: {
                email: req.decoded.username,
            },
            select: {
                employee_id: true,
            }
        });

        if (user.employee_id !== employee_id.employee_id) {
            res.status(401).json({ error: 'User not authorized' });
            return;
        }

        if (user.user_type === userTypes.volunteer) {
            const deletedUser = await prisma.users.delete({
                where: {
                    id: Number(req.params.id),
                }
            });
            res.status(200).json({ message: 'User deleted successfully' });
        }
        else {
            res.status(401).json({ error: 'User not authorized' });
            return;
        }
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

module.exports = router;