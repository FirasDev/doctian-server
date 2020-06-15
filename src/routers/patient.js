const express = require('express')
const auth = require('../middleware/auth')
const moment = require('moment')
var dateFormat = require('dateformat');
const User = require('../models/user')
const Doctor = require('../models/doctor')
const Pharmacy = require('../models/pharmacy')
const Patient = require('../models/patient')
const Laboratory = require('../models/laboratory')
const Analysis = require('../models/analysis')
const Appointment = require('../models/appointment')
const Perscription = require('../models/perscription')
const Notes = require('../models/notes')
const PharmaceuticalCompany = require('../models/pharmaceuticalCompany')
const MedicamentRequest = require('../models/medicamentRequest')
const MedicamentResponse = require('../models/medicamentResponse')
const requestNotification = require('../models/requestNotification')
const { getDistance, convertDistance } = require('geolib')

const router = new express.Router()

//////////////////
// Create Analyse Request
//////////////////
router.post('/patient/analysis', auth, async (req, res) => {

    const patient = await Patient.findByUser(req.user.id)
    console.log(patient)

    const analysis = new Analysis({
        ...req.body,
        patient: patient._id
    })
    try {
        await analysis.save();
        res.status(201).send(analysis);
    } catch (e) {
        res.status(500).send(e);
    }

})

//////////////////
// Check All Analysis Requests
//////////////////
router.get('/patient/analysis/', auth, async (req, res) => {
    console.log("Get Notes ENTER")
    try {
        const patient = await Patient.findByUser(req.user.id)
        const analyses = await Analysis.find({ 'patient': patient._id })

        if (analyses.length == 0) {
            return res.status(404).send()
        }
        for (var i = 0; i < analyses.length; i++) {
            await analyses[i].populate('doctor').execPopulate();
            await analyses[i].populate('laboratory').execPopulate();
            await analyses[i].doctor.populate('owner').execPopulate();
            await analyses[i].laboratory.populate('owner').execPopulate();
            var analysis = analyses[i].toObject();
            analysis.createDate = analyses[i]._id.getTimestamp();
            analyses[i] = analysis;
            console.log("Analysis : " + i + " - " + analyses[i])
        }
        res.status(200).send(analyses)
    } catch (e) {
        res.status(500).send(e)
    }
})

//////////////////
// Check Analysis Request
//////////////////
router.get('/patient/analysis/:id', auth, async (req, res) => {
    const _id = req.params.id
    try {
        const patient = await Patient.findByUser(req.user.id)
        await patient.populate('analyses').execPopulate()

        const analysis = await Analysis.findOne({ _id, 'patient': patient._id })
        if (!analysis) {
            res.status(404).send()
        }

        res.status(200).send(analysis)
    } catch (e) {
        res.status(500).send(e)
    }
})

//////////////////
// Filter Doctors by Specialty
//////////////////
router.get('/patient/doctors/:speciality', auth, async (req, res) => {
    const _speciality = req.params.speciality
    try {
        const doctors = await Doctor.find({ 'specialty': _speciality })
        res.status(200).send(doctors)
    } catch (e) {
        res.status(400).send(e)
    }
})


//////////////////
// Get Doctors Information
//////////////////
router.get('/patient/doctor/:id', auth, async (req, res) => {
    const _id = req.params.id
    try {
        const doctor = await Doctor.findById(_id)
        await doctor.populate('owner').execPopulate()
        res.status(200).send(doctor)
    } catch (e) {
        res.status(400).send(e)
    }
})

//////////////////
// Apply for an Appointment
//////////////////
router.post('/patient/doctor/:id', auth, async (req, res) => {
    const patient = await Patient.findByUser(req.user.id)

    const _id = req.params.id
    const doctor = await Doctor.findById(_id)

    const appointment = new Appointment({
        ...req.body,
        patient: patient._id,
        doctor: doctor._id
    })
    console.log(appointment.appointmentDate);
    try {
        await appointment.save();
        res.status(201).send(appointment);
    } catch (e) {
        res.status(400).send(e)
    }
})


class DaysEvent {
    status = false;
    number = 0;
    constructor(date) {
        this.date = date;
    }

    get area() {
        return this.calcArea();
    }

    calcArea() {
        return this.largeur * this.hauteur;
    }
}


class DaySession {
    session = "0";
    status = false;

    constructor(session, status) {
        this.session = session;
        this.status = status;
    }
}

class DayBlock {
    _id = "";
    count = 100;
    status = 1;

    constructor(_id) {
        this._id = _id;
    }
}



function compareDayString(days, blockeDays) {
    const index = blockeDays.indexOf(days.toUpperCase());
    if (index > -1) {
        return true;
    } else {
        return false;
    }
}



