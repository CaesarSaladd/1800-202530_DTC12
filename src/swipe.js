import { Stack, Direction } from "swing";
import { db, auth } from "./firebaseConfig.js";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Check if user logged in
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // Continue only if logged in
    const stack = Stack();

    document.querySelectorAll(".card").forEach((card) => {
        card.style.cursor = "grab";
        stack.createCard(card);
    });

    // Reset styles if card returns
    stack.on("throwin", (e) => {
        e.target.style.transform = "";
        e.target.style.opacity = "";
        document.getElementById("status").textContent = "";
    });

    // Swiping left or right
    stack.on("throwout", async (e) => {
        let userId = user
        const restaurant = e.target.textContent.trim();
        const isCrave = e.throwDirection === Direction.RIGHT;
        const action = isCrave ? "crave" : "leftover";
        const status = document.getElementById("status");

        status.textContent = isCrave ? `You crave ${restaurant}!` : `You left ${restaurant} as leftovers!`;

        // Save to Firestore tied to logged-in user
        await addDoc(collection(db, "swipes"), {
            userId: user.uid, restaurant, action, timestamp: serverTimestamp(),
        });

        e.target.remove();
    });
});
