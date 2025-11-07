import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { auth } from "./firebaseConfig.js";

// Check if user logged in
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
    console.log("Logged in as:", user.email);
    initApp(user);
});