//////////////////
// Check Doctor Appointement System
//////////////////
router.get('/patient/doctor/days/:id', auth, async (req, res) => {

    const patient = await Patient.findByUser(req.user.id)
    const _id = req.params.id
    const doctor = await Doctor.findById(_id)
    const blockeDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
    try {


        var workDays = doctor.workDays.split(',')


        for (var i = 0; i < workDays.length; i++) {
            const index = blockeDays.indexOf(workDays[i].toUpperCase());
            if (index > -1) {
                blockeDays.splice(index, 1);
            }
        }

        console.log(blockeDays)

        let nbrHours = moment.utc(moment(doctor.dispoHourEnd, "DD/MM/YYYY HH:mm:ss").diff(moment(doctor.dispoHourStart, "DD/MM/YYYY HH:mm:ss"))).format("HH");
        let nbrMins = moment.utc(moment(doctor.dispoHourEnd, "DD/MM/YYYY HH:mm:ss").diff(moment(doctor.dispoHourStart, "DD/MM/YYYY HH:mm:ss"))).format("mm");

        let config =
        {
            // //startWork: doctor.dispoHourStart,
            // ///endWork: doctor.dispoHourEnd,
            startWork: dateFormat(doctor.dispoHourStart, "HH:mm:ss", true),
            endWork: dateFormat(doctor.dispoHourEnd, "HH:mm:ss", true),
            sessionTime: 30, // Session Time Per Minutes (30 min)
            numberSession: (parseInt(nbrHours) * 60 + parseInt(nbrMins)) / 30
        };
        const today = moment().startOf('day')

        const appointments = await Appointment.aggregate([
            {
                $match: {
                    doctor: doctor._id, patient: patient._id, appointmentDate: {
                        '$gte': today.toDate(),
                    }
                }
            },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$appointmentDate" } }, count: { $sum: 1 }, appointmentsStatus: { $push: "$appointmentStatus" } } },
            {
                $addFields:
                {
                    status: {
                        $sum: {
                            "$cond": [
                                { "$eq": ["$count", config.numberSession] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ])


        ///////
        /// Not Optimal Solution (--)
        ///////
        var now = moment()
        for (var i = 1; i < 365; i++) {
            //console.log("Not In IF : "+now.format('dddd') + " - " + now.format('YYYY-MM-DD'))
            if (compareDayString(now.format('dddd'), blockeDays)) {
                console.log(now.format('dddd') + " - " + now.format('YYYY-MM-DD'))
                dayBlock = new DayBlock(now.format('YYYY-MM-DD'))
                appointments.push(dayBlock)
            }
            now = moment(now, true).add(1, 'days');
        }
        console.log(appointments)
        res.status(201).send(appointments);
    } catch (e) {
        res.status(400).send(e)
    }
})


function compareTime(dateTimeA, dateTimeB) {
    var momentA = moment(dateTimeA, "HH:MM:ss");
    var momentB = moment(dateTimeB, "HH:MM:ss");
    if (momentA > momentB) return 1;
    else if (momentA < momentB) return -1;
    else return 0;
}

function compareTimeString(dateTimeA, dateTimeB) {
    var momentA = dateTimeA.format('LTS');
    var momentB = dateTimeB.format('LTS');
    if (momentA == momentB) return 0;
    else return -1;
}


router.get('/patient/doctor/hours/:id/:date', auth, async (req, res) => {

    const patient = await Patient.findByUser(req.user.id)
    const _id = req.params.id
    const doctor = await Doctor.findById(_id)
    const _date = req.params.date;
    console.log("DATE FROM Flutter -- > " + _date)
    ///////
    const today = moment(_date, "YYYYMMDD").startOf('day')
    ///////
    try {
        const appointments = await Appointment.find({
            doctor: doctor._id,
            //patient: patient._id,
            appointmentDate: {
                $gte: today.toDate(),
                $lte: moment(today).endOf('day').toDate()
            }
        })

        let nbrHours = moment.utc(moment(doctor.dispoHourEnd, "DD/MM/YYYY HH:mm:ss").diff(moment(doctor.dispoHourStart, "DD/MM/YYYY HH:mm:ss"))).format("HH");
        let nbrMins = moment.utc(moment(doctor.dispoHourEnd, "DD/MM/YYYY HH:mm:ss").diff(moment(doctor.dispoHourStart, "DD/MM/YYYY HH:mm:ss"))).format("mm");

        // console.log("---------> " + (parseInt(nbrHours) * 60 + parseInt(nbrMins)));
        // var date = moment(doctor.dispoHourStart, "HH:MM:ss", true).add(30, 'minutes');
        // for (var i = 0; i < 6; i++) {
        //     console.log(date)
        //     date = moment(date, "HH:MM:ss", true).add(30, 'minutes').format('LTS');
        // }
        let sessions = [];
        let config =
        {
            //startWork: doctor.dispoHourStart,
            ///endWork: doctor.dispoHourEnd,
            startWork: dateFormat(doctor.dispoHourStart, "HH:MM:ss", true),
            endWork: dateFormat(doctor.dispoHourEnd, "HH:MM:ss", true),
            sessionTime: 30,
            numberSession: (parseInt(nbrHours) * 60 + parseInt(nbrMins)) / 30
        };

        var date = moment(doctor.dispoHourStart, "HH:MM:ss", true);

        for (var i = 0; i < config.numberSession; i++) {

            var daySession = new DaySession(date, false);
            appointments.forEach(app => {
                console.log("Compare : " + moment(app.appointmentDate).format('LTS') + " | " + date.format('LTS'))
                console.log(compareTimeString(moment(app.appointmentDate), date))
                if (compareTimeString(moment(app.appointmentDate), date) == 0) {
                    daySession.status = true;
                }
            });
            var date = moment(date, "HH:MM:ss", true).add(30, 'minutes');
            sessions.push(daySession)

        }
        console.log(sessions.length)

        // res.status(201).send({ appointments, config, sessions });
        res.status(201).send(sessions);
    } catch (e) {
        res.status(400).send(e)
    }

})

//////////////////
// AI Appointement Auto-System
//////////////////
router.post('/patient/doctors/appointment/:id', auth, async (req, res) => {
    const patient = await Patient.findByUser(req.user.id)
    const _id = req.params.id
    const doctor = await Doctor.findById(_id)
    console.log(doctor.name)
    var workDays = doctor.workDays.split(',')
    for (var i = 0; i < workDays.length; i++) {
        workDays[i] = workDays[i].toUpperCase();
    }
    console.log(workDays)
    var operation = true;
    //var now = moment()
    //var today = moment(now).startOf('day')

    //console.log("ToDay : " + today)

    let nbrHours = moment.utc(moment(doctor.dispoHourEnd, "DD/MM/YYYY HH:mm:ss").diff(moment(doctor.dispoHourStart, "DD/MM/YYYY HH:mm:ss"))).format("HH");
    let nbrMins = moment.utc(moment(doctor.dispoHourEnd, "DD/MM/YYYY HH:mm:ss").diff(moment(doctor.dispoHourStart, "DD/MM/YYYY HH:mm:ss"))).format("mm");

    let config =
    {
        // //startWork: doctor.dispoHourStart,
        // ///endWork: doctor.dispoHourEnd,
        startWork: dateFormat(doctor.dispoHourStart, "HH:MM:ss", true),
        endWork: dateFormat(doctor.dispoHourEnd, "HH:MM:ss", true),
        sessionTime: 30, // Session Time Per Minutes (30 min)
        numberSession: (parseInt(nbrHours) * 60 + parseInt(nbrMins)) / 30
    };

    var now = moment().startOf('day')
    //for (var i = 1; i < 365; i++) {
    var max = 0;
    while (operation && max < 30) {
        max++;
        if (compareDayString(now.format('dddd'), workDays)) {
            console.log(now.format('dddd') + " - " + now.format('YYYY-MM-DD'))
            var countSession = await Appointment.countDocuments({
                doctor: doctor._id,
                appointmentDate: {
                    $gte: now.toDate(),
                    $lte: moment(now).endOf('day').toDate()
                }
            })
            console.log("countSession : " + countSession)
            if (countSession < config.numberSession) {
                if (countSession == 0) {
                    var date = moment.utc(doctor.dispoHourStart, "HH:mm:ss", true);
                    var dateString = now.format('YYYY-MM-DDT') + date.format('HH:mm:ss.SSS') + "Z"
                    //     //var finalDate = new Date(dateString);
                    var finalDate = moment(dateString).format("YYYY-MM-DDTHH:mm:ss.SSS");
                    var msg = "Hi D. " + doctor.name + ". This is " + patient.name + ". I want to confirm this appointment."
                    var appointment = new Appointment({
                        appointmentDate: finalDate,
                        detailsProvidedByPatient: msg,
                        patient: patient._id,
                        doctor: doctor._id
                    })
                    try {
                        await appointment.save();
                        operation = false;
                        res.status(201).send({ appointment, finalDate, dateString });
                    } catch (error) {
                        res.status(400).send(error)
                    }
                } else {
                    try {
                        const appointments = await Appointment.find({
                            doctor: doctor._id,
                            appointmentDate: {
                                $gte: now.toDate(),
                                $lte: moment(now).endOf('day').toDate()
                            }
                        }).sort({ appointmentDate: 'asc' })
                        var date = moment.utc(doctor.dispoHourStart, "HH:mm:ss", true);
                        console.log("Start Date TEST : " + date.format('HH:mm:ss'))

                        var validSession = false;
                        var i = 0;
                        //var iApp = 0;
                        var createSession = false;

                        while (!createSession) {
                            try {
                                console.log("Compare : " + moment.utc(appointments[i].appointmentDate).format('LTS') + " | " + date.format('LTS'))
                                if (compareTimeString(moment.utc(appointments[i].appointmentDate), date) != 0) {
                                    var date = moment(date, "HH:mm:ss", true);
                                    var dateString = now.format('YYYY-MM-DDT') + date.format('HH:mm:ss.SSS') + "Z"
                                    var finalDate = moment(dateString).format("YYYY-MM-DDTHH:mm:ss.SSS");
                                    var msg = "Hi D. " + doctor.name + ". This is " + patient.name + ". I want to confirm this appointment."
                                    var appointment = new Appointment({
                                        appointmentDate: finalDate,
                                        detailsProvidedByPatient: msg,
                                        patient: patient._id,
                                        doctor: doctor._id
                                    })
                                    try {
                                        await appointment.save();
                                        console.log('Create')
                                        createSession = true;
                                        operation = false;
                                        res.status(201).send({ appointment, finalDate, dateString });
                                    } catch (error) {
                                        res.status(400).send(error)
                                    }

                                }
                            } catch (error) {
                                console.log("Catch Time - > " + date.format('LTS'))
                                var date = moment(date, "HH:mm:ss", true);
                                var dateString = now.format('YYYY-MM-DDT') + date.format('HH:mm:ss.SSS') + "Z"
                                var finalDate = moment(dateString).format("YYYY-MM-DDTHH:mm:ss.SSS");
                                var msg = "Hi D. " + doctor.name + ". This is " + patient.name + ". I want to confirm this appointment."
                                var appointment = new Appointment({
                                    appointmentDate: finalDate,
                                    detailsProvidedByPatient: msg,
                                    patient: patient._id,
                                    doctor: doctor._id
                                })
                                try {
                                    await appointment.save();
                                    console.log('Create')
                                    createSession = true;
                                    operation = false;
                                    res.status(201).send({ appointment, finalDate, dateString });
                                } catch (error) {
                                    res.status(400).send(error)
                                }
                            }

                            i++;
                            console.log('i = ' + i)

                            var date = moment(date, "HH:mm:ss", true).add(30, 'minutes');
                        }





                        // while ((!validSession) && (i < config.numberSession)) {

                        //for (const app of appointments) {
                        //console.log("Compare : " + moment(appointments[iAppLength].appointmentDate).format('LTS') + " | " + date.format('LTS'))
                        //console.log(compareTimeString(moment(appointments[i].appointmentDate), date))
                        // if (compareTimeString(moment(appointments[i].appointmentDate), date) == 0) {
                        //     validSession = true;
                        //     var dateString = now.format('YYYY-MM-DDT') + date.format('HH:mm:ss.SSS') + "Z"
                        //     //var finalDate = new Date(dateString);
                        //     var finalDate = moment(dateString).format("YYYY-MM-DDTHH:mm:ss.SSS");
                        //     var msg = "Hi D. " + doctor.name + ". This is " + patient.name + ". I want to confirm this appointment."
                        //     var appointment = new Appointment({
                        //         appointmentDate: finalDate,
                        //         detailsProvidedByPatient: msg,
                        //         patient: patient._id,
                        //         doctor: doctor._id
                        //     })
                        //     //res.status(201).send({ appointment, finalDate, dateString });
                        //     try {
                        //         await appointment.save();
                        //         res.status(201).send({ appointment, finalDate, dateString });
                        //     } catch (error) {
                        //         res.status(400).send(error)
                        //     }
                        //     //res.status(200).send("End " + finalDate)
                        //     //res.status(200).send("End " + now.format('YYYY-MM-DD') + " - " + date.format('hh:mm:ss'))
                        // }
                        // }



                        // appointments.forEach((app) => {
                        // console.log("Compare : " + moment(app.appointmentDate).format('LTS') + " | " + date.format('LTS'))
                        // console.log(compareTimeString(moment(app.appointmentDate), date))
                        // if (compareTimeString(moment(app.appointmentDate), date) == 0) {
                        //     validSession = true;
                        //     var dateString = now.format('YYYY-MM-DDT') + date.format('HH:mm:ss.SSS')

                        //     //var finalDate = new Date(dateString);
                        //     var finalDate = moment(dateString).format("YYYY-MM-DDTHH:mm:ss.SSS");
                        //     var msg = "Hi D. " + doctor.name + ". This is " + patient.name + ". I want to confirm this appointment."
                        //     var appointment = new Appointment({
                        //         appointmentDate: finalDate,
                        //         detailsProvidedByPatient: msg,
                        //         patient: patient._id,
                        //         doctor: doctor._id
                        //     })
                        //     //res.status(201).send({ appointment, finalDate, dateString });
                        //     try {
                        //         //await appointment.save();

                        //         res.status(201).send({ appointment, finalDate, dateString });
                        //     } catch (error) {
                        //         res.status(400).send(error)
                        //     }

                        //     //res.status(200).send("End " + finalDate)
                        //     //res.status(200).send("End " + now.format('YYYY-MM-DD') + " - " + date.format('hh:mm:ss'))
                        // }
                        // });
                        //if(iAppLength < )
                        //     iSession++;
                        //     console.log('i = ' + iSession)

                        //     var date = moment(date, "HH:mm:ss", true).add(30, 'minutes');
                        // }
                        // for (var i = 0; i < config.numberSession; i++) {
                        //     appointments.forEach(app => {
                        //         console.log("Compare : " + moment(app.appointmentDate).format('LTS') + " | " + date.format('LTS'))
                        //         console.log(compareTimeString(moment(app.appointmentDate), date))
                        //         if (compareTimeString(moment(app.appointmentDate), date) == 0) {
                        //             daySession.status = true;
                        //         }
                        //     });
                        //     var date = moment(date, "HH:MM:ss", true).add(30, 'minutes');
                        // }
                        operation = false;
                    } catch (error) {
                        console.log('Error')
                        res.status(500).send('Mother Of ALL Error')
                    }
                }

            }
            // i++;
            // if (i == 10) {
            //     operation = false;
            // }
        }
        now = moment(now, true).add(1, 'days');
    }
    // while (operation) {
    //     //console.log(now.format('dddd') + " - " + now.format('YYYY-MM-DD'))
    //     if (compareDayString(now.format('dddd'), workDays)) {
    //         console.log(now.format('dddd') + " - " + now.format('YYYY-MM-DD'))

    //         // var countSession = await Appointment.countDocuments({
    //         //     doctor: doctor._id,
    //         //     appointmentDate: {
    //         //         $gte: now.toDate(),
    //         //         $lte: moment(now).endOf('day').toDate()
    //         //     }
    //         // })

    //         // console.log("countSession : " + countSession)
    //         console.log("Enter Condition")
    //         if (countSession > 0) {
    //             operation = false;
    //         }

    //     } else {
    //         console.log("operation")
    //         operation = false;
    //     }
    //     now = moment(now, true).add(1, 'days');
    // }

    // for (var i = 0; i < workDays.length; i++) {
    //     const index = blockeDays.indexOf(workDays[i].toUpperCase());
    //     if (index > -1) {
    //         blockeDays.splice(index, 1);
    //     }
    // }
})




/*
router.get('/patient/doctors/hours/:id/:date', auth, async (req, res) => {

    const patient = await Patient.findByUser(req.user.id)
    const _id = req.params.id
    const doctor = await Doctor.findById(_id)
    ///////
    const today = moment("20200425", "YYYYMMDD").startOf('day')
    ///////
    try {
        const appointments = await Appointment.find({
            doctor: doctor._id,
            patient: patient._id,
            appointmentDate: {
                $gte: today.toDate(),
                $lte: moment(today).endOf('day').toDate()
            }
        })

        res.status(201).send(appointments);
    } catch (e) {
        res.status(400).send(e)
    }
})

*/


//////////////////
// Get All Doctor By Speciality And Location   
//////////////////
class DoctorResult {
    doctor;
    latitude = 1.1;
    longitude = 1.1;
    avatar = "avatar.jpg";
    distance = 100;


    constructor(doctor, avatar, latitude, longitude, distance) {
        this.doctor = doctor;
        this.avatar = avatar;
        this.latitude = latitude;
        this.longitude = longitude;
        this.distance = distance;

    }
}






router.get('/patient/doctors/', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        let doctors = [];
        const users = await User.find({ country: req.user.country, role: 'Doctor' })
        //const users = await User.find({ city: req.user.city })
        console.log(users.length)
        const USER_COORDS = { latitude: req.user.latitude, longitude: req.user.longitude }
        for (var i = 0; i < users.length; i++) {

            var DOC_COORDS = { latitude: users[i].latitude, longitude: users[i].longitude }
            console.log({ DOC_COORDS })
            var distance = getDistance(USER_COORDS, DOC_COORDS)
            try {
                var doctor = await Doctor.findByUser(users[i]._id)
                await doctor.populate('owner').execPopulate()
                var doctorResult = new DoctorResult(doctor, users[i].avatar, users[i].latitude, users[i].longitude, convertDistance(distance, 'km'))
                doctors.push(doctorResult)
            } catch (error) {
                console.log('Recherche FAIL')
            }
        }
        doctors.sort(function (a, b) {
            return a.distance - b.distance
        })
        console.log(doctors)
        res.status(200).send(doctors)
    } catch (error) {
        res.status(400).send(error)
    }


})



//////////////////
// Patient Accept/Reject an Appointment  
//////////////////
//----------------> Not Completed
router.patch('/patient/appointment/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['appointmentStatus']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid update!' })
    }
    try {
        const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        if (!appointment) {
            res.status(404).send()
        }
        res.status(204).send(appointment)
    } catch (e) {
        res.status(400).send(e)
    }

})

