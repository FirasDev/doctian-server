const express = require('express')
const passport = require('passport')
var dateFormat = require('dateformat');
const moment = require('moment')
const NodeGeocoder = require('node-geocoder');
const { getDistance, convertDistance } = require('geolib')


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


const options = {
    provider: 'openstreetmap',
    language: 'fr',
    // apiKey: 'AIzaSyAEDQcY_kTih4fEN6rnyqcKDHM7fIdvzOc', // for Mapquest, OpenCage, Google Premier
    // formatter: null // 'gpx', 'string', ...
};

let geoCoder = NodeGeocoder(options);

const router = new express.Router()



//////////////////
// Patient Notes Page
//////////////////
router.get('/web/patient/notes', authenticationMiddleware(), async (req, res) => {
    console.log("Get Notes Web ENTER")
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
        res.render('./patient/notes.ejs', { notes: notes, moment: moment })
    } catch (e) {
        res.redirect('/web/error/')
    }
})


//////////////////
// Patient Prescription Page
//////////////////
router.get('/web/patient/prescriptions', authenticationMiddleware(), async (req, res) => {
    console.log("Get Web Perscriptions ENTER")
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
        res.render('./patient/perscriptions.ejs', { perscriptions: perscriptions, moment: moment })
    } catch (e) {
        res.redirect('/web/error/')
    }
})


//////////////////
// Patient Analyses Page
//////////////////
router.get('/web/patient/analyses', authenticationMiddleware(), async (req, res) => {

    console.log("Get Analyses ENTER")
    try {
        const patient = await Patient.findByUser(req.user.id)
        const analyses = await Analysis.find({ 'patient': patient._id /*, 'status': "Ended" */ })

        // if (analyses.length == 0) {
        //     return res.redirect('/web/notfound/')
        // }

        for (var i = 0; i < analyses.length; i++) {
            await analyses[i].populate('doctor').execPopulate();
            await analyses[i].populate('laboratory').execPopulate();
            //await analyses[i].doctor.populate('owner').execPopulate();
            await analyses[i].laboratory.populate('owner').execPopulate();
            var analysis = analyses[i].toObject();
            analysis.createDate = analyses[i]._id.getTimestamp();
            analyses[i] = analysis;
            console.log("Analysis : " + i + " - " + analyses[i])
        }


        res.render('./patient/analysis.ejs', { analyses: analyses, moment: moment })
    } catch (e) {
        res.redirect('/web/error/')
    }
})




//////////////////
// Patient Profile Register Page
//////////////////
router.get('/web/patient/register', async (req, res) => {
    console.log("req.user")
    res.render('./patient/register.ejs')
})


router.post('/web/patient/register', async (req, res) => {
    try {
        console.log(req.body.date)
        const date = moment(req.body.date, 'DD/MM/YYYY').toDate();
        const patient = new Patient({
            name: req.body.name,
            lastName: req.body.lastName,
            gender: req.body.gender,
            cin: req.body.cin,
            dateOfBirth: date,
            cnssNumber: req.body.cnssNumber,
            owner: req.user._id
        })
        await patient.save();
        if (req.files.upfile) {
            var fileName = req.user._id + "." + dateFormat(Date.now(), "yyyy-mm-dd-hh.MM.ss") + '.jpg';
            var file = req.files.upfile,
                name = file.name,
                type = file.mimetype;
            var uploadpath = './uploads/' + fileName;
            file.mv(uploadpath, async function (err) {
                if (err) {
                    console.log("File Upload Failed", name, err);
                    console.log("Error Occured!")
                    res.redirect('/web/patient/register')
                }
                else {
                    console.log("File Uploaded", name);
                    res.send('Done! Uploading files')
                    console.log(req.user.avatar)
                    req.user.avatar = fileName;
                    await req.user.save();
                }
            });
        }
        else {
            console.log("No File selected !")
            res.redirect('/web/patient/register')
        };
    } catch (error) {
        console.log("Error Register Patient Complete")
        res.redirect('/web/patient/register')
    }

})



//////////////////
// Doctor Profile Page
//////////////////

router.get('/web/patient/doctor/:id', authenticationMiddleware(), async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id)
        await doctor.populate('owner').execPopulate();
        res.render('./patient/doc-profile.ejs', { doctor: doctor, moment: moment })
    } catch (e) {
        res.redirect('/web/notfound/')
    }
})


