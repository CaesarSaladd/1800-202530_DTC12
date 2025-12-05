# Binge - Your next favorite food app!
## Dating is overated. Eat good food instead!

## Overview
- Binge is a client-side JavaScript web application that helps users discover and explore restaurants. The app allows users to search for restaurants using filters such as cuisine, price, distance, and ratings, or swipe through a deck of restaurant cards to quickly browse options. Each restaurant card includes key details such as name, location, cuisine type, price range, and an image. Users can browse freely and save their favorite restaurants for easy access later.
- Developed for the COMP 1800 course, this project applies User-Centred Design principles and agile project management, and demonstrates integration with Firebase backend services for storing user favorites and supporting real-time updates. Binge is designed to make choosing where to eat fast, intuitive, and fun.
---


## Features

- Browse a list of curated restaurants with images and details
- Swipe through a deck of restaurant cards to discover new options
- Filter restaurants by cuisine, price, distance, and rating
- Mark and unmark restaurants as favorites
- Write, edit, and read reviews for restaurants
- Responsive design for desktop and mobile
  
---


## Technologies Used

Example:
- **Frontend**: HTML, CSS, JavaScript
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Backend**: Firebase for hosting
- **Database**: Firestore

---


## Usage

1. Open your CLI and type 'run npm dev'.
2. Login or Sign Up and see displayed restaurants on search page or swipe.
3. Swipe right to like restaurants and swipe left to dislike restaurants.
4. Add liked restaurants to your profile page and click on the pencil to write reivews.
5. View your reviews on the bottom section of profile page.

---


## Project Structure

```
1800-202530_DTC12/
├── src/
│   ├── app.js
│   ├── authetication.js
│   ├── firebaseConfig.js
│   ├── firebaseUserRef.js
│   ├── leftovers.js
│   ├── login.js
│   ├── profile.js
│   ├── profileEdit.js
│   ├── review.js
│   ├── search.js
│   ├── swipe.js
├── styles/
│   └── style.css
├── public/
├── images/
│   ├──binge_invis.png
│   ├── binge.jpg
│   ├── settings.png
├── index.html
├── profile.html
├── review.html
├── settings.html
├── search.html
├── swipe.json
├── login.json
├── leftovers.json
├── README.md
```

---

## Contributors
- **Julio** - BCIT CST Student who loves to play FPS games and go on hikes. Has lived in 4 different countries.
- Jameel - BCIT CST Student, aspiring full-stack developer who enjoys playing video games in his spare time.
- **Declan Shorman** - BCIT CST Student, specializes in backend programming. Fun fact: Loves solving Rubik's Cubes in under a minute.
---


## Acknowledgments

- Code snippets were adapted from resources such as [Stack Overflow](https://stackoverflow.com/) and [Chat-GPT](https://chatgpt.com/) and COMP-1800 Course Demos.
---


## Limitations and Future Work

### Limitations

- Limited trail details (e.g., no live trail conditions).
- Accessibility features can be further improved.

### Future Work

- Implement map view and trailhead directions.
- Add filtering and sorting options (e.g., by difficulty, distance).
- Create a dark mode for better usability in low-light conditions.

---


## License

This project is licensed under the MIT License. See the LICENSE file for details.
