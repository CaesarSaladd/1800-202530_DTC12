// Fix Swing.js ReferenceError: global is not defined
if (typeof global === "undefined") {
  window.global = window;
}


import { Stack, Direction } from "swing";
import { db, auth } from "./firebaseConfig.js";
import { addDoc, collection, serverTimestamp, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Load google maps
async function waitForGoogleMaps() {
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

// Load restaurants
async function loadNearbyRestaurants() {
    const defaultLocation = { lat: 49.282868, lng: -123.125032 };
    const apiKey = "AIzaSyDKJe5Ga1Zc1anQ8ivg617LvGaChAy8aE4";

    const response = await fetch(
        `https://places.googleapis.com/v1/places:searchText?key=${apiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Goog-FieldMask":
                    "places.displayName,places.formattedAddress,places.priceLevel,places.rating,places.photos,places.types",
            },
            body: JSON.stringify({
                textQuery: "restaurants near Downtown Vancouver",
                locationBias: {
                    circle: {
                        center: {
                            latitude: defaultLocation.lat,
                            longitude: defaultLocation.lng,
                        },
                        radius: 2000.0,
                    },
                },
                maxResultCount: 15,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Places API HTTP error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Fetched Places data:", data);

    if (!data.places || data.places.length === 0) {
        throw new Error("No restaurants found.");
    }

    // Convert photo URIs to usable URLs
    return data.places.map((p) => {
        const photoRef = p.photos?.[0]?.name;
        const photoUrl = photoRef
            ? `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=400&maxHeightPx=400&key=${apiKey}`
            : "https://storage.googleapis.com/support-kms-prod/SNP_2752125_en_v0";

        return {
            name: p.displayName?.text || "Unnamed Restaurant",
            formatted_address: p.formattedAddress || "No address available",
            rating: p.rating || "N/A",
            price_level: p.priceLevel || "N/A",
            types: p.types || [],
            photoUrl,
        };
    });
}



// Check user logged in
onAuthStateChanged(auth, async (user) => {
    await waitForGoogleMaps();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    console.log("Logged in as:", user.email);

    // Load nearby restaurant data from Google
    let restaurants = [];
    try {
        restaurants = await loadNearbyRestaurants();
        console.log("Loaded restaurants:", restaurants.map(r => r.displayName || r.name));
        // --- Load user's existing swipes (craves + leftovers) ---
        const craveRef = collection(db, "users", user.uid, "craves");
        const leftoverRef = collection(db, "users", user.uid, "leftovers");

        const craveDocs = await getDocs(craveRef);
        const leftoverDocs = await getDocs(leftoverRef);

        // Combine restaurant names user already swiped
        const previouslySwiped = new Set([
            ...craveDocs.docs.map(d => d.data().name),
            ...leftoverDocs.docs.map(d => d.data().name)
        ]);

        // Filter out previously swiped restaurants
        restaurants = restaurants.filter(r => !previouslySwiped.has(r.name));

        console.log("After filtering:", restaurants.map(r => r.name));
        
        // If no restaurants remain after filtering, show message and stop
        if (restaurants.length === 0) {
            document.getElementById("status").textContent =
                "No more restaurants nearby!";
            return;
        }


    } catch (err) {
        console.error(err);
        document.getElementById("status").textContent = "Failed to load restaurants.";
        return;
    }

    const cardContainer = document.getElementById("card-container");
    cardContainer.innerHTML = ""; // clear any previous cards

    // Create swipeable cards dynamically for each restaurant
    restaurants.forEach((place) => {
        const name = place.name || "Unnamed Restaurant";
        const rating = place.rating || "N/A";
        const priceSigns = place.price_level && !isNaN(place.price_level)
            ? "$".repeat(place.price_level)
            : "N/A";
        const address = place.formatted_address || "No address available";
        const photoUrl = place.photoUrl || "https://storage.googleapis.com/support-kms-prod/SNP_2752125_en_v0";

        const card = document.createElement("div");
        card.className = "card bg-white p-4 rounded-2xl shadow-lg absolute inset-0 flex flex-col justify-between text-center transition-all";

        card.innerHTML = `
            <div class="relative w-full h-full rounded-2xl overflow-hidden">
                <img src="${photoUrl}" alt="${name}" class="absolute inset-0 w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                
                <div class="absolute bottom-0 p-4 text-left text-white">
                    <h2 class="text-xl font-bold drop-shadow-md mb-1">${name}</h2>
                    <p class="text-sm opacity-90">${address}</p>
                    <div class="flex items-center mt-1 text-yellow-400 text-sm">
                        <span>⭐ ${rating}</span>
                        <span class="ml-2 text-gray-200">${priceSigns}</span>
                    </div>
                    <p class="text-xs text-gray-300 mt-1">${place.types?.[0] || "Restaurant"}</p>
                </div>
            </div>
        `;

        cardContainer.appendChild(card);
    });


    // Initialize the Swing.js stack once
    const stack = Stack();
    const cardElements = Array.from(document.querySelectorAll(".card"));

    // Bind cards to the stack immediately after creating them
    cardElements.forEach((card) => {
    card.style.cursor = "grab";
    stack.createCard(card);
    });

    // Handle swipe directions
    stack.on("throwout", async (e) => {
    const restaurantName = e.target.querySelector("h2").textContent;
    const address = e.target.querySelector("p").textContent;
    const ratingEl = e.target.querySelector("span");
    const rating = ratingEl ? ratingEl.textContent.replace("⭐ ", "") : "N/A";

    const isCrave = e.throwDirection === Direction.RIGHT;
    const targetCollection = isCrave ? "craves" : "leftovers";
    const status = document.getElementById("status");

    // Feedback text
    status.textContent = isCrave
        ? `You crave ${restaurantName}!`
        : `You left ${restaurantName} as leftovers!`;

    const userRef = collection(db, "users", user.uid, targetCollection);
    const existingDocs = await getDocs(userRef);
    const alreadyExists = existingDocs.docs.some(
        (doc) => doc.data().name === restaurantName
    );

    if (!alreadyExists) {
        await addDoc(userRef, {
        name: restaurantName,
        address,
        rating,
        added_at: serverTimestamp(),
        });
        console.log(`${restaurantName} added to ${targetCollection}.`);
    }

    // Remove card after animation ends
    setTimeout(() => {
        e.target.remove();
        if (!cardContainer.children.length) {
        status.textContent = "No more restaurants nearby!";
        }
    }, 300); 
    });
    stack.on("throwin", (e) => {
    e.target.style.transform = "";
    e.target.style.opacity = "";
    document.getElementById("status").textContent = "";
    });



});

