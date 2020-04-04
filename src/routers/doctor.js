const express = require('express')
const auth = require('../middleware/auth')

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

const router = new express.Router()

//////////////////
// Check All Patient Perscriptions
//////////////////
router.get('/doctor/patient/perscriptions/:id', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.params.id)
        await patient.populate('perscriptions').execPopulate()
        res.status(200).send(patient.perscriptions)
    } catch (e) {
        res.status(500).send(e)
    }
})

//////////////////
// Check All Patient Notes
//////////////////
router.get('/doctor/patient/notes/:id', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.params.id)
        await patient.populate('notes').execPopulate()
        res.status(200).send(patient.notes)
    } catch (e) {
        res.status(500).send(e)
    }
})

//////////////////
// Check All Patient Ended Analysis Requests 
//////////////////
router.get('/doctor/patient/analysisended/:id', auth, async (req, res) => {
    try {
        //const patient = await Patient.findByUser(req.params.id)

        const analyses = await Analysis.find({ 'patient': req.params.id, 'status': "Ended" })
        console.log(analyses.length)

        if (analyses.length == 0) {
            return res.status(404).send()
        }

        res.status(200).send(analyses)
    } catch (e) {
        res.status(500).send(e)
    }
})


//////////////////
// Create Analyse Request
//////////////////
router.post('/doctor/patient/analysis/:id', auth, async (req, res) => {
    
    const doctor = await Doctor.findByUser(req.user.id)
    console.log(req.params.id)

    //console.log(patient._id)
    const analysis = new Analysis({
        ...req.body,
        patient: req.params.id,
        doctor: doctor._id
    })
    try {
        await analysis.save();
        res.status(201).send(analysis);
    } catch (e) {
        res.status(500).send(e);
    }
})

//////////////////
// Check All Analysis Requests Of Patient By Doctor 
//////////////////
router.get('/doctor/patient/analysis/:id', auth, async (req, res) => {
    try {
        
        const doctor = await Doctor.findByUser(req.user.id)
        console.log(req.params.id);
        console.log(doctor._id)
        console.log(req.user.id)
        const analyses = await Analysis.find({ 'doctor': doctor._id, 'patient': req.params.id })
        if (!analyses) {
            return res.status(404).send()
        }
        res.status(200).send(analyses)
    } catch (e) {
        res.status(500).send(e)
    }
})


//////////////////
// Check Ended Analysis Requests Of Patient By Doctor 
//////////////////
router.get('/doctor/patient/analysisresult/:id', auth, async (req, res) => {
    try {
        const doctor = await Doctor.findByUser(req.user.id)
        const analyses = await Analysis.find({ 'status': "Ended", 'doctor': doctor._id, 'patient': req.params.id })
        if (!analyses) {
            return res.status(404).send()
        }
        res.status(200).send(analyses)
    } catch (e) {
        res.status(500).send(e)
    }
})

//////////////////
// Check All Appointments
//////////////////
router.get('/doctor/appointments/', auth, async (req, res) => {
    try {
        const doctor = await Doctor.findByUser(req.user.id)
        await doctor.populate('appointments').execPopulate()
        res.status(200).send(doctor.appointments)
    } catch (e) {
        res.status(400).send(e)
    }
})


//////////////////
// Patient Accept/Reject/Reschedule an Appointment  
//////////////////
//----------------> Not Completed
router.patch('/doctor/appointment/:id', auth, async (req, res) => {
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
// Check All Perscriptions Of Patient By Doctor 
//////////////////
router.get('/doctor/patient/docperscriptions/:id', auth, async (req, res) => {

    const doctor = await Doctor.findByUser(req.user.id)
    try {
        const perscriptions = await Perscription.find({ 'doctor': doctor._id , 'patient': req.params.id })
        if (!perscriptions) {
            return res.status(404).send()
        }
        res.status(200).send(perscriptions)
    } catch (e) {
        res.status(500).send(e)
    }
})

//////////////////
// Check All Notes Of Patient By Doctor 
//////////////////
router.get('/doctor/patient/docnotes/:id', auth, async (req, res) => {

    const doctor = await Doctor.findByUser(req.user.id)
    try {
        const notes = await Notes.find({ 'doctor': doctor_id, 'patient': req.params.id })
        if (!notes) {
            return res.status(404).send()
        }
        res.status(200).send(notes)
    } catch (e) {
        res.status(500).send(e)
    }
})

//////////////////
// Create a Prescription For a Patient
//////////////////
router.post('/doctor/patient/perscriptions/:id', auth, async (req, res) => {
    const doctor = await Doctor.findByUser(req.user.id)

    const perscription = new Perscription({
        ...req.body,
        patient: req.params.id,
        doctor: doctor._id
    })
    try {
        await perscription.save();
        res.status(201).send(perscription);
    } catch (e) {
        res.status(500).send(e);
    }
})



module.exports = router