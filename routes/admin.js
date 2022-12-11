var express = require('express');

const { PrismaClient } = require("@prisma/client");
const router = require('./users');

const prisma = new PrismaClient();
const jwtMiddleware = require('../middlewares/jwt');
const userTypeMiddleware = require('../middlewares/userType');
const userTypes = require('../misc/enum').userType;
const isUserType = require('../misc/istype').isUserType;

const multer = require('multer');
const fs = require('fs');

router.post('/upload', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (!req.decoded.user_type == userTypes.admin){
        return res.status(401).json({ error: 'User not authorized' });
    }
});

router.get('/getshifts', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.admin)) {
        const shifts = await prisma.shifts.findMany({
            select: {
                id: true,
                start_time: true,
                end_time: true,
                max_volunteers: true,
                work_type: true,
                location: true,
                description: true,
            }
        });
        for (const shift of shifts) {
            shift.start_time = shift.start_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            shift.end_time = shift.end_time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            shift.date = new Date(shift.start_time).toLocaleDateString();
        }
        res.json({ shifts: shifts });
        return;
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

router.delete('/deleteshift/:id', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.admin)) {
        try {
            const shift = await prisma.shifts.delete({
                where: {
                    id: parseInt(req.params.id)
                }
            });
            res.json({ message: 'Shift deleted' });
            return;
        } catch (error) {
            if (error.code == 'P2025') {
                res.status(401).json({ error: 'Invalid shift' });
                return;
            }
        }
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

module.exports = router;