import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { db } from "./firebaseConfig.js";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";


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


// Profile Page section // 

