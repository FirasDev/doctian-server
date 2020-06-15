const express = require('express')
const auth = require('../middleware/auth')
const NodeGeocoder = require('node-geocoder');
var dateFormat = require('dateformat');

const fs = require('fs');
const mime = require('mime');

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



router.get('/', async (req, res) => {
    //const users = await User.find({})
    //res.send(users)
    res.redirect('/web/patient/')
})

//////////////////
// Login w
//////////////////
router.post('/users/login', async (req, res) => {
    console.log('Enter login')
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()

        switch (user.role) {
            case 'Patient':
                const patient = await Patient.findByUser(user._id)
                res.send({ user, token, patient })
                break;
            case 'Doctor':
                const doctor = await Doctor.findByUser(user._id)
                res.send({ user, token, doctor })
                break;
            case 'Laboratory':
                const lab = await Laboratory.findByUser(user._id)
                res.send({ user, token, lab })
                break;
            case 'Pharmacy':
                const pharmacy = await Pharmacy.findByUser(user._id)
                res.send({ user, token, pharmacy })
                break;
            case 'Pharmaceutical company':
                console.log('Enter PH C')
                const pharmaceuticalCompany = await PharmaceuticalCompany.findByUser(user._id)
                res.send({ user, token, pharmaceuticalCompany })
                break;
        }


        //res.send({ user, token , patient})
    } catch (e) {
        res.status(400).send()
    }
})

//////////////////
// SignUp As User 
//////////////////
router.post('/users', async (req, res) => {
    console.log(req.body)
    const user = new User(req.body)
    try {
        try {
            const res = await geoCoder.reverse({ lat: user.latitude, lon: user.longitude });
            console.log(res[0])
            user.country = res[0].country;
            user.city = res[0].state;
            if (res[0].formattedAddress != null) {
                user.address = res[0].formattedAddress;
            } else {
                user.address = res[0].streetName;
            }
            user.zipCode = res[0].zipcode;
        } catch (em) {
            console.log('GeoCoder Failed To Get Address')
        }
        await user.save()
        const token = await user.generateAuthToken()
        res.status(201).send({ user, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

//////////////////
// Complete Register As [Patient/Doctor/Laboratory/Pharmacy/Pharmaceutical company]
////////////////// 
router.post('/users/register', auth, async (req, res) => {
    var user;
    if (req.user.role == "Doctor") {
        user = new Doctor({
            ...req.body,
            owner: req.user._id
        })
    }
    if (req.user.role == "Patient") {
        user = new Patient({
            ...req.body,
            owner: req.user._id
        })
    }
    if (req.user.role == "Laboratory") {
        user = new Laboratory({
            ...req.body,
            owner: req.user._id
        })
    }
    if (req.user.role == "Pharmacy") {
        user = new Pharmacy({
            ...req.body,
            owner: req.user._id
        })
    }
    if (req.user.role == "Pharmaceutical company") {
        user = new PharmaceuticalCompany({
            ...req.body,
            owner: req.user._id
        })
    }
    try {
        await user.save()
        await user.populate('owner').execPopulate()

        ///////
        if (user.owner.role == "Patient") {
            var not = new requestNotification();
            not.patient = user._id;
            not.state = 'false';
            await not.save();
        }
        console.log("Register DONE")
        res.status(201).send(user)
    } catch (e) {
        res.status(400).send(e)
    }
})



// LogOut 

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send()
    } catch (error) {
        res.status(500).send()
    }
})

/// Get User By Token
router.get('/users', auth, async (req, res) => {
    const user = await User.findById(req.user._id)
    console.log("Get User By Token")
    console.log(user.id)
    switch (user.role) {
        case 'Patient':
            const patient = await Patient.findByUser(user.id)
            res.send({ user, patient })
            console.log({ user, patient })
            break;
        case 'Doctor':
            const doctor = await Doctor.findByUser(user.id)
            res.send({ user, doctor })
            break;
    }
    //res.status(200).send({ user, patient })
})


// Upload Avatar

router.post("/users/avatar", auth, async (req, res) => {
    console.log("Etape 1")

    // if (!req.files || Object.keys(req.files).length === 0) {
    //     return res.status(400).send('No files were uploaded.');
    // }
    // // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
    // let sampleFile = req.files.file;
    // //var filename = req.user._id + "." + dateFormat(Date.now(), "yyyy-mm-dd-hh.MM.ss") + '.jpg';
    // var filename = dateFormat(Date.now(), "yyyy-mm-dd-hh.MM.ss") + '.jpg';
    // // Use the mv() method to place the file somewhere on your server
    // await sampleFile.mv('./uploads/' + filename, function (err) {
    //     if (err)
    //         return res.status(500).send(err);
    //     console.log('File uploaded!');
    // });

    // var img = filename;
    // console.log("Upload Etap 2")


    // connection.query('INSERT INTO `question` ( `title`, `img`) VALUES (?,?)', [title, "img"], function (err, result, field) {
    //     connection.on('error', function (err) {
    //         console.log('MySQL Error', err);
    //         res.json('Question Error', err);
    //     });
    //     console.log("Enter 3")
    //     res.json('Question Added');
    // });

    if (!req.body.file || Object.keys(req.body.file).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    var base64Data = req.body.file.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    var fileName = req.user._id + "." + dateFormat(Date.now(), "yyyy-mm-dd-hh.MM.ss") + '.jpg';
    try {
        fs.writeFileSync("./uploads/" + fileName, base64Data, 'base64');
        req.user.avatar = fileName;
        await req.user.save();
        return res.status(200).send({ "status": "success", "ImageName": fileName });
    } catch (e) {
        next(e);
    }

    res.status(200).send("faile")
});

// Update User Account 
router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['email', 'password', 'latitude', 'longitude']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))
    const user = new User(req.body)
    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' })
    }
    try {
        try {
            const res = await geoCoder.reverse({ lat: user.latitude, lon: user.longitude });
            req.user.country = res[0].country;
            req.user.city = res[0].state;
            if (res[0].formattedAddress != null) {
                req.user.address = res[0].formattedAddress;
            } else {
                req.user.address = res[0].streetName;
            }
            req.user.zipCode = res[0].zipcode;
        } catch (em) {
            console.log('GeoCoder Failed To Get Address')
        }
        updates.forEach((update) => req.user[update] = req.body[update])
        await req.user.save()
        res.status(200).send(req.user)
    } catch (e) {
        res.status(400).send(e)
    }
})



// Get Image
router.get("/users/img/:img", (req, res, next) => {
    var img = './uploads/' + req.params.img;
    console.log(img);
    res.sendfile(img);
});

module.exports = router