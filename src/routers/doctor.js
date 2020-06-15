const express = require("express");
const axios = require("axios");
const auth = require("../middleware/auth");
const moment = require("moment");
const User = require("../models/user");
const Doctor = require("../models/doctor");
const Pharmacy = require("../models/pharmacy");
const Patient = require("../models/patient");
const Laboratory = require("../models/laboratory");
const Analysis = require("../models/analysis");
const AnalysisResults = require("../models/analysisResult");
const Appointment = require("../models/appointment");
const Perscription = require("../models/perscription");
const Notes = require("../models/notes");
const PharmaceuticalCompany = require("../models/pharmaceuticalCompany");
const Scan = require("../models/scan");
var FormData = require("form-data");
var request = require("request");
var fs = require("fs");
const uuidv4 = require("uuid/v4");

const BC_SERVER = "http://localhost:4000/";
const BC_LOCAL = true;
const DICOM_SERVER = "http://localhost:3045/";

const router = new express.Router();

//////////////////
// Check All Patient Perscriptions
//////////////////
router.get("/doctor/patient/perscriptions/:id", auth, async (req, res) => {
  try {
    const patient = await Patient.findByUser(req.params.id);
    await patient.populate("perscriptions").execPopulate();
    res.status(200).send(patient.perscriptions);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check All Patient Notes
//////////////////
router.get("/doctor/patient/notes/:id", auth, async (req, res) => {
  try {
    const patient = await Patient.findByUser(req.params.id);
    await patient.populate("notes").execPopulate();
    res.status(200).send(patient.notes);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check All Patient Ended Analysis Requests
//////////////////
router.get("/doctor/patient/analysisended/:id", auth, async (req, res) => {
  try {
    //const patient = await Patient.findByUser(req.params.id)

    const analyses = await Analysis.find({
      patient: req.params.id,
      status: "Ended",
    });
    console.log(analyses.length);

    if (analyses.length == 0) {
      return res.status(404).send();
    }

    res.status(200).send(analyses);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Create Analyse Request
//////////////////
router.post("/doctor/patient/analysis/:id", auth, async (req, res) => {
  const doctor = await Doctor.findByUser(req.user.id);
  console.log(req.params.id);

  //console.log(patient._id)
  const analysis = new Analysis({
    ...req.body,
    patient: req.params.id,
    doctor: doctor._id,
  });
  try {
    await analysis.save();
    res.status(201).send(analysis);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check All Analysis Requests Of Patient By Doctor
//////////////////
router.get("/doctor/patient/analysis/:id", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    console.log(req.params.id);
    console.log(doctor._id);
    console.log(req.user.id);
    const analyses = await Analysis.find({
      doctor: doctor._id,
      patient: req.params.id,
    });
    for (var i = 0; i < analyses.length; i++) {
      await analyses[i].populate("doctor").execPopulate();
      //await analyses[i].populate('patient').execPopulate();
      var analysis = analyses[i].toObject();
      analyses[i] = analysis;
      //mypatient = await Patient.findById(analysis.patient._id)
      //await mypatient.populate('owner').execPopulate()
      await doctor.populate("owner").execPopulate();
      analyses[i].doctor = doctor;
      //analyses[i].patient = mypatient;
      console.log("Analysis : " + i + " - " + analysis);
    }
    if (!analyses) {
      return res.status(404).send();
    }
    res.status(200).send(analyses);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check All Analysis Results Of Patient By Doctor
//////////////////
router.get("/doctor/laboratory/analysis/:id", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    const analysis = await Analysis.find({
      doctor: doctor._id,
      patient: req.params.id,
    });

    var result = [];
    for (var y = 0; y < analysis.length; y++) {
      await analysis[y].populate("doctor").execPopulate();
      var analysisPopulated = analysis[y].toObject();
      analysis[y] = analysisPopulated;

      const analysisResults = await AnalysisResults.find({
        analysis: analysis[y]._id,
      });

      for (var i = 0; i < analysisResults.length; i++) {
        await analysisResults[i].populate("analysis").execPopulate();
        await analysisResults[i].analysis.populate("doctor").execPopulate();
        await analysisResults[i].analysis.doctor
          .populate("owner")
          .execPopulate();
        var analysisRes = analysisResults[i].toObject();
        analysisResults[i] = analysisRes;
      }

      if (analysisResults.length) {
        result.push(analysisResults);
      }
    }

    res.status(200).send(result[0]);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check Ended Analysis Requests Of Patient By Doctor
//////////////////
router.get("/doctor/patient/analysisresult/:id", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    const analyses = await Analysis.find({
      status: "Ended",
      doctor: doctor._id,
      patient: req.params.id,
    });

    if (!analyses) {
      return res.status(404).send();
    }
    res.status(200).send(analyses);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check All Appointments
//////////////////
router.get("/doctor/appointments/", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    const appointments = await Appointment.find({ doctor: doctor._id });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(appointments);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// get all appointments count
//////////////////
router.get("/doctor/appointments/all/count", auth, async (req, res) => {
  let number = 0;
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    const appointments = await Appointment.find({ doctor: doctor._id });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      number++;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(JSON.stringify(number));
  } catch (e) {
    res.status(500).send(e);
  }
});

// Reject Appointment

router.put("/doctor/appointments/reject/:id", auth, async (req, res) => {
  Appointment.findById(req.params.id, function (err, appointment) {
    if (err) {
      res.send(err);
    }
    appointment.appointmentStatus = "Rejected";
    appointment.save(function (err) {
      if (err) {
        res.send(err);
      }
      res.json({ message: "Appointment rejected" });
    });
  });
});

// Reschedule Appointment

router.put("/doctor/appointments/reschedule/:id", auth, async (req, res) => {
  Appointment.findById(req.params.id, function (err, appointment) {
    if (err) {
      res.send(err);
    }
    appointment.appointmentStatus = "Waiting";
    appointment.save(function (err) {
      if (err) {
        res.send(err);
      }
      res.json({ message: "Appointment Waiting" });
    });
  });
});

//////////////////
// Check Appointments History
//////////////////
router.get("/doctor/appointments/history", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    var now = moment().startOf("day");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentStatus: { $regex: "Accepted" },
      appointmentDate: { $lte: now.toDate() },
    });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(appointments);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// get history of appointments count
//////////////////
router.get("/doctor/appointments/history/count", auth, async (req, res) => {
  let number = 0;
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    var now = moment().startOf("day");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentStatus: { $regex: "Accepted" },
      appointmentDate: { $lte: now.toDate() },
    });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      number++;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(JSON.stringify(number));
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check Accepted Appointments
//////////////////
router.get("/doctor/appointments/accepted", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    var currentDate = new Date();
    console.log(currentDate < "2020-04-25T01:36:35.702Z");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentStatus: { $regex: "Accepted" },
    });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(appointments);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check Rejected Appointments
//////////////////
router.get("/doctor/appointments/rejected", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    var currentDate = new Date();
    console.log(currentDate < "2020-04-25T01:36:35.702Z");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentStatus: { $regex: "Rejected" },
    });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(appointments);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// get rejected appointments count
//////////////////
router.get("/doctor/appointments/rejected/count", auth, async (req, res) => {
  let number = 0;
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    var currentDate = new Date();
    console.log(currentDate < "2020-04-25T01:36:35.702Z");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentStatus: { $regex: "Rejected" },
    });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      number++;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(JSON.stringify(number));
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check Pending Appointments
//////////////////
router.get("/doctor/appointments/pending", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    var currentDate = new Date();
    console.log(currentDate < "2020-04-25T01:36:35.702Z");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentStatus: { $regex: "Pending" },
    });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(appointments);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// get pending appointments count
//////////////////
//////////////////
// get history of appointments count
//////////////////
router.get("/doctor/appointments/upcoming/count", auth, async (req, res) => {
  let number = 0;
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    var now = moment().startOf("day");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentStatus: { $regex: "Accepted" },
      appointmentDate: { $gte: now.toDate() },
    });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      number++;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(JSON.stringify(number));
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check waiting Appointments
//////////////////
router.get("/doctor/appointments/waiting", auth, async (req, res) => {
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    var currentDate = new Date();
    console.log(currentDate < "2020-04-25T01:36:35.702Z");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentStatus: { $regex: "Waiting" },
    });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(appointments);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// get waiting appointments count
//////////////////
router.get("/doctor/appointments/waiting/count", auth, async (req, res) => {
  let number = 0;
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    var currentDate = new Date();
    console.log(currentDate < "2020-04-25T01:36:35.702Z");
    const appointments = await Appointment.find({
      doctor: doctor._id,
      appointmentStatus: { $regex: "Waiting" },
    });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      number++;
      console.log("Appointment : " + i + " - " + appointments[i]);
    }
    res.status(200).send(JSON.stringify(number));
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check All of my patients
//////////////////
router.get("/doctor/patients/", auth, async (req, res) => {
  var patients = [];
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    const appointments = await Appointment.find({ doctor: doctor._id });
    for (var i = 0; i < appointments.length; i++) {
      await appointments[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var appointment = appointments[i].toObject();
      appointment.createDate = appointments[i]._id.getTimestamp();
      appointments[i] = appointment;
      patient = await Patient.findById(appointment.patient._id);
      await patient.populate("owner").execPopulate();
      if (appointment.appointmentStatus == "Accepted") {
        patients.push(patient);
      }
      console.log("Appointment : " + i + " - " + appointment);
    }
    res.status(200).send(patients);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Patient Accept/Reject/Reschedule an Appointment
//////////////////
//----------------> Not Completed
router.patch("/doctor/appointment/:id", auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ["appointmentStatus"];
  const isValidOperation = updates.every((update) =>
    allowedUpdates.includes(update)
  );
  if (!isValidOperation) {
    return res.status(400).send({ error: "Invalid update!" });
  }
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!appointment) {
      res.status(404).send();
    }
    res.status(204).send(appointment);
  } catch (e) {
    res.status(400).send(e);
  }
});

//////////////////
// Check All Perscriptions Of Patient By Doctor
//////////////////
router.get("/doctor/patient/docperscriptions/:id", auth, async (req, res) => {
  const doctor = await Doctor.findByUser(req.user.id);
  try {
    const perscriptions = await Perscription.find({
      doctor: doctor._id,
      patient: req.params.id,
    });
    if (!perscriptions) {
      return res.status(404).send();
    }
    res.status(200).send(perscriptions);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// get perscriptions count
//////////////////
router.get("/doctor/perscriptions/count", auth, async (req, res) => {
  let number = 0;
  try {
    const doctor = await Doctor.findByUser(req.user.id);
    const perscriptions = await Perscription.find({ doctor: doctor._id });
    for (var i = 0; i < perscriptions.length; i++) {
      await perscriptions[i].populate("patient").execPopulate();
      //await appointments[i].doctor.populate('owner').execPopulate();
      var perscription = perscriptions[i].toObject();
      perscriptions[i] = perscription;
      number++;
      console.log("perscription : " + i + " - " + perscriptions[i]);
    }
    res.status(200).send(JSON.stringify(number));
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Check All Notes Of Patient By Doctor
//////////////////
router.get("/doctor/patient/docnotes/:id", auth, async (req, res) => {
  const doctor = await Doctor.findByUser(req.user.id);
  try {
    const notes = await Notes.find({
      doctor: doctor_id,
      patient: req.params.id,
    });
    if (!notes) {
      return res.status(404).send();
    }
    res.status(200).send(notes);
  } catch (e) {
    res.status(500).send(e);
  }
});

///////////////////
// Create a Prescription For a Patient
//////////////////
router.post("/doctor/patient/perscriptions/:id", auth, async (req, res) => {
  const doctor = await Doctor.findByUser(req.user.id);

  const perscription = new Perscription({
    ...req.body,
    patient: req.params.id,
    doctor: doctor._id,
  });

  ////////////////////////
  /////// BlockChain Service
  /////// Type : Text
  ////////////////////////

  const myData = req.body.perscriptionDescription; /// Data Sended To BlockChain
  const type = 2;
  var blockChainResponse;
  var ipfsLink;
  try {
    blockChainResponse = await axios.post(BC_SERVER + "ipfsDatatextUpload", {
      id: req.params.id,
      data: myData,
      type: type,
    });
    console.log(blockChainResponse.data.ipfsServer);
    if (BC_LOCAL) {
      ipfsLink = blockChainResponse.data.local;
    } else {
      ipfsLink = blockChainResponse.data.ipfsServer;
    }
  } catch (error) {
    console.log("Error BlockChain");
  }
  ////////////////////////

  try {
    perscription.ipfsUrl = ipfsLink;
    await perscription.save();
    res.status(201).send(perscription);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Create a note For a Patient
//////////////////
router.post("/doctor/patient/note/:id", auth, async (req, res) => {
  const doctor = await Doctor.findByUser(req.user.id);

  const note = new Notes({
    ...req.body,
    patient: req.params.id,
    doctor: doctor._id,
  });

  ////////////////////////
  /////// BlockChain Service
  /////// Type : Text
  ////////////////////////

  const myData = req.body.notesDetails; /// Data Sended To BlockChain
  const type = 1;
  var blockChainResponse;
  var ipfsLink;
  try {
    blockChainResponse = await axios.post(BC_SERVER + "ipfsDatatextUpload", {
      id: req.params.id,
      data: myData,
      type: type,
    });
    console.log(blockChainResponse.data.ipfsServer);
    if (BC_LOCAL) {
      ipfsLink = blockChainResponse.data.local;
    } else {
      ipfsLink = blockChainResponse.data.ipfsServer;
    }
    console.log(ipfsLink);
  } catch (error) {
    console.log("Error BlockChain");
  }
  ////////////////////////

  try {
    note.ipfsUrl = ipfsLink;
    console.log(note);
    await note.save();
    res.status(201).send(note);
  } catch (e) {
    res.status(500).send(e);
  }
});

//////////////////
// Create a Notes For a Patient
//////////////////
router.post("/doctor/patient/notes/:id", auth, async (req, res) => {
  const doctor = await Doctor.findByUser(req.user.id);

  const notes = new Notes({
    ...req.body,
    patient: req.params.id,
    doctor: doctor._id,
  });
  try {
    await notes.save();
    res.status(201).send(notes);
  } catch (e) {
    res.status(500).send(e);
  }
});




//////////////////////////////////////////////////
////// Retrive and convert ipfs file ////////////
////////////////////////////////////////////////

router.post("/doctor/ipfs/", auth, async (req, res) => {
  var ipfsUrl = req.body.ipfsUrl;
  var filename = uuidv4();
  var imageUrl;
  var stream = function () {
    request(ipfsUrl).pipe(
      fs.createWriteStream("./uploads/dicom_files/" + filename + ".dcm")
    );
  };
  stream();

  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    var newFile = fs.createReadStream(
      "./uploads/dicom_files/" + filename + ".dcm"
    );
    const form_data = new FormData();
    form_data.append("file", newFile);
    const request_config = {
      headers: {
        "Content-Type": "multipart/form-data",
        ...form_data.getHeaders(),
      },
    };
    imageUrl = await axios.post(
      DICOM_SERVER + "upload_dicomm",
      form_data,
      request_config
    );

    filename = "localhost:3045/"+filename+".png";
    res.status(201).send(filename);
  } catch (e) {
    res.status(500).send(e);
  }
});

module.exports = router;
