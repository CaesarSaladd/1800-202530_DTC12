import {
    getAuth,
    onAuthStateChanged,
    signOut,
} from "firebase/auth";


const auth = getAuth();
const usernameDisplay = document.getElementById('usernameDisplay');
const placeholderText = document.getElementById('nameInput');

onAuthStateChanged(auth, (user) => {
    if (user) {
        const username = user.displayName || user.email
        usernameDisplay.textContent = username
        if (placeholderText){
            placeholderText.placeholder = username
        }
    } else {
        console.log('no user logged in')
    }
})


// ---------------
// | signing out |
// ---------------
const logoutBtn = document.getElementById('logoutButton')

if (logoutBtn)
{
    logoutBtn.addEventListener("click", () => {
        signOut(auth)
        .then(() => {
            window.location.assign('/index')
        })
        .catch((error) => {
            console.error('Error signing out:', error)
        })
    })
}