const express = require('express')
const auth = require('../middleware/auth')

const User = require('../models/user')
const Doctor = require('../models/doctor')
const Pharmacy = require('../models/pharmacy')
const Patient = require('../models/patient')
const Laboratory = require('../models/laboratory')
const PharmaceuticalCompany = require('../models/pharmaceuticalCompany')


const router = new express.Router()



router.get('/test', auth, async (req, res) => {
    const users = await User.find({})
    res.send(users)
})

//////////////////
// Login w
//////////////////
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (e) {
        res.status(400).send()
    }
})

//////////////////
// SignUp As User 
//////////////////
router.post('/users', async (req, res) => {
    const user = new User(req.body)
    try {
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

router.post('/users/notes', async (req, res) => {

})





module.exports = router