//////////////////
// Cancel Appointment [Delete]
//////////////////
router.delete('/patient/appointments/:id', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, 'patient': patient._id })
        if (!appointment) {
            res.status(404).send()
        }
        res.status(200).send(appointment)
    } catch (e) {
        res.status(500).send()
    }
})

//////////////////
// Check Upcoming Appointments
//////////////////
router.get('/patient/appointments/upcoming', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        //const appointments = await Appointment.find({ /* 'appointmentDate' : Date.now , , 'appointmentStatus': "Accepted" */ 'patient': patient._id })
        var now = moment().startOf('day')
        const appointments = await Appointment.find({
            patient: patient._id,
            appointmentDate: {
                $gte: now.toDate()
            }
        })

        for (var i = 0; i < appointments.length; i++) {
            await appointments[i].populate('doctor').execPopulate();
            await appointments[i].doctor.populate('owner').execPopulate();
            var appointment = appointments[i].toObject();
            appointment.createDate = appointments[i]._id.getTimestamp();
            appointments[i] = appointment;
            console.log("Perscriptions : " + i + " - " + appointments[i])
        }

        res.status(200).send(appointments)
    } catch (e) {
        res.status(400).send(e)
    }
})

//////////////////
// Check Appointments History
//////////////////
router.get('/patient/appointments/history', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        //const appointments = await Appointment.find({ /* 'appointmentDate' : Date.now , , 'appointmentStatus': "Accepted" */ 'patient': patient._id })
        var now = moment().startOf('day')
        const appointments = await Appointment.find({
            patient: patient._id,
            appointmentDate: {
                $lte: now.toDate()
            }
        })

        for (var i = 0; i < appointments.length; i++) {
            await appointments[i].populate('doctor').execPopulate();
            await appointments[i].doctor.populate('owner').execPopulate();
            var appointment = appointments[i].toObject();
            appointment.createDate = appointments[i]._id.getTimestamp();
            appointments[i] = appointment;
            console.log("Perscriptions : " + i + " - " + appointments[i])
        }

        res.status(200).send(appointments)
    } catch (e) {
        res.status(400).send(e)
    }
})

