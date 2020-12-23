
require('dotenv').config()
const express = require('express');
const app = express();
const cors = require('cors')
app.use(cors())
let bodyParser = require('body-parser');
app.use(bodyParser.json());
// Twilio credentials
const authToken = process.env.TWILIO_TOKEN;
const accountSid = process.env.TWILIO_ACCOUNTSID;
const client = require('twilio')(accountSid, authToken);
const sendMessage = (sender, receiver, body) => {
    client.messages.create({
        to: receiver,
        from: sender,
        body: body
    }).then((message) => console.log(message.sid));
}
// Firebase Credentials
let firebase = require('firebase');
let firebaseConfig = {
    apiKey: process.env.FB_API_KEY,
    authDomain: process.env.FB_AUTH_DOMAIN,
    projectId: process.env.FB_PROJECT_ID,
    storageBucket: process.env.FB_STORAGE_BUCKET,
    messagingSenderId: process.env.FB_SENDER_ID,
    appId: process.env.FB_APP_ID,
    measurementId: process.env.FB_MEASUREMENT_ID
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
let buffer = new Set(); // a buffer that contains all phone numbers in the middle of verification.
// Expire the access code after 60 seconds
const expire = (generatedCode, phoneNumber) => {
    setTimeout(async() => { 
        let ref = firebase.database().ref('users');
        let snapshot = await ref.once('value');
        let val = snapshot.child(phoneNumber).child('access_code').val();
        let newReference = firebase.database().ref('users/' + phoneNumber + '/');
        if (val == generatedCode && buffer.has(phoneNumber))
        {
            buffer.delete(phoneNumber);
            newReference.update({access_code: ''}, 
                (error) => {
                if (error) {
                    console.log(error.response.data);
                } 
            });
        }
    }, 60000)
}
// Validate Access Code POST
app.post('/', async (req, res) => {
    console.log('ValidateAccessCode');
	let phoneNumber = req.body.Phone.toString();
    let submittedCode = req.body.Code;
    if (!buffer.has(phoneNumber)) // only validate the phone number if it's in the buffer
    {    
        res.send('There has been no access code created for your phone number or your access code has expired. Please try again.');    
        return;
    }
    let ref = firebase.database().ref('users');
    let snapshot = await ref.once('value');
    let generatedCode = snapshot.child(phoneNumber).child('access_code').val();
    // Verification succeeds
    if (generatedCode == submittedCode)
    {
        firebase.database().ref('users/' + phoneNumber + '/').update({access_code: ''}, 
        (error) => {
            if (error) {
                res.send('Data could not be updated.' + error);
                return;
            } 
        });
        console.log('Verification is successful');
        buffer.delete(phoneNumber);
        res.json('Verification is successful');
    }
    // Verification fails
    else {
        console.log('Access Code incorrect');
        res.json('Access Code is not correct. Please try again');
    }
});
// Create New Access Code POST
app.post('/users/:phone', async (req, res) => {
    let phoneNumber = req.params.phone;
    if (buffer.has(phoneNumber)) // Only creates the access code if the phone number is not in the buffer
    {
        res.send('Your phone number is already under verification. Please try again after 1 minute.')
        return;
    }
    console.log('CreateNewAccessCode');
    buffer.add(phoneNumber) // Add the phone number that needs verification to the buffer
    let ref = firebase.database().ref('users');
    let snapshot = await ref.once('value');
    let val = snapshot.child(phoneNumber).val();
    let generatedCode = Math.floor(Math.random() * 900000 + 100000);
    let newReference = firebase.database().ref('users/' + phoneNumber + '/');
    // Create new instance in the database if the phone number is new
    if (val == null)
    {
        newReference.set({access_code: generatedCode}, 
        (error) => {
            if (error) {
                res.send('Data could not be saved.' + error);
                return;
            } 
        });
    }
    // Update the access code if the phone number is already in the database
    else {
        newReference.update({access_code: generatedCode}, 
            (error) => {
            if (error) {
                res.send('Data could not be update.' + error);
                return;
            } 
        });
    }
    // Send the generated access code to the phone number via SMS
    const message = 'The access code for your phone number is ' + generatedCode + '. Please enter the access code to verify your account';
    const receiver = '+1' + phoneNumber; 
    const sender = process.env.TWILIO_NUMBER;
    sendMessage('+12518621381', receiver, message);
    expire(generatedCode, phoneNumber); // Remove the phone number from the buffer and reset the access code after 60 seconds. Users need to request a new access code.
    res.send('Access Code has been generated and sent to your phone number.');
});

const PORT = process.env.PORT || 3001
const server = app.listen(PORT,() => {
  const port = server.address().port;
  console.log('Server is listening at port:%s', port);
})
