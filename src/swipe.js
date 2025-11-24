    // Fix Swing.js ReferenceError: global is not defined
    if (typeof global === "undefined") {
    window.global = window;
    }

    let nextPageToken = null;
    let searchRadius = 1200;
    const MAX_RADIUS = 4000;

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

    async function getSearchCenter() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                console.warn("Geolocation not supported. Using default location.");
                return resolve({ lat: 49.2827, lng: -123.1207 });
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                }),
                () => resolve({ lat: 49.2827, lng: -123.1207 }),
                { enableHighAccuracy: true, timeout: 7000 }
            );
        });
    }

    let BASE_CENTER = null;
    let spiralAngle = 0;

    function getOffsetCenter(base, attempt) {
        const radiusKm = 0.005 * attempt; // ~500m per step outward
        spiralAngle += Math.PI / 4;      // rotate 45° per attempt

        return {
            lat: base.lat + radiusKm * Math.cos(spiralAngle),
            lng: base.lng + radiusKm * Math.sin(spiralAngle)
        };
    }



    let restaurants = [];

    async function loadNearbyRestaurants(minCount = 20, maxAttempts = 12, onBatchFound) {
        await waitForGoogleMaps();

        if (!BASE_CENTER) {
            BASE_CENTER = await getSearchCenter();
            console.log("Locked base center:", BASE_CENTER);
        }

        let total = [];
        let attempts = 0;

        while (attempts < maxAttempts && total.length < minCount) {
            const searchCenter = getOffsetCenter(BASE_CENTER, attempts);
            attempts++;

            console.log(`Attempt ${attempts} — Search center:`, searchCenter);

            const results = await new Promise((resolve) => {
                const service = new google.maps.places.PlacesService(document.createElement("div"));

                service.nearbySearch(
                    {
                        location: new google.maps.LatLng(searchCenter.lat, searchCenter.lng),
                        radius: searchRadius,
                        type: "restaurant",
                        keyword: "restaurant " + Math.random()
                    },
                    (res, status) => {
                        if (status !== google.maps.places.PlacesServiceStatus.OK) {
                            resolve([]);
                            return;
                        }
                        resolve(res || []);
                    }
                );
            });

            const allowedTypes = [
                "restaurant",
                "food",
                "meal_takeaway",
                "meal_delivery",
                "sit_down_restaurant",
                "fast_food_restaurant",
                "cafe",
                "coffee_shop",
                "burger_restaurant",
                "italian_restaurant",
                "chinese_restaurant",
                "japanese_restaurant",
                "korean_restaurant",
                "indian_restaurant",
                "asian_restaurant",
                "pizza_restaurant"
            ];

            const filtered = results.filter(p => {
                const t = p.types || [];
                return t.some(type => allowedTypes.includes(type));
            });


            let mapped = filtered.map(p => ({
                id: p.place_id,
                name: p.name,
                formatted_address: p.vicinity || "No address",
                rating: p.rating || "N/A",
                price_level: p.price_level || "N/A",
                types: p.types || [],
                photoUrl: p.photos?.[0]?.getUrl({ maxWidth: 500 }) ||
                    "https://storage.googleapis.com/support-kms-prod/SNP_2752125_en_v0"
            }));

            // REMOVE duplicates so we don’t show the same restaurant twice
            mapped = mapped.filter(m => !total.some(t => t.id === m.id));

            // ADD the new restaurants
            total.push(...mapped);

            // STREAM THE NEW RESTAURANTS TO UI
            if (onBatchFound && mapped.length > 0) {
                onBatchFound(mapped);
            }

            console.log("Total so far:", total.length);
        }

        return total;
    }

    // Check user logged in