/***********//////////////////
/***********/// Check Medical Files
/***********///  - 1 : Ended Analysis
/***********///  - 2 : Prescription
/***********///  - 3 : Notes
/***********//////////////////



/**///////[-1-]////////
/**/// Check All Ended Analysis Requests 
/**///////////////////
router.get('/patient/analysisended/', auth, async (req, res) => {

    console.log("Get Notes ENTER")
    try {
        const patient = await Patient.findByUser(req.user.id)

        const analyses = await Analysis.find({ 'patient': patient._id, 'status': "Ended" })

        if (analyses.length == 0) {
            return res.status(404).send()
        }

        for (var i = 0; i < analyses.length; i++) {
            await analyses[i].populate('doctor').execPopulate();
            await analyses[i].populate('laboratory').execPopulate();
            await analyses[i].doctor.populate('owner').execPopulate();
            await analyses[i].laboratory.populate('owner').execPopulate();
            var analysis = analyses[i].toObject();
            analysis.createDate = analyses[i]._id.getTimestamp();
            analyses[i] = analysis;
            console.log("Analysis : " + i + " - " + analyses[i])
        }


        res.status(200).send(analyses)
    } catch (e) {
        res.status(500).send(e)
    }
})

/**///////[-2-]////////
/**/// Check All Prescription
/**///////////////////
router.get('/patient/perscriptions/', auth, async (req, res) => {
    // try {
    //     const patient = await Patient.findByUser(req.user.id)
    //     await patient.populate('perscriptions').execPopulate()
    //     //await patient.perscriptions.populate('doctor').execPopulate()
    //     res.status(200).send(patient.perscriptions)
    // } catch (e) {
    //     res.status(500).send(e)
    // }
    console.log("Get Perscriptions ENTER")
    try {
        const patient = await Patient.findByUser(req.user.id)
        const perscriptions = await Perscription.find({ 'patient': patient._id })
        for (var i = 0; i < perscriptions.length; i++) {
            await perscriptions[i].populate('doctor').execPopulate();
            await perscriptions[i].doctor.populate('owner').execPopulate();
            var perscription = perscriptions[i].toObject();
            perscription.createDate = perscriptions[i]._id.getTimestamp();
            perscriptions[i] = perscription;
            console.log("Perscriptions : " + i + " - " + perscriptions[i])
        }
        res.status(200).send(perscriptions)
    } catch (e) {
        res.status(500).send(e)
    }
})

