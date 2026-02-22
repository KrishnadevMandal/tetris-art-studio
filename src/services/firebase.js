// src/services/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKxmnbmghCYqgwtg4F9LL5gUlWHyl-9II",
  authDomain: "tetris-art-studio-b9f20.firebaseapp.com",
  projectId: "tetris-art-studio-b9f20",
  storageBucket: "tetris-art-studio-b9f20.firebasestorage.app",
  messagingSenderId: "873312149160",
  appId: "1:873312149160:web:aadabeac09c6a61eb16c9d",
  measurementId: "G-SC5YZ8JNWJ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

