const express = require('express')
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const session = require('express-session')
const flash = require('express-flash')
const passport = require('passport')
const MongoDBStore = require('connect-mongodb-session')(session);



const initializePassport = require('./passport-config')
initializePassport(passport)
// const fs = require('fs');
// const mime = require('mime');

require('./db/mongoose')


//// Mobile App Routes

const userRouter = require('./routers/user')
const doctorRouter = require('./routers/doctor')
const patientRouter = require('./routers/patient')
const pharmacyRouter = require('./routers/pharmacy')
const laboratoryRouter = require('./routers/laboratory')


//// Models

const User = require('./models/user')
const Doctor = require('./models/doctor')
const Pharmacy = require('./models/pharmacy')
const Patient = require('./models/patient')
const Laboratory = require('./models/laboratory')
const PharmaceuticalCompany = require('./models/pharmaceuticalCompany')

//// Web App Routes

const webPatientRouter = require('./web/web.patient')
const webUserRouter = require('./web/web.user')
const webPharmacyRouter = require('./web/web.pharmacy')
const webDoctorRouter = require('./web/web.doctor')

const app = express()
const port = process.env.PORT || 3000


var store = new MongoDBStore({
    uri: 'mongodb://localhost:27017/doctian-data',
    collection: 'mySessions'
});

// Catch errors
store.on('error', function (error) {
    console.log(error);
});

// /// GateWay
// app.use((req, res , next) => {
//     console.log(req.method , req.path)
//     next()
// })

//app.use(fileUpload)
app.use(express.json())
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('/upload'));
app.use('/assets/', express.static('assets'));
app.use(fileUpload());
app.set('view-engine', 'ejs')


//app.use(flash())
app.use(session({
    secret: 'x199103',
    store: store,
    resave: false,
    saveUninitialized: false,
    //cookie: { secure: true }
}))

app.use(passport.initialize());
app.use(passport.session());
app.use(async function (req, res, next) {
    res.locals.isAuthenticated = req.isAuthenticated();
    if (req.isAuthenticated()) {
        res.locals.user = req.user;
        //console.log(req.user)
        //console.log(req.isAuthenticated())
        //res.locals.name
        switch (req.user.role) {
            case 'Patient':
                var user = await Patient.findByUser(req.user.id)
                res.locals.name = user.name + " " + user.lastName;
                break;
            case 'Doctor':
                var user = await Doctor.findByUser(req.user.id)
                res.locals.name = user.name + " " + user.lastName;
                break;
            case 'Laboratory':
                var user = await Laboratory.findByUser(req.user.id)
                res.locals.name = user.name;
                break;
            case 'Pharmacy':
                var user = await Pharmacy.findByUser(req.user.id)
                res.locals.name = user.name;
                break;
            case 'Pharmaceutical company':
                var user = await PharmaceuticalCompany.findByUser(req.user.id)
                res.locals.name = user.name;
                break;
        }
    }


    next();
})




app.use(userRouter)
app.use(doctorRouter)
app.use(patientRouter)
app.use(pharmacyRouter)
app.use(laboratoryRouter)

app.use(webPatientRouter)
app.use(webUserRouter)
app.use(webPharmacyRouter)
app.use(webDoctorRouter)

// passport.use(new LocalStrategy(
//     function (username, password, done) {

//         return done(null, "user");

//     }
// ));


// app.use(function(req, res) {
//     res.redirect('/web/error');
// });


app.listen(port, () => {
    console.log('Server is up on port : ' + port)
})


const jwt = require('jsonwebtoken')