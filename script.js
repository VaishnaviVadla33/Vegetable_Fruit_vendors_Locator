// ===== FIREBASE INITIALIZATION =====
const auth = firebase.auth();
const db = firebase.firestore();

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let map; // For Google Map
// Removed: let geocoder;
let infowindow; // For Google Map
let sidebarOpen = false; // For Google Map

// --- Globals for Order Form ---
let currentRecipeId = null;
let currentRecipeTitle = null;
let currentRecipeOwnerUid = null;

// ===== AUTHENTICATION & PAGE LOAD =====
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged((user) => {
        if (user && user.emailVerified) {
            // User is signed in and verified
            const localUserData = JSON.parse(localStorage.getItem('user'));

            if (localUserData && localUserData.uid === user.uid) {
                currentUser = localUserData;
                initializePage(); // Initialize after currentUser is set
            } else {
                // Fetch user data from Firestore if localStorage is missing or mismatched
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        currentUser = {
                            uid: user.uid,
                            email: user.email,
                            name: userData.name || '',
                            userType: userData.userType || 'user'
                        };
                        localStorage.setItem('user', JSON.stringify(currentUser));
                        initializePage(); // Initialize after currentUser is set
                    } else {
                        console.error("User exists in Auth but not in Firestore.");
                        auth.signOut();
                        localStorage.removeItem('user'); // Clear potentially bad local storage
                        window.location.href = 'index.html'; // Redirect to login
                    }
                }).catch(error => {
                    console.error("Error fetching user data from Firestore:", error);
                    auth.signOut();
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                });
            }
        } else if (user && !user.emailVerified) {
            // User signed in but not verified - Redirect to login
            auth.signOut();
            localStorage.removeItem('user');
            // Don't alert here, let index.html handle showing verification message
            window.location.href = 'index.html';
        } else {
            // User is not signed in - Redirect to login
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        }
    });
});

function initializePage() {
    // Show default section
    showSection('home');

    // Initialize Google Map
    initMap();

    // Set Dropdown Toggle Text
    const accountToggle = document.getElementById('account-dropdown-toggle');
    if (accountToggle) { // Check if element exists
        if (currentUser && currentUser.name) {
            const firstName = currentUser.name.split(' ')[0];
            accountToggle.textContent = `${firstName} ▼`;
        } else {
            accountToggle.textContent = 'Account ▼'; // Default
        }
    } else {
        console.error("Account dropdown toggle element not found.");
    }


    // Conditionally show vendor link
    if (currentUser && currentUser.userType === 'vendor') { // Add check for currentUser
        const myShopNavItem = document.getElementById('nav-my-shop');
        if (myShopNavItem) {
            myShopNavItem.style.display = 'list-item'; // Use list-item for li
            loadVendorDetails(); // Load existing details into the form
        }
    }

    // Load all recipes for public view
    loadAllRecipes();

    // Load user-specific recipes
    loadMyRecipes();

    // Load user's orders (placed and received)
    loadMyOrders();

    // Set default recipe section to be active (for category view)
    const vegRecipesSection = document.getElementById('vegetarian-recipes');
    if(vegRecipesSection) vegRecipesSection.classList.add('active');

    // ----- ADD EVENT LISTENERS -----

    // *** CORRECTED Logout button inside dropdown ***
    const logoutBtn = document.getElementById('logout-btn-dropdown'); // Use the correct ID
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            auth.signOut().then(() => {
                localStorage.removeItem('user');
                sessionStorage.removeItem('chatSessionId'); // Clear chat session on logout
                window.location.href = 'index.html';
            }).catch(error => {
                console.error("Logout error:", error);
                alert("Failed to log out. Please try again.");
            });
        });
    } else {
        console.error("Logout button (dropdown) element not found!");
    }


    // Recipe search
    const recipeSearchBtn = document.getElementById('recipe-search-btn');
     if(recipeSearchBtn) recipeSearchBtn.addEventListener('click', searchRecipes);

    // Recipe upload/edit form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) uploadForm.addEventListener('submit', handleRecipeSubmit);

    // Recipe image preview
    const recipeImageInput = document.getElementById('recipe-image');
    if (recipeImageInput) recipeImageInput.addEventListener('change', (e) => {
        handleImagePreview(e, 'image-preview');
    });

    // --- Vendor Form Listeners ---
    const vendorForm = document.getElementById('vendor-form');
    if (vendorForm) vendorForm.addEventListener('submit', handleVendorSubmit);

    const vendorImageInput = document.getElementById('vendor-image');
    if (vendorImageInput) vendorImageInput.addEventListener('change', (e) => {
        handleImagePreview(e, 'vendor-image-preview');
    });

    const captureLocationBtn = document.getElementById('capture-location-btn');
    if (captureLocationBtn) captureLocationBtn.addEventListener('click', captureCurrentLocation);


    // --- Order Form Listeners ---
    const showOrderBtn = document.getElementById('show-order-form-btn');
    if (showOrderBtn) {
        showOrderBtn.addEventListener('click', () => {
            const orderForm = document.getElementById('order-form');
            if(orderForm) orderForm.style.display = 'block';
            showOrderBtn.style.display = 'none';
        });
    }

    const orderForm = document.getElementById('order-form');
    if(orderForm) orderForm.addEventListener('submit', handleOrderSubmit);

    // --- Popup Close Listeners ---
    const closePopupBtn = document.querySelector('.close-popup');
    if (closePopupBtn) closePopupBtn.addEventListener('click', closeRecipePopup);

    const recipePopup = document.querySelector('.recipe-popup');
    if (recipePopup) {
        recipePopup.addEventListener('click', function(e) {
            if (e.target === this) { // Only close if clicking the background overlay
                closeRecipePopup();
            }
        });
    }

    // --- Chatbot UI Listeners (Moved inside initializePage) ---
    initializeChatbotUI(); // Call separate function for chatbot UI

    // Staggered entrance animations for home elements (fade-up)
    // Run only once after initial load potentially
    if (!document.body.dataset.animationsDone) { // Prevent re-running on potential re-initialization
        setTimeout(() => {
            document.querySelectorAll('#home .fade-up').forEach((el, idx) => {
                setTimeout(() => el.classList.add('visible'), idx * 120);
            });
            document.body.dataset.animationsDone = 'true'; // Mark as done
        }, 400); // Delay slightly after page load
    }

    // Start carousel autoplay
    startCarouselAutoplay();
    const carouselCard = document.querySelector('.carousel-card');
    if (carouselCard) {
        carouselCard.addEventListener('mouseenter', stopCarouselAutoplay);
        carouselCard.addEventListener('mouseleave', startCarouselAutoplay);
    }

} // End of initializePage


