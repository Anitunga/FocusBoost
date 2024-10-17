import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider} from "firebase/auth";
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
const googleProvider = new GoogleAuthProvider();

export { auth };
export { googleProvider };