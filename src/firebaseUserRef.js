// firebaseUserRef.js
import { auth, db } from "./firebase";
import { doc } from "firebase/firestore";

let userRef = null;

auth.onAuthStateChanged((user) => {
  if (user) {
    // User signed in → store their Firestore doc reference
    userRef = doc(db, "Users", user.uid);
    console.log("User logged in:", user.email);
  } else {
    // User signed out → clear reference
    userRef = null;
    console.log("No user logged in");
  }
});

export function getUserRef() {
  if (!userRef) throw new Error("No user is currently logged in");
  return userRef;
}