// ===== NAVIGATION =====
function showSection(sectionId) {
    document.body.style.overflow = 'auto'; // Reset body overflow

    // Hide all sections first
    document.querySelectorAll('.section').forEach(function(section) {
        section.classList.remove('active');
    });

    // Show the selected section
    const activeSection = document.getElementById(sectionId);
    if(activeSection) {
        activeSection.classList.add('active');
    } else {
        console.warn(`Section with ID "${sectionId}" not found.`);
        const homeSection = document.getElementById('home');
        if (homeSection) homeSection.classList.add('active'); // Fallback to home
    }

    // Update active state for main nav links (excluding dropdown toggle)
    let mainLinkActivated = false;
    document.querySelectorAll('nav > ul > li > a:not(.dropdown-toggle)').forEach(function(link) {
        link.classList.remove('active');
        const onclickAttr = link.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes(`showSection('${sectionId}')`)) {
             link.classList.add('active');
             mainLinkActivated = true;
        }
    });

    // Handle 'Home' link state specifically
    const homeLink = document.querySelector('nav > ul > li > a[onclick*="showSection(\'home\')"]');
    if (sectionId === 'home' && homeLink) {
        homeLink.classList.add('active'); // Always activate home if showing home
    } else if (homeLink) {
        homeLink.classList.remove('active'); // Deactivate home if showing any other section
    }


    // Reset specific states when switching sections
    if (sectionId === 'recipes') {
        const searchResults = document.getElementById('search-results-section');
        if (searchResults) searchResults.classList.remove('active');
        if (!document.querySelector('#recipes .recipe-section.active')) {
             showRecipeSection('vegetarian-recipes');
        }
    }

    if (sectionId === 'upload-recipe-form') {
        const editIdInput = document.getElementById('edit-recipe-id');
        if (editIdInput && !editIdInput.value) {
            resetUploadForm();
        }
    }

    window.scrollTo(0, 0); // Scroll to top
}


