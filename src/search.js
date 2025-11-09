import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

// --------- AUTH CHECK ----------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    window.currentUser = user;
    console.log("Logged in as:", user.email);

    initMap(); // load map and restaurant data
});

// --------- ADD TO CRAVES ----------
async function addToCrave(parentElement, restaurantData) {
    const user = window.currentUser;
    if (!user) return alert("Please log in first.");

    const userId = user.uid;
    const cravesRef = collection(db, "users", userId, "craves");

    // Fetch all current Craves for this user to prevent duplicates
    const existing = await getDocs(cravesRef);
    const alreadyThere = existing.docs.some(d => d.data().name === restaurantData.name);
    if (alreadyThere) return alert(`${restaurantData.name} is already in your Craves.`);

    // Add a new restaurant document
    await addDoc(cravesRef, {
        name: restaurantData.name,
        address: restaurantData.formattedAddress || "No address available",
        rating: restaurantData.rating || "N/A",
        added_at: serverTimestamp(),
    });

    alert(`${restaurantData.name} added to Craves!`);
}

// --------- MAP + PLACES SETUP ----------
let map, service, markers = [];


// Remove all markers from the map before new search results
function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

// function waitForGoogleMaps() {
//     return new Promise(resolve => {
//         if (window.google?.maps?.places) return resolve();
//         const check = setInterval(() => {
//         if (window.google?.maps?.places) {
//             clearInterval(check);
//             resolve();
//         }
//         }, 100);
//     });
// }

// Use Google API to text search restaurants based on user location or keyword search
async function findNearbyRestaurants(location, keyword) {
    const latLng = new google.maps.LatLng(location.lat, location.lng);

    const request = {
        query: keyword ? `${keyword} restaurant` : "restaurants near me",
        location: latLng,
        radius: 1500,
    };

    const service = new google.maps.places.PlacesService(map);


    service.textSearch(request, (results, status) => {
        const container = document.getElementById("resultsContainer");
        container.innerHTML = "";
        clearMarkers();

        // Handle errors or empty results
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
            container.innerHTML = `<p class="text-gray-600">No restaurants found.</p>`;
            return;
        }

        // Loop through each returned restaurant
        results.forEach((place) => {
            // Create a map marker if restaurant exists
            if (place.geometry?.location) {
                const marker = new google.maps.Marker({map, position: place.geometry.location, title: place.name,
                });
                markers.push(marker);
            }

            // Restaurant info card
            const card = document.createElement("div");
            card.className = "bg-white w-full px-3 py-2 rounded-2xl shadow";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold">${place.name}</h3>
                </div>
                <p>${place.formatted_address || "No address available"}</p>
                <p class="text-yellow-600">⭐ ${place.rating || "N/A"}</p>
            `;
            // Create an "Add to Craves" button
            const addButton = document.createElement("button");
            addButton.textContent = "+";
            addButton.className = "ml-2 bg-orange-300 text-white px-3 py-1 rounded-full hover:bg-orange-400 font-bold flex-shrink-0 self-start";

            // "+" adds restaurant to Firestore
            addButton.addEventListener("click", async () => {
                await addToCrave(addButton, {
                    name: place.name,
                    formattedAddress: place.formatted_address,
                    rating: place.rating,
                });
                // Disable button after clicked
                addButton.textContent = "✓ Added";
                addButton.disabled = true;
                addButton.classList.add("opacity-70");
            });

            // Add button to card
            const headerDiv = card.querySelector("div");
            headerDiv.appendChild(addButton);

            container.appendChild(card);
        });
    });
}

// Initialize map function, this loads user map using geolocation (to be implemented), default is downtown vancouver
// Also connects search bar and "go" button
async function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 49.282868, lng: -123.125032 },
        zoom: 14,
    });

    // Places services instance linked to map (from Google)
    const service = new google.maps.places.PlacesService(map);

    // Center mapp and search based on user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => findNearbyRestaurants({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 })
        );
    } else {
        findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 });
    }

    // Connect search bar functionality 
    const searchButton = document.getElementById("searchButton");
    const searchInput = document.getElementById("searchInput");

    if (searchButton && searchInput) {
        const handleSearch = () => {
            const keyword = searchInput.value.trim();
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => findNearbyRestaurants({ lat: pos.coords.latitude, lng: pos.coords.longitude }, keyword),
                    () => findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 }, keyword)
                );
            } else {
                findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 }, keyword);
            }
        };

        // Run when the Go button is clicked
        searchButton.addEventListener("click", handleSearch);

        // Run when Enter key is pressed
        searchInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault(); // stop form submission or reload
                handleSearch(); // use the same function as Go button
            }
        });
    }

}

