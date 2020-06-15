const express = require('express')
const passport = require('passport')
var dateFormat = require('dateformat');
const moment = require('moment')
var FormData = require("form-data");
const axios = require("axios");

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

const router = new express.Router()


    const CERTIF_SERVER = "http://localhost:3066/";


//////////////////////////////



//////////////////
// Doctor Home Page
//////////////////
router.get('/web/doctor/', authenticationMiddleware(), async (req, res) => {
    console.log(req.user)
    var patients = [];
    try {
        const doctor = await Doctor.findByUser(req.user.id)
        const appointments = await Appointment.find({ 'doctor': doctor._id })
        const doctors = await Doctor.find()
        var _accepted = 0;
        var _rejected = 0;
        var _pending = 0;
        var _waiting = 0;
        for (var i = 0; i < doctors.length; i++) {
            await doctors[i].populate('owner').execPopulate();
            var myDoc = doctors[i].toObject();
            doctors[i] = myDoc;
        }
        console.log("/////////////");
        console.log(doctors);
        console.log("////////////////");
        for (var i = 0; i < appointments.length; i++) {
            await appointments[i].populate('patient').execPopulate();
            await appointments[i].patient.populate('owner').execPopulate();
            //await appointments[i].doctor.populate('owner').execPopulate();
            var appointment = appointments[i].toObject();
            appointment.createDate = appointments[i]._id.getTimestamp();
            switch (appointments[i].appointmentStatus){
                case "Accepted" : _accepted++;
                    break;
                case "Waiting" : _waiting++;
                    break;
                case "Pending" : _pending++;
                    break;
                case "Rejected" : _rejected++;
                    break;
            }
            appointments[i] = appointment ;
            patient = await Patient.findById(appointment.patient._id)
            await patient.populate('owner').execPopulate()
            if (appointment.appointmentStatus == "Accepted"){
                patients.push(patient);
            }
            console.log("Appointment : " + i + " - " + appointments[i])
        }
        var appStats = [_waiting, _accepted, _pending, _rejected ];
    res.render('./doctor/index.ejs', { app: appointments, stats: appStats, moment: moment, docs: doctors, myPatients: patients})
    } catch (e) {
        res.redirect('/web/error/')
    }
})


//////////////////
// Doctor appointments
//////////////////
router.get('/web/doctor/appointments', authenticationMiddleware(), async (req, res) => {
    console.log(req.user)
    try {
        const doctor = await Doctor.findByUser(req.user.id)
        const appointments = await Appointment.find({ 'doctor': doctor._id })
        for (var i = 0; i < appointments.length; i++) {
            await appointments[i].populate('patient').execPopulate();
            await appointments[i].populate('doctor').execPopulate();
            var appointment = appointments[i].toObject();
            appointment.createDate = appointments[i]._id.getTimestamp();
            appointments[i] = appointment ;
            patient = await Patient.findById(appointment.patient._id)
            await patient.populate('owner').execPopulate()
            appointments[i].patient = patient;
            console.log("Appointment : " + i + " - " + appointments[i])
        }
        res.render('./doctor/appointments.ejs', { app: appointments, moment: moment})
    } catch (e) {
        res.redirect('/web/error/')
    }
})


//////////////////
// Doctor's patients
//////////////////
router.get('/web/doctor/patients', authenticationMiddleware(), async (req, res) => {

    var patients = [];
    try {
        const doctor = await Doctor.findByUser(req.user.id)
        const appointments = await Appointment.find({ 'doctor': doctor._id })
        for (var i = 0; i < appointments.length; i++) {
            await appointments[i].populate('patient').execPopulate();
            //await appointments[i].doctor.populate('owner').execPopulate();
            var appointment = appointments[i].toObject();
            appointment.createDate = appointments[i]._id.getTimestamp();
            appointments[i] = appointment ;
            patient = await Patient.findById(appointment.patient._id)
            await patient.populate('owner').execPopulate()
            if (appointment.appointmentStatus == "Accepted"){
                patients.push(patient);
            }
            console.log("Appointment : " + i + " - " + appointment)
        }
        res.render('./doctor/patients.ejs', { patients: patients, moment: moment})
    } catch (e) {
        res.redirect('/web/error/')
    }
})


//////////////////
// Upcoming Appointments 
//////////////////
router.get('/web/doctor/schedule', authenticationMiddleware(), async (req, res) => {

    try {
        const doctor = await Doctor.findByUser(req.user.id)
        var now = moment().startOf('day')
        const appointments = await Appointment.find({ 'doctor': doctor._id, 'appointmentStatus' : { "$regex": "Accepted" }, 'appointmentDate': { $gte: now.toDate() }})
        for (var i = 0; i < appointments.length; i++) {
            await appointments[i].populate('patient').execPopulate();
            //await appointments[i].doctor.populate('owner').execPopulate();
            var appointment = appointments[i].toObject();
            appointment.createDate = appointments[i]._id.getTimestamp();
            appointments[i] = appointment;
            patient = await Patient.findById(appointment.patient._id)
            await patient.populate('owner').execPopulate()
            appointments[i].patient = patient;
            console.log("Appointment : " + i + " - " + appointments[i])
        }
        res.render('./doctor/schedule.ejs', { app: appointments, moment: moment})
    } catch (e) {
        res.redirect('/web/error/')
    }
})

//////////////////
// Doctor Profile Register Page
//////////////////
router.get('/web/doctor/verify', async (req, res) => {
    res.render('./doctor/verify.ejs')
  })



router.post('/doctor/verif', async (req, res) => {
    console.log(req.files.upfile)
    // console.log(req.body.language)

    try {
        const form_data = new FormData();
        form_data.append("file", req.files.upfile.data, req.body.language+".jpg");
        const request_config = {
          headers: {
            "Content-Type": "multipart/form-data",
            ...form_data.getHeaders(),
          },
        };
        result = await axios.post(
          CERTIF_SERVER + "verif_doc",
          form_data,
          request_config
        );
        console.log(result.data)
        console.log(req.body.language+".jpg")
        if (result.data == "Verified"){
            res.redirect('/web/doctor')
        }{
            res.render('./doctor/verify.ejs')
        }
      } catch (e) {
        res.redirect('/web/error/')
      }
  })  
  
//////////////////
// Upcoming Appointments 
//////////////////
router.get('/web/doctor/addAppointment', authenticationMiddleware(), async (req, res) => {

    res.render('./doctor/add-appointment.ejs')
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
        console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

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