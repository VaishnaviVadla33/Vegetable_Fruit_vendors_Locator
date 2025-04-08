// Image Carousel Functions
let currentSet = 1;
const totalSets = 2;

function showSet(setNumber) {
    document.querySelectorAll('.image-set').forEach(function(element) {
        element.classList.remove('active');
    });

    document.getElementById(`image-set${setNumber}`).classList.add('active');
    currentSet = setNumber;
}

function nextSet() {
    if (currentSet < totalSets) {
        showSet(currentSet + 1);
    } else {
        showSet(1); // Loop back to first set
    }
}

function prevSet() {
    if (currentSet > 1) {
        showSet(currentSet - 1);
    } else {
        showSet(totalSets); // Loop to last set
    }
}

// Section Navigation Functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(function(section) {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('nav ul li a').forEach(function(link) {
        link.classList.remove('active');
    });
    
    // Find the nav link for this section and make it active
    const navLink = document.querySelector(`nav ul li a[href="#${sectionId}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Recipe Section Navigation Functions
function showRecipeSection(sectionId) {
    // Hide all recipe sections
    document.querySelectorAll('.recipe-section').forEach(function(section) {
        section.classList.remove('active');
    });
    
    // Show selected recipe section
    document.getElementById(sectionId).classList.add('active');
}

// Google Maps and Vendor Functions
let map;
let infowindow;
let sidebarOpen = false;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 16.8236857, lng: 78.1422984 },
        zoom: 12,
        styles: [
            {
                "featureType": "poi",
                "elementType": "labels",
                "stylers": [{ "visibility": "off" }]
            }
        ]
    });

    const markers = [
        { lat: 16.7520314, lng: 78.0177033, title: 'Vegetable Vendor 1', vendor: 'Anjama', contact: '9573069662', location: 'Padmavathi colony', vegetables: ['Tomato', 'Onion', 'Potato', 'Cabbage'], image: 'images/veg_10.jpeg' },
        { lat: 16.7533637, lng: 78.0161735, title: 'Vegetable Vendor 2', vendor: 'Nirmala', contact: '8886833609', location: 'Venkateshwara colony', vegetables: ['Carrot', 'Spinach', 'Capsicum'], image: 'images/veg_20.jpeg' },
        { lat: 16.753253, lng: 78.01532, title: 'Vegetable Vendor 3', vendor: 'Parupally Chennamma', contact: '9XXXXXXXXX', location: 'Venkateshwara colony', vegetables: ['Brinjal', 'Bitter gourd', 'Ridge gourd'], image: 'images/veg_30.jpeg' },
        { lat: 16.753253, lng: 78.01533, title: 'Fruits Vendor 4', vendor: 'Krishnama', contact: '9XXXXXXXXX', location: 'Venkateshwara colony', vegetables: ['Apple', 'Orange', 'Banana'], image: 'images/fruit_40.jpeg' },
        { lat: 16.7489166, lng: 78.0017231, title: 'Fruits Vendor 5', vendor: 'Giri', contact: '9XXXXXXXXX', location: 'New Town', vegetables: ['Grapes', 'Pomegranate', 'Guava'], image: 'images/fruit_50.jpeg' },
        { lat: 16.754597, lng: 78.0015857, title: 'Fruits Vendor 6', vendor: 'Amzed Khan', contact: '9XXXXXXXXX', location: 'Rajendra nagar', vegetables: ['Mango', 'Watermelon', 'Papaya'], image: 'images/fruit_60.jpeg' },
        { lat: 16.7548941, lng: 78.000241, title: 'Vegetable Vendor 7', vendor: 'Kavali Raju', contact: '9XXXXXXXXX', location: 'Rajendra nagar', vegetables: ['Cauliflower', 'Broccoli', 'Green beans'], image: 'images/veg_70.jpeg' },
        { lat: 16.7533346, lng: 77.9965387, title: 'Vegetable Vendor 8', vendor: 'Laxmi', contact: '9XXXXXXXXX', location: 'Subhash nagar', vegetables: ['Pumpkin', 'Sweet corn', 'Cucumber'], image: 'images/veg_80.jpeg' },
        { lat: 16.7505015, lng: 77.9893079, title: 'Fruit Vendor 9', vendor: 'Baba', contact: '9XXXXXXXXX', location: 'Monnappaguta', vegetables: ['Pear', 'Kiwi', 'Dragon fruit'], image: 'images/fruit_90.jpeg' },
        { lat: 16.7534287, lng: 77.9914145, title: 'Vegetable Vendor 10', vendor: 'Vishnu', contact: '9XXXXXXXXX', location: 'New Gunj', vegetables: ['Beetroot', 'Radish', 'Turnip'], image: 'images/veg_100.jpeg' }
    ];

    //marker
    markers.forEach(markerData => {
        const marker = new google.maps.Marker({
            position: { lat: markerData.lat, lng: markerData.lng },
            map: map,
            title: markerData.title,
            icon: {
                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                fillColor: markerData.title.includes('Fruit') ? '#FF5252' : '#4CAF50', // Red for fruits, green for vegetables
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 1,
                scale: 1.5,
                anchor: new google.maps.Point(12, 24) // Adjust anchor point for the pin
            }
        });

        marker.addListener('click', () => {
            if (infowindow) {
                infowindow.close();
            }

            const content = `
                <div style="background-color: #e8f5e9; padding: 10px; border-radius: 5px;">
                    <h3 style="color: #2e7d32;">${markerData.title}</h3>
                    <p><strong>Vendor:</strong> ${markerData.vendor}</p>
                    <p><strong>Location:</strong> ${markerData.location}</p>
                </div>
            `;

            infowindow = new google.maps.InfoWindow({
                content: content
            });
            infowindow.open(map, marker);

            // Open sidebar with marker details
            openSidebar(markerData);
        });
    });

    // Close sidebar button event
    document.getElementById('close-sidebar').addEventListener('click', function() {
        closeSidebar();
    });
}

function openSidebar(markerData) {
    const sidebarContent = document.getElementById('sidebar-content');
    sidebarContent.innerHTML = `
        <h2>${markerData.title}</h2>
        <img src="${markerData.image}" alt="${markerData.title}">
        <p><strong>Vendor:</strong> ${markerData.vendor}</p>
        <p><strong>Contact:</strong> ${markerData.contact}</p>
        <p><strong>Location:</strong> ${markerData.location}</p>
        <p><strong>Products Available:</strong></p>
        <ul>
            ${markerData.vegetables.map(vegetable => `<li>${vegetable}</li>`).join('')}
        </ul>
    `;

    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('open');
    sidebar.style.right = '0';
    sidebarOpen = true;
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    sidebar.style.right = '-350px';
    sidebarOpen = false;
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Show default section (home)
    showSection('home');
    
    // Initialize map
    initMap();
    
    // Set default recipe section
    document.getElementById('vegetarian-recipes').classList.add('active');
    
    // Start auto slideshow for image sets
    setInterval(function() {
        nextSet();
    }, 5000);
});

// Recipe Data - Authentic South Indian Recipes
const recipes = {
    vegetarian: [
        {
            id: 'masala-dosa',
            title: 'Masala Dosa',
            image: 'images/food1.jpeg',
            description: 'Crispy rice and lentil crepe filled with spiced potato filling',
            ingredients: [
                '2 cups rice',
                '1 cup urad dal (black gram)',
                '1/2 tsp fenugreek seeds',
                '4 medium potatoes (boiled and mashed)',
                '1 onion (finely chopped)',
                '2 green chilies (chopped)',
                '1/2 tsp mustard seeds',
                '1/2 tsp turmeric powder',
                '1 sprig curry leaves',
                'Salt to taste',
                'Oil for cooking'
            ],
            method: [
                'Soak rice, urad dal and fenugreek seeds for 6 hours',
                'Grind to a smooth batter and ferment overnight',
                'For filling, heat oil, add mustard seeds, curry leaves, onions and green chilies',
                'Add turmeric and mashed potatoes, mix well and cook for 5 minutes',
                'Spread batter on hot tawa to make thin dosa',
                'Place potato filling in center and fold',
                'Serve hot with coconut chutney and sambar'
            ],
            videoUrl: 'https://www.youtube.com/embed/9saTcTm4UQw'
        }
    ],
    desserts: [
        {
            id: 'mysore-pak',
            title: 'Mysore Pak',
            image: 'images/dessert1.jpeg',
            description: 'Traditional sweet made with gram flour, ghee and sugar',
            ingredients: [
                '1 cup besan (gram flour)',
                '1 cup ghee',
                '1 cup sugar',
                '1/2 cup water',
                '1/4 tsp cardamom powder'
            ],
            method: [
                'Heat ghee in a pan and keep warm',
                'In another pan, make sugar syrup with water until one-string consistency',
                'Slowly add besan to the syrup while stirring continuously',
                'Add ghee gradually while stirring to avoid lumps',
                'Keep stirring until the mixture leaves the sides of the pan',
                'Pour into greased tray and cut into pieces when slightly cooled',
                'Let it set completely before serving'
            ],
            videoUrl: 'https://www.youtube.com/embed/Np2jiYSd6aE'
        }
    ],
    nonVegetarian: [
        {
            id: 'chicken-biryani',
            title: 'Hyderabadi Chicken Biryani',
            image: 'images/nonveg1.jpeg',
            description: 'Flavorful rice dish with marinated chicken and spices',
            ingredients: [
                '500g basmati rice',
                '1kg chicken (cut into pieces)',
                '2 cups yogurt',
                '3 onions (sliced)',
                '2 tomatoes (chopped)',
                '1 tbsp ginger-garlic paste',
                '2 green chilies',
                '1/2 cup mint leaves',
                '1/2 cup coriander leaves',
                '1 tsp turmeric',
                '2 tsp red chili powder',
                '1 tsp garam masala',
                '1/2 tsp saffron (soaked in milk)',
                '4 tbsp ghee',
                'Salt to taste'
            ],
            method: [
                'Marinate chicken with yogurt, spices, ginger-garlic paste for 2 hours',
                'Soak rice for 30 minutes and parboil with whole spices',
                'Fry onions until golden brown',
                'Layer half the rice in heavy bottomed vessel',
                'Add chicken masala, fried onions, mint and coriander leaves',
                'Top with remaining rice and saffron milk',
                'Seal with dough and cook on dum (low heat) for 30 minutes',
                'Mix gently before serving with raita'
            ],
            videoUrl: 'https://www.youtube.com/embed/PmqdA05OXuI'
        }
    ]
};

// Recipe Popup Elements


// Recipe Popup CSS
const style = document.createElement('style');
style.textContent = `
    .recipe-popup {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.8);
        z-index: 1000;
        overflow-y: auto;
    }
    .popup-content {
        background-color: white;
        max-width: 800px;
        margin: 50px auto;
        padding: 20px;
        border-radius: 8px;
        position: relative;
    }
    .close-popup {
        position: absolute;
        top: 10px;
        right: 20px;
        font-size: 30px;
        cursor: pointer;
    }
    .recipe-image {
        width: 100%;
        max-height: 300px;
        object-fit: cover;
        border-radius: 5px;
    }
    .recipe-details {
        margin-top: 20px;
    }
    .ingredients, .method {
        margin: 15px 0;
        padding-left: 20px;
    }
    .video-container {
        margin-top: 20px;
        position: relative;
        padding-bottom: 56.25%;
        height: 0;
        overflow: hidden;
    }
    .video-container iframe {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
    @media (max-width: 600px) {
        .popup-content {
            margin: 20px auto;
            width: 90%;
        }
    }
`;
document.head.appendChild(style);

// Function to show recipe details
function showRecipeDetails(recipeId, category) {
    let recipe;
    
    // Find the recipe based on category
    if (category === 'vegetarian') {
        recipe = recipes.vegetarian.find(r => r.id === recipeId);
    } else if (category === 'desserts') {
        recipe = recipes.desserts.find(r => r.id === recipeId);
    } else if (category === 'nonVegetarian') {
        recipe = recipes.nonVegetarian.find(r => r.id === recipeId);
    }
    
    if (!recipe) return;

    const popup = document.querySelector('.recipe-popup');
    popup.querySelector('.recipe-title').textContent = recipe.title;
    popup.querySelector('.recipe-image').src = recipe.image;
    popup.querySelector('.recipe-image').alt = recipe.title;
    
    const ingredientsList = popup.querySelector('.ingredients');
    ingredientsList.innerHTML = recipe.ingredients.map(ing => `<li>${ing}</li>`).join('');
    
    const methodList = popup.querySelector('.method');
    methodList.innerHTML = recipe.method.map(step => `<li>${step}</li>`).join('');
    
    const iframe = popup.querySelector('iframe');
    iframe.src = recipe.videoUrl;
    
    popup.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close popup handler
document.querySelector('.close-popup').addEventListener('click', () => {
    document.querySelector('.recipe-popup').style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Also pause any videos when closing
    const iframe = document.querySelector('.recipe-popup iframe');
    if (iframe) {
        iframe.src = iframe.src; // This resets the iframe
    }
});
// Close when clicking outside content
document.querySelector('.recipe-popup').addEventListener('click', function(e) {
    if (e.target === this) {
        this.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

function initializeRecipeCards() {
    // Get all recipe cards
    const recipeCards = document.querySelectorAll('.recipe-card');
    
    recipeCards.forEach(card => {
        const recipeId = card.dataset.id;
        const category = card.dataset.category;
        
        // Find the matching recipe
        let recipe;
        if (category === 'vegetarian') {
            recipe = recipes.vegetarian.find(r => r.id === recipeId);
        } else if (category === 'desserts') {
            recipe = recipes.desserts.find(r => r.id === recipeId);
        } else if (category === 'nonVegetarian') {
            recipe = recipes.nonVegetarian.find(r => r.id === recipeId);
        }
        
        if (recipe) {
            const btn = card.querySelector('.recipe-btn');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                showRecipeDetails(recipeId, category);
            });
            
            // Make the title clickable
            const title = card.querySelector('h3');
            title.style.cursor = 'pointer';
            title.addEventListener('click', () => {
                showRecipeDetails(recipeId, category);
            });
        }
    });
}

// Initialize recipe cards when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // Existing initialization code...
    initializeRecipeCards();
    
    // Make recipe titles clickable too
    document.querySelectorAll('.recipe-card h3').forEach(title => {
        title.style.cursor = 'pointer';
        title.addEventListener('click', function() {
            const card = this.closest('.recipe-card');
            const btn = card.querySelector('.recipe-btn');
            btn.click();
        });
    });
});
