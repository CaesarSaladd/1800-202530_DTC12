class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
    <footer>
        <div class="footericons">
            <a href="search.html">
                <div
                    class=" hover:bg-gray-400 ficons px-2 md:px-4 mx-3 border-2 border-faded border-gray-600 rounded-lg">
                    <svg class="h-14 w-14 p-1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"
                        viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                        <path d="M21 21l-6 -6" />
                    </svg>
                </div>
            </a>
            <a href="swipe.html">
                <div class="ficons px-2 md:px-4 mx-3 border-2 border-faded border-gray-600 rounded-lg">
                    <svg class="h-14 w-14 p-1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"
                        viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M9 21h6v-9a1 1 0 0 0 -1 -1h-4a1 1 0 0 0 -1 1v9z" />
                        <path d="M12 3l1.465 1.638a2 2 0 1 1 -3.015 .099l1.55 -1.737z" />
                    </svg>
                </div>
            </a>
            <a href="profile.html">
                <div id="ProfileIcon"
                    class="hover:bg-gray-400 ficons px-2 md:px-4 mx-3 border-2 border-faded border-gray-600 rounded-lg">
                    <svg class="h-14 w-14 p-1" xmlns="http://www.w3.org/2000/svg" width="32" height="32"
                        viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round"
                        stroke-linejoin="round">
                        <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                        <path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                        <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" />
                    </svg>
                </div>
            </a>
        </div>
    </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);