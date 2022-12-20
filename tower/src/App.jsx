import './App.css';
import './index.css';
import { useRef } from 'react';
import axios from 'axios';
import { useState } from 'react';
import {app, auth, db} from './firebase';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import {GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut} from 'firebase/auth';
import {GoogleButton} from 'react-google-button';
import { io } from 'socket.io-client';

function App() {
  let width = window.innerWidth;
  //single id of doc containing quizlet card info inside collection with name of user.email
  const [docid, setdocid] = useState('');
  const [User, setUser] = useState();
  const [loading, setloading] = useState(true);
  //either join or create or none (before user chooses)
  const [mode, setmode] = useState('none');
  const [linksubmissionloading, setlinksubmissionloading] = useState(false);
  const [displayname, setdisplayname] = useState('');
  const [socketroomid, setsocketroomid] = useState('');
  const [quizletname, setquizletname] = useState('');

  const text = useRef();

  const quizletcardstitle = document.querySelector('#quizletcardstitle');
  const quizletcards = document.querySelector('#quizletcards');
  const startgamebutton = document.querySelector('#startgamebutton');

  const socket = io('http://localhost:3000')

  function submitClick() {
    const options = {
      method: 'GET',
      url: "http://localhost:8000/results",
      params: {link: text.current.value, user: User.email},
    }
    axios.request(options)
      .then(response => {
        console.log(response);
      })
      .catch(err => console.log(err));
    if (text.current.value === '') return;
    docid && deleteDoc(doc(db, `${User.email} link`, docid));
    if (quizletcardstitle) quizletcardstitle.innerHTML = '';
    if (quizletcards) quizletcards.innerHTML = '';
    startgamebutton && startgamebutton.remove();
    setlinksubmissionloading(true);
  }

  useEffect(() => {
    if (User) {
      socket.emit('usersignedin', User)
    }
  }, [User])
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUser(user);
      setloading(false);
    })
    return unsub;
  })
  const signinwithgoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  }
  //for creategame, whenever user inputs quizlet link into input box
  if (User) {
    const colRef = collection(db, `${User.email} link`);
    const unsub = onSnapshot(colRef, (snapshot) => {
      let links = [];
      snapshot.docs.forEach(doc => {
        setsocketroomid(snapshot.docs[0].data().id);
        setdocid(doc.id);
        setquizletname(snapshot.docs[0].data().quizletname);
        links.push({...doc.data()});
        if (links[0].info) setlinksubmissionloading(false);
        if (links[0] && links[0].error) {
          console.log('there was an error');
          setlinksubmissionloading(false);
          let div = document.createElement('div');
          div.classList.add('popup');
          div.textContent = 'We could not get the data for your Quizlet link';
          document.body.append(div);
          setTimeout(() => {
            div.remove();
          }, 3200);
          docid && deleteDoc(doc(db, `${User.email} link`, docid));
          return;
        }
      })
      if (quizletcards && quizletcards.innerHTML === '' && links[0]) {

        if (quizletcardstitle && quizletcardstitle.innerHTML === '') {
          let startdiv = document.createElement('div');
          startdiv.classList.add('quizletdiv');
          startdiv.innerHTML = '<p class="quizletp" style="width: 50%">Term</p><p class="quizletp" style="width: 50%">Definition</p>';
          quizletcardstitle.append(startdiv);
        }

        let array = links[0].info;
        for (let i = 0; i < array.length/2; i++) {
          let div = document.createElement('div');
          div.classList.add('quizletdiv');
          div.innerHTML = `<p class="quizletp" style="width: 50%">${array[i]}</p><p class="quizletp" style="width: 50%">${array[i+1]}</p>`;
          quizletcards.append(div);
        }

        startgamebutton.style.display = 'block';
      }
      return unsub;
    })
  }
  //for joingame, whenever user clicks join game button on menu
  const joingametext = document.querySelector('#joingametext');
  const unsub = onSnapshot(collection(db, 'games'), (snapshot) => {
    let activegamesarr = [];
    snapshot.docs.forEach(doc => {
      activegamesarr.push({...doc.data()});
    })
    if (mode === 'join') {
      joingametext.innerHTML = '';
      if (activegamesarr.length === 0) {
        joingametext.textContent = 'No Active Games';
        return;
      }
      activegamesarr.forEach(val => {
        let div = document.createElement('div');
        if (width > 500) {
          div.style = "display: flex; align-items: center; margin-bottom: 1rem;";
        } else {
          div.style = "margin-bottom: 1rem;";
        }
        div.innerHTML = `
        <div style="margin-bottom: 0.5rem; display: flex; align-items: center;">
          <img style="border-radius: 50%; width: 45px; height: 40px; max-width: 50px; margin-right: 10px;" src=${val.pfp}>
          <span style="margin-left: 1rem; margin-right: 2rem; width: 60%; word-wrap: break-word">${val.name}'s game</span>
        </div>
        <button id=${val.id} class="greenbutton ${val.email}">Join Game</button>`;
        joingametext.append(div);

        document.querySelectorAll('.greenbutton').forEach(button => {
          button.addEventListener('click', (e) => {
            let roomid = e.target.id;
            let roomleader = e.target.classList[1];
            socket.emit('joingame', roomid, roomleader, User, displayname);

            document.querySelector('#joingame').style.display = 'none';
            document.querySelector('#gameroom').style.display = 'block';

            const unsuba = onSnapshot(collection(db, `${roomleader} game`), (snapshot) => {
              snapshot.docs.forEach(doc => {
                if (doc.data().email === roomleader) {
                  document.querySelector('#roomowner').textContent = `${doc.data().name}'s gameroom`;
                  return;
                }
              })
              return unsuba;
            })

            onSnapshot(collection(db, `${roomleader} link`), (snapshot) => {
              document.querySelector('#quizletname').textContent = snapshot.docs[0].data().quizletname;
            })
        
            let gameroomplayers = document.querySelector('#gameroomplayers');
            const q = query(collection(db, `${roomleader} game`), orderBy('createdAt', 'asc'))
            const unsub = onSnapshot(q, (snapshot) => {
              gameroomplayers.innerHTML = '';
              snapshot.docs.forEach(doc => {
                let div = document.createElement('div');
                div.innerHTML = `<img style="border-radius: 50%;" src=${doc.data().pfp}><div>${doc.data().name}</div>`;
                div.style = "display: flex; flex-direction: column; justify-content: center; align-items: center; margin-right: 1rem;";
                if (doc.data().email === roomleader) {
                  div.style.color = '#d1981d';
                }
                gameroomplayers.append(div);
              })
              return unsub;
            })
          })
        })
      })
    
    }
    return unsub;
  })

  function signout() {
    signOut(auth);
  }
  function startgame() {
    const usergameroom = doc(db, `${User.email} game`, User.email);
    setDoc(usergameroom, {
      name: displayname,
      pfp: User.photoURL,
      email: User.email,
      createdAt: serverTimestamp()
    })
    const docRef = doc(db, 'games', User.email);
    setDoc(docRef, {
      name: displayname,
      pfp: User.photoURL,
      email: User.email,
      id: socketroomid
    })
    document.querySelector('#creategame').style.display = 'none';
    document.querySelector('#gameroom').style.display = 'block';
    
    document.querySelector('#quizletname').textContent = quizletname;

    document.querySelector('#roomowner').textContent = `${displayname}'s gameroom`;

    let gameroomplayers = document.querySelector('#gameroomplayers');
    const q = query(collection(db, `${User.email} game`), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, (snapshot) => {
      gameroomplayers.innerHTML = '';
      snapshot.docs.forEach(doc => {
        let div = document.createElement('div');
        div.innerHTML = `<img style="border-radius: 50%;" src=${doc.data().pfp}><div>${doc.data().name}</div>`;
        div.style = "display: flex; flex-direction: column; justify-content: center; align-items: center; margin-right: 1rem;";
        if (User.email === doc.data().email) {
          div.style.color = '#d1981d';
        }
        gameroomplayers.append(div);
      })
      return unsub;
    })
  }
  function checknameinput(e, modeparam) {
    e.preventDefault();
    const enternameinputinvisible = document.querySelector('#enternameinputinvisible');
    const enternameinput = document.querySelector('#enternameinput');
    const usernamediv = document.querySelector('#username');
    enternameinputinvisible.textContent = '';
    enternameinput.style.border = '';
    if (enternameinput.value.length > 0) {
      setmode(modeparam);
      document.querySelector('#menu').style.display = 'none';
      setdisplayname(enternameinput.value);

      usernamediv.textContent = `Name: ${enternameinput.value}`;
      usernamediv.style.display = 'block';
    } else {
      enternameinput.style.border = '2px solid red';
      enternameinputinvisible.textContent = 'Please type in a display name';
      enternameinputinvisible.style.width = '60%';
      enternameinputinvisible.style.color = 'red';
      enternameinputinvisible.style.fontSize = 'bold';
    }
  }
  function leaveroom() {
    socket.emit('disconnect')
  }
  return (
    <div className="App">
        <img className='absolute w-full h-[100vh] z-[-1] object-cover blur-[1px]' src={`../images/pattern.png`}/>
        {User && <div onClick={signout} className='hover hover:underline rounded-[15px] bg-gray-400 text-xl absolute right-5 top-3 text-white font-bold px-4 py-2'>Log out</div>}
        {User && <div className='rounded-[10px] px-4 py-1 bg-blue-300 text-xl absolute top-3 left-5 font-bold'>
          <div>Signed in as {User.email}</div>
          <div id="username" className='hidden'></div>
        </div>}
        {!loading && !User && <h2 className='absolute top-[20%] left-2/4 z-[3] -translate-x-2/4 -translate-y-2/4 text-[3rem] w-full md:text-[4rem] font-bold text-white text-center'>Welcome to my Tower Game!</h2>}
      { loading ? <div></div> :
        User ? <div id="infobar" className='absolute flex flex-col items-center bg-blue-600 w-[80%] h-[80%] top-2/4 left-2/4 z-[3] -translate-x-2/4 -translate-y-2/4'>
          <form className='flex flex-col justify-center items-center w-full' id="menu">
            <p className='text-white text-[4rem] mt-10'>Menu</p>
            <input required id="enternameinput" type="text" placeholder='Enter Your Dispay Name' maxLength={15} className='bg-white border-2 py-2 px-2 w-[60%] text-center rounded-[10px] mt-4'/>
            <div id="enternameinputinvisible"></div>
            <input type="submit" onClick={(e) => checknameinput(e, 'create')} className='bg-gradient-to-r from-green-400 to-green-600 rounded-[15px] text-white font-bold text-3xl px-8 py-2 mb-8 mt-10 hover hover:underline' value="Create Game" />
            <input type="submit" onClick={(e) => checknameinput(e, 'join')} className='bg-gradient-to-r from-green-400 to-green-600 rounded-[15px] text-white font-bold text-3xl px-8 py-2 hover hover:underline' value="Join Game" />
          </form>
          
          <div id="creategame" className='w-full h-full' style={{display: mode === 'create' ? 'block' : 'none'}}>
            {
              linksubmissionloading ? <div className='w-full h-full flex flex-col justify-center items-center'>
                <p className='text-3xl text-center w-[80%] py-2 absolute text-white font-bold left-2/4 top-[10%] -translate-x-2/4 -translate-y-2/4'>Loading your flashcard info</p>
                <img className='w-full h-full object-cover' src="https://cdn.dribbble.com/users/306010/screenshots/2146801/loader.gif"/>
              </div> : <div className='flex flex-col items-center w-full mt-4'>
                <div onClick={() => {setmode('none'); document.querySelector('#menu').style.display = 'flex'}} className='text-black font-bold absolute top-2 left-4 text-xl hover hover:underline'>Back to Menu</div>
                <p className='text-2xl text-white mt-8'>Enter link of your quizlet</p>
                <input className='w-[60%] my-2 border-solid border-black border-2 px-2 bg-white' ref={text} type="text"/>
                <input className='hover hover:underline border-solid mb-8 text-xl bg-green-500 font-bold text-white px-[4rem] py-[0.2rem] rounded-[20px] mt-2' onClick={submitClick} type="submit"/>
                <div id="quizletcardscontainer">
                  <div id="quizletcardstitle"></div>
                  <div id="quizletcards"></div>
                  <div onClick={startgame} className='hidden hover hover:underline md:w-2/4' id="startgamebutton">Start Game</div>
                </div>
              </div>
            }
          </div>

          <div id="joingame" className='w-full flex flex-col justify-center items-center' style={{display: mode === 'join' ? 'flex' : 'none'}}>
            <div onClick={() => {setmode('none'); document.querySelector('#menu').style.display = 'flex'}} className='text-black font-bold absolute top-2 left-4 text-xl hover hover:underline'>Back to Menu</div>
            <p className='text-3xl py-3 text-white font-bold mt-8'>Active Games</p>
            <div id="joingametext" className='absolute left-2/4 top-2/4 -translate-x-2/4 -translate-y-2/4 bg-white w-3/4 h-[60%] pt-4 pl-4'>
            </div>
          </div>

          <div id="gameroom" className='hidden bg-blue-500 absolute w-full h-full'>
            <span onClick={leaveroom} id="leaveroom" className='hover hover:underline absolute bg-[#ed7164] top-2 left-4 py-[0.2rem] px-4 rounded-[15px] text-white font-bold'>Leave Room</span>
            <div id="roomowner" className='font-bold text-white text-center w-full text-xl mt-4'></div>
            <div id="quizletname" className='text-white font-bold w-full text-center mt-3 text-[1.5rem]'></div>
            <div className='text-black font-bold ml-4 text-[1.2rem] mb-3'>Players</div>
            <div id="gameroomplayers" className='flex ml-4'></div>
          </div>

        </div> : <div className='bg-blue-600 px-16 py-8 flex flex-col items-center absolute left-2/4 top-2/4 -translate-x-2/4 -translate-y-2/4'>
          <p className='my-4 text-2xl font-bold text-white text-center'>Sign in with Google to play</p>
          <GoogleButton className='text-[1rem] mt-4' onClick={signinwithgoogle}/>
        </div>
      }
    </div>
  )
}

export default App
