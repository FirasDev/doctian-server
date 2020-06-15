const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp(functions.config().functions);

var newData;

exports.myMessageTrigger = functions.firestore
  .document("Messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    if (snapshot.empty) {
      console.log("No Devices");
      return;
    }

    newData = snapshot.data();

    var tokens = [
      "fVE1MuZgSKa99wT8PHigUt:APA91bEnOX_zau9Yw9tooimWiw7qbLlZoHdTd0p3bVZIyhUw3iP0RJNcldCO9zalB76Gzu47bdQ4WIgQXCl5fbVg7d8Nnk8D2DYKriX5neO4yuyhXUVf-uGFjuuCgsDDfD0vTt_34Cxt",
    ];
    var payload = {
      notification: {
        title: "New appointment added",
        body: "Head over to the appointments menu",
        sound: "default",
      },
      data: {
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        message: newData.message,
      },
    };

    try {
      const response = await admin.messaging().sendToDevice(tokens, payload);
      console.log("Notification sent successfully");
    } catch (err) {
      console.log(err);
    }
  });

exports.doctorAppointmentTrigger = functions.https.onRequest((req, res) => {
  if (req.method == "POST") {
    functions.firestore
      .document("Messages/{messageId}")
      .onCreate(async (snapshot, context) => {
        if (snapshot.empty) {
          console.log("No Devices");
          return;
        }

        newData = snapshot.data();

        var tokens = [
          req.params.token,
        ];
        var payload = {
          notification: {
            title: "New appointment added",
            body: "Head over to the appointments menu",
            sound: "default",
          },
          data: {
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            message: newData.message,
          },
        };

        try {
          const response = await admin
            .messaging()
            .sendToDevice(tokens, payload);
          console.log("Notification sent successfully");
        } catch (err) {
          console.log(err);
        }
      });
  } else {
    console.log("not a post");
  }
});
