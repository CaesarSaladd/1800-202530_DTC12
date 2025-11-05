import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { auth } from "./firebaseConfig.js";
import { db } from "./firebaseConfig.js";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";


async function addToCrave(parentElement, restaurantData) {
  auth.onAuthStateChanged(async (user) => {
    let userId;

    if (user) {
      userId = user.uid;
    } else {
      userId = "guestUser";
    }

    let addToCraves = document.createElement("button");
    addToCraves.className = "h-6 w-6 px-2 text-blue-400 rounded-lg hover:bg-orange-300 font-bold";
    addToCraves.innerHTML = "+";

    addToCraves.addEventListener("click", async () => {
      try {
        let cravesRef = collection(db, "users", userId, "craves");

        // Check if this restaurant is already in the user's Craves
        let currentDoc = await getDocs(cravesRef);

        // Check if any documents were returned
        let isAlreadyInCraves = currentDoc.docs.some(doc => doc.data().name === restaurantData.name);

        if (isAlreadyInCraves) {
          alert(`${restaurantData.name} is already in your Craves.`);
          return;
        }

        // Add to Firestore
        await addDoc(cravesRef, {
          name: restaurantData.name,
          address: restaurantData.formattedAddress || "No address available",
          rating: restaurantData.rating || "N/A",
          added_at: serverTimestamp(),
        });

        alert(`${restaurantData.name} added to your Craves!`);
      } catch (error) {
        alert("Failed to add to Craves. Please try again.");
      }
    });

    parentElement.appendChild(addToCraves);
  });
}


// --- SEED FILTERS (if empty) ---
async function addFilterData() {
  const filterRef = collection(db, "filters");
  await addDoc(filterRef, { code: "BNGC", filter: "Cuisine", details: "Choose one or more cuisines", last_updated: serverTimestamp() });
  await addDoc(filterRef, { code: "BNGR", filter: "Reviews", details: "Look through user reviews of the restaurant", last_updated: serverTimestamp() });
  await addDoc(filterRef, { code: "BNGP", filter: "Price", details: "Check the average price per person", last_updated: serverTimestamp() });
}

// --- SEED RESTAURANTS (if empty) ---
async function addRestaurantData() {
  const restRef = collection(db, "restaurants");
  await addDoc(restRef, { name: "Cactus Club Cafe", distance: 0.5, filter: "Cuisine", image: "./images/salmon.png" });
  await addDoc(restRef, { name: "Miku", distance: 0.8, filter: "Cuisine", image: "./images/salmon.png" });
  await addDoc(restRef, { name: "Tap & Barrel", distance: 1.2, filter: "Price", image: "./images/salmon.png" });
  await addDoc(restRef, { name: "Earls", distance: 1.5, filter: "Reviews", image: "./images/salmon.png" });
}

// --- SEED DATA IF EMPTY ---
async function seedCollection(name, seedFn) {
  const ref = collection(db, name);
  const snapshot = await getDocs(ref);
  if (snapshot.empty) {
    console.log(`${name} is empty. Seeding data...`);
    await seedFn();
  }
}

// --- LOAD FILTERS INTO DROPDOWN ---
async function loadFilters() {
  const filterRef = collection(db, "filters");
  const querySnapshot = await getDocs(filterRef);
  const dropdown = document.getElementById("myDropdown");
  dropdown.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const li = document.createElement("li");
    li.textContent = data.filter;
    li.className = "pr-4 py-2 hover:bg-gray-100 cursor-pointer";

    // When a filter is clicked, load restaurants
    li.addEventListener("click", () => {
      document.getElementById("filterTitle").textContent = data.filter + " Results";
      loadRestaurantsByFilter(data.filter);
      document.getElementById("myDropdown").classList.add("hidden"); // hide dropdown after selection
    });

    dropdown.appendChild(li);
  });
  console.log("Filters loaded into dropdown.");
}

