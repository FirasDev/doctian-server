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
const AnalysisResult = require('../models/analysisResult')

const router = new express.Router()

//////////////////
// Check All Analysis Requests
//////////////////
router.get('/laboratory/analysis/', auth, async (req, res) => {
    try {
        const laboratory = await Laboratory.findByUser(req.user.id)
        await laboratory.populate('analyses').execPopulate()
        res.status(200).send(laboratory.analyses)
    } catch (e) {
        res.status(500).send(e)
    }
})


//////////////////
// Analyse Accept/Reject/Start/Ended an Analyse  
//////////////////
router.patch('/laboratory/analysis/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['status']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid update!' })
    }
    try {
        const analysis = await Analysis.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        if (!analysis) {
            res.status(404).send()
        }
        res.status(204).send(analysis)
    } catch (e) {
        res.status(400).send(e)
    }
})



//////////////////
// Create Analysis Process(AnalysisResult) For Analyse  
//////////////////
router.post('/laboratory/analysis/:id', auth, async (req, res) => {
    const analysis = await Analysis.find({_id : req.params.id})
    
    const analysisResult = new AnalysisResult({
        ...req.body,
        analysis: analysis._id,
    })
    try {
        await analysisResult.save()
        res.status(201).send(analysis)
    } catch (e) {
        res.status(400).send(e)
    }
})


module.exports = router
