import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "./firebaseConfig.js";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";

// Function to load and display the user's saved craves
async function loadCraves(userId) {
    const cravesRef = collection(db, "users", userId, "craves");
    const querySnapshot = await getDocs(cravesRef);
    const container = document.getElementById("cravesContainer");
    container.innerHTML = ""; // Clear any previous content

    if (querySnapshot.empty) {
        container.innerHTML = "<p>No craved restaurants found.</p>";
        return;
    }

    querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const card = document.createElement("div");
        card.className = "flex flex-col bg-white rounded-2xl shadow px-3 py-2 w-full max-w-sm";

        // Create the restaurant card
        card.innerHTML = `
      <div class="flex flex-row justify-between w-full font-bold">
        <span>${data.name}</span>
        <span>${data.distance} km</span>
      </div>
      <div class="flex flex-row justify-between items-center mt-2">
        <div class="bg-gray-300 px-2 py-1 rounded-2xl">Menu</div>
        <div class="bg-gray-300 px-2 py-1 rounded-2xl">Reserve</div>
        <div class="bg-gray-300 px-2 py-1 rounded-2xl">Photos</div>
        <img src="${data.image}" class="w-20 h-20 object-cover rounded-2xl">
      </div>
      <div class="mt-2 text-right">
        <button class="bg-red-500 text-white px-2 py-1 rounded-lg" data-id="${docSnapshot.id}">Remove</button>
      </div>
    `;

        // Append the card to the container
        container.appendChild(card);

        // Add event listener for the remove button
        const removeButton = card.querySelector("button");
        removeButton.addEventListener("click", async (event) => {
            const docId = event.target.getAttribute("data-id");
            await removeCrave(userId, docId);
            loadCraves(userId); // Refresh the list after deletion
        });
    });
}

// Function to remove a crave from Firestore
async function removeCrave(userId, docId) {
    const cravesRef = doc(db, "users", userId, "craves", docId);
    await deleteDoc(cravesRef);
    console.log(`Removed crave with ID: ${docId}`);
}

// Listen for authentication state change to get the current user
onAuthStateChanged(getAuth(), (user) => {
    if (user) {
        // User is logged in
        loadCraves(user.uid);
    } else {
        // User is not logged in, handle accordingly (e.g., show login prompt)
        console.log("No user is logged in.");
        document.getElementById("cravesContainer").innerHTML = "<p>Please log in to see your Craves.</p>";
    }
});