function showRecipeSection(sectionId) {
    document.querySelectorAll('#recipes .recipe-section').forEach(function(section) {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(sectionId);
    if(activeSection) {
        activeSection.classList.add('active');
    } else {
        console.warn(`Recipe section with ID "${sectionId}" not found.`);
        const defaultRecipeSection = document.getElementById('vegetarian-recipes');
        if(defaultRecipeSection) defaultRecipeSection.classList.add('active');
    }
}


// ===== RECIPE MANAGEMENT (ALL USERS) =====
function loadAllRecipes() {
    const vegetarianGrid = document.getElementById('vegetarian-grid');
    const dessertGrid = document.getElementById('dessert-grid');
    const nonVegetarianGrid = document.getElementById('nonVegetarian-grid');
    if (!vegetarianGrid || !dessertGrid || !nonVegetarianGrid) return;
    vegetarianGrid.innerHTML = '<p>Loading recipes...</p>'; dessertGrid.innerHTML = '<p>Loading recipes...</p>'; nonVegetarianGrid.innerHTML = '<p>Loading recipes...</p>';
    db.collection('recipes').orderBy('createdAt', 'desc').get()
        .then(querySnapshot => {
            vegetarianGrid.innerHTML = ''; dessertGrid.innerHTML = ''; nonVegetarianGrid.innerHTML = '';
            let count = { veg: 0, dessert: 0, nonVeg: 0 };
            querySnapshot.forEach(doc => {
                const recipe = doc.data(); const recipeId = doc.id;
                if (!recipe.title || !recipe.imageBase64 || !recipe.category) return;
                const card = createRecipeCard(recipe, recipeId, false);
                if (recipe.category === 'vegetarian') { vegetarianGrid.appendChild(card); count.veg++; }
                else if (recipe.category === 'dessert') { dessertGrid.appendChild(card); count.dessert++; }
                else if (recipe.category === 'nonVegetarian') { nonVegetarianGrid.appendChild(card); count.nonVeg++; }
            });
            if (count.veg === 0) vegetarianGrid.innerHTML = '<p>No vegetarian recipes found.</p>';
            if (count.dessert === 0) dessertGrid.innerHTML = '<p>No dessert recipes found.</p>';
            if (count.nonVeg === 0) nonVegetarianGrid.innerHTML = '<p>No non-vegetarian recipes found.</p>';
        }).catch(error => { console.error("Error loading recipes: ", error); /* Show error on all */ });
}
function createRecipeCard(recipe, recipeId, isMyRecipe = false) {
    const card = document.createElement('div'); card.className = 'recipe-card';
    card.dataset.id = recipeId; card.dataset.category = recipe.category;
    let buttonsHTML = `<a href="#" class="recipe-btn" onclick="event.preventDefault(); showRecipeDetails('${recipeId}')">Read More</a>`;
    if (isMyRecipe) { buttonsHTML += `<div class="my-recipe-buttons"><button class="btn-edit" onclick="event.stopPropagation(); editRecipe('${recipeId}')">Edit</button><button class="btn-delete" onclick="event.stopPropagation(); deleteRecipe('${recipeId}')">Delete</button></div>`; }
    card.innerHTML = `<img src="${recipe.imageBase64}" alt="${recipe.title}" loading="lazy"><h3>${recipe.title || 'Untitled'}</h3><p>${recipe.description || ''}</p><p class="recipe-author">By: ${recipe.uploaderName || 'Unknown'}</p>${buttonsHTML}`;
    const titleElement = card.querySelector('h3');
    if (titleElement) { titleElement.style.cursor = 'pointer'; titleElement.addEventListener('click', (e) => { e.stopPropagation(); showRecipeDetails(recipeId); }); }
    return card;
}
function showRecipeDetails(recipeId) {
    if (!recipeId) return;
    db.collection('recipes').doc(recipeId).get().then(doc => {
        if (!doc.exists) { alert("Recipe not found."); return; }
        const recipe = doc.data(); const popup = document.querySelector('.recipe-popup'); if (!popup) return;
        currentRecipeId = recipeId; currentRecipeTitle = recipe.title; currentRecipeOwnerUid = recipe.uploadedBy;
        popup.querySelector('.recipe-title').textContent = recipe.title || 'Details';
        popup.querySelector('.recipe-image').src = recipe.imageBase64 || ''; popup.querySelector('.recipe-image').alt = recipe.title || 'Image';
        document.getElementById('recipe-uploader').textContent = recipe.uploaderName || 'Unknown';
        popup.querySelector('.ingredients').innerHTML = (recipe.ingredients || []).map(ing => `<li>${ing}</li>`).join('');
        popup.querySelector('.method').innerHTML = (recipe.method || []).map(step => `<li>${step}</li>`).join('');
        const iframe = popup.querySelector('iframe'); const videoContainer = popup.querySelector('.video-container');
        if (iframe && videoContainer) { if (recipe.videoUrl) { iframe.src = recipe.videoUrl; videoContainer.style.display = 'block'; } else { iframe.src = ''; videoContainer.style.display = 'none'; } }
        const orderBtn = document.getElementById('show-order-form-btn'); const orderForm = document.getElementById('order-form');
        if (orderBtn) { orderBtn.style.display = (currentUser && recipe.uploadedBy === currentUser.uid) ? 'none' : 'block'; }
        if (orderForm) orderForm.style.display = 'none'; // Reset form visibility
        popup.style.display = 'block'; document.body.style.overflow = 'hidden';
    }).catch(error => { console.error("Error getting recipe details: ", error); alert("Error fetching details."); });
}
function closeRecipePopup() {
    const popup = document.querySelector('.recipe-popup'); if (popup) popup.style.display = 'none';
    document.body.style.overflow = 'auto';
    const orderForm = document.getElementById('order-form'); if (orderForm) { orderForm.style.display = 'none'; orderForm.reset(); }
    const orderSuccess = document.getElementById('order-success'); if(orderSuccess) orderSuccess.style.display = 'none';
    const orderError = document.getElementById('order-error'); if (orderError) orderError.style.display = 'none';
    const showOrderBtn = document.getElementById('show-order-form-btn'); if (showOrderBtn) showOrderBtn.style.display = 'block';
    currentRecipeId = null; currentRecipeTitle = null; currentRecipeOwnerUid = null;
    const iframe = popup ? popup.querySelector('iframe') : null; if (iframe && iframe.src) { iframe.src = iframe.src; }
}
function searchRecipes() {
    const searchTerm = document.getElementById('recipe-search-input')?.value.toLowerCase().trim(); if (!searchTerm) { showSection('recipes'); return; }
    const resultsGrid = document.getElementById('search-results-grid'); if (!resultsGrid) return;
    resultsGrid.innerHTML = '<p>Searching...</p>'; showSection('recipes'); showRecipeSection('search-results-section');
    db.collection('recipes').where('searchKeywords', 'array-contains', searchTerm).get().then(querySnapshot => {
        resultsGrid.innerHTML = ''; if (querySnapshot.empty) { resultsGrid.innerHTML = `<p>No recipes found matching "${searchTerm}".</p>`; return; }
        querySnapshot.forEach(doc => { const recipe = doc.data(); if (recipe.title && recipe.imageBase64 && recipe.category) resultsGrid.appendChild(createRecipeCard(recipe, doc.id, false)); });
    }).catch(error => { console.error("Error searching recipes: ", error); resultsGrid.innerHTML = '<p>Error searching.</p>'; });
}

// ===== "MY RECIPES" MANAGEMENT =====
function loadMyRecipes() {
    if (!currentUser || !currentUser.uid) return;
    const myRecipesGrid = document.getElementById('my-recipes-grid'); if (!myRecipesGrid) return;
    myRecipesGrid.innerHTML = '<p>Loading...</p>';
    db.collection('recipes').where('uploadedBy', '==', currentUser.uid).orderBy('createdAt', 'desc').get().then(querySnapshot => {
        myRecipesGrid.innerHTML = ''; let count = 0;
        querySnapshot.forEach(doc => { const recipe = doc.data(); if (recipe.title && recipe.imageBase64 && recipe.category) { myRecipesGrid.appendChild(createRecipeCard(recipe, doc.id, true)); count++; }});
        if (count === 0) myRecipesGrid.innerHTML = '<p>You haven\'t uploaded any recipes yet.</p>';
    }).catch(error => { console.error("Error loadMyRecipes: ", error); myRecipesGrid.innerHTML = '<p>Error loading recipes.</p>'; if (error.code === 'failed-precondition') myRecipesGrid.innerHTML += '<p style="color: red;">Index needed. Check console.</p>'; });
}
function deleteRecipe(recipeId) {
     if (!recipeId || !confirm('Delete this recipe permanently?')) return;
    db.collection('recipes').doc(recipeId).delete().then(() => { alert('Recipe deleted.'); loadMyRecipes(); loadAllRecipes(); }).catch(error => { console.error("Error deleting: ", error); alert('Delete failed.'); });
}
function editRecipe(recipeId) {
     if (!recipeId) return;
    db.collection('recipes').doc(recipeId).get().then(doc => {
        if (!doc.exists) { alert("Recipe not found."); return; }
        const recipe = doc.data();
        document.getElementById('upload-form-title').textContent = 'Edit Your Recipe';
        document.getElementById('upload-submit-btn').textContent = 'Update Recipe';
        document.getElementById('edit-recipe-id').value = recipeId;
        document.getElementById('recipe-title').value = recipe.title || '';
        document.getElementById('recipe-description').value = recipe.description || '';
        document.getElementById('recipe-category').value = recipe.category || '';
        document.getElementById('recipe-ingredients').value = (recipe.ingredients || []).join('\n');
        document.getElementById('recipe-method').value = (recipe.method || []).join('\n');
        document.getElementById('recipe-video').value = recipe.videoUrl || '';
        const previewEl = document.getElementById('image-preview'); if (previewEl) { previewEl.src = recipe.imageBase64 || ''; previewEl.style.display = recipe.imageBase64 ? 'block' : 'none'; }
        document.getElementById('recipe-image').value = '';
        showSection('upload-recipe-form');
    }).catch(error => { console.error("Error loading for edit: ", error); alert("Error loading recipe."); });
}
function resetUploadForm() {
    const form = document.getElementById('upload-form'); if (form) form.reset();
    document.getElementById('upload-form-title').textContent = 'Upload a New Recipe';
    document.getElementById('upload-submit-btn').textContent = 'Submit Recipe';
    document.getElementById('edit-recipe-id').value = '';
    const previewEl = document.getElementById('image-preview'); if (previewEl) { previewEl.src = ''; previewEl.style.display = 'none'; }
    document.getElementById('upload-success').style.display = 'none';
    document.getElementById('upload-error').style.display = 'none';
}
async function handleRecipeSubmit(e) {
    e.preventDefault(); if (!currentUser || !currentUser.uid) { alert("Login required."); return; }
    const editRecipeId = document.getElementById('edit-recipe-id')?.value; const isEditing = !!editRecipeId;
    const title = document.getElementById('recipe-title')?.value; const file = document.getElementById('recipe-image')?.files[0];
    const submitBtn = document.getElementById('upload-submit-btn'); if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = isEditing ? 'Updating...' : 'Processing...'; }
    const recipeData = {
        title: title || '', description: document.getElementById('recipe-description')?.value || '', category: document.getElementById('recipe-category')?.value || '',
        ingredients: (document.getElementById('recipe-ingredients')?.value || '').split('\n').map(l => l.trim()).filter(Boolean),
        method: (document.getElementById('recipe-method')?.value || '').split('\n').map(l => l.trim()).filter(Boolean),
        videoUrl: convertToEmbedUrl(document.getElementById('recipe-video')?.value || ''), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    recipeData.searchKeywords = generateKeywords(recipeData.title);
    if (!recipeData.title || !recipeData.category || recipeData.ingredients.length === 0 || recipeData.method.length === 0) {
        showUploadError("Title, Category, Ingredients, and Method are required.");
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Update Recipe' : 'Submit Recipe'; } return;
    }
    if (!isEditing) { recipeData.uploadedBy = currentUser.uid; recipeData.uploaderName = currentUser.name || 'Anonymous'; recipeData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); }
    let base64String = null;
    if (file) { try { base64String = await fileToBase64(file); recipeData.imageBase64 = base64String; } catch (error) { showUploadError('Error processing image.'); if (submitBtn) submitBtn.disabled = false; return; } }
    else if (isEditing) { const previewSrc = document.getElementById('image-preview')?.src; if (previewSrc && previewSrc.startsWith('data:image')) recipeData.imageBase64 = previewSrc; }
    else { showUploadError('An image is required for new recipes.'); if (submitBtn) submitBtn.disabled = false; return; }
    if (!isEditing && !recipeData.imageBase64) { showUploadError('Image missing or failed processing.'); if (submitBtn) submitBtn.disabled = false; return; }
    saveRecipeToFirestore(recipeData, editRecipeId);
}
function saveRecipeToFirestore(recipeData, editRecipeId) {
    const submitBtn = document.getElementById('upload-submit-btn');
    let promise = editRecipeId ? db.collection('recipes').doc(editRecipeId).update(recipeData) : db.collection('recipes').add(recipeData);
    promise.then(() => {
        showUploadSuccess(editRecipeId ? 'Update successful!' : 'Upload successful!'); resetUploadForm();
        if (submitBtn) submitBtn.disabled = false; loadAllRecipes(); loadMyRecipes();
        setTimeout(() => { const el = document.getElementById('upload-success'); if (el) el.style.display = 'none'; showSection('my-recipes'); }, 1500);
    }).catch(error => { console.error("Firestore save error: ", error); showUploadError('Save failed. Image too large or network issue?'); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = editRecipeId ? 'Update Recipe' : 'Submit Recipe'; } });
}