/**///////[-3-]////////
/**/// Check All Notes
/**///////////////////
router.get('/patient/notes/', auth, async (req, res) => {
    console.log("Get Notes ENTER")
    try {
        const patient = await Patient.findByUser(req.user.id)
        const notes = await Notes.find({ 'patient': patient._id })
        for (var i = 0; i < notes.length; i++) {
            await notes[i].populate('doctor').execPopulate();
            await notes[i].doctor.populate('owner').execPopulate();
            var note = notes[i].toObject();
            note.createDate = notes[i]._id.getTimestamp();
            notes[i] = note;
            console.log("Note : " + i + " - " + notes[i])
        }
        res.status(200).send(notes)
    } catch (e) {
        res.status(500).send(e)
    }
})


//////////////////
// Create Medicament Request (Patient Prescriptions)
//////////////////
router.post('/patient/medicaments/', auth, async (req, res) => {
    const patient = await Patient.findByUser(req.user.id)
    const medicamentRequest = new MedicamentRequest({
        ...req.body,
        patient: patient._id,
    })
    try {
        await medicamentRequest.save();
        res.status(201).send(medicamentRequest);
    } catch (e) {
        res.status(400).send(e)
    }
})

//////////////////
// Create Medicament Request (Doctor Prescriptions)
//////////////////
router.post('/patient/perscription/:id', auth, async (req, res) => {
    const patient = await Patient.findByUser(req.user.id)

    const medicamentRequest = new MedicamentRequest({
        ...req.body,
        patient: patient._id,
        perscription: req.params.id
    })
    try {
        await medicamentRequest.save();
        res.status(201).send(medicamentRequest);
    } catch (e) {
        res.status(400).send(e)
    }
})


