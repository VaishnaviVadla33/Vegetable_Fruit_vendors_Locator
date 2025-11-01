# Vendor Veggie & Vittles

![HomePage](https://github.com/VaishnaviVadla33/Vegetable_Fruit_vendors_Locator/blob/main/Vendor_VeggieAndVittles_HomePage1.png)
Vendor Veggie & Vittles is a frontend web application designed to help users explore South Indian recipes and discover local vegetable and fruit vendors through an interactive map. The application features user authentication powered by Firebase.

## View Demo
[View Live Demo](https://vaishnavivadla33.github.io/Vegetable_Fruit_vendors_Locator/)

## Features

* **User Authentication:**
    * Login and Sign-up functionality using Firebase Authentication (via `index.html`).
    * Email verification for new accounts.
    * Session management to show user status.
* **Main Application:**
    * **Single Page Interface:** Dynamically displays sections (Home, Vendors, Recipes, Grocer Guide) without full page reloads.
    * **Image Carousel:** Simple image slideshow on the home section.
    * **Local Vendor Showcase:** Displays vendor cards with details.
    * **Recipe Book:** Presents recipes categorized into Vegetarian, Desserts, and Non-Vegetarian sections using cards.
    * **Grocer Guide (Map):** Integrates Google Maps to display vendor locations with markers and an interactive details sidebar.

## Technologies Used

* **Frontend:** HTML5, CSS3, JavaScript (ES6)
* **Fonts:** Google Fonts (Poppins, Playfair Display)
* **Maps API:** Google Maps JavaScript API
* **Authentication:** Firebase Authentication
* **Deployment (Potential):** Firebase Hosting

## Setup & Installation (Local Frontend)

1.  **Clone/Download**
2.  **API Keys Configuration:**
    * **Firebase:** Update the Firebase project configuration variables (apiKey, authDomain, projectId, etc.) found within the `<script>` tags in `index.html`.
    * **Google Maps:** Ensure a valid Google Maps JavaScript API key is included in the `<script>` tag within `home.html`.
3.  **Run:** Open the `index.html` file in your web browser to access the login/signup page. After successful login/signup, you should be redirected or manually navigate to `home.html` to use the main application features.

## Usage

1.  Open `index.html` to log in or sign up.
2.  Upon successful authentication, access `home.html`.
3.  Use the top navigation bar to switch between the different sections (Home, Vendors, Recipes, Grocer Guide).
4.  Explore recipes by category.
5.  Interact with the map in the "Grocer Guide" section to find vendors and view their details.

Note: If the popup’s close button isn’t working, simply click anywhere outside the popup to exit the dialog.