// ===== VENDOR SHOP MANAGEMENT =====
function captureCurrentLocation() {
    const errorEl = document.getElementById('vendor-location-error'); if (!navigator.geolocation) { if (errorEl) { errorEl.textContent = 'Geolocation not supported.'; errorEl.style.display = 'block'; } return; }
    const btn = document.getElementById('capture-location-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Getting Location...'; } if (errorEl) errorEl.style.display = 'none';
    navigator.geolocation.getCurrentPosition( (position) => {
        const lat = position.coords.latitude; const lng = position.coords.longitude;
        const latInput = document.getElementById('vendor-latitude'); const lngInput = document.getElementById('vendor-longitude');
        if (latInput) latInput.value = lat.toFixed(7); if (lngInput) lngInput.value = lng.toFixed(7);
        if (btn) { btn.disabled = false; btn.textContent = 'Capture My Current Location'; }
    }, (geoError) => {
        let message = 'Unable to retrieve location.';
        switch(geoError.code) { case geoError.PERMISSION_DENIED: message = "Permission denied."; break; case geoError.POSITION_UNAVAILABLE: message = "Location unavailable."; break; case geoError.TIMEOUT: message = "Request timed out."; break; default: message = "Unknown error." ; break; } // Semicolon added
        if (errorEl) { errorEl.textContent = message; errorEl.style.display = 'block'; }
        if (btn) { btn.disabled = false; btn.textContent = 'Capture My Current Location'; } console.error("Geolocation Error:", geoError);
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}
function loadVendorDetails() {
    if (!currentUser || !currentUser.uid) return;
    db.collection('vendors').doc(currentUser.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const nameEl = document.getElementById('vendor-name'); const contactEl = document.getElementById('vendor-contact'); const latEl = document.getElementById('vendor-latitude'); const lngEl = document.getElementById('vendor-longitude'); const productsEl = document.getElementById('vendor-products'); const previewEl = document.getElementById('vendor-image-preview');
            if (nameEl) nameEl.value = data.vendorName || ''; if (contactEl) contactEl.value = data.contact || ''; if (latEl) latEl.value = data.lat || ''; if (lngEl) lngEl.value = data.lng || ''; if (productsEl) productsEl.value = (data.products || []).join('\n');
            if (previewEl && data.imageBase64) { previewEl.src = data.imageBase64; previewEl.style.display = 'block'; } else if (previewEl) { previewEl.src = ''; previewEl.style.display = 'none'; }
        }
    }).catch(error => { console.error("Error loadVendorDetails: ", error); showVendorError("Could not load shop details."); });
}
async function handleVendorSubmit(e) {
    e.preventDefault(); if (!currentUser || !currentUser.uid) { alert("Login required."); return; }
    const submitBtn = document.getElementById('vendor-submit-btn'); if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Updating...'; }
    const latVal = parseFloat(document.getElementById('vendor-latitude')?.value); const lngVal = parseFloat(document.getElementById('vendor-longitude')?.value);
    if (isNaN(latVal) || isNaN(lngVal)) { showVendorError('Valid latitude/longitude required.'); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Update My Shop'; } return; }
    const vendorData = {
        vendorName: document.getElementById('vendor-name')?.value || '', contact: document.getElementById('vendor-contact')?.value || '', lat: latVal, lng: lngVal,
        products: (document.getElementById('vendor-products')?.value || '').split('\n').map(l => l.trim()).filter(Boolean), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!vendorData.vendorName || !vendorData.contact) { showVendorError('Shop Name and Contact required.'); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Update My Shop'; } return; }
    const file = document.getElementById('vendor-image')?.files[0]; let base64Image = null;
    if (file) { try { base64Image = await fileToBase64(file); vendorData.imageBase64 = base64Image; } catch (error) { showVendorError('Error converting image.'); if (submitBtn) submitBtn.disabled = false; return; } }
    else { const previewSrc = document.getElementById('vendor-image-preview')?.src; if (previewSrc && previewSrc.startsWith('data:image')) vendorData.imageBase64 = previewSrc; else { try { const doc = await db.collection('vendors').doc(currentUser.uid).get(); if (doc.exists && doc.data().imageBase64) vendorData.imageBase64 = doc.data().imageBase64; } catch(e) { console.error("DB check error:", e); } } }
    db.collection('vendors').doc(currentUser.uid).set(vendorData, { merge: true }).then(() => {
        showVendorSuccess('Shop updated! Reloading map...'); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Update My Shop'; }
        setTimeout(() => { const el = document.getElementById('vendor-success'); if (el) el.style.display = 'none'; initMap(); }, 1500);
    }).catch(error => { console.error("Error save vendor: ", error); showVendorError('Save failed: ' + error.message); if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Update My Shop'; } });
}
function showVendorError(message) { const el = document.getElementById('vendor-error'); if (el) { el.textContent = message; el.style.display = 'block'; } const s = document.getElementById('vendor-success'); if (s) s.style.display = 'none'; } // Combined error display
function showVendorSuccess(message) { const el = document.getElementById('vendor-success'); if (el) { el.textContent = message; el.style.display = 'block'; } const e = document.getElementById('vendor-error'); if (e) e.style.display = 'none'; } // Combined success display

// ===== UPLOAD MESSAGE HELPERS =====
function showUploadSuccess(message) {
    const el = document.getElementById('upload-success');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
    const errEl = document.getElementById('upload-error');
    if (errEl) errEl.style.display = 'none';
}

function showUploadError(message) {
    const el = document.getElementById('upload-error');
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
    const successEl = document.getElementById('upload-success');
    if (successEl) successEl.style.display = 'none';
}

// ===== ORDER MANAGEMENT =====
function handleOrderSubmit(e) {
    e.preventDefault(); if (!currentUser || !currentUser.uid) { alert("Login required."); return; } if (!currentRecipeId || !currentRecipeOwnerUid || !currentRecipeTitle) { alert("Recipe context lost."); return; }
    const phone = document.getElementById('customer-phone')?.value; const address = document.getElementById('customer-address')?.value; if (!phone || !address) { showOrderError("Phone and Address required."); return; }
    const orderData = { recipeId: currentRecipeId, recipeTitle: currentRecipeTitle, recipeOwnerUid: currentRecipeOwnerUid, customerUid: currentUser.uid, customerName: currentUser.name || 'Unknown', customerPhone: phone, customerAddress: address, status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    const submitBtn = document.querySelector('#order-form button[type="submit"]'); if(submitBtn) submitBtn.disabled = true;
    db.collection('orders').add(orderData).then(() => { showOrderSuccess('Order placed!'); setTimeout(() => { closeRecipePopup(); loadMyOrders(); }, 2000); }).catch(error => { console.error("Error placing order:", error); showOrderError('Order failed: ' + error.message); if(submitBtn) submitBtn.disabled = false; });
}
function showOrderError(message) { const el = document.getElementById('order-error'); if (el) { el.textContent = message; el.style.display = 'block'; } const s = document.getElementById('order-success'); if (s) s.style.display = 'none'; }
function showOrderSuccess(message) { const el = document.getElementById('order-success'); if (el) { el.textContent = message; el.style.display = 'block'; } const e = document.getElementById('order-error'); if (e) e.style.display = 'none'; }
async function loadMyOrders() {
     if (!currentUser || !currentUser.uid) return;
    const placedGrid = document.getElementById('orders-placed-grid'); const receivedGrid = document.getElementById('orders-received-grid'); if (!placedGrid || !receivedGrid) return;
    placedGrid.innerHTML = '<p>Loading...</p>'; receivedGrid.innerHTML = '<p>Loading...</p>';
    try {
        const [placedSnapshot, receivedSnapshot] = await Promise.all([
            db.collection('orders').where('customerUid', '==', currentUser.uid).orderBy('createdAt', 'desc').get(),
            db.collection('orders').where('recipeOwnerUid', '==', currentUser.uid).orderBy('createdAt', 'desc').get()
        ]);
        placedGrid.innerHTML = ''; if (placedSnapshot.empty) placedGrid.innerHTML = '<p>No orders placed yet.</p>'; else placedSnapshot.forEach(doc => placedGrid.appendChild(createOrderCard(doc.data(), 'customer', doc.id)));
        receivedGrid.innerHTML = ''; if (receivedSnapshot.empty) receivedGrid.innerHTML = '<p>No orders received yet.</p>'; else receivedSnapshot.forEach(doc => receivedGrid.appendChild(createOrderCard(doc.data(), 'owner', doc.id)));
    } catch (error) { console.error("Error loading orders: ", error); placedGrid.innerHTML = '<p>Error loading orders.</p>'; receivedGrid.innerHTML = '<p>Error loading orders.</p>'; if (error.code === 'failed-precondition') { const msg = '<p style="color: red;">Index needed. Check console.</p>'; placedGrid.innerHTML += msg; receivedGrid.innerHTML += msg; } }
}
function createOrderCard(order, userRole, orderId = null) {
    const card = document.createElement('div'); card.className = 'order-card';
    let orderDate = (order.createdAt && order.createdAt.seconds) ? new Date(order.createdAt.seconds * 1000).toLocaleString(undefined, { year:'numeric', month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}) : 'Date unavailable';
    let details = `<h4>${order.recipeTitle || 'N/A'}</h4><p><strong>Status:</strong> <span class="status status-${order.status || 'N/A'}">${order.status || 'N/A'}</span></p>${orderId ? `<p><small>ID: ${orderId}</small></p>` : ''}`;
    if (userRole === 'customer') { details += `<p><strong>Placed:</strong> ${orderDate}</p>`; }
    else if (userRole === 'owner') { details += `<p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p><p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p><p><strong>Address:</strong> ${order.customerAddress || 'N/A'}</p><p><strong>Placed:</strong> ${orderDate}</p>`; if (order.status === 'pending' && orderId) details += `<div class="order-actions"><button class="btn btn-accept" onclick="event.stopPropagation(); acceptOrder('${orderId}')">Accept</button><button class="btn btn-reject" onclick="event.stopPropagation(); rejectOrder('${orderId}')">Reject</button></div>`; }
    card.innerHTML = details; return card;
}
function acceptOrder(orderId) { if (!orderId) return; db.collection('orders').doc(orderId).update({ status: 'accepted' }).then(loadMyOrders).catch(e => { console.error("Accept error:", e); alert("Failed."); }); }
function rejectOrder(orderId) { if (!orderId) return; db.collection('orders').doc(orderId).update({ status: 'rejected' }).then(loadMyOrders).catch(e => { console.error("Reject error:", e); alert("Failed."); }); }

// ===== HELPER FUNCTIONS =====
function fileToBase64(file) { return new Promise((resolve, reject) => { if (!file) reject(new Error("No file")); const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); }); }
function handleImagePreview(event, previewElementId) {
    const file = event.target?.files[0]; const preview = document.getElementById(previewElementId);
    if (file && preview) { const reader = new FileReader(); reader.onload = (e) => { preview.src = e.target.result; preview.style.display = 'block'; }; reader.onerror = () => { preview.src=''; preview.style.display = 'none'; }; reader.readAsDataURL(file); }
    else if (preview) { preview.src=''; preview.style.display = 'none'; }
}
function generateKeywords(title) {
     if (!title) return []; const keywords = new Set(); const cleanTitle = title.toLowerCase().replace(/[^\w\s]/gi, ''); const words = cleanTitle.split(/\s+/).filter(Boolean);
    words.forEach(word => { if(word.length > 1) { keywords.add(word); for (let i = 2; i <= word.length; i++) keywords.add(word.substring(0, i)); } else if (word.length === 1) keywords.add(word); }); if (cleanTitle) keywords.add(cleanTitle); return Array.from(keywords);
}
function convertToEmbedUrl(url) {
    if (!url || typeof url !== 'string') return ""; let videoId = null; try { const urlObj = new URL(url); if ((urlObj.hostname.includes('youtube.com')) && urlObj.searchParams.has('v')) videoId = urlObj.searchParams.get('v'); else if (urlObj.hostname === 'youtu.be') videoId = urlObj.pathname.substring(1); else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) videoId = urlObj.pathname.substring('/embed/'.length); if (videoId && /^[a-zA-Z0-9_-]+$/.test(videoId.trim())) return `https://www.youtube.com/embed/${videoId.trim()}`; } catch (e) { /* ignore */ } return "";
}

// ===== GOOGLE MAPS & VENDORS =====
async function initMap() {
     if (typeof google === 'undefined' || typeof google.maps === 'undefined') { console.error("Maps API failed."); const mapDiv = document.getElementById('map'); if(mapDiv) mapDiv.innerHTML = '<p>Could not load Google Maps.</p>'; return; }
    try {
        map = new google.maps.Map(document.getElementById('map'), { center: { lat: 16.8236857, lng: 78.1422984 }, zoom: 12, styles: [ { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] } ], mapTypeControl: false, streetViewControl: false });
        infowindow = new google.maps.InfoWindow();
        const hardcodedMarkers = [ { lat: 16.7520314, lng: 78.0177033, title: 'Vegetable Vendor 1', vendor: 'Anjama', contact: '9573069662', location: 'Padmavathi colony', vegetables: ['Tomato', 'Onion', 'Potato', 'Cabbage'], image: 'images/veg_10.jpeg', type: 'hardcoded' }, { lat: 16.7533637, lng: 78.0161735, title: 'Vegetable Vendor 2', vendor: 'Nirmala', contact: '8886833609', location: 'Venkateshwara colony', vegetables: ['Carrot', 'Spinach', 'Capsicum'], image: 'images/veg_20.jpeg', type: 'hardcoded' }, { lat: 16.753253, lng: 78.01532, title: 'Vegetable Vendor 3', vendor: 'Parupally Chennamma', contact: '9XXXXXXXXX', location: 'Venkateshwara colony', vegetables: ['Brinjal', 'Bitter gourd', 'Ridge gourd'], image: 'images/veg_30.jpeg', type: 'hardcoded' }, { lat: 16.753253, lng: 78.01533, title: 'Fruits Vendor 4', vendor: 'Krishnama', contact: '9XXXXXXXXX', location: 'Venkateshwara colony', vegetables: ['Apple', 'Orange', 'Banana'], image: 'images/fruit_40.jpeg', type: 'hardcoded' }, { lat: 16.7489166, lng: 78.0017231, title: 'Fruits Vendor 5', vendor: 'Giri', contact: '9XXXXXXXXX', location: 'New Town', vegetables: ['Grapes', 'Pomegranate', 'Guava'], image: 'images/fruit_50.jpeg', type: 'hardcoded' }, { lat: 16.754597, lng: 78.0015857, title: 'Fruits Vendor 6', vendor: 'Amzed Khan', contact: '9XXXXXXXXX', location: 'Rajendra nagar', vegetables: ['Mango', 'Watermelon', 'Papaya'], image: 'images/fruit_60.jpeg', type: 'hardcoded' }, { lat: 16.7548941, lng: 78.000241, title: 'Vegetable Vendor 7', vendor: 'Kavali Raju', contact: '9XXXXXXXXX', location: 'Rajendra nagar', vegetables: ['Cauliflower', 'Broccoli', 'Green beans'], image: 'images/veg_70.jpeg', type: 'hardcoded' }, { lat: 16.7533346, lng: 77.9965387, title: 'Vegetable Vendor 8', vendor: 'Laxmi', contact: '9XXXXXXXXX', location: 'Subhash nagar', vegetables: ['Pumpkin', 'Sweet corn', 'Cucumber'], image: 'images/veg_80.jpeg', type: 'hardcoded' }, { lat: 16.7505015, lng: 77.9893079, title: 'Fruit Vendor 9', vendor: 'Baba', contact: '9XXXXXXXXX', location: 'Monnappaguta', vegetables: ['Pear', 'Kiwi', 'Dragon fruit'], image: 'images/fruit_90.jpeg', type: 'hardcoded' }, { lat: 16.7534287, lng: 77.9914145, title: 'Vegetable Vendor 10', vendor: 'Vishnu', contact: '9XXXXXXXXX', location: 'New Gunj', vegetables: ['Beetroot', 'Radish', 'Turnip'], image: 'images/veg_100.jpeg', type: 'hardcoded' } ];
        hardcodedMarkers.forEach(md => createMarker(md, md.title?.includes('Fruit') ? '#FF5252' : '#4CAF50'));
        const snapshot = await db.collection('vendors').get();
        snapshot.forEach(doc => { const v = doc.data(); if (v && v.lat != null && v.lng != null && typeof v.lat === 'number' && typeof v.lng === 'number') { const md = { lat: v.lat, lng: v.lng, title: v.vendorName || 'Reg. Vendor', vendor: v.vendorName || 'N/A', contact: v.contact || 'N/A', location: `Lat: ${v.lat.toFixed(5)}, Lng: ${v.lng.toFixed(5)}`, products: v.products || [], image: v.imageBase64 || 'images/v1.png', type: 'firestore' }; createMarker(md, '#2196F3'); }});
        const csb = document.getElementById('close-sidebar'); if (csb) csb.addEventListener('click', closeSidebar);
     } catch (error) { console.error("Map init error:", error); const mapDiv = document.getElementById('map'); if(mapDiv) mapDiv.innerHTML = '<p>Error loading map.</p>'; }
}
function createMarker(markerData, iconColor) {
     if (markerData.lat == null || markerData.lng == null || typeof markerData.lat !== 'number' || typeof markerData.lng !== 'number') return;
    const marker = new google.maps.Marker({ position: { lat: markerData.lat, lng: markerData.lng }, map: map, title: markerData.title || 'Vendor', icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: iconColor, fillOpacity: 0.9, strokeColor: '#FFFFFF', strokeWeight: 1.5, scale: 7 } });
    marker.addListener('click', () => {
        if (infowindow) infowindow.close();
        const content = `<div style="padding: 5px; font-family: 'Poppins', sans-serif; max-width: 250px;"><h4 style="color:#2e7d32;margin:0 0 5px 0;font-size:1.1em;">${markerData.title||'Vendor'}</h4><p style="margin:2px 0;font-size:0.9em;"><strong>Vendor:</strong> ${markerData.vendor||'N/A'}</p><p style="margin:2px 0;font-size:0.9em;"><strong>Location:</strong> ${markerData.location||'N/A'}</p>${markerData.contact ? `<p style="margin:2px 0;font-size:0.9em;"><strong>Contact:</strong> ${markerData.contact}</p>` : ''}<a href="#" onclick="event.preventDefault(); openSidebar(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(markerData))}')));" style="font-size:0.9em;margin-top:5px;display:inline-block;">View Details</a></div>`;
        infowindow.setContent(content); infowindow.open(map, marker);
    });
}
function openSidebar(markerData) {
    const sbContent = document.getElementById('sidebar-content'); if (!sbContent) return;
    const pList = markerData.products || markerData.vegetables || [];
    sbContent.innerHTML = `<h2>${markerData.title||'Details'}</h2><img src="${markerData.image||'images/placeholder.png'}" alt="${markerData.title||'Vendor'}" style="width:100%;height:200px;object-fit:cover;border-radius:8px;margin-bottom:1rem;"><p><strong>Vendor:</strong> ${markerData.vendor||'N/A'}</p><p><strong>Contact:</strong> ${markerData.contact||'N/A'}</p><p><strong>Location:</strong> ${markerData.location||'N/A'}</p>${pList.length > 0 ? '<p><strong>Products:</strong></p><ul>' + pList.map(item => `<li>${item}</li>`).join('') + '</ul>' : '<p>No products listed.</p>'}`;
    const sb = document.getElementById('sidebar'); if (sb) { sb.classList.add('open'); sb.style.right = '0'; sidebarOpen = true; }
}
function closeSidebar() { const sb = document.getElementById('sidebar'); if (sb) { sb.classList.remove('open'); sb.style.right = '-380px'; sidebarOpen = false; } }


// ===== IMAGE CAROUSEL =====
let currentSet = 1; const totalSets = 2;
function showSet(setNumber) { if (setNumber < 1 || setNumber > totalSets) return; document.querySelectorAll('.image-set').forEach(el => el.classList.remove('active')); const ts = document.getElementById(`image-set${setNumber}`); if (ts) { ts.classList.add('active'); currentSet = setNumber; } }
function nextSet() { let next = currentSet + 1; if (next > totalSets) next = 1; showSet(next); }
function prevSet() { let prev = currentSet - 1; if (prev < 1) prev = totalSets; showSet(prev); }
let carouselInterval = null; const CAROUSEL_DELAY = 4500;
function startCarouselAutoplay() { if (carouselInterval) return; carouselInterval = setInterval(nextSet, CAROUSEL_DELAY); }
function stopCarouselAutoplay() { if (!carouselInterval) return; clearInterval(carouselInterval); carouselInterval = null; }
document.addEventListener('DOMContentLoaded', () => { const cc = document.querySelector('.carousel-card'); if (cc) { cc.addEventListener('mouseenter', stopCarouselAutoplay); cc.addEventListener('mouseleave', startCarouselAutoplay); } }); // Start handled in initializePage

// ===== CHATBOT UI WIRING & LOGIC =====
// Encapsulate chatbot UI logic in its own function for clarity
function initializeChatbotUI() {
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    const chatWindow = document.getElementById('chatbot-window');
    const closeBtn = document.getElementById('chatbot-close-btn');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const inputEl = document.getElementById('chatbot-input');
    const messagesEl = document.getElementById('chatbot-messages');

    if (!toggleBtn || !chatWindow || !closeBtn || !sendBtn || !inputEl || !messagesEl) {
        console.warn('One or more chatbot UI elements not found. Chatbot UI disabled.');
        if(toggleBtn) toggleBtn.style.display = 'none'; // Hide button if essential elements missing
        return;
    }

    // Determine backend endpoint: PASTE YOUR LAMBDA FUNCTION URL HERE!
    let CHAT_ENDPOINT = 'https://idxeva3wcrpj3el2fp3vav5xkq0lroyj.lambda-url.us-east-1.on.aws/'; 
    console.log('Chat endpoint will be:', CHAT_ENDPOINT); // Log placeholder

    // Toggle window visibility
    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        toggleBtn.classList.toggle('active'); // Optional: style button when open
        if (chatWindow.classList.contains('active')) {
            setTimeout(() => inputEl.focus(), 100); // Focus input shortly after opening
        }
    });

    // Close window
    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('active');
        toggleBtn.classList.remove('active');
        // Optional: Clear session history on close?
        // sessionStorage.removeItem('chatSessionId');
    });

    // Append message utility
    function appendMessage(text, sender = 'bot') {
        const div = document.createElement('div');
        div.className = sender === 'user' ? 'message user-message' : 'message bot-message';
        div.textContent = text;
        messagesEl.appendChild(div);
        // Ensure scroll to bottom happens after element is added
        setTimeout(() => messagesEl.scrollTop = messagesEl.scrollHeight, 0);
    }

    // Send message function (Placeholder - Needs Auth Header & Session ID)
    async function sendChatMessage() {
        const question = inputEl.value.trim();
        if (!question) return;

        appendMessage(question, 'user');
        inputEl.value = ''; // Clear input

        // Show loader
        const loader = document.createElement('div');
        loader.className = 'message bot-message';
        loader.innerHTML = '<i>Typing...</i>';
        messagesEl.appendChild(loader);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        // Get Session ID (Example)
        let sessionId = sessionStorage.getItem('chatSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
            sessionStorage.setItem('chatSessionId', sessionId);
            console.log('Generated new chat session ID:', sessionId);
        }

        try {
            // Get Firebase ID Token (Placeholder - Add actual code here)
             if (!auth.currentUser) {
                 throw new Error("User not logged in."); // Throw error to be caught
             }
             const idToken = await auth.currentUser.getIdToken();

            // Make API call (Placeholder - Add Auth Header & Session ID to body)
            const resp = await fetch(CHAT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + idToken // Add token
                },
                body: JSON.stringify({
                     question: question,
                     sessionId: sessionId // Send session ID
                 })
            });

             // Always remove loader after fetch attempt
            if (loader.parentNode) loader.parentNode.removeChild(loader);

            const data = await resp.json().catch(() => ({ error: `Invalid response (Status: ${resp.status})` }));

            if (!resp.ok) {
                const err = data.error || `Server error (${resp.status})`;
                appendMessage(`Sorry, error: ${err}`, 'bot');
                console.error('Chat error:', resp.status, data);
                return;
            }

            const answer = data.answer || 'Sorry, I couldn\'t get an answer.';
            appendMessage(answer, 'bot');

        } catch (e) {
             if (loader.parentNode) loader.parentNode.removeChild(loader);
            appendMessage(`Error: ${e.message}. Could not connect or user not logged in.`, 'bot');
            console.error('sendChatMessage error:', e);
        }
    }


    // Wire send button and Enter key
    sendBtn.addEventListener('click', sendChatMessage);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    // Wire 'Start Chat' button from home page section
    const openChatBtnHome = document.getElementById('open-chat-btn');
     if (openChatBtnHome) {
         openChatBtnHome.addEventListener('click', () => {
             chatWindow.classList.add('active');
             toggleBtn.classList.add('active');
             setTimeout(() => inputEl.focus(), 100);
         });
     }

} // End of initializeChatbotUI
// ===== END CHATBOT UI WIRING & LOGIC =====