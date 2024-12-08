import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, User } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
//import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyCBZOzWrFHUgZokkVNKHIVGyNMLVS2BP14",
    authDomain: "pomodoro-timer-4b34c.firebaseapp.com",
    projectId: "pomodoro-timer-4b34c",
    storageBucket: "pomodoro-timer-4b34c.appspot.com",
    messagingSenderId: "550934383322",
    appId: "1:550934383322:web:579eee6d7f64ff864333e3",
    measurementId: "G-WECBLCDBFR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Fonction pour créer/initialiser le document utilisateur
const createUserDocument = async (user: User) => {
  if (!user) return;
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const defaultData = {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL || require('../assets/images/user.png'),
      points: 0,
      hasLotteryTicket: false,
      tickets: 0,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(userRef, defaultData);
    } catch (error) {
      console.error("Error creating user document:", error);
    }
  }
};

export { auth, db, storage, googleProvider, createUserDocument };