//////////////////
// AI Appointement Auto-System
//////////////////

function compareDayString(days, blockeDays) {
    const index = blockeDays.indexOf(days.toUpperCase());
    if (index > -1) {
        return true;
    } else {
        return false;
    }

}
function compareTimeString(dateTimeA, dateTimeB) {
    var momentA = dateTimeA.format('LTS');
    var momentB = dateTimeB.format('LTS');
    if (momentA == momentB) return 0;
    else return -1;
}

router.get('/web/patient/doctors/appointment/:id', authenticationMiddleware(), async (req, res) => {
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
                        res.redirect('/web/patient/appointments/')
                    } catch (e) {
                        res.redirect('/web/error/')
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
                                        res.redirect('/web/patient/appointments/')
                                    } catch (e) {
                                        res.redirect('/web/error/')
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
                                    res.redirect('/web/patient/appointments/')
                                } catch (e) {
                                    res.redirect('/web/error/')
                                }
                            }

                            i++;
                            console.log('i = ' + i)

                            var date = moment(date, "HH:mm:ss", true).add(30, 'minutes');
                        }
                        operation = false;
                        //res.redirect('./patient/appointments')
                    } catch (e) {
                        res.redirect('/web/error/')
                    }
                }

            }
        }
        now = moment(now, true).add(1, 'days');
    }
})


//////////////////
// Check Upcoming Appointments Web Page
//////////////////
router.get('/web/patient/appointments/', authenticationMiddleware(), async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
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
            //console.log("Perscriptions : " + i + " - " + appointments[i])
        }
        console.log("Perscriptions :  - " + appointments.length)
        res.render('./patient/appointements.ejs', { appointments: appointments, moment: moment, title: 'Upcoming Appointments' })
    } catch (e) {
        res.redirect('/web/error/')
    }
})

//////////////////
// Check Appointments History
//////////////////
router.get('/web/patient/appointments/history', authenticationMiddleware(), async (req, res) => {
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

        console.log("Perscriptions :  - " + appointments.length)
        res.render('./patient/appointements.ejs', { appointments: appointments, moment: moment, title: 'Appointments History' })
    } catch (e) {
        res.redirect('/web/error/')
    }
})


router.post('/web/patient/appointments/delete/:id', authenticationMiddleware(), async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, 'patient': patient._id })
        if (!appointment) {
            res.redirect('/web/notfound/')
        }
        res.redirect('/web/patient/appointments/')
    } catch (e) {
        res.redirect('/web/error/')
    }
})


//////////////////
// Patient Account Setting Page
//////////////////
router.get('/web/patient/account/', authenticationMiddleware(), async (req, res) => {
    console.log(req.user)
    res.render('./patient/account-setting.ejs')
})


router.post('/web/patient/account', authenticationMiddleware(), async (req, res) => {
    try {
        console.log(req.body.latitude)
        const result = await geoCoder.reverse({ lat: req.body.latitude, lon: req.body.longitude });
        res.render('./patient/account-setting-2.ejs', { country: result[0].country, city: result[0].state, zipcode: result[0].zipcode, address: result[0].formattedAddress })
        //res.render('./patient/account-setting.ejs')
    } catch (error) {
        console.log('Error GeoCoder')
        res.redirect('/web/error/')
    }
})

//////////////////
// Patient Profile Setting Page
//////////////////
router.get('/web/patient/profile', authenticationMiddleware(), async (req, res) => {
    console.log(req.user)
    res.render('./patient/edit-profile.ejs')
})




//////////////////
// Patient All Doctors Page
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

router.get('/web/patient/doctors', authenticationMiddleware(), async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        let doctors = [];
        const users = await User.find({ country: req.user.country, role: 'Doctor' })

        const USER_COORDS = { latitude: req.user.latitude, longitude: req.user.longitude }
        for (var i = 0; i < users.length; i++) {

            var DOC_COORDS = { latitude: users[i].latitude, longitude: users[i].longitude }
            console.log({ DOC_COORDS })
            var distance = getDistance(USER_COORDS, DOC_COORDS)
            console.log(users[i]._id)
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

        res.render('./patient/doctors.ejs', { doctors: doctors })
    } catch (error) {
        console.log('Error geoCoder')
        res.redirect('/web/error/')
    }
})

