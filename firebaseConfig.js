// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

export { auth }