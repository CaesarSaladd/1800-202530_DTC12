import {
    getAuth,
    onAuthStateChanged,
    signOut,
} from "firebase/auth";




// ---------------
// | signing out |
// ---------------
const logoutButton = document.getElementById('logoutButton')

logoutButton.addEventListener("click", () => {
    signOut(auth)
    .then(() => {
        window.location.assign('/index')
    })
    .catch((error) => {
        console.error('Error signing out:', error)
    })
})