//////////////////
// Check All Medicaments Requests
//////////////////
router.get('/patient/medicaments/request', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        await patient.populate('medicamentRequests').execPopulate()
        res.status(200).send(patient.medicamentRequests)
    } catch (e) {
        res.status(400).send(e)
    }
})

//////////////////
// Check All Medicament Responses For Request
//////////////////
router.get('/patient/medicaments/:id', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)

        const medicamentRequests = await MedicamentRequests.find({ 'patient': patient._id, _id: req.params.id })
        await medicamentRequests.populate('medicamentResponses').execPopulate()

        if (medicamentRequests.medicamentResponses.length == 0) {
            return res.status(404).send()
        }

        res.status(200).send(medicamentRequests.medicamentResponses)
    } catch (e) {
        res.status(500).send(e)
    }
})


//////////////////
// Get Patien Information
//////////////////
router.get('/patient/', auth, async (req, res) => {
    console.log("Get Patient ENTER")
    try {
        const patient = await Patient.findByUser(req.user.id)
        res.status(200).send(patient)
    } catch (e) {
        res.status(500).send(e)
    }
})


//////////////////
// Update Patient Profile
//////////////////
router.patch('/patient/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'lastName', 'gender', 'cin', 'dateOfBirth', 'cnssNumber']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }
    const patient = await Patient.findByUser(req.user.id)

    if (!patient) {
        return res.status(404).send()
    }

    updates.forEach((update) => patient[update] = req.body[update])
    await patient.save()
    res.status(200).send(patient)
})



