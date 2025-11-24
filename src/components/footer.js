class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
        <footer>
        <div class="footericons bg-[#fbf4ed]">
        <a class = "no-underline text-black transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110" href="search.html">
            <div
                class="flex flex-col items-center justify-center hover:bg-orange-200 ficons px-2 md:px-4 mx-3  rounded-lg">
    
                <svg class = "h-14 w-14 p-1"
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e9580c"
                stroke-width="1.25"
                stroke-linecap="round"
                stroke-linejoin="round"
                >
                <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                <path d="M21 21l-6 -6" />
                </svg>
                <h3 class = "font-semibold no-underline"> Search </h3>
            </div>
        </a>
        <a class = "no-underline text-black transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110" href="swipe.html">
        <div class="ficons  flex flex-col items-center justify-center px-2 md:px-4 mx-3 hover:bg-orange-200 rounded-lg">
        <svg class = "h-14 w-14 p-1"
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ea580c"
        stroke-width="1.25"
        stroke-linecap="round"
        stroke-linejoin="round"
        >
        <path d="M9 21h6v-9a1 1 0 0 0 -1 -1h-4a1 1 0 0 0 -1 1v9z" />
        <path d="M12 3l1.465 1.638a2 2 0 1 1 -3.015 .099l1.55 -1.737z" />
        </svg>
        
        <h3 class = "font-semibold"> Swipe </h3>
        </div>
        </a>
        <a class = "no-underline text-black transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110" href="profile.html">
                <div id="ProfileIcon"
                    class="hover:bg-orange-200 ficons px-2 md:px-4 mx-3  rounded-lg flex flex-col items-center justify-center">
                    <svg class = "w-14 h-14 p-1"
                    xmlns="http://www.w3.org/2000/svg"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#e9580c"
                    stroke-width="1.25"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    >
                    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
                    <path d="M12 10m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                    <path d="M6.168 18.849a4 4 0 0 1 3.832 -2.849h4a4 4 0 0 1 3.834 2.855" />
                    </svg>
                    <h3 class = "font-semibold"> Profile </h3>
                </div>
            </a>
        </div>
    </footer>
        `;
    }
}

customElements.define('site-footer', SiteFooter);

