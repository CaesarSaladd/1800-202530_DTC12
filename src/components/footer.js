class SiteFooter extends HTMLElement {
    connectedCallback() {
        const currentPage = window.location.pathname.split("/").pop(); 
        // e.g. "swipe.html"

        const isActive = (page) =>
            currentPage === page ? "bg-orange-200 scale-110 font-bold" : "";

        this.innerHTML = `
        <footer>
        <div class="footericons bg-[#fbf4ed] flex justify-center">

            <!-- SEARCH -->
            <a href="search.html" class="no-underline text-black transition duration-200 ease-in-out">
                <div class="ficons px-2 md:px-4 mx-3 rounded-lg flex flex-col items-center justify-center
                    hover:bg-orange-200 hover:-translate-y-1 hover:scale-110 ${isActive("search.html")}">

                    <svg class="h-14 w-14 p-1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none" stroke="#e9580c" stroke-width="1.25"
                        stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="10" cy="10" r="7" />
                        <path d="M21 21l-6 -6" />
                    </svg>
                    <h3 class="font-semibold">Search</h3>
                </div>
            </a>

            <!-- SWIPE -->
            <a href="swipe.html" class="no-underline text-black transition duration-200 ease-in-out">
                <div class="ficons px-2 md:px-4 mx-3 rounded-lg flex flex-col items-center justify-center
                    hover:bg-orange-200 hover:-translate-y-1 hover:scale-110 ${isActive("swipe.html")}">

                    <svg class="h-14 w-14 p-1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none" stroke="#ea580c" stroke-width="1.25"
                        stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21h6v-9a1 1 0 0 0 -1 -1h-4a1 1 0 0 0 -1 1v9z" />
                        <path d="M12 3l1.465 1.638a2 2 0 1 1 -3.015 .099l1.55 -1.737z" />
                    </svg>
                    <h3 class="font-semibold">Swipe</h3>
                </div>
            </a>

            <!-- PROFILE -->
            <a href="profile.html" class="no-underline text-black transition duration-200 ease-in-out">
                <div class="ficons px-2 md:px-4 mx-3 rounded-lg flex flex-col items-center justify-center
                    hover:bg-orange-200 hover:-translate-y-1 hover:scale-110 ${isActive("profile.html")}">

                    <svg class="h-14 w-14 p-1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none" stroke="#e9580c" stroke-width="1.25"
                        stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <circle cx="12" cy="10" r="3" />
                        <path d="M6.2 18.85a4 4 0 0 1 3.8 -2.85h4a4 4 0 0 1 3.8 2.85" />
                    </svg>
                    <h3 class="font-semibold">Profile</h3>
                </div>
            </a>

        </div>
        </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);