///////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////// 
///////////////////                            ////////////////////////
///////////////////      Firas Ben Saleh       ////////////////////////
///////////////////        Integration         ////////////////////////
///////////////////                            ////////////////////////
/////////////////////////////////////////////////////////////////////// 
/////////////////////////////////////////////////////////////////////// 




//////////////////
// Create Medicament Request (Patient Prescriptions)
//////////////////
router.route('/patient/medicament/:iduser/:med/:qua/:city').post(async function (req, res) {
    const patient = await Patient.findByUser(req.params.iduser)

    var mr = new MedicamentRequest();
    mr.city = req.params.city,
        mr.dateB = patient.dateOfBirth,
        mr.medicament = req.params.med,
        mr.quantity = req.params.qua,
        mr.image = "pill-png-2",
        mr.patient = patient._id
    try {
        await mr.save();
        res.status(201).send(mr);
    } catch (e) {
        res.status(400).send(e)
    }
})

//////////////////
// Create Medicament Request (Doctor Prescriptions)
//////////////////

router.route('/patient/perscription/:idpres/:iduser/:city').post(async function (req, res) {
    const patient = await Patient.findByUser(req.params.iduser)

    var mr = new MedicamentRequest();
    mr.city = req.params.city,
        mr.medicament = "Prescription",
        mr.dateB = patient.dateOfBirth,
        mr.image = "Prescription",
        mr.patient = patient._id,
        mr.perscription = req.params.idpres
    try {
        await mr.save();
        res.status(201).send(mr);
    } catch (e) {
        res.status(400).send(e)
    }
})



router.route('/Pendingdrugreps/:id')
    .get(function (req, res) {
        MedicamentResponse.find({ medicamentRequest: req.params.id }, function (err, drugreqs) {
            if (err) {
                res.send(err);
            }
            res.json(drugreqs);
        }).sort({ distance: 1 });
    })

router.route('/Pendingdrugreqs/:id')
    .get(function (req, res) {
        MedicamentRequest.find({ patient: req.params.id, state: "Pending" }, function (err, drugreqs) {
            if (err) {
                res.send(err);
            }
            res.json(drugreqs);
        }).sort({ date: -1 });
    })

router.route('/Closeddrugreqs/:id')
    .get(function (req, res) {
        MedicamentRequest.find({ patient: req.params.id, state: "Closed" }, function (err, drugreqs) {
            if (err) {
                res.send(err);
            }
            res.json(drugreqs);
        }).sort({ date: -1 });
    })

router.route('/drugreqs/:reqId/:resId')
    .put(function (req, res) {
        MedicamentRequest.findById(req.params.reqId, function (err, drugrequest) {
            if (err) {
                res.send(err);
            }
            drugrequest.state = "Closed";
            drugrequest.response = req.params.resId;
            drugrequest.save(function (err) {
                if (err) {
                    res.send(err);
                }
                res.json({ message: 'Bravo, mise à jour des données OK' });
            });
        });
    })

