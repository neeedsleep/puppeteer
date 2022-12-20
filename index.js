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
const http = require('http');
app.use(cors());
const server = http.createServer(app);
const {Server} = require('socket.io');
let socketid;
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:3000"],
        methods: ["GET", "POST"],
    }
})

io.on('connection', (socket) => {
    socketid = socket.id;
    socket.on('usersignedin', (User) => {
        socket.on('disconnect', () => {
            admin.firestore().collection(`${User.email} link`).doc(User.email).delete();
            admin.firestore().collection('games').doc(User.email).delete();
            admin.firestore().collection(`${User.email} game`).doc(User.email).delete();
        })
    })
    socket.on('joingame', (roomid, roomleader, User, displayname) => {
        socket.to(roomid);
        const docRef = admin.firestore().collection(`${roomleader} game`).doc(User.email);
        docRef.set({
            email: User.email,
            name: displayname,
            pfp: User.photoURL,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
        socket.on('disconnect', () => {
            admin.firestore().collection(`${roomleader} game`).doc(User.email).delete();
        })
    })
})

server.listen(3000, () => {
    console.log('SERVER IS RUNNING')
})


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})
let link;
let quizletinfo;
let useremail;
app.get('/results', (req, res) => {
    link = req.query.link.toString();
    useremail = req.query.user;
    action()
})
app.listen(port, () => console.log('running on port ' + port));
async function action() {
    const browser = await puppeteer.launch({headless: true});
    const page = await browser.newPage();
    await page.goto(link.toString())
        .then(() => {
            page.evaluate(() => {
                const info = document.querySelectorAll('.TermText');
                const getquizletname = document.querySelector(".SetPage-titleWrapper h1").innerText;
                let arr = [];
                for (let i = 0; i < info.length; i++) {
                    arr.push(info[i].innerText);
                }
                return [arr, getquizletname]
            }).then((array) => {
                quizletinfo = array[0];
                console.log('info', quizletinfo);
                if (quizletinfo[0]) {
                    const docRef = admin.firestore().collection(`${useremail} link`).doc(useremail);
                    docRef.set({
                        useremail: useremail,
                        info: quizletinfo,
                        id: socketid,
                        quizletname: array[1]
                    })
                }
                browser.close();
            })
        })
        .catch((err) => {
            console.log('THERE IS AN ERROR: ' + err);
            const docRef = admin.firestore().collection(`${useremail} link`).doc(useremail);
            docRef.set({
                useremail: useremail,
                error: 'error'
            })
            browser.close();
            return;
        })
}