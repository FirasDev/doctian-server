const express = require('express')
const passport = require('passport')
var dateFormat = require('dateformat');
const moment = require('moment')


const User = require('../models/user')
const Doctor = require('../models/doctor')
const Pharmacy = require('../models/pharmacy')
const Patient = require('../models/patient')
const Laboratory = require('../models/laboratory')
const PharmaceuticalCompany = require('../models/pharmaceuticalCompany')
const requestNotification = require('../models/requestNotification')
const MedicamentRequest = require('../models/medicamentRequest')
const MedicamentResponse = require('../models/medicamentResponse')

const router = new express.Router()




//////////////////
// Pharmacy Request [Index] Page
//////////////////
router.get('/web/pharmacy/', authenticationMiddleware(), async (req, res) => {

    console.log(req.user)

    //const medicamentRequest = await  MedicamentRequest.find({ city: req.user.city }).sort({ date: -1 });
    const medicamentRequest = await MedicamentRequest.find({ city: req.user.city, image: 'pill-png-2' }).sort({ date: -1 });
    const prescriptionRequest = await MedicamentRequest.find({ city: req.user.city, image: 'Prescription' }).sort({ date: -1 });
    const pharmacy = await Pharmacy.findByUser(req.user.id)





    for (var i = 0; i < medicamentRequest.length; i++) {
        await medicamentRequest[i].populate('patient').execPopulate();
        // if(medicamentRequest[i].perscription != null )
        //     await medicamentRequest[i].populate('perscription').execPopulate();
        //await analyses[i].doctor.populate('owner').execPopulate();
        await medicamentRequest[i].patient.populate('owner').execPopulate();
        // if(medicamentRequest[i].perscription != null )
        var medicamentRq = medicamentRequest[i].toObject();
        var medicamentResp = await MedicamentResponse.find({ 'pharmacy': pharmacy._id, 'medicamentRequest': medicamentRequest[i]._id });
        medicamentRq.action = true;
        if (medicamentResp.length > 0) {
            medicamentRq.action = false;
        }
        medicamentRq.createDate = medicamentRequest[i]._id.getTimestamp();
        medicamentRequest[i] = medicamentRq;

        console.log("Medicament Request : " + i + " - " + medicamentRequest[i].action)
    }


    for (var i = 0; i < prescriptionRequest.length; i++) {
        await prescriptionRequest[i].populate('patient').execPopulate();
        console.log(i + " - " + prescriptionRequest[i].perscription)
        await prescriptionRequest[i].patient.populate('owner').execPopulate();
        if (prescriptionRequest[i].perscription != null)
            await prescriptionRequest[i].populate('perscription').execPopulate();
        await prescriptionRequest[i].perscription.populate('doctor').execPopulate();
        await prescriptionRequest[i].perscription.doctor.populate('owner').execPopulate();
        var prescriptionRq = prescriptionRequest[i].toObject();
        var medicamentResp = await MedicamentResponse.find({ 'pharmacy': pharmacy._id, 'medicamentRequest': prescriptionRequest[i]._id });
        prescriptionRq.action = true;
        if (medicamentResp.length > 0) {
            prescriptionRq.action = false;
        }
        prescriptionRq.createDate = prescriptionRequest[i]._id.getTimestamp();
        prescriptionRequest[i] = prescriptionRq;
        console.log("Medicament Request : " + i + " - " + prescriptionRequest[i])
    }



    res.render('./pharmacy/index.ejs', { medicamentRequest: medicamentRequest, prescriptionRequest: prescriptionRequest, moment: moment })
})

router.get('/web/pharmacy/medicaments/request/:id/', authenticationMiddleware(), async (req, res) => {
    const pharmacy = await Pharmacy.findByUser(req.user.id)
    const medReq = await MedicamentRequest.findById(req.params.id)
  
    const filter = { patient: medReq.patient };
    const update = { state: true };
    
    // `doc` is the document _after_ `update` was applied because of
    // `returnOriginal: false`
    let doc = await requestNotification.findOneAndUpdate(filter, update, {
      returnOriginal: false
    });

 
    //const user = await User.findById(pharmacy.owner)
    
  
    const medicamentResponse = new MedicamentResponse({
        address: req.user.address,
        name: pharmacy.name,
        state: "Accepted",
        pharmacy: pharmacy._id,
        medicamentRequest: req.params.id
    })
    try {
        await medicamentResponse.save();
        res.redirect('/web/pharmacy/accepted')
    } catch (e) {
        res.redirect('/web/error/')
    }
})


//////////////////
// Pharmacy Request Accepted Page
//////////////////
router.get('/web/pharmacy/accepted', authenticationMiddleware(), async (req, res) => {
    const pharmacy = await Pharmacy.findByUser(req.user.id)


    const medicamentResponces = await MedicamentResponse.find({ 'pharmacy': pharmacy._id });

    for (var i = 0; i < medicamentResponces.length; i++) {
        await medicamentResponces[i].populate('medicamentRequest').execPopulate();

        if (medicamentResponces[i].medicamentRequest.image != 'pill-png-2') {
            await medicamentResponces[i].medicamentRequest.populate('perscription').execPopulate();
            await medicamentResponces[i].medicamentRequest.perscription.populate('doctor').execPopulate();
        }
        //await analyses[i].doctor.populate('owner').execPopulate();
        await medicamentResponces[i].medicamentRequest.populate('patient').execPopulate();
        var medicamentRep = medicamentResponces[i].toObject();
        medicamentRep.createDate = medicamentResponces[i]._id.getTimestamp();
        medicamentResponces[i] = medicamentRep;
        console.log("Medicament Request : " + i + " - " + medicamentResponces[i])
    }




    res.render('./pharmacy/accepted.ejs', { medicamentResponces: medicamentResponces, moment: moment })
})



//////////////////
// Pharmacy Request Finished Page
//////////////////
router.get('/web/pharmacy/finished', authenticationMiddleware(), async (req, res) => {
    const pharmacy = await Pharmacy.findByUser(req.user.id)
    console.log(req.user)

    //const medicamentRequest = await  MedicamentRequest.find({ city: req.user.city }).sort({ date: -1 });
    //const medicamentRequest = await MedicamentRequest.find({ 'state': 'Closed', 'response':  }).sort({ date: -1 });

    const medicamentResponces = await MedicamentResponse.find({ 'pharmacy': pharmacy._id })
    let medicamentRequest = [];
    for (var i = 0; i < medicamentResponces.length; i++) {
        await medicamentResponces[i].populate('medicamentRequest').execPopulate();
        await medicamentResponces[i].medicamentRequest.populate('patient').execPopulate();
        if (medicamentResponces[i].medicamentRequest.image != 'pill-png-2') {
            await medicamentResponces[i].medicamentRequest.populate('perscription').execPopulate();
            await medicamentResponces[i].medicamentRequest.perscription.populate('doctor').execPopulate();
        }
        if (medicamentResponces[i].medicamentRequest.response == medicamentResponces[i]._id) {

            medicamentRequest.push(medicamentResponces[i].medicamentRequest)
        }
    }


    res.render('./pharmacy/finished.ejs', { medicamentRequest: medicamentRequest })
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