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