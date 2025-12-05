# Binge - Your next favorite food app!
## Use Binge to discover new restaurants around you!

## Overview
- Binge is a client-side JavaScript web application designed to help users discover new restaurants through location based searching and interactive swiping. Users can explore nearby restaurants using a live map and filters, or swipe through personalized restaurant recommendations.
- Originally developed for the COMP 1800 course at BCIT, this project applies User-Centred Design principles, agile project management, and integrates Firebase backend services to store user preferences such as saved restaurants (“Craves”) and rejected options (“Leftovers”).

---


## Features

- Search nearby restaurants using a live interactive map
- Filter results by cuisine, price, and reviews
- Swipe right to save restaurants to Craves
- Swipe left to remove restaurants from your recommendations
- View your personalized Craves and Leftovers lists
- Secure authentication using Firebase
- Fully responsive design for desktop and mobile devices

---


## Technologies Used

Example:
- **Frontend**: HTML, Tailwind CSS, JavaScript
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Backend**: Firebase for hosting and authentication
- **Database**: Firestore
- **API**: Google Maps and Places API

---


## Usage

1. Open your browser and visit `https://binge-94730.web.app/`.
2. Log in or create an account.
3. Browse nearby restaurants on the Search page using the live map and filters.
4. Use the Swipe page to discover restaurants interactively.
5. Swipe right to add a restaurant to Craves.
6. Swipe left to remove it from your recommendations.
7. View all saved restaurants in your Craves list.

---


## Project Structure

```

1800-202530_DTC12/
├── .firebase/
│   └── hosting.*.cache
├── dist/
│   └── assets/
├── images/
│   ├── binge_invis.png
│   ├── binge.jpg
│   ├── logo.jpg
│   ├── settings.svg
│   └── vertical_dots.svg
├── node_modules/
├── src/
│   ├── components/
│   ├── app.js
│   ├── authentication.js
│   ├── firebaseConfig.js
│   ├── firebaseUserRef.js
│   ├── leftovers.js
│   ├── login.js
│   ├── main.js
│   ├── profile.js
│   ├── ProfileEdit.js
│   ├── review.js
│   ├── search.js
│   └── swipe.js
├── styles/
│   └── style.css
├── .env
├── .firebaserc
├── .gitignore
├── burger.svg
├── faq.html
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── index.html
├── leftovers.html
├── Login.html
├── package-lock.json
├── package.json
├── profile.html
├── profileEdit.html
├── README.md
├── review.html
├── search.html
├── settings.html
├── swipe.html
├── tailwind.config.js
└── vite.config.js

```
---


## Contributors
- **Julio** - BCIT CST Student who loves to play FPS games and go on hikes. Has lived in 4 different countries.
- **Jameel** - BCIT CST Student, aspiring full-stack developer who enjoys playing video games in his spare time.
- **Declan Shorman** - BCIT CST Student, specializes in backend programming. Fun fact: Loves solving Rubik's Cubes in under a minute.
---


## Acknowledgments

- Restaurant data for demonstration purposes only.
- Code snippets were adapted from resources such as [Stack Overflow](https://stackoverflow.com/) and [MDN Web Docs](https://developer.mozilla.org/).
- Icons sourced from [FontAwesome](https://fontawesome.com/) and images from [Unsplash](https://unsplash.com/).

---


## Limitations and Future Work
### Limitations

- No real-time restaurant availability or wait times
- Limited accessibility features
- Recommendation logic is basic

### Future Work
- Advanced recommendation algorithm using user behavior
- Live restaurant availability and wait times
- In-app navigation to restaurants
- Dark mode support
- Enhanced accessibility and screen-reader support
- Group swiping and social features

---