router.route('/drugreps/:resId/:distance')
    .put(function (req, res) {
        MedicamentResponse.findById(req.params.resId, function (err, drugres) {
            if (err) {
                res.send(err);
            }
            drugres.distance = req.params.distance;

            drugres.save(function (err) {
                if (err) {
                    res.send(err);
                }
                res.json({ message: 'Fetching Distance' });
            });
        });
    })

router.route('/notification/:notId/:state')
    .put(function (req, res) {
        requestNotification.where('patient', req.params.notId).updateOne({ $set: { state: req.params.state } }, function (err, count) { res.status(201).send(count); });
    })

router.route('/stat/region/northeast')
    .get(function (req, res) {
        MedicamentRequest.countDocuments({ $or: [{ city: "Bizerte" }, { city: "Tunis" }, { city: "Ariana" }, { city: "Manouba" }, { city: "Ben Arous" }, { city: "Zaghouan" }, { city: "Nabeul" }] })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/region/northwest')
    .get(function (req, res) {
        MedicamentRequest.countDocuments({ $or: [{ city: "Jendouba" }, { city: "Béja" }, { city: "El Kef" }, { city: "Siliana" }] })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/region/Centereast')
    .get(function (req, res) {
        MedicamentRequest.countDocuments({ $or: [{ city: "Sousse" }, { city: "Monastir" }, { city: "Mahdia" }] })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/region/Centerwest')
    .get(function (req, res) {
        MedicamentRequest.countDocuments({ $or: [{ city: "Kairouan" }, { city: "Kasserine" }, { city: "Sidi Bouzid" }] })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/region/Southeast')
    .get(function (req, res) {
        MedicamentRequest.countDocuments({ $or: [{ city: "Sfax" }, { city: "Gabès" }, { city: "Médenine" }, { city: "Tataouine" }] })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/region/Southwest')
    .get(function (req, res) {
        MedicamentRequest.countDocuments({ $or: [{ city: "Gafsa" }, { city: "Tozeur" }, { city: "Kébili" }] })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/age/0-11')
    .get(function (req, res) {

        MedicamentRequest.countDocuments({ dateB: { "$gte": new Date(2009, 1, 1) } })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/age/12-19')
    .get(function (req, res) {

        MedicamentRequest.countDocuments({ dateB: { "$gte": new Date(2001, 1, 1), "$lt": new Date(2009, 1, 1) } })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/age/20-59')
    .get(function (req, res) {

        MedicamentRequest.countDocuments({ dateB: { "$gte": new Date(1961, 1, 1), "$lt": new Date(2001, 1, 1) } })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/age/60')
    .get(function (req, res) {

        MedicamentRequest.countDocuments({ dateB: { "$lt": new Date(1961, 1, 1) } })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/pending')
    .get(function (req, res) {

        MedicamentRequest.countDocuments({ state: "Pending" })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/closed')
    .get(function (req, res) {

        MedicamentRequest.countDocuments({ state: "Closed" })
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/all')
    .get(function (req, res) {

        MedicamentRequest.countDocuments({})
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/drug')
    .get(function (req, res) {

        MedicamentRequest.aggregate([
            {
                $match: { image: "pill-png-2" }
            },
            {
                $group: {
                    _id: "$medicament",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },

        ]).limit(1).exec(function (err, docs) {
            res.json(docs);
        });

    })

router.route('/stat/city')
    .get(function (req, res) {

        MedicamentRequest.aggregate([
            {
                $group: {
                    _id: "$city",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
        ]).limit(1).exec(function (err, docs) {
            res.json(docs);
        });

    })

router.route('/stat/patients')
    .get(function (req, res) {

        Patient.countDocuments({})
            .exec(function (err, docs) {
                res.json(docs);
            });
    })

router.route('/stat/pharmacies')
    .get(function (req, res) {

        Pharmacy.countDocuments({})
            .exec(function (err, docs) {
                res.json(docs);
            });
    })



router.route('/notifications/:id')
    .get(function (req, res) {
        requestNotification.find({ patient: req.params.id }, function (err, drugreqs) {
            if (err) {
                res.send(err);
            }
            res.json(drugreqs);
        });
    })

router.route('/notification/:idPat/:state').post(async function (req, res) {

    var not = new requestNotification();
    not.patient = req.params.idPat;
    not.state = req.params.state;
    try {
        await not.save();
        res.status(201).send(not);
    } catch (e) {
        res.status(400).send(e)
    }
})


router.route('/DrugResponse/:id')
    .get(function (req, res) {
        MedicamentResponse.find({ _id: req.params.id }, function (err, drugreqs) {
            if (err) {
                res.send(err);
            }
            res.json(drugreqs);
        }).sort([['distance', -1]]);
    })


module.exports = router