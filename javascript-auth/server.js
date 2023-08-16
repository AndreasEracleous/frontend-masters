import express from 'express'
/* FOR DATABASE we use lowdb
just to make simple with simple lowdb and for learning purposes
lowdb is open source library
that write object into a JSON file for easy for debugging
*/
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

import * as url from 'url';
import bcrypt from 'bcryptjs';
import * as jwtJsDecode from 'jwt-js-decode';
import base64url from "base64url";
import SimpleWebAuthnServer from '@simplewebauthn/server';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const app = express()
app.use(express.json())

// Once write something, the file will be exist
const adapter = new JSONFile(__dirname + '/auth.json');
const db = new Low(adapter);
await db.read();
db.data ||= { users: [] }

const rpID = "localhost";
const protocol = "http";
const port = 5050;
const expectedOrigin = `${protocol}://${rpID}:${port}`;

// check the public folder
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

// check if the user exist
function findUser (email) {
  const results = db.data.users.filter(user=>user.email===email); // return an array
  if(results.length===0){
    return undefined;
  }
  return results[0]; // return the first user that it should be the only one
}

// ADD HERE THE REST OF THE ENDPOINTS
app.post("/auth/login", (req, res) => {
  const userFound = findUser(req.body.email);
  if(userFound){
    // User Found, Check Password
    // hashed password with plan password is a problem, so we need to decrypt
    if(bcrypt.compareSync(req.body.password, userFound.password)){
      res.send({ok: true, name: userFound.name, email: userFound.email});
    } else {
       res.send({ok: false, message: "Credential are wrong."});
    }
  } else {
    // User Not Found
    // message: "The account doesn't exist. Check your email address." The message couldn't be a good idea to be inform the user because hackers can take advantage of this. Because you say to hacker that someone has account
    // better to keep more generic the message
    res.send({ok: false, message: "Credential are wrong."});
  }
})
// for POST HTTP action or method
// the argument that we receive, is the request and response
/*
req = request, we get information coming from the browser
res = response, we send information to the browser
*/
app.post("/auth/register", (req, res) => {
  const salt = bcrypt.genSaltSync(10); // like random words, generate random words
  const hashedPass = bcrypt.hashSync(req.body.password, salt); // we use Sync API because we not need to deal with responses and in the HTTP async world, is not so simpler

  //TODO: Date Validation
  const user = {
    name: req.body.name,
    email: req.body.email,
    password: hashedPass // req.body.password // here the password is in plan text that is not good idea, need to encrypt the data like hash
  }
  const userFound = findUser(user.email);
  // User already exists
  if(userFound) {
    res.send({ok: false, message: "User already exists"});
  } else {
    // User is new, we are good!
    db.data.users.push(user);
    db.write();
    res.send({ok: true});
  }
})

// * it's a start
app.get("*", (req, res) => {
    res.sendFile(__dirname + "public/index.html");
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
});