onAuthStateChanged(auth, async (user) => {
    await waitForGoogleMaps();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    console.log("Logged in as:", user.email);

    const cardContainer = document.getElementById("card-container");
    const statusEl = document.getElementById("status");
    cardContainer.innerHTML = "";

    // Load user's existing swipes so we don't show repeats
    const craveRef = collection(db, "users", user.uid, "craves");
    const leftoverRef = collection(db, "users", user.uid, "leftovers");

    const craveDocs = await getDocs(craveRef);
    const leftoverDocs = await getDocs(leftoverRef);

    const previouslySwiped = new Set([
        ...craveDocs.docs.map(d => d.data().id),
        ...leftoverDocs.docs.map(d => d.data().id)
    ]);


    console.log("Already swiped:", previouslySwiped);

    const handleBatch = (batch) => {
        batch.forEach((p) => {
            // skip unnamed
            if (!p.name) return;

            // skip restaurants swiped before
            if (previouslySwiped.has(p.id)) return;

            // skip duplicates already collected
            if (restaurants.some(r => r.id === p.id)) return;

            restaurants.push(p);
            previouslySwiped.add(p.id);
        });

        console.log("Batch collected:", batch.length);
        console.log("Restaurants after filter:", restaurants.length);
    };



    // Initial load of restaurants
    try {
        // Create stack
        const stack = Stack();
        restaurants = [];
        await loadNearbyRestaurants(20, 12, handleBatch);
        console.log("Final restaurants (UI) =", restaurants.length);
        console.log("Total previously swiped =", previouslySwiped.size);


        // Only create stack if at least 10 restaurants exist
        if (restaurants.length < 10) {
            statusEl.textContent = "Not enough restaurants nearby to start swiping.";
            return;
        }
        
        // Add initial cards to UI + bind to Swing
        addCardsToUI(restaurants.slice(0, 10), stack);
        restaurants = restaurants.slice(10); // remove the ones shown

        console.log("Initial cards added:", cardContainer.children.length);
        
        // Swipe handlers 
        stack.on("throwout", async (e) => {
            const placeId = e.target.dataset.id;
            const restaurantName = e.target.querySelector("h2")?.textContent || "Unknown";
            const address = e.target.querySelector("p")?.textContent || "No address";
            const ratingEl = e.target.querySelector(".rating-value");
            const rating = ratingEl ? ratingEl.textContent.replace("⭐ ", "") : "N/A";

            const isCrave = e.throwDirection === Direction.RIGHT;
            const targetCollection = isCrave ? "craves" : "leftovers";

            statusEl.textContent = isCrave
                ? `You crave ${restaurantName}!`
                : `You left ${restaurantName} as leftovers!`;

            const userRef = collection(db, "users", user.uid, targetCollection);
            const existingDocs = await getDocs(userRef);
            const alreadyExists = existingDocs.docs.some(
                (doc) => doc.data().id === placeId
            );


            if (!alreadyExists) {
                await addDoc(userRef, {
                    id: placeId,
                    name: restaurantName,
                    address,
                    rating,
                    added_at: serverTimestamp(),
                });

                console.log(`${restaurantName} added to ${targetCollection}.`);
            }

            // Remove card after animation ends
            setTimeout(async () => {
                e.target.remove();

                // If deck is empty load more
                if (!cardContainer.children.length) {

                    // If we already have restaurants in memory, load next 10
                    if (restaurants.length >= 10) {
                        addCardsToUI(restaurants.slice(0, 10), stack);
                        restaurants = restaurants.slice(10);
                        statusEl.textContent = "";
                        return;
                    }

                    // Otherwise fetch more from API
                    statusEl.textContent = "Loading more restaurants...";
                    await loadNearbyRestaurants(20, 12, handleBatch);

                    if (restaurants.length >= 10) {
                        addCardsToUI(restaurants.slice(0, 10), stack);
                        restaurants = restaurants.slice(10);
                        statusEl.textContent = "";
                    } else {
                        statusEl.textContent = "No more restaurants nearby!";
                    }
                }

            }, 300);
        });

        stack.on("throwin", (e) => {
            e.target.style.transform = "";
            e.target.style.opacity = "";
            statusEl.textContent = "";
        });

    } catch (err) {
        console.error(err);
        statusEl.textContent = "Failed to load restaurants.";
        return;
    }


});

// Helper to add cards & bind them to Swing
function addCardsToUI(restaurants, stack) {
    const cardContainer = document.getElementById("card-container");
    

    restaurants.forEach((place) => {
        const card = document.createElement("div");
        card.className = "card bg-white p-4 rounded-2xl shadow-lg absolute inset-0 flex flex-col justify-between text-center transition-all";
        
        card.dataset.id = place.id;
        const priceSigns = place.price_level && !isNaN(place.price_level)
            ? "$".repeat(place.price_level)
            : "N/A";

        card.innerHTML = `
            <div class="relative w-full h-full rounded-2xl overflow-hidden">
                <img 
                    src="${place.photoUrl}" 
                    onerror="this.onerror=null; this.src='https://storage.googleapis.com/support-kms-prod/SNP_2752125_en_v0';"
                    class="absolute inset-0 w-full h-full object-cover" 
                    alt="${place.name}"
                >
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                <div class="absolute bottom-0 p-4 text-left text-white">
                    <h2 class="text-xl font-bold mb-1">${place.name}</h2>
                    <p class="text-sm opacity-90">${place.formatted_address}</p>
                    <div class="flex items-center mt-1 text-yellow-400 text-sm">
                        <span class="rating-value">⭐ ${place.rating}</span>
                        <span class="ml-2 text-gray-200">${priceSigns}</span>
                    </div>
                </div>
            </div>
        `;

        cardContainer.appendChild(card);
        // Bind this new card immediately
        stack.createCard(card);
    });
}