// --- LOAD RESTAURANTS BASED ON FILTER ---
async function loadRestaurantsByFilter(filterName) {
  const restRef = collection(db, "restaurants");
  const q = query(restRef, where("filter", "==", filterName));
  const snapshot = await getDocs(q);
  const container = document.getElementById("resultsContainer");
  container.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();
    const card = document.createElement("div");
    card.className = "flex flex-col bg-white rounded-2xl shadow px-3 py-2 w-full max-w-sm";

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
    `;
    container.appendChild(card);
  });

  if (snapshot.empty) {
    container.innerHTML = `<p class="text-gray-500 italic">No results found for "${filterName}".</p>`;
  }
}

// --- INIT ON PAGE LOAD ---
window.addEventListener("DOMContentLoaded", async () => {
  await seedCollection("filters", addFilterData);
  await seedCollection("restaurants", addRestaurantData);
  await loadFilters();
});

// --- DROPDOWN SHOW/HIDE ---
function myDropdown() {
  const dropdown = document.getElementById("myDropdown");
  dropdown.classList.toggle("hidden");
}
window.myDropdown = myDropdown;

// --- GOOGLE MAPS INTEGRATION --- //
let map, service, userLocation;
let markers = [];

// Wait until Google Maps API is available
function waitForGoogleMaps() {
  return new Promise((resolve) => {
    if (window.google?.maps?.places) return resolve();
    const check = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });
}

// Clear all existing markers
function clearMarkers() {
  for (const m of markers) m.setMap(null);
  markers = [];
}

// Perform nearby restaurant search
async function findNearbyRestaurants(location, keyword) {
  const { Place } = await google.maps.importLibrary("places");

  const latLng = new google.maps.LatLng(location.lat, location.lng);
  const request = {
    textQuery: keyword ? `${keyword} restaurant` : "restaurants near me",
    fields: ["displayName", "formattedAddress", "location", "rating"],
    locationBias: { center: latLng, radius: 1500 },
  };

  try {
    const { places } = await Place.searchByText(request);
    const container = document.getElementById("resultsContainer");
    container.innerHTML = "";
    clearMarkers();

    if (!places || !places.length) {
      container.innerHTML = `<p class="text-gray-600">No restaurants found.</p>`;
      return;
    }

    places.forEach((place) => {
      if (place.location) {
        const marker = new google.maps.Marker({
          map,
          position: place.location,
          title: place.displayName,
        });
        markers.push(marker);
      }

      const card = document.createElement("div");
      card.className = "bg-white w-full px-3 py-2 rounded-2xl shadow";
      card.innerHTML = `
        <div class = "flex justify-between mb-2> <h3 class="font-bold">${place.displayName}</h3>  </div>
        
        <p>${place.formattedAddress || "No address available"}</p>
        <p class="text-yellow-600">⭐ ${place.rating || "N/A"}</p>
      `;
      const headerDiv = card.querySelector("div");
      addToCrave(headerDiv, {
        name: place.displayName,
        formattedAddress: place.formattedAddress,
        rating: place.rating,
        distance: place.distance,
      });
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Places search failed:", err);
    document.getElementById("resultsContainer").innerHTML =
      `<p class="text-gray-600">Error retrieving restaurants.</p>`;
  }
}





// Initialize map only after library + DOM are ready
async function initMap() {
  const defaultLoc = { lat: 49.282868, lng: -123.125032 };
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLoc,
    zoom: 14,
  });

  // Create the Places service
  service = new google.maps.places.PlacesService(map);

  // Helper to start the first search once map finishes rendering
  const startSearch = (loc) => {
    userLocation = loc || defaultLoc;
    map.setCenter(userLocation);

    google.maps.event.addListenerOnce(map, "idle", () => {
      findNearbyRestaurants(userLocation, "");
    });
  };

  // Geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => startSearch({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => startSearch(defaultLoc)
    );
  } else {
    startSearch(defaultLoc);
  }

  // Attach search handlers
  const searchBtn = document.getElementById("searchButton");
  const searchInput = document.getElementById("searchInput");
  if (searchBtn && searchInput) {
    const triggerSearch = () => {
      const keyword = searchInput.value.trim();
      findNearbyRestaurants(userLocation, keyword);
    };
    searchBtn.addEventListener("click", triggerSearch);
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") triggerSearch();
    });
  }
}

// --- INIT ON PAGE LOAD ---
window.addEventListener("DOMContentLoaded", async () => {
  await seedCollection("filters", addFilterData);
  await seedCollection("restaurants", addRestaurantData);
  await loadFilters();


  await waitForGoogleMaps();
  initMap();
});

