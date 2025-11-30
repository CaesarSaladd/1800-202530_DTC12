import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

window.lastSearchResults = [];
window.originalSearchResults = [];


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

// Reset function
function resetToOriginal() {
    window.lastSearchResults = [...window.originalSearchResults];
}


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
let userLocationMarker = null;
let userLocation = null;
let lastSearchKeyword = "";





// Remove all markers from the map before new search results
function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
    // Keep user location marker
}

// Helper function to create a restaurant card with distance
function createRestaurantCard(place, container) {
    // Calculate distance if user location is available and not already calculated
    if (userLocation && navigator.geolocation && !place.distance && place.geometry?.location) {
        const placeLat = place.geometry.location.lat();
        const placeLng = place.geometry.location.lng();
        place.distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            placeLat,
            placeLng
        );
    }

    // Only show distance if user location is available
    const distanceText = (userLocation && navigator.geolocation && place.distance) ? formatDistance(place.distance) : null;
    const priceSigns = place.price_level && place.price_level > 0 ? "$".repeat(place.price_level) : null;

    const card = document.createElement("div");
    card.className = "bg-white w-full px-3 py-2 rounded-2xl shadow";
    card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold">${place.name}</h3>
        </div>
        <p>${place.formatted_address || "No address available"}</p>
        <div class="flex items-center gap-2 mt-1">
            <p class="text-yellow-600">⭐ ${place.rating || "N/A"}</p>
            ${distanceText ? `<p class="text-gray-600 text-sm">📍 ${distanceText}</p>` : ''}
        </div>
        ${priceSigns ? `<p class="text-gray-700">${priceSigns}</p>` : ''}
    `;

    // Add "Add to Craves" button
    const addButton = document.createElement("button");
    addButton.textContent = "+";
    addButton.className = "ml-2 bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-400 font-bold flex-shrink-0 self-start";
    addButton.addEventListener("click", async () => {
        await addToCrave(addButton, {
            name: place.name,
            formattedAddress: place.formatted_address,
            rating: place.rating,
        });
        addButton.textContent = "✓ Added";
        addButton.disabled = true;
        addButton.classList.add("opacity-70");
    });

    const headerDiv = card.querySelector("div");
    headerDiv.appendChild(addButton);
    container.appendChild(card);
}

// Calculate distance between two coordinates in meters
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Format distance for display
function formatDistance(meters) {
    if (meters < 1000) {
        return Math.round(meters) + "m";
    } else {
        return (meters / 1000).toFixed(1) + "km";
    }
}

// Add user location marker to map
function addUserLocationMarker(location) {
    // Remove existing user location marker if any
    if (userLocationMarker) {
        userLocationMarker.setMap(null);
    }

    // Create a custom icon for user location (blue circle)
    const userIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4285F4",
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 2,
    };

    userLocationMarker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: map,
        icon: userIcon,
        title: "Your Location",
        zIndex: 1000, // Ensure it's on top
    });
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

    // Store user location if geolocation is enabled
    userLocation = location;

    // Add user location marker if we have a valid location (not default downtown)
    if (navigator.geolocation && location.lat !== 49.282868 && location.lng !== -123.125032) {
        addUserLocationMarker(location);
    }

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
            window.lastSearchResults = [];
            return;
        }

        // Calculate distances and add to results if user location is available
        if (userLocation && navigator.geolocation) {
            results.forEach(place => {
                if (place.geometry?.location) {
                    const placeLat = place.geometry.location.lat();
                    const placeLng = place.geometry.location.lng();
                    place.distance = calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        placeLat,
                        placeLng
                    );
                } else {
                    place.distance = Infinity; // No location, put at end
                }
            });

            // Sort by distance (closest first)
            results.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }

        // Save last search results + keyword for filters
        window.lastSearchResults = results;
        window.originalSearchResults = [...results];
        lastSearchKeyword = keyword || "";


        // Loop through each returned restaurant
        results.forEach((place) => {
            // Create a map marker if restaurant exists
            if (place.geometry?.location) {
                const marker = new google.maps.Marker({
                    map, position: place.geometry.location, title: place.name,
                });
                markers.push(marker);
            }

            // Use helper function to create card with directions button
            createRestaurantCard(place, container);
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

    // Center map and search based on user location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                map.setCenter(userPos);
                findNearbyRestaurants(userPos);
            },
            () => {
                findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 });
            },
            { enableHighAccuracy: true }
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
                    (pos) => {
                        const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                        map.setCenter(userPos);
                        findNearbyRestaurants(userPos, keyword);
                    },
                    () => findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 }, keyword),
                    { enableHighAccuracy: true }
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

// --------- BURGER MENU + FILTERS ----------
document.addEventListener("DOMContentLoaded", () => {
    const burgerButton = document.getElementById("burger-menu");
    const dropdown = document.getElementById("myDropdown");

    let isDropdownOpen = false;

    // Toggle dropdown
    if (burgerButton && dropdown) {
        burgerButton.addEventListener("click", (event) => {
            event.stopPropagation();

            // Toggle visiblity of dropdown
            const willOpen = dropdown.classList.contains("hidden");
            dropdown.classList.toggle("hidden");
            isDropdownOpen = willOpen;

            // Reset transition when opened
            if (willOpen) {
                dropdown.classList.remove("opacity-0", "scale-95");
                setTimeout(() => {
                    dropdown.classList.add("opacity-100", "scale-100");
                }, 10);
            } else {
                dropdown.classList.remove("opacity-100", "scale-100");
                dropdown.classList.add("opacity-0", "scale-95");
            }
        });

        // Prevent clicks inside dropdown from closing it
        dropdown.addEventListener("click", (event) => {
            event.stopPropagation();
        });

        // Close dropdown only if click is outside both elements
        document.addEventListener("click", (event) => {
            if (
                isDropdownOpen &&
                !dropdown.contains(event.target) &&
                !burgerButton.contains(event.target)
            ) {
                closeDropdown();
            }
        });
    }

    function closeDropdown() {
        dropdown.classList.add("hidden");
        dropdown.classList.remove("opacity-100", "scale-100");
        dropdown.classList.add("opacity-0", "scale-95");
        isDropdownOpen = false;
    }

    // Load filters from Firestore database
    async function loadFilters() {
        try {
            const snapshot = await getDocs(collection(db, "filters"));
            dropdown.innerHTML = "";

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const li = document.createElement("li");
                li.className = "px-4 py-2 hover:bg-gray-100 cursor-pointer";
                li.textContent = data.filter;

                if (data.filter.toLowerCase() === "cuisine") {
                    li.addEventListener("click", (event) => {
                        event.stopPropagation();
                        showCuisineOptions();
                    });
                }

                if (data.filter.toLowerCase() === "price") {
                    li.addEventListener("click", (event) => {
                        event.stopPropagation();
                        showPriceOptions();
                    });
                }

                if (data.filter.toLowerCase() === "reviews") {
                    li.addEventListener("click", (event) => {
                        event.stopPropagation();
                        showReviewOptions();
                    });
                }

                dropdown.appendChild(li);
            });
        } catch (err) {
            console.error("Error loading filters:", err);
            dropdown.innerHTML =
                '<li class="px-4 py-2 text-red-500">Failed to load filters</li>';
        }
    }

    // Cusisine options
    async function showCuisineOptions() {
        dropdown.innerHTML = "";

        const cuisines = [
            "American",
            "BBQ",
            "Chinese",
            "French",
            "Greek",
            "Indian",
            "Italian",
            "Japanese",
            "Korean",
            "Lebanese",
            "Mediterranean",
            "Mexican",
            "Middle Eastern",
            "Spanish",
            "Thai",
            "Turkish",
            "Vietnamese"
        ];

        cuisines.forEach((cuisine) => {
            const li = document.createElement("li");
            li.className = "px-4 py-1 flex items-center hover:bg-gray-100";
            li.innerHTML = `
                <input type="checkbox" value="${cuisine}" class="mr-2 cursor-pointer checkbox-cuisine">
                <span>${cuisine}</span>`;
            dropdown.appendChild(li);
        });

        const btns = document.createElement("div");
        btns.className = "flex justify-between px-4 py-2 border-t mt-2";
        btns.innerHTML = `
            <button id="backToFilters" class="text-gray-500 hover:text-gray-700 text-sm">← Back</button>
            <button id="applyCuisine" class="bg-orange-400 text-white px-3 py-1 rounded-lg text-sm hover:bg-orange-500">Apply</button>
        `;
        dropdown.appendChild(btns);

        document.getElementById("backToFilters").addEventListener("click", (e) => {
            e.stopPropagation();
            loadFilters();
        });

        document.getElementById("applyCuisine").addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const selected = [...document.querySelectorAll(".checkbox-cuisine:checked")].map((cb) => cb.value);

            if (selected.length === 0) {
                alert("Please select at least one cuisine.");
                return;
            }

            console.log("Selected cuisines:", selected);

            if (window.lastSearchResults.length > 0) {
                // Just call the filter function directly
                filterExistingResultsByCuisine(selected);
            } else {
                // fallback: query Google if no prior search
                const keyword = selected.join(", ");
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        pos => findNearbyRestaurants({ lat: pos.coords.latitude, lng: pos.coords.longitude }, keyword),
                        () => findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 }, keyword)
                    );
                } else {
                    findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 }, keyword);
                }
            }
            closeDropdown();
        });
    }



    // Price options
    async function showPriceOptions() {
        dropdown.innerHTML = ""; // clear filter list

        const options = [
            { label: "$ → $$$$", value: "asc" },
            { label: "$$$$ → $", value: "desc" },
        ];

        options.forEach(option => {
            const li = document.createElement("li");
            li.className = "px-4 py-2 hover:bg-gray-100 cursor-pointer";
            li.textContent = option.label;

            li.addEventListener("click", (e) => {
                e.stopPropagation();
                sortByPrice(option.value);
            });

            dropdown.appendChild(li);
        });

        // Add "Back" button
        const btnContainer = document.createElement("div");
        btnContainer.className = "flex justify-start px-4 py-2 border-t mt-2";
        btnContainer.innerHTML = `
            <button id="backToFilters" class="text-gray-500 hover:text-gray-700 text-sm">← Back</button>
        `;
        dropdown.appendChild(btnContainer);

        document.getElementById("backToFilters").addEventListener("click", (e) => {
            e.stopPropagation();
            loadFilters();
        });
    }

    async function showReviewOptions() {
        dropdown.innerHTML = "";

        const options = [
            { label: "⭐ High → Low", value: "desc" },
            { label: "⭐ Low → High", value: "asc" }
        ];

        options.forEach(option => {
            const li = document.createElement("li");
            li.className = "px-4 py-2 hover:bg-gray-100 cursor-pointer";
            li.textContent = option.label;

            li.addEventListener("click", (e) => {
                e.stopPropagation();
                sortByReviews(option.value);
            });

            dropdown.appendChild(li);
        });

        // Back button
        const btnContainer = document.createElement("div");
        btnContainer.className = "flex justify-start px-4 py-2 border-t mt-2";
        btnContainer.innerHTML = `
            <button id="backToFilters" class="text-gray-500 hover:text-gray-700 text-sm">← Back</button>
        `;
        dropdown.appendChild(btnContainer);

        document.getElementById("backToFilters").addEventListener("click", (e) => {
            e.stopPropagation();
            loadFilters();
        });
    }

    function sortByReviews(order = "desc") {
        dropdown.classList.add("hidden");

        const container = document.getElementById("resultsContainer");
        container.innerHTML = "<p class='text-gray-500 px-4'>Sorting by reviews...</p>";

        if (window.lastSearchResults.length > 0) {
            sortExistingResultsByReviews(order);
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => findAndSortByReviews({ lat: pos.coords.latitude, lng: pos.coords.longitude }, order),
                    () => findAndSortByReviews({ lat: 49.282868, lng: -123.125032 }, order)
                );
            } else {
                findAndSortByReviews({ lat: 49.282868, lng: -123.125032 }, order);
            }
        }

        closeDropdown();
    }

    function sortExistingResultsByReviews(order = "desc") {
        const container = document.getElementById("resultsContainer");
        container.innerHTML = "";
        clearMarkers();

        const sorted = [...window.lastSearchResults];
        
        // Calculate distances if user location is available
        if (userLocation && navigator.geolocation) {
            sorted.forEach(place => {
                if (place.geometry?.location && !place.distance) {
                    const placeLat = place.geometry.location.lat();
                    const placeLng = place.geometry.location.lng();
                    place.distance = calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        placeLat,
                        placeLng
                    );
                }
            });
        }

        sorted.sort((a, b) => {
            const ratingA = a.rating || 0;
            const ratingB = b.rating || 0;
            const ratingSort = order === "asc" ? ratingA - ratingB : ratingB - ratingA;
            if (ratingSort === 0 && userLocation && navigator.geolocation) {
                // If ratings are equal, sort by distance
                return (a.distance || Infinity) - (b.distance || Infinity);
            }
            return ratingSort;
        });

        renderResultCards(sorted);
        showFilterSummary({ reviews: order });
    }

    function findAndSortByReviews(location, order = "desc") {
        const latLng = new google.maps.LatLng(location.lat, location.lng);
        const service = new google.maps.places.PlacesService(map);

        // Store user location if geolocation is enabled
        if (navigator.geolocation && location.lat !== 49.282868 && location.lng !== -123.125032) {
            userLocation = location;
            addUserLocationMarker(location);
        }

        const request = {
            query: "restaurant",
            location: latLng,
            radius: 5000,
        };

        service.textSearch(request, (results, status) => {
            const container = document.getElementById("resultsContainer");
            container.innerHTML = "";
            clearMarkers();

            if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
                container.innerHTML = `<p class="text-gray-600">No restaurants found.</p>`;
                return;
            }

            // Calculate distances if user location is available
            if (userLocation && navigator.geolocation) {
                results.forEach(place => {
                    if (place.geometry?.location && !place.distance) {
                        const placeLat = place.geometry.location.lat();
                        const placeLng = place.geometry.location.lng();
                        place.distance = calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            placeLat,
                            placeLng
                        );
                    }
                });
            }

            results.sort((a, b) => {
                const ratingA = a.rating || 0;
                const ratingB = b.rating || 0;
                const ratingSort = order === "asc" ? ratingA - ratingB : ratingB - ratingA;
                if (ratingSort === 0 && userLocation && navigator.geolocation) {
                    // If ratings are equal, sort by distance
                    return (a.distance || Infinity) - (b.distance || Infinity);
                }
                return ratingSort;
            });

            renderResultCards(results);
        });
    }

    function renderResultCards(results) {
        const container = document.getElementById("resultsContainer");
        container.innerHTML = "";
        clearMarkers();

        // Calculate distances if user location is available
        if (userLocation && navigator.geolocation) {
            results.forEach(place => {
                if (place.geometry?.location && !place.distance) {
                    const placeLat = place.geometry.location.lat();
                    const placeLng = place.geometry.location.lng();
                    place.distance = calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        placeLat,
                        placeLng
                    );
                } else if (!place.geometry?.location) {
                    place.distance = Infinity;
                }
            });

            // Sort by distance (closest first)
            results.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
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

            const priceSigns = place.price_level && place.price_level > 0 ? "$".repeat(place.price_level) : null;
            // Only show distance if user location is available
            const distanceText = (userLocation && navigator.geolocation && place.distance) ? formatDistance(place.distance) : null;

            const card = document.createElement("div");
            card.className = "bg-white w-full px-3 py-2 rounded-2xl shadow";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold">${place.name}</h3>
                </div>
                <p>${place.formatted_address || "No address available"}</p>
                <div class="flex items-center gap-2 mt-1">
                    <p class="text-yellow-600">⭐ ${place.rating || "N/A"}</p>
                    ${distanceText ? `<p class="text-gray-600 text-sm">📍 ${distanceText}</p>` : ''}
                </div>
                ${priceSigns ? `<p class="text-gray-700">${priceSigns}</p>` : ''}
            `;

            const addButton = document.createElement("button");
            addButton.textContent = "+";
            addButton.className = "ml-2 bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-400 font-bold flex-shrink-0 self-start";
            addButton.addEventListener("click", async () => {
                await addToCrave(addButton, {
                    name: place.name,
                    formattedAddress: place.formatted_address,
                    rating: place.rating,
                });
                addButton.textContent = "✓ Added";
                addButton.disabled = true;
                addButton.classList.add("opacity-70");
            });

            const headerDiv = card.querySelector("div");
            headerDiv.appendChild(addButton);
            container.appendChild(card);
        });
    }





    // Price options after cuisine filtered
    async function showPriceOptionsForCuisine(selectedCuisines) {
        dropdown.innerHTML = "";

        const options = [
            { label: "$ → $$$$", value: "asc" },
            { label: "$$$$ → $", value: "desc" },
            { label: "Skip", value: "none" },
        ];

        options.forEach(option => {
            const li = document.createElement("li");
            li.className = "px-4 py-2 hover:bg-gray-100 cursor-pointer";
            li.textContent = option.label;

            li.addEventListener("click", (e) => {
                e.stopPropagation();

                const keyword = selectedCuisines.join(", ");

                if (option.value === "none") {
                    // Just show cuisines without sorting
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            pos => findNearbyRestaurants({ lat: pos.coords.latitude, lng: pos.coords.longitude }, keyword),
                            () => findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 }, keyword)
                        );
                    } else {
                        findNearbyRestaurants({ lat: 49.282868, lng: -123.125032 }, keyword);
                    }
                    closeDropdown();
                } else {
                    // Cuisine + Price combined
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            pos => findAndSortByCuisineAndPrice({ lat: pos.coords.latitude, lng: pos.coords.longitude }, keyword, option.value),
                            () => findAndSortByCuisineAndPrice({ lat: 49.282868, lng: -123.125032 }, keyword, option.value)
                        );
                    } else {
                        findAndSortByCuisineAndPrice({ lat: 49.282868, lng: -123.125032 }, keyword, option.value);
                    }
                    closeDropdown();
                }
            });

            dropdown.appendChild(li);
        });

        // Back button
        const btnContainer = document.createElement("div");
        btnContainer.className = "flex justify-start px-4 py-2 border-t mt-2";
        btnContainer.innerHTML = `
            <button id="backToCuisine" class="text-gray-500 hover:text-gray-700 text-sm">← Back</button>
        `;
        dropdown.appendChild(btnContainer);

        document.getElementById("backToCuisine").addEventListener("click", (e) => {
            e.stopPropagation();
            showCuisineOptions();
        });
    }


    // Sort filters by price
    async function sortByPrice(order = "desc") {
        dropdown.classList.add("hidden");

        const container = document.getElementById("resultsContainer");
        container.innerHTML = "<p class='text-gray-500 px-4'>Sorting by price...</p>";

        if (window.lastSearchResults.length > 0) {
            sortExistingResultsByPrice(order);
        } else {
            // fallback if no search results yet
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => findAndSortByPrice({ lat: pos.coords.latitude, lng: pos.coords.longitude }, order),
                    () => findAndSortByPrice({ lat: 49.282868, lng: -123.125032 }, order)
                );
            } else {
                findAndSortByPrice({ lat: 49.282868, lng: -123.125032 }, order);
            }
        }


        closeDropdown();
    }

    // Helper function
    async function findAndSortByPrice(location, order = "desc") {
        const latLng = new google.maps.LatLng(location.lat, location.lng);
        const service = new google.maps.places.PlacesService(map);

        // Store user location if geolocation is enabled
        if (navigator.geolocation && location.lat !== 49.282868 && location.lng !== -123.125032) {
            userLocation = location;
            addUserLocationMarker(location);
        }

        const request = {
            query: "restaurant",
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

            // Calculate distances if user location is available
            if (userLocation && navigator.geolocation) {
                results.forEach(place => {
                    if (place.geometry?.location && !place.distance) {
                        const placeLat = place.geometry.location.lat();
                        const placeLng = place.geometry.location.lng();
                        place.distance = calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            placeLat,
                            placeLng
                        );
                    }
                });
            }

            // Sort by price ascending or descending
            results.sort((a, b) => {
                const priceA = a.price_level || 0;
                const priceB = b.price_level || 0;
                return order === "asc" ? priceA - priceB : priceB - priceA;
            });

            // If user location is available, also sort by distance as secondary sort
            if (userLocation && navigator.geolocation) {
                results.sort((a, b) => {
                    const priceA = a.price_level || 0;
                    const priceB = b.price_level || 0;
                    const priceSort = order === "asc" ? priceA - priceB : priceB - priceA;
                    if (priceSort === 0) {
                        // If prices are equal, sort by distance
                        return (a.distance || Infinity) - (b.distance || Infinity);
                    }
                    return priceSort;
                });
            }

            results.forEach((place) => {
                // Add map markers
                if (place.geometry?.location) {
                    const marker = new google.maps.Marker({
                        map,
                        position: place.geometry.location,
                        title: place.name,
                    });
                    markers.push(marker);
                }

                createRestaurantCard(place, container);
            });
        });
    }
    // Cuisine and Price combined
    async function findAndSortByCuisineAndPrice(location, keyword, order = "desc") {
        resetToOriginal();
        const latLng = new google.maps.LatLng(location.lat, location.lng);
        const service = new google.maps.places.PlacesService(map);

        // Store user location if geolocation is enabled
        if (navigator.geolocation && location.lat !== 49.282868 && location.lng !== -123.125032) {
            userLocation = location;
            addUserLocationMarker(location);
        }

        const request = {
            query: `${keyword} restaurant`,
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

            // Calculate distances if user location is available
            if (userLocation && navigator.geolocation) {
                results.forEach(place => {
                    if (place.geometry?.location && !place.distance) {
                        const placeLat = place.geometry.location.lat();
                        const placeLng = place.geometry.location.lng();
                        place.distance = calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            placeLat,
                            placeLng
                        );
                    }
                });
            }

            // Sort by price order
            results.sort((a, b) => {
                const priceA = a.price_level || 0;
                const priceB = b.price_level || 0;
                const priceSort = order === "asc" ? priceA - priceB : priceB - priceA;
                if (priceSort === 0 && userLocation && navigator.geolocation) {
                    // If prices are equal, sort by distance
                    return (a.distance || Infinity) - (b.distance || Infinity);
                }
                return priceSort;
            });

            results.forEach((place) => {
                if (place.geometry?.location) {
                    const marker = new google.maps.Marker({
                        map,
                        position: place.geometry.location,
                        title: place.name,
                    });
                    markers.push(marker);
                }

                createRestaurantCard(place, container);
            });
        });
        showFilterSummary({ cuisines: keyword.split(", "), price: order });

    }

    // Sort existing search results by price
    function sortExistingResultsByPrice(order = "desc") {
        const container = document.getElementById("resultsContainer");
        container.innerHTML = "";
        clearMarkers();
        resetToOriginal();
        
        // Calculate distances if user location is available
        const sorted = [...window.lastSearchResults];
        if (userLocation && navigator.geolocation) {
            sorted.forEach(place => {
                if (place.geometry?.location && !place.distance) {
                    const placeLat = place.geometry.location.lat();
                    const placeLng = place.geometry.location.lng();
                    place.distance = calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        placeLat,
                        placeLng
                    );
                }
            });
        }
        
        sorted.sort((a, b) => {
            const priceA = a.price_level || 0;
            const priceB = b.price_level || 0;
            const priceSort = order === "asc" ? priceA - priceB : priceB - priceA;
            if (priceSort === 0 && userLocation && navigator.geolocation) {
                // If prices are equal, sort by distance
                return (a.distance || Infinity) - (b.distance || Infinity);
            }
            return priceSort;
        });

        sorted.forEach((place) => {
            if (place.geometry?.location) {
                const marker = new google.maps.Marker({
                    map,
                    position: place.geometry.location,
                    title: place.name,
                });
                markers.push(marker);
            }

            createRestaurantCard(place, container);
        });
        showFilterSummary({ price: order });
    }

    // Filter existing results by cusiine
    // Filter existing results by cuisine
    function filterExistingResultsByCuisine(selectedCuisines) {
        const container = document.getElementById("resultsContainer");
        container.innerHTML = "<p class='text-gray-500 px-4'>Searching for restaurants...</p>";
        clearMarkers();

        // Use Google Places API to search for the cuisines
        const keyword = selectedCuisines.join(", ");
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => searchByCuisine({ lat: pos.coords.latitude, lng: pos.coords.longitude }, selectedCuisines),
                () => searchByCuisine({ lat: 49.282868, lng: -123.125032 }, selectedCuisines)
            );
        } else {
            searchByCuisine({ lat: 49.282868, lng: -123.125032 }, selectedCuisines);
        }
    }

    // New function to search by cuisine
    function searchByCuisine(location, selectedCuisines) {
        const latLng = new google.maps.LatLng(location.lat, location.lng);
        const service = new google.maps.places.PlacesService(map);
        
        // Store user location if geolocation is enabled
        if (navigator.geolocation && location.lat !== 49.282868 && location.lng !== -123.125032) {
            userLocation = location;
            addUserLocationMarker(location);
        }
        
        const keyword = selectedCuisines.join(" OR ");
        
        const request = {
            query: `${keyword} restaurant`,
            location: latLng,
            radius: 5000,
        };

        service.textSearch(request, (results, status) => {
            const container = document.getElementById("resultsContainer");
            container.innerHTML = "";
            clearMarkers();

            if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
                container.innerHTML = `<p class="text-gray-600 px-4">No restaurants found for the selected cuisines.</p>`;
                return;
            }

            // Calculate distances if user location is available
            if (userLocation && navigator.geolocation) {
                results.forEach(place => {
                    if (place.geometry?.location && !place.distance) {
                        const placeLat = place.geometry.location.lat();
                        const placeLng = place.geometry.location.lng();
                        place.distance = calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            placeLat,
                            placeLng
                        );
                    }
                });
                // Sort by distance (closest first)
                results.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
            }

            // Save results for further filtering
            window.lastSearchResults = results;
            window.originalSearchResults = [...results];

            results.forEach((place) => {
                if (place.geometry?.location) {
                    const marker = new google.maps.Marker({
                        map,
                        position: place.geometry.location,
                        title: place.name,
                    });
                    markers.push(marker);
                }

                createRestaurantCard(place, container);
            });

            showFilterSummary({ cuisines: selectedCuisines });
        });
    }

    // Filter summary
    function showFilterSummary({ cuisines = [], price = "", reviews = "" }) {
        const summary = document.getElementById("filterSummary");
        const text = document.getElementById("filterSummaryText");

        let summaryText = "";

        // Cuisine
        if (cuisines.length > 0) {
            summaryText += `🍴 Cuisine: ${cuisines.join(", ")}`;
        }

        // Price
        if (price) {
            if (summaryText) summaryText += " | ";
            summaryText += price === "asc" ? "$ → $$$$" : "$$$$ → $";
        }

        // Reviews
        if (reviews) {
            if (summaryText) summaryText += " | ";
            summaryText += reviews === "asc" ? "⭐ Low → High" : "⭐ High → Low";
        }

        text.textContent = summaryText || "";
        summary.classList.remove("hidden");

        document.getElementById("clearFiltersBtn").onclick = () => {
            clearFilters();
        };

        window.scrollTo({ top: 0, behavior: "smooth" });
    }


    function clearFilters() {
        const summary = document.getElementById("filterSummary");
        summary.classList.add("hidden");

        if (window.originalSearchResults.length === 0) return;

        window.lastSearchResults = [...window.originalSearchResults];

        // Recalculate distances if user location is available
        if (userLocation && navigator.geolocation) {
            window.lastSearchResults.forEach(place => {
                if (place.geometry?.location) {
                    const placeLat = place.geometry.location.lat();
                    const placeLng = place.geometry.location.lng();
                    place.distance = calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        placeLat,
                        placeLng
                    );
                }
            });
            // Sort by distance (closest first)
            window.lastSearchResults.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }

        const container = document.getElementById("resultsContainer");
        container.innerHTML = "";
        clearMarkers();

        window.lastSearchResults.forEach((place) => {
            if (place.geometry?.location) {
                const marker = new google.maps.Marker({
                    map,
                    position: place.geometry.location,
                    title: place.name,
                });
                markers.push(marker);
            }

            createRestaurantCard(place, container);
        });

        window.scrollTo({ top: 0, behavior: "smooth" });
    }




    loadFilters();
});



