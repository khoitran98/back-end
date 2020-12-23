# Project Description

## Setting Up
### `npm install`
### `npm run dev`
Runs the app in the development mode.
## About
* This backend uses Node, Express for server communication, Firebase Realtime Database for database, Twilio for texting and Heroku for hosting.
* Since the repository does not contain the env variables (Firebase and Twilio configurations), running this locally won't work. 
* This server is live and running at https://pacific-falls-13049.herokuapp.com.
* It utilizes a set that acts as a buffer that contains phone numbers under processing to prevent multiple access.
* It also implements a 1-minute expiration time for access code.

