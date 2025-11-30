import { db, auth } from "./firebaseConfig.js";
import { collection, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";


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
                const wholeCard = craveCard.querySelector("div.w-80");

                // Update the cloned content with the data from Firestore
                craveCard.querySelector(".craveName").textContent = restaurantName;  // Update the restaurant name
                craveCard.querySelector(".craveReview").textContent = restaurantRating + "★";  // Update the restaurant rating
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
                craveCard.querySelector(".writeReviewBtn").addEventListener("click", () => {
                    localStorage.setItem('restaurantDocID', docSnap.id);
                    window.location.href = 'review.html';
                });
                // Append the to the container
                craveCardContainer.appendChild(wholeCard);
            });
        } catch (error) {
            console.error("Error loading craves:", error);
        }
    });
}

// Same logic as populateCrave

async function populateReview() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) return;

        const reviewCardTemplate = document.getElementById("reviews");
        const reviewCardContainer = document.getElementById("profReviews");
        const userId = user.uid;

        try {
            const revRef = collection(db, "users", userId, "reviews");
            const querySnapshot = await getDocs(revRef);

            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();

                const restaurantName = data.restaurantName;
                const restaurantRating = data.rating || "N/A";
                const restaurantAddress = data.restaurantAddress || "N/A";
                const restaurantDescription = data.description || "";

                const reviewCard = reviewCardTemplate.content.cloneNode(true);
                const wholeCard = reviewCard.querySelector("div.w-80");

                reviewCard.querySelector(".reviewName").textContent = restaurantName;
                reviewCard.querySelector(".reviewRating").textContent = restaurantRating + "★";
                reviewCard.querySelector(".reviewAddress").textContent = restaurantAddress;
                reviewCard.querySelector(".reviewDescription").textContent = restaurantDescription;

                const deleteButton = reviewCard.querySelector(".delButton");
                deleteButton.addEventListener("click", async () => {
                    try {
                        await deleteDoc(doc(db, "users", userId, "reviews", docSnap.id));
                        wholeCard.remove();
                    } catch (err) {
                        console.log(err);
                    }
                });

                reviewCardContainer.appendChild(wholeCard);
            });

        } catch (error) {
            console.error("Error loading reviews:", error);
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

// Clear all craves function
async function clearAllCraves() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                console.log("No user logged in");
                resolve();
                return;
            }

            const userId = user.uid;
            const craveCardContainer = document.getElementById("profCraves");

            try {
                // Get all crave documents
                const cravesRef = collection(db, "users", userId, "craves");
                const querySnapshot = await getDocs(cravesRef);

                if (querySnapshot.empty) {
                    console.log("No craves to clear");
                    resolve();
                    return;
                }

                // Use batch delete for better performance
                const batch = writeBatch(db);
                querySnapshot.forEach((docSnap) => {
                    const docRef = doc(db, "users", userId, "craves", docSnap.id);
                    batch.delete(docRef);
                });

                await batch.commit();

                // Clear the UI
                craveCardContainer.innerHTML = "";

                console.log("All craves cleared successfully");
                resolve();
            } catch (error) {
                console.error("Error clearing craves:", error);
                resolve();
            }
        });
    });
}

// Add event listener for clear craves button
document.addEventListener("DOMContentLoaded", () => {
    const clearCravesBtn = document.getElementById("clearCravesBtn");
    if (clearCravesBtn) {
        clearCravesBtn.addEventListener("click", async () => {
            // Confirm before clearing
            const confirmed = confirm("Are you sure you want to clear all your craves? This action cannot be undone.");
            if (confirmed) {
                clearCravesBtn.disabled = true;
                clearCravesBtn.textContent = "Clearing...";
                await clearAllCraves();
                clearCravesBtn.disabled = false;
                clearCravesBtn.textContent = "Clear Craves";
            }
        });
    }
});

populateCrave();
populateReview();
