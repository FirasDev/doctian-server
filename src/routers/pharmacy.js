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
router.route('/Pharmacy/Medicament/:city')
    .get(function (req, res) {
        MedicamentRequest.find({ city: req.params.city }, function (err, drugreqs) {
            if (err) {
                res.send(err);
            }
            res.json(drugreqs);
        }).sort({ date: -1 });
    })


//////////////////
// Accept/Reject Medicament Request (Create Medicament Response)
//////////////////
router.post('/pharmacy/medicaments/request/:id/:idphar', async (req, res) => {
    const pharmacy = await Pharmacy.findByUser(req.params.idphar)
    const user = await User.findById(pharmacy.owner)
    const medicamentResponse = new MedicamentResponse({
        address: user.address,
        name: pharmacy.name,
        state: "Accepted",
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
