const puppeteer = require('puppeteer');
const functions = require('firebase-functions');
const firebase = require('firebase/app');
const admin = require('firebase-admin');
const serviceAccount = require("./tower-1eaf9-firebase-adminsdk-r37un-f10143abee.json");
const axios = require('axios');
const cors = require('cors');



const express = require('express');
const port = 8000;
const app = express();
app.use(cors());
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})
let link;
let quizletinfo;
let useremail;
app.get('/results', (req, res) => {
    link = req.query.link.toString();
    useremail = req.query.user;
    action().then(() => {
        const docRef = admin.firestore().collection(`${useremail} link`).doc();
        docRef.set({
            useremail: useremail,
            info: quizletinfo
        })
    })
    
})
app.listen(port, () => console.log('running on port ' + port));
async function action() {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto(link.toString())
        .catch((err) => {
            console.log('THERE IS AN ERROR: ' + err);
        })
    const getinfo = await page.evaluate(() => {
        const info = document.querySelectorAll('.TermText');
        let arr = [];
        for (let i = 0; i < info.length; i++) {
            arr.push(info[i].innerText);
        }
        return arr;
    })
    quizletinfo = getinfo;
    console.log('info', quizletinfo);
}
