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
// Check All Medicament Request
//////////////////
router.get('/pharmacy/medicaments/request/', auth, async (req, res) => {
    try {
        const medicamentRequests = await MedicamentRequest.find({})
        if(medicamentRequests.length == 0){
            res.status(404).send()
        }
        res.status(200).send(medicamentRequests)
    } catch (e) {
        res.status(500).send(e)
    }
})


//////////////////
// Accept/Reject Medicament Request (Create Medicament Response)
//////////////////
router.post('/pharmacy/medicaments/request/:id', auth, async (req, res) => {
    const pharmacy = await Pharmacy.findByUser(req.user.id)
    
    const medicamentResponse = new MedicamentResponse({
        ...req.body,
        pharmacy: pharmacy._id,
        medicamentRequest: req.params.id
    })

    try {
        await medicamentResponse.save();
        res.status(201).send(medicamentResponse);
    } catch (e) {
        res.status(500).send(e)
    }
})


module.exports = router
