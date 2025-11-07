import { auth } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { logoutUser } from "./authentication.js";

// Chekc if user logged in
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
});

// Logout button
document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await logoutUser();
            console.log("Logged out");
        } 
        catch (error) {
        console.error("Logout error:", error);
        alert("Logout failed. Please try again.");
        }
    });
}
});
