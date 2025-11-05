import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebaseConfig.js";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";

