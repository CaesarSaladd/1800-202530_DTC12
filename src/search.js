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
    await waitForGoogleMaps();
    initMap();
});

// --------- ADD TO CRAVES ----------
async function addToCrave(parentElement, restaurantData) {
    const user = window.currentUser;
    if (!user) return alert("Please log in first.");

    const userId = user.uid;
    const cravesRef = collection(db, "users", userId, "craves");
    const existing = await getDocs(cravesRef);
    const alreadyThere = existing.docs.some(d => d.data().name === restaurantData.name);
    if (alreadyThere) return alert(`${restaurantData.name} is already in your Craves.`);

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

function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

function waitForGoogleMaps() {
    return new Promise(resolve => {
        if (window.google?.maps?.places) return resolve();
        const check = setInterval(() => {
        if (window.google?.maps?.places) {
            clearInterval(check);
            resolve();
        }
        }, 100);
    });
}

async function findNearbyRestaurants(location, keyword) {
    const { places } = await google.maps.importLibrary("places");
    const latLng = new google.maps.LatLng(location.lat, location.lng);

    const request = {
        query: keyword ? `${keyword} restaurant` : "restaurants near me",
        location: latLng,
        radius: 1500,
    };

    service.textSearch(request, (results, status) => {
        const container = document.getElementById("resultsContainer");
        container.innerHTML = "";
        clearMarkers();

        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
        container.innerHTML = `<p class="text-gray-600">No restaurants found.</p>`;
        return;
        }

        results.forEach((place) => {
        if (place.geometry?.location) {
            const marker = new google.maps.Marker({
            map,
            position: place.geometry.location,
            title: place.name,
            });
            markers.push(marker);
        }

        const card = document.createElement("div");
        card.className = "bg-white w-full px-3 py-2 rounded-2xl shadow";
        card.innerHTML = `
            <div class="flex justify-between mb-2">
            <h3 class="font-bold">${place.name}</h3>
            </div>
            <p>${place.formatted_address || "No address available"}</p>
            <p class="text-yellow-600">⭐ ${place.rating || "N/A"}</p>
        `;
        const headerDiv = card.querySelector("div");
        addToCrave(headerDiv, {
            name: place.name,
            formattedAddress: place.formatted_address,
            rating: place.rating,
        });
        container.appendChild(card);
        });
    });
}

async function initMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { places } = await google.maps.importLibrary("places");

    const map = new Map(document.getElementById("map"), {
        center: { lat: 49.282868, lng: -123.125032 },
        zoom: 14,
    });

    const service = new places.PlacesService({ map });

    const search = (keyword, location) => {
        const request = {
            query: keyword || "restaurants",
            location,
            radius: 1500,
        };
        service.textSearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                console.log(results);
            }
        });
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => search("", { lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => search("", { lat: 49.282868, lng: -123.125032 })
        );
    } else {
        search("", { lat: 49.282868, lng: -123.125032 });
    }
}
