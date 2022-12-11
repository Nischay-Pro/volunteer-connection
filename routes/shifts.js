var express = require('express');
const { PrismaClient } = require("@prisma/client");
var router = express.Router();
const dotenv = require('dotenv');
const userTypeMiddleware = require('../middlewares/userType');
const jwtMiddleware = require('../middlewares/jwt');
const isUserType = require('../misc/istype').isUserType;
const userTypes = require('../misc/enum').userType;
const shiftTypes = require('../misc/enum').shiftType;
const Joi = require('joi');

dotenv.config();

const prisma = new PrismaClient();

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
        res.json({ shifts: shifts });
        return;
    }
    else{
        res.status(401).json({ error: 'User not authorized' });
        return;
    }

});

router.get('/getjobs', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    if (isUserType(req, userTypes.volunteer)) {
        const shifts = await prisma.jobs.findMany({
            where: {
                user_id: req.decoded.id
            }
        });
        const shiftList = [];
        for (const shift of shifts) {
            const shiftData = await prisma.shifts.findUnique({
                where: {
                    id: shift.id
                },
                include: { 
                    event: true
                }
            });
            shiftList.push(shiftData);
        }
        res.json({ shifts: shiftList });
        return
    }
    else if (isUserType(req, userTypes.admin)) {
        const shifts = await prisma.shifts.findMany();
        res.json({ shifts: shifts });
        return
    }
});

router.post('/addshift', jwtMiddleware, userTypeMiddleware, async function(req, res, next) {
    const shifts = Object.keys(shiftTypes).map(function(type) {
        return shiftTypes[type];
    });
    if (isUserType(req, userTypes.admin)) {
        const schema = Joi.object({
            start_time: Joi.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({'string.format': 'Start time must be in the format HH:MM'}),
            end_time: Joi.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({'string.format': 'End time must be in the format HH:MM'}),
            max_volunteers: Joi.number().required().min(1).max(5000),
            date: Joi.string().regex(/^\d{4}\-(0[1-9]|1[012])\-(0[1-9]|[12][0-9]|3[01])$/).required().messages({'string.format': 'Date must be in the format YYYY-MM-DD'}),
            location: Joi.string().required(),
            work_type: Joi.any().valid(...shifts).required(),
            description: Joi.string().required()
        });
        const { error, value } = schema.validate(req.body);
        if (error) {
            res.status(422).json({ error: error.details[0].message });
            return;
        }
        const parsedStartDateTime = new Date(value.date + ' ' + value.start_time);
        const parsedEndDateTime = new Date(value.date + ' ' + value.end_time);
        if (parsedStartDateTime >= parsedEndDateTime) {
            res.status(422).json({ error: 'Start time must be before end time' });
            return;
        }
        const timeDiff = parsedEndDateTime - parsedStartDateTime;
        if (timeDiff % 900000 != 0) {
            res.status(422).json({ error: 'Shift must be a multiple of 15 minutes' });
            return;
        }
        const shift = await prisma.shifts.create({
            data: {
                start_time: parsedStartDateTime,
                end_time: parsedEndDateTime,
                work_type: value.work_type,
                max_volunteers: value.max_volunteers,
                location: value.location,
                description: value.description,
            }
        });
        res.json({ shift: shift });
        return;
    }
    else {
        res.status(401).json({ error: 'User not authorized' });
        return;
    }
});

router.get('/gettypes', jwtMiddleware, async function(req, res, next) {
    res.json({ types: shiftTypes });
    return;
});

module.exports = router;
