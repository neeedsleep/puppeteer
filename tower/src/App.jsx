import './App.css';
import './index.css';
import { useRef } from 'react';
import axios from 'axios';
import { useState } from 'react';
import {app, auth, db} from './firebase';
import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import {GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut} from 'firebase/auth';
import {GoogleButton} from 'react-google-button';

function App() {
  //single id of doc containing quizlet card info inside collection with name of user.email
  const [docid, setdocid] = useState('');
  const [User, setUser] = useState();
  const [loading, setloading] = useState(true);
  //either join or create or none (before user chooses)
  const [mode, setmode] = useState('none');
  const [linksubmissionloading, setlinksubmissionloading] = useState(false);
  const text = useRef();
  const quizletcardstitle = document.querySelector('#quizletcardstitle');
  const quizletcards = document.querySelector('#quizletcards');
  const startgamebutton = document.querySelector('.start-game-button');

  function submitClick() {
    docid && deleteDoc(doc(db, `${User.email} link`, docid));
    setlinksubmissionloading(true);
    if (quizletcardstitle) quizletcardstitle.innerHTML = '';
    if (quizletcards) quizletcards.innerHTML = '';
    startgamebutton && startgamebutton.remove();
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
      setloading(false);
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
        if (document.querySelector('#quizletcards').innerHTML === '' && links[0]) {
          setlinksubmissionloading(false);

          if (document.querySelector('#quizletcardstitle').innerHTML === '') {
            let startdiv = document.createElement('div');
            startdiv.classList.add('quizletdiv');
            startdiv.innerHTML = '<p class="quizletp" style="width: 50%">Term</p><p class="quizletp" style="width: 50%">Definition</p>';
            document.querySelector('#quizletcardstitle').append(startdiv);
          }

          let array = links[0].info;
          for (let i = 0; i < array.length/2; i++) {
            let div = document.createElement('div');
            div.classList.add('quizletdiv');
            div.innerHTML = `<p class="quizletp" style="width: 50%">${array[i]}</p><p class="quizletp" style="width: 50%">${array[i+1]}</p>`;
            document.querySelector('#quizletcards').append(div);
          }
        }
        return unsub;
      })
    }
  }, [User])

  function signout() {
    signOut(auth);
  }
  return (
    <div className="App">
        <img className='absolute w-full h-[100vh] z-[-1] object-cover blur-[1px]' src={`../images/pattern.png`}/>
        {User && <div onClick={signout} className='hover hover:underline rounded-[15px] bg-gray-400 text-xl absolute right-5 top-3 text-white font-bold px-4 py-2'>Log out</div>}
        {!loading && !User && <h2 className='absolute top-[20%] left-2/4 z-[3] -translate-x-2/4 -translate-y-2/4 text-[3rem] w-full md:text-[4rem] font-bold text-white text-center'>Welcome to my Tower Game!</h2>}
      { loading ? <div></div> :
        User ? <div id="infobar" className='absolute flex flex-col items-center bg-blue-600 w-[80%] h-[80%] top-2/4 left-2/4 z-[3] -translate-x-2/4 -translate-y-2/4'>
          <div className='flex flex-col justify-center items-center' id="menu">
            <p className='text-white text-[4rem] mt-8'>Menu</p>
            <div onClick={() => {setmode('create'); document.querySelector('#menu').style.display = 'none'}} className='bg-gradient-to-r from-green-400 to-green-600 rounded-[15px] text-white font-bold text-3xl px-8 py-2 mb-8 mt-10 hover hover:underline'>Create Game</div>
            <div className='bg-gradient-to-r from-green-400 to-green-600 rounded-[15px] text-white font-bold text-3xl px-8 py-2 hover hover:underline'>Join Game</div>
          </div>
          
          <div id="creategame" className='w-full' style={{display: mode === 'create' ? 'block' : 'none'}}>
            {
              linksubmissionloading ? <div className='flex flex-col justify-center items-center'>
                <p className='text-2xl mb-2'>Loading your flashcard info</p>
                <img className='w-[25%]' src="https://media0.giphy.com/media/xTk9ZvMnbIiIew7IpW/giphy.gif"/>
              </div> : <div className='flex flex-col items-center w-full mt-4'>
                <div onClick={() => {setmode('none'); document.querySelector('#menu').style.display = 'flex'}} className='text-black font-bold absolute top-2 left-4 text-xl hover hover:underline'>Back to Menu</div>
                <p className='text-2xl text-white'>Enter link of your quizlet</p>
                <input className='w-[60%] my-2 border-solid border-black border-2 px-2 bg-white' ref={text} type="text"/>
                <input className='hover hover:underline border-solid mb-8 text-xl bg-green-500 font-bold text-white px-[4rem] py-[0.2rem] rounded-[20px] mt-2' onClick={submitClick} type="submit"/>
                <div id="quizletcardscontainer">
                  <div id="quizletcardstitle"></div>
                  <div id="quizletcards"></div>
                  <div className='hidden hover' id="startgamebutton">Start Game</div>
                </div>
              </div>
            }
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
