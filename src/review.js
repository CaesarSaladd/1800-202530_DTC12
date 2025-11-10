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

let hikeRating = 0;
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
            hikeRating = index + 1;
            console.log("Current rating:", hikeRating);
        });
    });
}



async function writeReview() {
    console.log("Inside write review");

    // 🧾 Collect form data
    const hikeDescription = document.getElementById("description").value;
    const hikeFlooded = document.querySelector('input[name="flooded"]:checked')?.value;
    const hikeScrambled = document.querySelector('input[name="scrambled"]:checked')?.value;

    // Log collected data for verification
    console.log("inside write review, rating =", hikeRating);
    console.log("hikeDocID =", hikeDocID);
    console.log("Collected review data:");
    console.log(hikeTitle, hikeLevel, hikeSeason, hikeDescription, hikeFlooded, hikeScrambled);

    // simple validation
    if (!hikeTitle || !hikeDescription) {
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
            await addDoc(collection(db, "reviews"), {
                hikeDocID: hikeDocID,   // make sure hikeDocID is defined globally or passed in
                userID: userID,
                title: hikeTitle,
                level: hikeLevel,
                season: hikeSeason,
                description: hikeDescription,
                flooded: hikeFlooded,
                scrambled: hikeScrambled,
                rating: hikeRating,
                timestamp: serverTimestamp()
            });

            console.log("Review successfully written!");

            window.location.href = `eachHike.html?docID=${hikeDocID}`;

            // 🎉 Optional: Say thank-you in a new page
            //window.location.href = "thanks.html"; // redirect to thank-you page

            // 🎉 Optional: Show thank-you modal instead of redirect
            const thankYouModal = new bootstrap.Modal(document.getElementById("thankYouModal"));
            thankYouModal.show();

        } catch (error) {
            console.error("Error adding review:", error);
        }
    } else {
        console.log("No user is signed in");
        //window.location.href = "review.html";
    }
}