//////////////////
// Patient Index Page
//////////////////
router.get('/web/patient/', authenticationMiddleware(), async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        var now = moment().startOf('day')
        const appointments = await Appointment.find({
            patient: patient._id,
            appointmentDate: {
                $gte: now.toDate()
            }
        }).limit(5)

        var notesNumber = await Notes.countDocuments({ 'patient': patient._id });
        var analysesNumber = await Analysis.countDocuments({ 'patient': patient._id });
        var prescriptionsNumber = await Perscription.countDocuments({ 'patient': patient._id });

        var appointmentsNumber = await Appointment.countDocuments({ patient: patient._id, });

        for (var i = 0; i < appointments.length; i++) {
            await appointments[i].populate('doctor').execPopulate();
            await appointments[i].doctor.populate('owner').execPopulate();
            var appointment = appointments[i].toObject();
            appointment.createDate = appointments[i]._id.getTimestamp();
            appointments[i] = appointment;
            //console.log("Perscriptions : " + i + " - " + appointments[i])
        }
        console.log("Perscriptions :  - " + appointments.length)
        res.render('./patient/index.ejs', { appointments: appointments, moment: moment, notesNumber: notesNumber, analysesNumber: analysesNumber, prescriptionsNumber: prescriptionsNumber, appointmentsNumber: appointmentsNumber })
    } catch (e) {
        res.redirect('/web/error/')
    }
})



//////////////////
// Browse Doctors By Speciality Page
//////////////////

router.get('/web/patient/doctors/:speciality', authenticationMiddleware(), async (req, res) => {
    console.log('ENter Doctorsss')
    try {
        const patient = await Patient.findByUser(req.user.id)
        let doctors = [];
        const users = await User.find({ country: req.user.country, role: 'Doctor' })
        console.log('Enter geoCoder')
        const USER_COORDS = { latitude: req.user.latitude, longitude: req.user.longitude }
        for (var i = 0; i < users.length; i++) {

            var DOC_COORDS = { latitude: users[i].latitude, longitude: users[i].longitude }
            console.log({ DOC_COORDS })
            try {
                var doctor = await Doctor.findByUser(users[i]._id)
                if (doctor.specialty == req.params.speciality.toLowerCase()) {
                    var distance = getDistance(USER_COORDS, DOC_COORDS)
                    await doctor.populate('owner').execPopulate()
                    var doctorResult = new DoctorResult(doctor, users[i].avatar, users[i].latitude, users[i].longitude, convertDistance(distance, 'km'))
                    doctors.push(doctorResult)
                }
            } catch (error) {
                console.log('Recherche FAIL')
            }
        }
        doctors.sort(function (a, b) {
            return a.distance - b.distance
        })
        res.render('./index.ejs')
        res.render('./patient/doctors.ejs', { doctors: doctors })
    } catch (error) {
        console.log('Error geoCoder')
        ///res.redirect('/web/error/')
    }
})



//////////////////
// Browse Doctors By Speciality Page
//////////////////

router.get('/web/patient/about/', async (req, res) => {
    res.render('./patient/about.ejs')
})



/////////
/////////
/////
/////  Base Functions to Load 
/////
/////////
/////////
passport.serializeUser(function (user, done) {
    done(null, user.id);
    console.log('passport serializeUser')
});

passport.deserializeUser(function (id, done) {
    done(null, user);
});
function authenticationMiddleware() {
    console.log('MiddleWare Passport ')
    return (req, res, next) => {
        //console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

        if (req.isAuthenticated()) return next();
        res.redirect('/web/login/')
    }
}

function isNotauthenticatedMiddleware() {
    console.log('is Not Authenticated Middleware')
    return (req, res, next) => {
        if (req.isAuthenticated()) {
            console.log('Login In')
            switch (req.user.role) {
                case 'Patient':
                    return res.redirect('/web/patient/')
                    break;
                case 'Doctor':
                    return res.redirect('/web/doctor/')
                    break;
                case 'Laboratory':
                    return res.redirect('/web/laboratory/')
                    break;
                case 'Pharmacy':
                    return res.redirect('/web/pharmacy/')
                    break;
                case 'Pharmaceutical company':
                    return res.redirect('/web/Pharmaceuticalcompany/')
                    break;
            }
        }
        return next()
    }
}

module.exports = router