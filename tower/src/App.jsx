import './App.css';
import './index.css';
import { useRef } from 'react';
import axios from 'axios';
import { useState } from 'react';
import {app, auth, db} from './firebase';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import {GoogleAuthProvider, onAuthStateChanged, signInWithPopup} from 'firebase/auth';
import {GoogleButton} from 'react-google-button';

function App() {
  //single id of doc containing quizlet card info inside collection with name of user.email
  const [docid, setdocid] = useState('');
  const [User, setUser] = useState();
  const text = useRef();
  // User && deleteDoc(doc(db, User.email.toString(),docid));
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
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setUser(user);
    })
    return unsub;
  })
  const signinwithgoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  }
  useEffect(() => {
    if (User) {
      const colRef = collection(db, `${User.email} link`);
      const unsub = onSnapshot(colRef, (snapshot) => {
        let links = [];
        snapshot.docs.forEach(doc => {
          setdocid(doc.id);
          links.push({...doc.data()});
        })

        if (document.querySelector('#quizletcards').innerHTML === '') {
          let startdiv = document.createElement('div');
          startdiv.classList.add('quizletdiv');
          startdiv.innerHTML = '<p class="quizletp" style="width: 50%">Term</p><p class="quizletp" style="width: 50%">Definition</p>';
          document.querySelector('#quizletcards').append(startdiv);
  
          let array = links[0].info;
          for (let i = 0; i < array.length/2; i++) {
            let div = document.createElement('div');
            div.classList.add('quizletdiv');
            div.innerHTML = `<p class="quizletp" style="width: 50%">${array[i]}</p><p class="quizletp" style="width: 50%">${array[i+1]}</p>`;
            document.querySelector('#quizletcards').append(div);
          }
          let div = document.createElement('div');
          div.classList.add('hover');
          div.classList.add('start-game-button');
          div.textContent = 'Start Game';
          document.body.append(div);
        }
        return unsub;
      })
    }
  }, [User])
  return (
    <div className="App">
      <img className='h-[50vh] w-full object-cover relative blur-[3px]' src="https://i.fbcd.co/products/original/2105-m10-i017-n020-mainpreview-32de471848ee6e252675f12203e3490c48b2a5d31c4e83c2f2c202c82697dc33.jpg"/>
      <h2 className='absolute top-1/4 left-2/4 z-[3] -translate-x-2/4 -translate-y-2/4 text-3xl'>Welcome to my Tower Game</h2>
      {
        User ? <div className='relative flex flex-col items-center'>
          <p className='text-2xl'>Enter link of your quizlet</p>
          <input className='w-2/4 my-2 border-solid border-black border-2 px-2' ref={text} type="text"/>
          <input className='hover border-solid mb-4 text-xl bg-blue-400 font-bold text-white px-4 rounded-[10px] mt-2' onClick={submitClick} type="submit"/>
          <div id="quizletcards"></div>
        </div> : <div className='flex flex-col items-center'>
          <p className='my-4 text-xl'>Please sign in with google to start the tower game</p>
          <GoogleButton className='text-[1rem]' onClick={signinwithgoogle}/>
        </div>
      }
    </div>
  )
}

export default App
