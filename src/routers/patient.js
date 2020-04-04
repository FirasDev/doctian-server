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
const MedicamentRequest = require('../models/medicamentRequest')
const MedicamentResponse = require('../models/medicamentResponse')

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
    try {
        const patient = await Patient.findByUser(req.user.id)
        await patient.populate('analyses').execPopulate()
        res.status(200).send(patient.analyses)
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
    try {
        await appointment.save();
        res.status(201).send(appointment);
    } catch (e) {
        res.status(400).send(e)
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
// Check Upcoming Appointments
//////////////////
//----------------> Not Completed
router.get('/patient/appointments/upcoming', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        await patient.populate('analyses').execPopulate()

        const appointments = await Appointment.find({ /* 'appointmentDate' : Date.now , */ 'patient': patient._id, 'appointmentStatus': "Accepted" })

        res.status(200).send(appointments)
    } catch (e) {
        res.status(400).send(e)
    }
})

//////////////////
// Check Appointments History
//////////////////
//----------------> Not Completed
router.get('/patient/appointments/history', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        await patient.populate('analyses').execPopulate()

        const appointments = await Appointment.find({ /* 'appointmentDate' : Date.now , */ 'patient': patient._id, 'appointmentStatus': "Accepted" })

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
    try {
        const patient = await Patient.findByUser(req.user.id)

        const analyses = await Analysis.find({ 'patient': patient._id, 'status': "Ended" })
        console.log(analyses.length)

        if (analyses.length == 0) {
            return res.status(404).send()
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
    try {
        const patient = await Patient.findByUser(req.user.id)
        await patient.populate('perscriptions').execPopulate()
        res.status(200).send(patient.perscriptions)
    } catch (e) {
        res.status(500).send(e)
    }
})

/**///////[-3-]////////
/**/// Check All Notes
/**///////////////////
router.get('/patient/notes/', auth, async (req, res) => {
    try {
        const patient = await Patient.findByUser(req.user.id)
        await patient.populate('notes').execPopulate()
        res.status(200).send(patient.notes)
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


module.exports = router