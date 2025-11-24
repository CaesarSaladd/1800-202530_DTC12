import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig.js";

document.addEventListener("DOMContentLoaded", () => {
    const fieldset = document.getElementById("personalInfoFields");
    const editBtn = document.getElementById("editButton");
    const saveBtn = document.getElementById("saveButton");
    const usernameInput = document.getElementById("nameInput");

    saveBtn.disabled = true; // save disabled initially

    // Load "name" from Firestore
    onAuthStateChanged(auth, async (user) => {
        if (!user) return console.log("No user signed in");

        try {
            const userRef = doc(db, "users", user.uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) return console.log("User document not found");

            const data = snap.data();
            usernameInput.value = data.name || "";  // <-- now using "name"
        } catch (err) {
            console.error("Error loading name:", err);
        }
    });

    // Enable editing
    editBtn.addEventListener("click", () => {
        fieldset.disabled = false;
        editBtn.disabled = true;
        saveBtn.disabled = false;
    });

    // Save to Firestore
    saveBtn.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in first.");
            return;
        }

        const name = usernameInput.value.trim();
        if (!name) {
            alert("Name cannot be empty.");
            return;
        }

        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { name });  // <-- write to "name"
            await updateProfile(user, { displayName: name });
            console.log("Name successfully updated:", name);

            // Disable editing again
            fieldset.disabled = true;
            editBtn.disabled = false;
            saveBtn.disabled = true;
        } catch (err) {
            console.error("Error saving name:", err);
            alert("Could not save name: " + err.message);
        }
    });
});
