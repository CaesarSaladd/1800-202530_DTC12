    // Fix Swing.js ReferenceError: global is not defined
    if (typeof global === "undefined") {
    window.global = window;
    }

    let nextPageToken = null;
    let searchRadius = 3000; // 3000m for downtown Vancouver
    const MAX_RADIUS = 5000;
    let userLocation = null; // Store user's current location

    import { Stack, Direction } from "swing";
    import { db, auth } from "./firebaseConfig.js";
    import { addDoc, collection, serverTimestamp, getDocs } from "firebase/firestore";
    import { onAuthStateChanged } from "firebase/auth";

    // Downtown Vancouver coordinates
    const DOWNTOWN_VANCOUVER = { lat: 49.2827, lng: -123.1207 };

    // Simple distance calculation using Pythagorean theorem
    // Works well for short distances (within a city)
    function calculateDistance(lat1, lng1, lat2, lng2) {
        // Convert latitude/longitude differences to meters
        // 1 degree latitude ≈ 111,000 meters
        // 1 degree longitude ≈ 111,000 * cos(latitude) meters
        const latDiff = (lat2 - lat1) * 111000; // meters
        const lngDiff = (lng2 - lng1) * 111000 * Math.cos(lat1 * Math.PI / 180); // meters
        
        // Use Pythagorean theorem: distance = √(latDiff² + lngDiff²)
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        
        return distance; // Distance in meters
    }

    // Format distance for display
    function formatDistance(meters) {
        if (meters < 1000) {
            return Math.round(meters) + "m";
        } else {
            return (meters / 1000).toFixed(1) + "km";
        }
    }

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
        // Always use downtown Vancouver for swipe functionality
        return DOWNTOWN_VANCOUVER;
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

    // Helper function to safely get photo URL from Google Places API
    function getPhotoUrl(place) {
        if (!place.photos || place.photos.length === 0) {
            return null;
        }

        try {
            const photo = place.photos[0];
            // Check if getUrl method exists (for nearbySearch results)
            if (typeof photo.getUrl === 'function') {
                return photo.getUrl({ maxWidth: 800, maxHeight: 600 });
            }
            // For textSearch results, photos might be objects with reference
            if (photo.getUrl) {
                return photo.getUrl({ maxWidth: 800, maxHeight: 600 });
            }
            // Try calling getUrl directly if it's a method
            if (photo.getUrl && typeof photo.getUrl === 'function') {
                return photo.getUrl({ maxWidth: 800, maxHeight: 600 });
            }
        } catch (error) {
            console.warn("Error getting photo URL:", error);
            return null;
        }

        return null;
    }

    // Fetch place details to get photos if not available in search results
    async function fetchPlaceDetails(placeId) {
        return new Promise((resolve) => {
            const service = new google.maps.places.PlacesService(document.createElement("div"));
            service.getDetails(
                {
                    placeId: placeId,
                    fields: ['photos', 'name', 'formatted_address', 'rating', 'price_level', 'types']
                },
                (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        const photoUrl = getPhotoUrl(place);
                        resolve(photoUrl);
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    }

    // Default placeholder image (a simple gray gradient as data URI)
    const DEFAULT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='600'%3E%3Crect fill='%23f3f4f6' width='400' height='600'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%239ca3af' text-anchor='middle' dominant-baseline='middle'%3E🍽️%3C/text%3E%3C/svg%3E";

    // Helper function to extract just the street name from address
    function getStreetName(address) {
        if (!address) return "No address";
        
        // Addresses
        const parts = address.split(',');
        if (parts.length > 0) {
            return parts[0].trim();
        }
        
        return address.trim();
    }

    // Helper function to extract cuisine type from restaurant types and name
    function getCuisineType(types, restaurantName = "") {
        if (!types || !Array.isArray(types)) types = [];
        
        const name = (restaurantName || "").toLowerCase();
        
        // Map of Google Places types to readable cuisine names
        const cuisineMap = {
            "italian_restaurant": "Italian",
            "chinese_restaurant": "Chinese",
            "japanese_restaurant": "Japanese",
            "korean_restaurant": "Korean",
            "indian_restaurant": "Indian",
            "asian_restaurant": "Asian",
            "pizza_restaurant": "Pizza",
            "burger_restaurant": "Burgers",
            "fast_food_restaurant": "Fast Food",
            "cafe": "Cafe",
            "coffee_shop": "Coffee",
            "bakery": "Bakery",
            "mexican_restaurant": "Mexican",
            "thai_restaurant": "Thai",
            "vietnamese_restaurant": "Vietnamese",
            "french_restaurant": "French",
            "greek_restaurant": "Greek",
            "mediterranean_restaurant": "Mediterranean",
            "seafood_restaurant": "Seafood",
            "steak_house": "Steakhouse",
            "sushi_restaurant": "Sushi"
        };

        // Look for cuisine-specific types first
        for (const type of types) {
            if (cuisineMap[type]) {
                return cuisineMap[type];
            }
        }

        // Check restaurant name for cuisine keywords
        const cuisineKeywords = {
            "italian": ["italian", "pasta", "pizza", "trattoria", "ristorante", "gelato", "italia", "napoli", "milan"],
            "chinese": ["chinese", "dim sum", "szechuan", "cantonese", "peking", "wonton", "beijing", "shanghai", "szechwan"],
            "japanese": ["japanese", "sushi", "ramen", "izakaya", "teriyaki", "yakitori", "tempura", "tokyo", "sashimi", "udon"],
            "korean": ["korean", "bbq", "kimchi", "bibimbap", "korean bbq", "seoul", "bulgogi"],
            "indian": ["indian", "curry", "tandoor", "naan", "biryani", "masala", "tikka", "dal", "samosa"],
            "mexican": ["mexican", "taco", "burrito", "quesadilla", "enchilada", "mexico", "mexicana", "fajita", "guacamole"],
            "thai": ["thai", "pad thai", "tom yum", "curry", "thailand", "satay", "green curry"],
            "vietnamese": ["vietnamese", "pho", "banh mi", "vietnam", "saigon"],
            "french": ["french", "bistro", "brasserie", "creperie", "patisserie", "france", "paris", "bouillabaisse"],
            "greek": ["greek", "gyro", "souvlaki", "athens", "moussaka", "tzatziki"],
            "mediterranean": ["mediterranean", "hummus", "falafel", "shawarma", "mezze", "mezze"],
            "american": ["american", "burger", "bbq", "barbecue", "steakhouse", "diner", "grill"],
            "seafood": ["seafood", "fish", "oyster", "lobster", "crab", "salmon", "tuna", "sashimi"],
            "pizza": ["pizza", "pizzeria", "neapolitan"],
            "cafe": ["cafe", "coffee", "espresso", "latte", "cappuccino", "roastery"],
            "bakery": ["bakery", "bake", "pastry", "donut", "bagel", "patisserie"],
            "spanish": ["spanish", "tapas", "paella", "sangria", "madrid"],
            "turkish": ["turkish", "kebab", "istanbul", "doner"],
            "lebanese": ["lebanese", "beirut", "shawarma"],
            "ethiopian": ["ethiopian", "injera", "berbere"],
            "brazilian": ["brazilian", "churrasco", "brazil", "rodizio"]
        };

        // Check name for cuisine keywords
        for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
            for (const keyword of keywords) {
                if (name.includes(keyword)) {
                    // Capitalize first letter
                    return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
                }
            }
        }

        // Check types array for any cuisine-related keywords
        for (const type of types) {
            const typeLower = type.toLowerCase();
            for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
                for (const keyword of keywords) {
                    if (typeLower.includes(keyword)) {
                        return cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
                    }
                }
            }
        }

        // Only return generic types if we really can't determine cuisine
        if (types.includes("bar") || types.includes("night_club")) {
            return "Bar";
        }
        
        if (types.includes("cafe") || types.includes("coffee_shop")) {
            return "Cafe";
        }
        
        if (types.includes("bakery")) {
            return "Bakery";
        }

        // Last resort - try to infer from name if it contains food-related words
        const foodWords = ["dining", "eatery", "bistro", "grill", "kitchen"];
        for (const word of foodWords) {
            if (name.includes(word)) {
                return "Dining";
            }
        }

        // Only return "Restaurant" as absolute last resort
        return "Restaurant";
    }

    // Search keywords to diversify restaurant discovery
    const searchKeywords = [
        "restaurant",
        "dining",
        "food",
        "cafe",
        "bistro",
        "eatery",
        "cuisine",
        "downtown vancouver restaurant",
        "gastown restaurant",
        "yaletown restaurant"
    ];

    // Use both nearbySearch and textSearch for better coverage
    async function searchWithNearbySearch(center, radius, keyword = "") {
        return new Promise((resolve) => {
                const service = new google.maps.places.PlacesService(document.createElement("div"));
                service.nearbySearch(
                    {
                    location: new google.maps.LatLng(center.lat, center.lng),
                    radius: radius,
                        type: "restaurant",
                    keyword: keyword || undefined
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
    }

    async function searchWithTextSearch(center, keyword, radius = 3000) {
        return new Promise((resolve) => {
            const service = new google.maps.places.PlacesService(document.createElement("div"));
            const request = {
                query: keyword,
                location: new google.maps.LatLng(center.lat, center.lng),
                radius: radius
            };
            service.textSearch(request, (res, status) => {
                if (status !== google.maps.places.PlacesServiceStatus.OK) {
                    resolve([]);
                    return;
                }
                resolve(res || []);
            });
        });
    }

    async function loadNearbyRestaurants(minCount = 50, maxAttempts = 30, onBatchFound) {
        await waitForGoogleMaps();

        if (!BASE_CENTER) {
            BASE_CENTER = await getSearchCenter();
            console.log("Locked base center (Downtown Vancouver):", BASE_CENTER);
        }

        let total = [];
        let attempts = 0;
        let keywordIndex = 0;

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
            "pizza_restaurant",
            "bar",
            "bakery"
        ];

        // First, try multiple searches from the center with different keywords
        for (let i = 0; i < searchKeywords.length && attempts < maxAttempts; i++) {
            attempts++;
            const keyword = searchKeywords[i];
            console.log(`Attempt ${attempts} — Text search with keyword: "${keyword}"`);

            // Use textSearch for better keyword matching
            const textResults = await searchWithTextSearch(BASE_CENTER, keyword, searchRadius);
            
            const filtered = textResults.filter(p => {
                const t = p.types || [];
                return t.some(type => allowedTypes.includes(type));
            });

            // Map results and fetch photos if needed (with rate limiting)
            let mapped = [];
            for (let i = 0; i < filtered.length; i++) {
                const p = filtered[i];
                let photoUrl = getPhotoUrl(p);
                
                // If no photo in search results, try fetching place details
                if (!photoUrl && p.place_id) {
                    photoUrl = await fetchPlaceDetails(p.place_id);
                    // Small delay to avoid rate limiting
                    if (i < filtered.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
                
                // Only add if we have a real photo (not default)
                if (photoUrl && photoUrl !== DEFAULT_IMAGE) {
                    mapped.push({
                        id: p.place_id,
                        name: p.name,
                        formatted_address: p.formatted_address || p.vicinity || "No address",
                        rating: p.rating || "N/A",
                        price_level: p.price_level || "N/A",
                        types: p.types || [],
                        photoUrl: photoUrl,
                        geometry: p.geometry // Store geometry for distance calculation
                    });
                }
            }

            // Remove duplicates
            mapped = mapped.filter(m => !total.some(t => t.id === m.id));
            total.push(...mapped);

            if (onBatchFound && mapped.length > 0) {
                onBatchFound(mapped);
            }

            console.log(`Found ${mapped.length} new restaurants. Total: ${total.length}`);
        }

        // Then use spiral pattern with nearbySearch for additional coverage
        while (attempts < maxAttempts && total.length < minCount) {
            const searchCenter = getOffsetCenter(BASE_CENTER, attempts - searchKeywords.length);
            attempts++;

            console.log(`Attempt ${attempts} — Nearby search center:`, searchCenter);

            const results = await searchWithNearbySearch(searchCenter, searchRadius);

            const filtered = results.filter(p => {
                const t = p.types || [];
                return t.some(type => allowedTypes.includes(type));
            });

            // Map results and fetch photos if needed
            let mapped = [];
            for (let i = 0; i < filtered.length; i++) {
                const p = filtered[i];
                let photoUrl = getPhotoUrl(p);
                
                // If no photo in search results, try fetching place details
                if (!photoUrl && p.place_id) {
                    photoUrl = await fetchPlaceDetails(p.place_id);
                    // Small delay to avoid rate limiting
                    if (i < filtered.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
                
                // Only add if we have a real photo (not default)
                if (photoUrl && photoUrl !== DEFAULT_IMAGE) {
                    mapped.push({
                id: p.place_id,
                name: p.name,
                        formatted_address: p.vicinity || p.formatted_address || "No address",
                rating: p.rating || "N/A",
                price_level: p.price_level || "N/A",
                types: p.types || [],
                        photoUrl: photoUrl,
                        geometry: p.geometry // Store geometry for distance calculation
                    });
                }
            }

            // Remove duplicates
            mapped = mapped.filter(m => !total.some(t => t.id === m.id));
            total.push(...mapped);

            if (onBatchFound && mapped.length > 0) {
                onBatchFound(mapped);
            }

            console.log(`Found ${mapped.length} new restaurants. Total: ${total.length}`);
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

    // Get user's current location if available
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log("User location obtained:", userLocation);
            },
            (error) => {
                console.log("Geolocation not available or denied:", error);
                userLocation = null;
            },
            { enableHighAccuracy: true, timeout: 7000 }
        );
    }

    const cardContainer = document.getElementById("card-container");
    const statusEl = document.getElementById("status");
    const loadingIndicator = document.getElementById("loading-indicator");
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

    // Helper function to check if restaurant is in Vancouver area
    function isInVancouver(address) {
        if (!address) return false;
        const addressLower = address.toLowerCase();
        // Check for Vancouver in address (since we're searching from downtown coordinates with 3km radius)
        return addressLower.includes('vancouver');
    }

    const handleBatch = (batch) => {
        batch.forEach((p) => {
            // skip unnamed
            if (!p.name) return;

            // skip restaurants swiped before
            if (previouslySwiped.has(p.id)) return;

            // skip duplicates already collected
            if (restaurants.some(r => r.id === p.id)) return;

            // skip restaurants without images (using default placeholder)
            if (!p.photoUrl || p.photoUrl === DEFAULT_IMAGE) {
                console.log(`Skipping ${p.name} - no image available`);
                return;
            }

            // skip restaurants not in Vancouver
            if (!isInVancouver(p.formatted_address)) {
                console.log(`Skipping ${p.name} - not in Vancouver: ${p.formatted_address}`);
                return;
            }

            restaurants.push(p);
            previouslySwiped.add(p.id);
        });

        console.log("Batch collected:", batch.length);
        console.log("Restaurants after filter:", restaurants.length);
    };



    // Initial load of restaurants
    try {
        // Show loading indicator
        if (loadingIndicator) {
            loadingIndicator.classList.remove("hidden");
        }
        
        // Create stack
        const stack = Stack();
        restaurants = [];
        // Load more restaurants initially (50 min, 30 attempts)
        await loadNearbyRestaurants(50, 30, handleBatch);
        console.log("Final restaurants (UI) =", restaurants.length);
        console.log("Total previously swiped =", previouslySwiped.size);
        
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.classList.add("hidden");
        }


        // Only create stack if at least 1 restaurant exists
        if (restaurants.length === 0) {
            statusEl.textContent = "No restaurants found. Please try again.";
            console.error("No restaurants available after filtering. Check console for details.");
            return;
        }
        
        // Add initial cards to UI + bind to Swing
        const cardsToAdd = Math.min(restaurants.length, 10);
        console.log(`Adding ${cardsToAdd} cards to UI out of ${restaurants.length} available restaurants`);
        addCardsToUI(restaurants.slice(0, cardsToAdd), stack);
        restaurants = restaurants.slice(cardsToAdd); // remove the ones shown

        console.log("Initial cards added:", cardContainer.children.length);
        
        // Mobile tutorial handling - only show on first visit
        const tutorialEl = document.getElementById("swipe-tutorial");
        const closeTutorialBtn = document.getElementById("close-tutorial");
        const gotItBtn = document.getElementById("got-it-btn");
        const showTutorialBtn = document.getElementById("show-tutorial-btn");
        const TUTORIAL_SEEN_KEY = "swipe-tutorial-seen";
        
        // Check if user has seen tutorial before
        const hasSeenTutorial = localStorage.getItem(TUTORIAL_SEEN_KEY) === "true";
        
        // Function to show tutorial
        function showTutorial() {
            if (tutorialEl) {
                tutorialEl.classList.remove("hidden");
            }
        }
        
        // Show tutorial only if user hasn't seen it before (on mobile only - desktop users can use button)
        if (tutorialEl) {
            // Check if on mobile (screen width < 768px)
            const isMobile = window.innerWidth < 768;
            if (hasSeenTutorial || !isMobile) {
                // Hide tutorial if user has seen it before, or if on desktop
                tutorialEl.classList.add("hidden");
            } else {
                // Show tutorial if user hasn't seen it and is on mobile (remove hidden class)
                tutorialEl.classList.remove("hidden");
            }
        }
        
        function closeTutorial() {
            if (tutorialEl && !tutorialEl.classList.contains("hidden")) {
                tutorialEl.classList.add("hidden");
                // Save to localStorage that user has seen the tutorial
                localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
            }
        }
        
        // Button to show tutorial
        if (showTutorialBtn) {
            showTutorialBtn.addEventListener("click", showTutorial);
        }
        
        if (closeTutorialBtn) {
            closeTutorialBtn.addEventListener("click", closeTutorial);
        }
        
        if (gotItBtn) {
            gotItBtn.addEventListener("click", closeTutorial);
        }
        
        // Close tutorial when clicking outside (on mobile)
        if (tutorialEl) {
            tutorialEl.addEventListener("click", (e) => {
                if (e.target === tutorialEl) {
                    closeTutorial();
                }
            });
        }
        
        // Swipe handlers 
        stack.on("throwout", async (e) => {
            // Hide tutorial on first swipe (mobile) and mark as seen
            closeTutorial();
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
                    place_id: placeId, // Store place_id for menu link
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
                    statusEl.textContent = "";
                    // Show loading indicator
                    if (loadingIndicator) {
                        loadingIndicator.classList.remove("hidden");
                    }
                    
                    // Load more restaurants when needed (50 min, 30 attempts)
                    await loadNearbyRestaurants(50, 30, handleBatch);
                    
                    // Hide loading indicator
                    if (loadingIndicator) {
                        loadingIndicator.classList.add("hidden");
                    }

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
        // Hide loading indicator on error
        if (loadingIndicator) {
            loadingIndicator.classList.add("hidden");
        }
        return;
    }


});

// Helper to add cards & bind them to Swing
function addCardsToUI(restaurants, stack) {
    const cardContainer = document.getElementById("card-container");
    

    restaurants.forEach((place) => {
        const card = document.createElement("div");
        card.className = "card bg-white p-4 rounded-2xl shadow-lg absolute inset-0 flex flex-col justify-between text-center transition-all";
        card.style.zIndex = "10"; // Ensure cards are above container but below footer
        card.style.userSelect = "none"; // Prevent text selection during swipe
        card.style.webkitUserSelect = "none"; // Prevent text selection in WebKit browsers
        
        // Prevent default drag behavior on card
        card.addEventListener("dragstart", (e) => {
            e.preventDefault();
            return false;
        });
        
        card.dataset.id = place.id;
        const priceSigns = place.price_level && !isNaN(place.price_level) && place.price_level > 0
            ? "$".repeat(place.price_level)
            : null; // Don't show price if unavailable
        
        const cuisineType = getCuisineType(place.types, place.name);
        
        // Create image element with proper error handling
        const img = document.createElement("img");
        img.className = "absolute inset-0 w-full h-full object-cover";
        img.alt = place.name;
        img.loading = "lazy";
        img.draggable = false; // Prevent image dragging
        img.style.userSelect = "none"; // Prevent text selection
        img.style.webkitUserDrag = "none"; // Prevent dragging in WebKit browsers
        
        // Prevent default drag behavior
        img.addEventListener("dragstart", (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });
        
        img.addEventListener("selectstart", (e) => {
            e.preventDefault();
            return false;
        });
        
        const streetName = getStreetName(place.formatted_address);

        // Calculate distance if user location is available
        let distanceText = null;
        if (userLocation && navigator.geolocation && place.geometry?.location) {
            const placeLat = typeof place.geometry.location.lat === 'function' 
                ? place.geometry.location.lat() 
                : place.geometry.location.lat;
            const placeLng = typeof place.geometry.location.lng === 'function' 
                ? place.geometry.location.lng() 
                : place.geometry.location.lng;
            
            const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                placeLat,
                placeLng
            );
            distanceText = formatDistance(distance);
        }

        card.innerHTML = `
            <div class="relative w-full h-full rounded-2xl overflow-hidden bg-gray-200">
            </div>
            <div class="absolute bottom-0 p-4 pb-5 text-left text-white z-10">
                <div class="mb-2">
                    <span class="bg-orange-500/95 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">${cuisineType}</span>
                </div>
                <h2 class="text-xl font-bold mb-1 text-white bg-black/60 px-2 py-1 rounded inline-block">${place.name}</h2>
                <p class="text-sm text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">${streetName}</p>
                <div class="flex items-center mt-1 text-yellow-400 text-sm drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                        <span class="rating-value">⭐ ${place.rating}</span>
                    ${priceSigns ? `<span class="ml-2 text-white/90">${priceSigns}</span>` : ''}
                    ${distanceText ? `<span class="ml-2 text-white/90">📍 ${distanceText}</span>` : ''}
                </div>
                <a href="https://www.google.com/maps/place/?q=place_id:${place.id}" target="_blank" rel="noopener noreferrer" class="mt-2 mb-1 inline-block bg-white/90 text-orange-600 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-white transition-colors">
                    View Menu
                </a>
            </div>
        `;

        // Insert the image into the card
        const imageContainer = card.querySelector(".relative");
        imageContainer.insertBefore(img, imageContainer.firstChild);
        
        // Add card to container immediately
        cardContainer.appendChild(card);
        
        // Set up error handling - remove card if image fails to load
        let errorHandled = false;
        img.onerror = function() {
            if (errorHandled) return; // Prevent multiple error calls
            errorHandled = true;
            this.onerror = null; // Prevent infinite loop
            // Remove the card entirely if image fails to load
            console.log(`Removing card for ${place.name} - image failed to load. URL: ${place.photoUrl}`);
            if (card.parentNode) {
                card.remove();
            }
        };
        
        // Set the source after error handler is in place
        img.src = place.photoUrl;
        
        // Bind card to stack after a short delay to ensure image starts loading
        // This allows the card to be visible while image loads
        setTimeout(() => {
            try {
                // Only bind if card is still in DOM (image didn't fail)
                if (card.parentNode) {
        stack.createCard(card);
                }
            } catch (e) {
                console.warn("Could not bind card to stack:", e);
            }
        }, 100);
    });
}
