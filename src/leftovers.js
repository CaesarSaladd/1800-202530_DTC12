import { db, auth } from "./firebaseConfig.js";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";

const clearBtn = document.getElementById("clearAllButton");

clearBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

    const userId = user.uid;

    if (!confirm("Are you sure you want to clear ALL leftovers? This will return them to your swiping pool.")) return;

    try {
        // Load all leftover docs
        const leftoversCol = collection(db, "users", userId, "leftovers");
        const snapshot = await getDocs(leftoversCol);

        const promises = [];

        snapshot.forEach((docSnap) => {
            const ref = doc(db, "users", userId, "leftovers", docSnap.id);
            promises.push(deleteDoc(ref));
        });

        // Delete all at once
        await Promise.all(promises);

        // Clear UI
        document.getElementById("LeftoversContainer").innerHTML = "";

        console.log("All leftovers removed successfully.");
    } catch (err) {
        console.error("Error clearing leftovers:", err);
    }
});


async function populateLeftovers() {
    auth.onAuthStateChanged(async (user) => {

        const CardTemplate = document.getElementById("Leftovers");
        const CardContainer = document.getElementById("LeftoversContainer");

        // Safety checks
        if (!CardTemplate) {
            console.error("Template element #Leftovers not found");
            return;
        }
        if (!CardContainer) {
            console.error("Container element #LeftoversContainer not found");
            return;
        }

        const userId = user ? user.uid : "guestUser";

        try {
            const leftoversCol = collection(db, "users", userId, "leftovers");
            const querySnapshot = await getDocs(leftoversCol);

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();

                const restaurantName = data.name || "Unnamed";
                const restaurantRating = data.rating || "N/A";
                const restaurantAddress = data.address || "N/A";

                const leftoverCardFragment = CardTemplate.content.cloneNode(true);

                const wholeCard = leftoverCardFragment.querySelector(".LeftoverCard");

                leftoverCardFragment.querySelector(".LeftoverName").textContent = restaurantName;
                leftoverCardFragment.querySelector(".LeftoverReview").textContent = restaurantRating + "★";
                leftoverCardFragment.querySelector(".LeftoverAddress").textContent = restaurantAddress;

                const deleteButton = leftoverCardFragment.querySelector(".delButton");

                deleteButton.addEventListener("click", async () => {
                    try {
                        await deleteDoc(doc(db, "users", userId, "leftovers", docSnap.id));
                        wholeCard.remove();
                    } catch (err) {
                        console.error("Error deleting item:", err);
                    }
                });

                // Append the card to the container
                CardContainer.appendChild(wholeCard);
            });

        } catch (error) {
            console.error("Error loading leftovers:", error);
        }
    });
}

document.addEventListener("click", (event) => {
    // If a dropdown button was clicked, toggle that dropdown
    const button = event.target.closest(".dropdownBtn");
    if (button) {
        const dropdown = button.nextElementSibling;
        dropdown.classList.toggle("hidden");
    }
});


populateLeftovers();