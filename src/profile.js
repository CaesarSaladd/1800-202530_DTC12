import { auth } from "./firebaseConfig.js";
<<<<<<< HEAD
import { db } from "./firebaseConfig.js";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";


async function populateCrave() {
    auth.onAuthStateChanged(async (user) => {
        const craveCardTemplate = document.getElementById("craves");
        const craveCardContainer = document.getElementById("profCraves");
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
                let restaurantRating = data.rating || "N/A";
                let restaurantAddress = data.address || "N/A";

                // Clone the template content
                const craveCard = craveCardTemplate.content.cloneNode(true);
                const wholeCard = craveCard.querySelector("div.w-80");

                // Update the cloned content with the data from Firestore
                craveCard.querySelector(".craveName").textContent = restaurantName;  // Update the restaurant name
                craveCard.querySelector(".craveReview").textContent = restaurantRating;  // Update the restaurant rating
                craveCard.querySelector(".craveAddress").textContent = restaurantAddress; // Update restaurant address
                let deleteButton = craveCard.querySelector(".delButton")

                // Delete button, remove from database
                deleteButton.addEventListener("click", async () => {
                    try {
                        await deleteDoc(doc(db, "users", userId, "craves", docSnap.id))
                        wholeCard.remove();
                    } catch (err) {
                        console.log(err)
                    }

                })
                // Append the to the container
                craveCardContainer.appendChild(wholeCard);
            });
        } catch (error) {
            console.error("Error loading craves:", error);
        }
    });
}

populateCrave();
=======
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
>>>>>>> ac46255 (Add swiping and logout button)
