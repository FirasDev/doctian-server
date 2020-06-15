const express = require('express')
const auth = require('../middleware/auth')
const axios = require('axios');
const fileUpload = require('express-fileupload');
var FormData = require('form-data');
const fs = require('fs');
var dateFormat = require('dateformat');

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


const BC_SERVER = "http://localhost:4000/"
const BC_LOCAL = true;


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
    
    


    ////////////////////////
    /////// BlockChain Service 
    /////// Type : Text 
    ////////////////////////

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    try {
        var blockChainResponse;
        var ipfsLink;

        let sampleFile = req.files.file;
        var filename = req.user._id + "." + dateFormat(Date.now(), "yyyy-mm-dd-hh.MM.ss") + '.jpg';

        await sampleFile.mv('./uploads/' + filename, async function (err) {
            if (err)
                return res.status(500).send(err);
            console.log('File uploaded!');
            try {

                var newFile = fs.createReadStream("./uploads/" + filename);
                const form_data = new FormData();
                form_data.append("file", newFile);
                form_data.append("id", req.user.id)
                const request_config = {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        ...form_data.getHeaders()
                    },
                };
                console.log(req.body.description)
                blockChainResponse = await axios.post(BC_SERVER + 'ipfsDataFileUpload', form_data, request_config);
                
                if (BC_LOCAL) {
                    ipfsLink = blockChainResponse.data.local;
                } else {
                    ipfsLink = blockChainResponse.data.ipfsServer;
                }
                //console.log(req.body.description)
                const analysisResult = new AnalysisResult({
                    description: req.body.description,
                    analysis: req.params.id,
                    ipfsUrl: ipfsLink

                })
                try {
                   
                    await analysisResult.save()
                    // fs.unlink("./uploads/" + filename, (err) => {
                    //     if (err) {
                    //         console.log("failed to delete local image:"+err);
                    //     } else {
                    //         console.log('successfully deleted local image');                                
                    //     }
                    // });
                    res.status(201).send(analysisResult)
                } catch (e) {
                    res.status(400).send(e)
                }


            } catch (error) {
                console.log('Error BlockChain')
            }
        });

    } catch (e) {
        console.log("BlockChain");
    }

    ////////////////////////







    
})


module.exports = router
