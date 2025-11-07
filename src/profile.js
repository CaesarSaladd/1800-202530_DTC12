import { auth } from "./firebaseConfig.js";
import { db } from "./firebaseConfig.js";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";


async function populateCrave() {
    auth.onAuthStateChanged(async (user) => {
        const craveCardTemplate = document.getElementById("craves");
        const craveCardContainer = document.getElementById("profCraves");  // The container where craves will be appended
        let userId;

        if (user) {
            userId = user.uid;
        } else {
            userId = "guestUser";
        }

        try {
            // Query the "craves" collection from Firestore
            const a = collection(db, "users", userId, "craves");
            const querySnapshot = await getDocs(a);

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                let restaurantName = data.name;
                let restaurantRating = data.rating || "N/A";  // Default to "N/A" if no rating
                let restaurantAddress = data.address || "N/A";

                // Clone the template content
                const craveCard = craveCardTemplate.content.cloneNode(true);

                // Update the cloned content with the data from Firestore
                craveCard.querySelector(".craveName").textContent = restaurantName;  // Update the restaurant name
                craveCard.querySelector(".craveReview").textContent = restaurantRating;  // Update the restaurant rating
                craveCard.querySelector(".craveAddress").textContent = restaurantAddress;

                // Append the cloned card to the container
                craveCardContainer.appendChild(craveCard);
            });
        } catch (error) {
            console.error("Error loading craves:", error);
        }
    });
}

populateCrave();
