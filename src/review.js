import { auth } from "./firebaseConfig.js";
import { db } from "./firebaseConfig.js";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

var restaurantDocID = localStorage.getItem('restaurantDocID');

auth.onAuthStateChanged(user => {
    if (user) {
        displayRestaurantName(restaurantDocID, user.uid);
    } else {
        console.error("User not logged in");
    }
});

async function displayRestaurantName(id, userId) {
    try {
        const restaurantRef = doc(db, "users", userId, "craves", id);
        const restaurantSnap = await getDoc(restaurantRef);

        if (restaurantSnap.exists()) {
            const restaurantName = restaurantSnap.data().name;
            document.getElementById("restaurantName").textContent = restaurantName;
        } else {
            console.log("No such restaurant found!");
        }
    } catch (error) {
        console.error("Error getting restaurant document:", error);
    }
}

//Add event listener to stars after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    manageStars();
});

let restaurantRating = 0;
function manageStars() {
    // ⭐ Make star icons clickable and calculate rating
    const stars = document.querySelectorAll('.star');

    // Step 1️⃣ – Add click behavior for each star
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            // Fill all stars up to the one clicked
            stars.forEach((s, i) => {
                s.textContent = i <= index ? 'star' : 'star_outline';
            });
            // Save rating value
            restaurantRating = index + 1;
            console.log("Current rating:", restaurantRating);
        });
    });
}

async function writeReview() {
    console.log("Inside write review");

    // 🧾 Collect form data
    const restaurantDescription = document.getElementById("description").value;

    // Log collected data for verification
    console.log("inside write review, rating =", restaurantRating);

    // simple validation
    if (!restaurantDescription) {
        alert("Please complete all required fields.");
        return;
    }

    const user = auth.currentUser;

    if (user) {
        try {
            const userID = user.uid;

            // 📝 Add a new review document
            // Extra: Let’s toss in the server timestamp as well.   
            // We can do this with one extra line of code.   
            // Reference: https://cloud.google.com/firestore/docs/manage-data/add-data#server_timestamp 

            const restaurantRef = doc(db, "users", userID, "craves", restaurantDocID);
            const restaurantSnap = await getDoc(restaurantRef);

            if (!restaurantSnap.exists()) {
                console.error("Restaurant data not found.");
                return;
            }

            const restaurantData = restaurantSnap.data();
            const restaurantName = restaurantData.name;
            const restaurantAddress = restaurantData.address;


            await addDoc(collection(db, "users", userID, "reviews"), {
                restaurantDocID: restaurantDocID,
                restaurantName: restaurantName,
                restaurantAddress: restaurantAddress,
                userID: userID,
                description: restaurantDescription,
                rating: restaurantRating,
                timestamp: serverTimestamp()
            });

            console.log("Review successfully written!");

            window.location.href = "profile.html";


        } catch (error) {
            console.error("Error adding review:", error);
        }
    } else {
        console.log("No user is signed in");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    manageStars();

    // 👇👇👇 Add these two lines
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.addEventListener('click', writeReview);

    const cancelBtn = document.getElementById('cancelBtn');
    cancelBtn.addEventListener('click', () => {
        window.location.href = "profile.html";
    });
});
