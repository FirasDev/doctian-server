const express = require('express')
const passport = require('passport')
const NodeGeocoder = require('node-geocoder');



const User = require('../models/user')
const Doctor = require('../models/doctor')
const Pharmacy = require('../models/pharmacy')
const Patient = require('../models/patient')
const Laboratory = require('../models/laboratory')
const PharmaceuticalCompany = require('../models/pharmaceuticalCompany')
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
// Index Page
//////////////////
router.get('/web/', async (req, res) => {
    console.log('Enter Home Page')
    res.render('./index.ejs')
})


//////////////////
// 500 Error Page
//////////////////
router.get('/web/error', async (req, res) => {
    res.render('./error-500.ejs')
})

//////////////////
// 404 Error Page
//////////////////
router.get('/web/notfound', async (req, res) => {
    res.render('./error-404.ejs')
})


//////////////////
// Login Page
//////////////////
router.get('/web/login/', isNotauthenticatedMiddleware(), async (req, res) => {
    res.render('./login.ejs')
})


//////////////////
// Login Out Page
//////////////////
router.get('/web/logout/', async (req, res) => {
    req.logout();
    req.session.destroy();
    res.redirect('/web/')
})


router.get('/web/redirect/', authenticationMiddleware(), async (req, res) => {

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

})

router.post('/web/login/', passport.authenticate('local',
    {
        successRedirect: '/web/redirect/',
        failureRedirect: '/web/login/',
        failureFlash: true
    }))





//////////////////
// Register Page
//////////////////
router.get('/web/register', isNotauthenticatedMiddleware(), async (req, res) => {
    res.render('./register.ejs')
})

router.post('/web/register/', isNotauthenticatedMiddleware(), async (req, res) => {
    try {
        const result = await geoCoder.reverse({ lat: req.body.latitude, lon: req.body.longitude });
        //console.log(result[0])
        req.session.email = req.body.email;
        req.session.password = req.body.password;
        req.session.role = req.body.role;
        req.session.phone = req.body.phone;
        //res.render('./register-step2.ejs', { city: result[0].state })
        res.render('./register-step2.ejs', { country: result[0].country, city: result[0].state, zipcode: result[0].zipcode, address: result[0].formattedAddress })
    } catch (error) {
        console.log('Error GeoCoder')
        res.redirect('/web/register/step-1')
    }
})

router.post('/web/register/final', authenticationMiddleware(), async (req, res) => {

    const user = new User({
        email: req.session.email,
        password: req.session.password,
        role: req.session.role,
        phoneNumber: req.session.phone,
    })
    try {
        try {
            var result = await geoCoder.geocode(req.body.address);
            console.log("---------------> " + result[0])
            if (!result[0].latitude) {
                console.log('Enter Condition / Address Fail ')
                result = await geoCoder.reverse({ lat: req.body.latitude, lon: req.body.longitude });
            }
            user.latitude = result[0].latitude;
            user.longitude = result[0].longitude;
            user.country = result[0].country;
            user.city = result[0].state;
            if (result[0].formattedAddress != null) {
                user.address = result[0].formattedAddress;
            } else {
                user.address = result[0].streetName;
            }
            user.zipCode = result[0].zipcode;
        } catch (em) {
            console.log('GeoCoder Failed To Get Address')
        }

        user.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log('user: ' + user.email + " saved.");
                req.login(user, function (err) {
                    if (err) {
                        console.log(err);
                    }
                    return res.redirect('/web/patient/');
                });
            }
        });
        // await user.save()
        // res.login(user, function (err) {
        //     //console.log(user)
        //     res.redirect('/web/patient/')
        //     // switch (user.role) {
        //     //     case 'Patient':
        //     //         //res.redirect('/web/patient/register/profile')
        //     //         res.redirect('/web/patient/')
        //     //         break;
        //     //     case 'Doctor':
        //     //         res.redirect('/web/doctor/register/profile')
        //     //         break;
        //     //     case 'Laboratory':
        //     //         res.redirect('/web/laboratory/register/profile')
        //     //         break;
        //     //     case 'Pharmacy':
        //     //         res.redirect('/web/pharmacy/register/profile')
        //     //         break;
        //     //     case 'Pharmaceutical company':
        //     //         res.redirect('/web/Pharmaceuticalcompany/register/profile')
        //     //         break;
        //     // }
        // })

    } catch (e) {
        console.log('FAIL Register')
        res.redirect('/web/login/')
    }
    //res.render('./register-step2.ejs', { country: result[0].country, city: result[0].state, zipcode: result[0].zipcode, address: result[0].formattedAddress })
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
            console.log('Login In ---> ' + req.user.role)
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