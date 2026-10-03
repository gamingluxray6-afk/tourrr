let currentUser = null;
let currentSpotId = null, currentProductId = null;
let myTickets = [], adminNotifications = [];
let map = null, markers = [], currentMapFilter = 'all';
let monthlyChart = null, locationChart = null, trendChart = null;
let dbSpots = [], dbProducts = [], dbRecords = [], dbTicketItems = [];
let currentSpotRating = 0, currentProductRating = 0;
let qrScanner = null;

// REAL Naguilian, La Union coordinates
const realNaguilianSpots = [
    { id: 1, name: "St. Michael the Archangel Parish Church", category: "cultural", location: "Poblacion, Naguilian, La Union", rating: 4.6, points_reward: 30, image_url: "https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=800", description: "Historic Spanish-era church in the heart of Naguilian town proper.", features: "Historical architecture,Cultural significance,Peaceful atmosphere,Guided tours,Spanish colonial design", lat: 16.4947, lng: 120.4594 },
    { id: 2, name: "Naguilian River", category: "nature", location: "Naguilian River, La Union", rating: 4.7, points_reward: 50, image_url: "https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=800", description: "Scenic river running through Naguilian, perfect for kayaking and enjoying nature.", features: "River activities,Natural scenery,Peaceful environment,Kayaking,Photography", lat: 16.4920, lng: 120.4620 },
    { id: 3, name: "Balete Tree Area", category: "nature", location: "Barangay Pacay, Naguilian, La Union", rating: 4.8, points_reward: 50, image_url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800", description: "Ancient balete trees surrounded by lush greenery.", features: "Ancient trees,Natural environment,Peaceful atmosphere,Photography spot,Cultural significance", lat: 16.4890, lng: 120.4550 },
    { id: 4, name: "Naguilian Public Market", category: "cultural", location: "Town Proper, Naguilian, La Union", rating: 4.5, points_reward: 40, image_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", description: "Vibrant local market with authentic Ilocano culture.", features: "Local food,Authentic Ilocano culture,Fresh produce,Market experience,Cultural immersion", lat: 16.4955, lng: 120.4600 },
    { id: 5, name: "Naguilian Rice Terraces", category: "nature", location: "Barangay Nambalan, Naguilian, La Union", rating: 4.7, points_reward: 60, image_url: "https://images.unsplash.com/photo-1495615012457-4646b69340e5?w=800", description: "Beautiful rice terraces showcasing agricultural heritage.", features: "Rice terraces,Agricultural heritage,Photography spot,Nature walks,Scenic views", lat: 16.5010, lng: 120.4580 },
    { id: 6, name: "Naguilian Heritage Sites", category: "cultural", location: "Various Barangays, Naguilian, La Union", rating: 4.6, points_reward: 35, image_url: "https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=800", description: "Rich cultural heritage through historical sites.", features: "Historical sites,Traditional architecture,Cultural heritage,Local traditions,Educational tours", lat: 16.4930, lng: 120.4610 },
    { id: 7, name: "Naguilian Mountain Trail", category: "adventure", location: "Mountain Area, Naguilian, La Union", rating: 4.9, points_reward: 100, image_url: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800", description: "Challenging mountain trail with breathtaking views.", features: "Mountain hiking,Scenic views,Adventure trail,Nature exploration,Photography opportunities", lat: 16.5050, lng: 120.4650 },
    { id: 8, name: "Naguilian Viewpoint", category: "nature", location: "Barangay Saoay, Naguilian, La Union", rating: 4.9, points_reward: 60, image_url: "https://images.unsplash.com/photo-1495615012457-4646b69340e5?w=800", description: "Elevated viewpoint with panoramic views.", features: "Panoramic views,Sunrise spot,Photography location,Peaceful environment,Mountain vistas", lat: 16.4980, lng: 120.4530 }
];

// ==================== MASSIVE NAGUILIAN KNOWLEDGE BASE ====================
const naguilianFacts = {
    history: "Naguilian was founded in 1882. It was named after a Spanish friar, Father Naguilian. It is known for its rich Ilocano heritage and the St. Michael the Archangel Parish Church, which has stood as a spiritual center for over a century.",
    geography: "Naguilian is a 4th class municipality in La Union. It is landlocked, bordered by San Fernando to the north, Bacnotan to the south, and the Cordillera mountains to the east. The Naguilian River runs beautifully through the town.",
    culture: "The town is famous for 'Abel Iloco' weaving, particularly in Barangay Pacay and Poblacion. The patron saint is St. Michael the Archangel, celebrated every September 29th with a grand fiesta featuring traditional dances and food.",
    food: "Must-try foods: Bagnet (crispy deep-fried pork belly), Ilocano Empanada (orange rice flour wrapper with egg, papaya, and longganisa), Pinakbet (vegetable stew with bagoong), and Tupig (grilled sticky rice cake).",
    spots: {
        'church': "St. Michael the Archangel Parish Church is a historic Spanish-era church located in the Poblacion. It features beautiful colonial architecture and is a peaceful place for reflection.",
        'river': "The Naguilian River is perfect for kayaking and rafting during the dry season. It offers a scenic view of the town and is a favorite spot for locals to cool off.",
        'weaving': "The Traditional Weaving Center in Barangay Poblacion showcases the intricate art of Abel Iloco weaving. You can watch artisans work and buy beautiful blankets and table runners.",
        'viewpoint': "The Naguilian Viewpoint in Barangay Saoay offers a panoramic view of the town and the mountains. It is best visited at sunrise for breathtaking photos.",
        'market': "The Public Market is the heart of the town's commerce. Go early in the morning (6 AM) for the freshest produce and hot, freshly made Empanadas."
    }
};

const naguilianKnowledge = {
    spots: {
        'st. michael': { name: 'St. Michael the Archangel Parish Church', category: 'cultural', location: 'Poblacion, Naguilian', rating: 4.6, points: 30, description: 'Historic Spanish-era church.', features: ['Historical architecture', 'Cultural significance', 'Peaceful atmosphere'], bestTime: 'Morning or late afternoon', duration: '30-45 minutes', tips: 'Great first stop for a quick cultural visit.', activities: ['Historical tour', 'Photography', 'Cultural exploration'], familyFriendly: true, difficulty: 'Easy' },
        'naguilian river': { name: 'Naguilian River', category: 'nature', location: 'Naguilian River', rating: 4.7, points: 50, description: 'Scenic river perfect for kayaking.', features: ['River activities', 'Natural scenery', 'Peaceful environment'], bestTime: 'Dry season (Nov-May)', duration: '2-3 hours', tips: 'Bring waterproof bag.', activities: ['Kayaking', 'Nature walks', 'Photography'], familyFriendly: true, difficulty: 'Easy' },
        'balete': { name: 'Balete Tree Area', category: 'nature', location: 'Barangay Pacay', rating: 4.8, points: 50, description: 'Ancient balete trees surrounded by lush greenery.', features: ['Ancient trees', 'Natural environment', 'Peaceful atmosphere'], bestTime: 'Any time', duration: '1-2 hours', tips: 'Respectful visit to sacred site.', activities: ['Nature walk', 'Photography', 'Meditation'], familyFriendly: true, difficulty: 'Easy' },
        'public market': { name: 'Naguilian Public Market', category: 'cultural', location: 'Town Proper', rating: 4.5, points: 40, description: 'Vibrant local market with authentic Ilocano culture.', features: ['Local food', 'Authentic culture', 'Fresh produce'], bestTime: 'Morning (6-10AM)', duration: '1-2 hours', tips: 'Try local delicacies.', activities: ['Food tasting', 'Shopping', 'Cultural experience'], familyFriendly: true, difficulty: 'Easy' },
        'rice terraces': { name: 'Naguilian Rice Terraces', category: 'nature', location: 'Barangay Nambalan', rating: 4.7, points: 60, description: 'Beautiful rice terraces showcasing agricultural heritage.', features: ['Rice terraces', 'Agricultural heritage', 'Scenic views'], bestTime: 'Morning or late afternoon', duration: '2-3 hours', tips: 'Best during planting or harvest season.', activities: ['Photography', 'Nature walk', 'Cultural learning'], familyFriendly: true, difficulty: 'Easy to Moderate' },
        'heritage sites': { name: 'Naguilian Heritage Sites', category: 'cultural', location: 'Various Barangays', rating: 4.6, points: 35, description: 'Rich cultural heritage through historical sites.', features: ['Historical sites', 'Traditional architecture', 'Cultural heritage'], bestTime: 'Morning', duration: '2-3 hours', tips: 'Hire a local guide.', activities: ['Historical tour', 'Photography', 'Cultural learning'], familyFriendly: true, difficulty: 'Easy' },
        'mountain trail': { name: 'Naguilian Mountain Trail', category: 'adventure', location: 'Mountain Area', rating: 4.9, points: 100, description: 'Challenging mountain trail with breathtaking views.', features: ['Mountain hiking', 'Scenic views', 'Adventure trail'], bestTime: 'Early morning (6-9AM)', duration: '4-6 hours', tips: 'Bring water, sunscreen, good shoes.', activities: ['Hiking', 'Photography', 'Nature exploration'], familyFriendly: false, difficulty: 'Difficult' },
        'viewpoint': { name: 'Naguilian Viewpoint', category: 'nature', location: 'Barangay Saoay', rating: 4.9, points: 60, description: 'Elevated viewpoint with panoramic views.', features: ['Panoramic views', 'Sunrise spot', 'Photography location'], bestTime: 'Early morning (5-7AM)', duration: '1-2 hours', tips: 'Arrive 30 minutes before sunrise.', activities: ['Sunrise watching', 'Photography', 'Meditation'], familyFriendly: true, difficulty: 'Easy' }
    },
    products: {
        'empanada': { name: 'Ilocano Empanada', price: 25, rating: 4.8, location: 'Naguilian Public Market', category: 'food', description: 'Crispy rice flour wrapper filled with egg and green papaya.', features: ['Freshly made daily', 'Crispy wrapper', 'Savory filling', 'Best with sukang Iloco'] },
        'bagnet': { name: 'Bagnet (Crispy Pork Belly)', price: 350, rating: 4.9, location: 'Local Delicacies Shop', category: 'food', description: 'Famous Ilocano crispy pork belly.', features: ['Extra crispy skin', 'Tender meat', 'Served with bagoong', 'Perfect for sharing'] },
        'abel': { name: 'Abel Iloco Textile', price: 1500, rating: 4.9, location: 'Traditional Weaving Center', category: 'crafts', description: 'Authentic handwoven Ilocano textile.', features: ['100% cotton', 'Traditional patterns', 'Handwoven by artisans', 'Durable'] },
        'bamboo': { name: 'Bamboo Crafts', price: 150, rating: 4.6, location: 'Naguilian Crafts Center', category: 'souvenirs', description: 'Beautiful handcrafted bamboo items.', features: ['Eco-friendly', 'Handcrafted', 'Unique designs', 'Lightweight'] },
        'honey': { name: 'Local Honey', price: 250, rating: 4.8, location: 'Mountain Village Shops', category: 'food', description: 'Pure organic honey from mountain bees.', features: ['100% pure', 'Organic', 'Locally sourced', 'Rich flavor'] },
        'tupig': { name: 'Tupig (Grilled Rice Cake)', price: 15, rating: 4.6, location: 'Street Vendors', category: 'food', description: 'Sweet grilled rice cake in banana leaves.', features: ['Traditional snack', 'Sweet & chewy', 'Charcoal-grilled', 'Affordable'] },
        'longganisa': { name: 'Ilocano Longganisa', price: 180, rating: 4.9, location: 'Naguilian Meat Shop', category: 'food', description: 'Garlicky Ilocano sausage.', features: ['Garlicky flavor', 'No preservatives', 'Vacuum-packed', 'Perfect for breakfast'] },
        'pinakbet': { name: 'Pinakbet', price: 120, rating: 4.7, location: 'Naguilian Food Stalls', category: 'food', description: 'Traditional Ilocano vegetable stew.', features: ['Fresh vegetables', 'Authentic recipe', 'Healthy', 'Served with rice'] }
    }
};

const weatherCodeMap = { 0: { desc: 'Clear Sky', icon: 'fa-sun', class: 'sunny' }, 1: { desc: 'Mainly Clear', icon: 'fa-sun', class: 'sunny' }, 2: { desc: 'Partly Cloudy', icon: 'fa-cloud-sun', class: 'cloudy' }, 3: { desc: 'Overcast', icon: 'fa-cloud', class: 'cloudy' }, 45: { desc: 'Foggy', icon: 'fa-smog', class: 'cloudy' }, 51: { desc: 'Light Drizzle', icon: 'fa-cloud-rain', class: 'rainy' }, 61: { desc: 'Slight Rain', icon: 'fa-cloud-rain', class: 'rainy' }, 63: { desc: 'Moderate Rain', icon: 'fa-cloud-showers-heavy', class: 'rainy' }, 65: { desc: 'Heavy Rain', icon: 'fa-cloud-showers-heavy', class: 'rainy' }, 95: { desc: 'Thunderstorm', icon: 'fa-bolt', class: 'stormy' } };

const notification = document.getElementById('notification');
const navLinks = document.querySelectorAll('nav a');
const pageContents = document.querySelectorAll('.page-content');

function showNotification(message, type = 'success') {
    notification.textContent = message; notification.style.background = type === 'danger' ? 'var(--danger)' : 'var(--success)';
    notification.classList.add('show'); setTimeout(() => notification.classList.remove('show'), 3000);
}
function getFeaturesArray(str) { return str ? str.split(',').map(f => f.trim()) : []; }
function getStarsHTML(rating) { let s = ''; for(let i=1; i<=5; i++) s += i <= Math.round(rating) ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>'; return s; }
function fileToBase64(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve(r.result); r.onerror = reject; }); }

async function loadDatabase() {
    try {
        const [s, p, r, t] = await Promise.all([fetch('get_data.php?type=spots'), fetch('get_data.php?type=products'), fetch('get_data.php?type=records'), fetch('get_data.php?type=ticket_items')]);
        dbSpots = await s.json(); dbProducts = await p.json(); dbRecords = await r.json(); dbTicketItems = await t.json();
        document.getElementById('dash-attractions-count').textContent = dbSpots.length;
        renderTouristSpots(); renderProducts(); renderRecords();
    } catch (e) { console.error(e); }
}

// AUTH
document.getElementById('closeLogin').addEventListener('click', () => document.getElementById('login-container').classList.remove('active'));
document.getElementById('closeSignup').addEventListener('click', () => document.getElementById('signup-container').classList.remove('active'));
document.getElementById('showSignup').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-container').classList.remove('active'); document.getElementById('signup-container').classList.add('active'); });
document.getElementById('showLogin').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('signup-container').classList.remove('active'); document.getElementById('login-container').classList.add('active'); });

document.getElementById('login-submit').addEventListener('click', async () => {
    const fd = new FormData(); fd.append('action', 'login'); fd.append('email', document.getElementById('login-email').value); fd.append('password', document.getElementById('login-password').value);
    const res = await fetch('login_process.php', { method: 'POST', body: fd }); const data = await res.json();
    if (data.success) { currentUser = data.user; updateUserUI(); document.getElementById('login-container').classList.remove('active'); showNotification(`Welcome, ${currentUser.name}!`); showPage('dashboard'); renderTouristSpots(); renderProducts(); }
    else showNotification(data.message, 'danger');
});

document.getElementById('signup-submit').addEventListener('click', async () => {
    const fd = new FormData(); fd.append('action', 'signup'); fd.append('name', document.getElementById('signup-name').value); fd.append('email', document.getElementById('signup-email').value); fd.append('password', document.getElementById('signup-password').value);
    const res = await fetch('login_process.php', { method: 'POST', body: fd }); const data = await res.json();
    showNotification(data.message, data.success ? 'success' : 'danger'); if (data.success) document.getElementById('signup-container').classList.remove('active');
});

document.getElementById('logout-btn').addEventListener('click', () => { currentUser = null; myTickets = []; document.getElementById('login-container').classList.add('active'); renderTouristSpots(); renderProducts(); });

function updateUserUI() {
    if (!currentUser) return;
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Tourist';
    document.getElementById('points-count').textContent = parseInt(currentUser.points).toLocaleString();
    document.getElementById('modal-points-count').textContent = parseInt(currentUser.points).toLocaleString();
    document.getElementById('tickets-points-count').textContent = parseInt(currentUser.points).toLocaleString();
    document.getElementById('welcome-msg').textContent = `Welcome, ${currentUser.name}!`;
    document.getElementById('tickets-issued-count').textContent = myTickets.length;
    const isAdmin = currentUser.role === 'admin';
    document.getElementById('nav-analytics').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('nav-admin-reviews').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('admin-reviews-btn').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('analytics-btn').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('notification-bell').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('qr-scan-btn-main').style.display = isAdmin ? 'flex' : 'none';
    document.querySelectorAll('.admin-only-btn').forEach(b => b.style.display = isAdmin ? 'inline-flex' : 'none');
    updateNotificationBadge();
    if (currentUser.profile_image) {
        document.getElementById('sidebar-profile-img').src = currentUser.profile_image;
    } else {
        document.getElementById('sidebar-profile-img').src = `https://i.pravatar.cc/150?u=${currentUser.email}`;
    }
}

function showPage(pageId) {
    if (!currentUser) return document.getElementById('login-container').classList.add('active');
    if (currentUser.role !== 'admin' && (pageId === 'analytics' || pageId === 'admin-tickets' || pageId === 'admin-reviews')) return showNotification('Admin only', 'danger');
    pageContents.forEach(p => p.classList.remove('active')); navLinks.forEach(l => l.classList.remove('active'));
    document.getElementById(`${pageId}-view`).classList.add('active');
    document.querySelector(`nav a[data-page="${pageId}"]`)?.classList.add('active');
    if (pageId === 'spots') renderTouristSpots();
    if (pageId === 'products') renderProducts();
    if (pageId === 'records') renderRecords();
    if (pageId === 'mytickets') renderMyTickets();
    if (pageId === 'admin-reviews') renderAdminPlaceReviews();
    if (pageId === 'map') setTimeout(() => { initMap(); fetchWeather(); }, 200);
    if (pageId === 'analytics') setTimeout(initAnalytics, 200);
}
navLinks.forEach(l => l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.page); }));

function renderRecords() {
    const tb = document.getElementById('records-tbody'); tb.innerHTML = '';
    dbRecords.forEach(r => tb.innerHTML += `<tr><td>#${r.id}</td><td>${r.location}</td><td>${r.visitors}</td><td>${r.record_date}</td><td><button class="action-icon-btn edit-btn" data-id="${r.id}"><i class="fas fa-edit"></i></button><button class="action-icon-btn delete-btn" data-id="${r.id}"><i class="fas fa-trash"></i></button></td></tr>`);
}

// PROFILE
document.getElementById('open-profile-btn').addEventListener('click', () => {
    if (!currentUser) return;
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-phone').value = currentUser.phone || '';
    if (currentUser.profile_image) {
        document.getElementById('profile-avatar-preview').src = currentUser.profile_image;
    } else {
        document.getElementById('profile-avatar-preview').src = `https://i.pravatar.cc/150?u=${currentUser.email}`;
    }
    document.getElementById('profile-modal').classList.add('active');
});
document.getElementById('close-profile-modal').addEventListener('click', () => document.getElementById('profile-modal').classList.remove('active'));
document.getElementById('profile-avatar-input').addEventListener('change', function(e) {
    if (e.target.files[0]) {
        document.getElementById('profile-avatar-preview').src = URL.createObjectURL(e.target.files[0]);
    }
});
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('user_id', currentUser.id);
    fd.append('name', document.getElementById('profile-name').value);
    fd.append('email', document.getElementById('profile-email').value);
    fd.append('phone', document.getElementById('profile-phone').value);
    const newPass = document.getElementById('profile-password').value;
    if (newPass) fd.append('password', newPass);
    const avatarFile = document.getElementById('profile-avatar-input').files[0];
    if (avatarFile) fd.append('profile_image', await fileToBase64(avatarFile));
    
    try {
        const res = await fetch('update_profile.php', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            currentUser = { ...currentUser, ...data.user };
            updateUserUI();
            showNotification('Profile updated!');
            document.getElementById('profile-modal').classList.remove('active');
        } else {
            showNotification(data.message, 'danger');
        }
    } catch (error) { showNotification('Error updating profile', 'danger'); }
});

// QR SCANNER
document.getElementById('qr-scan-btn-main').addEventListener('click', () => {
    document.getElementById('qr-scanner-title').textContent = 'Scan Spot QR Code';
    document.getElementById('qr-instruction').textContent = 'Point your camera at the spot\'s QR code to earn points';
    document.getElementById('qr-scanner-modal').classList.add('active');
    startQRScanner('spot');
});

document.getElementById('close-qr-scanner').addEventListener('click', () => {
    document.getElementById('qr-scanner-modal').classList.remove('active');
    stopQRScanner();
});

document.getElementById('scan-qr-visit-btn').addEventListener('click', () => {
    if (!currentUser) return showNotification('Please login first', 'danger');
    document.getElementById('qr-scanner-title').textContent = 'Scan to Earn Points';
    document.getElementById('qr-instruction').textContent = `Scan the QR code at ${dbSpots.find(s => s.id == currentSpotId)?.name || 'this spot'} to earn points`;
    document.getElementById('qr-scanner-modal').classList.add('active');
    startQRScanner('spot', currentSpotId);
});

document.getElementById('admin-generate-qr-btn').addEventListener('click', () => {
    if (!currentSpotId) return;
    const spot = dbSpots.find(s => s.id == currentSpotId);
    if (!spot) return;
    openQRGenerator(spot);
});

function startQRScanner(mode, expectedSpotId = null) {
    stopQRScanner();
    document.getElementById('qr-result').style.display = 'none';
    document.getElementById('qr-result').innerHTML = '';
    
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            handleScannedQR(decodedText, mode, expectedSpotId);
        },
        (errorMessage) => {}
    ).catch(err => {
        document.getElementById('qr-result').style.display = 'block';
        document.getElementById('qr-result').innerHTML = '<p style="color: var(--danger); text-align: center;"><i class="fas fa-exclamation-triangle"></i> Camera access denied. Please allow camera access to scan QR codes.</p>';
    });
}

function stopQRScanner() {
    if (qrScanner) {
        qrScanner.stop().then(() => {
            qrScanner.clear();
            qrScanner = null;
        }).catch(err => console.error(err));
    }
}

function handleScannedQR(decodedText, mode, expectedSpotId) {
    stopQRScanner();
    document.getElementById('qr-result').style.display = 'block';
    
    const parts = decodedText.split('|');
    
    if (parts[0] !== 'TOURGO') {
        document.getElementById('qr-result').innerHTML = `
            <div style="text-align: center; color: var(--danger);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <h4 style="margin-bottom: 10px;">Invalid QR Code</h4>
                <p style="color: var(--gray); font-size: 0.9rem;">This is not a valid Tourgo QR code.</p>
            </div>
        `;
        return;
    }
    
    const qrType = parts[1];
    const qrId = parts[2];
    
    if (mode === 'spot' && qrType === 'spot') {
        const spot = dbSpots.find(s => s.id == qrId);
        if (!spot) {
            document.getElementById('qr-result').innerHTML = '<p style="color: var(--danger);">Spot not found.</p>';
            return;
        }
        
        const alreadyScanned = sessionStorage.getItem(`scanned_spot_${qrId}_${currentUser.id}`);
        if (alreadyScanned) {
            document.getElementById('qr-result').innerHTML = `
                <div style="text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--success); margin-bottom: 10px;"></i>
                    <h4 style="color: var(--dark); margin-bottom: 10px;">Already Visited!</h4>
                    <p style="color: var(--gray);">You've already earned points for ${spot.name}.</p>
                </div>
            `;
            return;
        }
        
        currentUser.points += parseInt(spot.points_reward);
        updateUserUI();
        sessionStorage.setItem(`scanned_spot_${qrId}_${currentUser.id}`, 'true');
        
        document.getElementById('qr-result').innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-trophy" style="font-size: 3rem; color: var(--accent); margin-bottom: 10px;"></i>
                <h4 style="color: var(--primary); margin-bottom: 10px;">Points Earned!</h4>
                <p style="color: var(--dark); font-weight: 600; margin-bottom: 5px;">+${spot.points_reward} points</p>
                <p style="color: var(--gray); font-size: 0.9rem;">for visiting ${spot.name}</p>
                <p style="color: var(--primary); font-weight: 700; margin-top: 10px;">Total: ${currentUser.points.toLocaleString()} points</p>
            </div>
        `;
        
        showNotification(`+${spot.points_reward} points earned at ${spot.name}!`, 'success');
        addToActivity(`Earned ${spot.points_reward} pts at ${spot.name}`, 'Just now');
        
        setTimeout(() => {
            document.getElementById('qr-scanner-modal').classList.remove('active');
        }, 3000);
    } else if (qrType === 'ticket') {
        document.getElementById('qr-result').innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-ticket-alt" style="font-size: 3rem; color: var(--primary); margin-bottom: 10px;"></i>
                <h4 style="color: var(--dark); margin-bottom: 10px;">Ticket Verified!</h4>
                <p style="color: var(--gray); font-size: 0.9rem;">Code: ${qrId}</p>
                <p style="color: var(--success); font-weight: 600; margin-top: 10px;">Valid for redemption</p>
            </div>
        `;
    } else {
        document.getElementById('qr-result').innerHTML = `
            <div style="text-align: center; color: var(--danger);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <h4 style="margin-bottom: 10px;">Wrong QR Type</h4>
                <p style="color: var(--gray); font-size: 0.9rem;">This QR code is not for the current mode.</p>
            </div>
        `;
    }
}

function openQRGenerator(spot) {
    const qrData = `TOURGO|spot|${spot.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=0d9488&margin=10`;
    
    document.getElementById('qr-generator-spot-name').textContent = spot.name;
    document.getElementById('qr-generator-spot-location').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${spot.location}`;
    document.getElementById('qr-points-value').textContent = spot.points_reward;
    document.getElementById('qr-generator-image').src = qrUrl;
    document.getElementById('qr-generator-image').dataset.spotId = spot.id;
    document.getElementById('qr-generator-image').dataset.spotName = spot.name;
    
    document.getElementById('qr-generator-modal').classList.add('active');
}

document.getElementById('close-qr-generator').addEventListener('click', () => {
    document.getElementById('qr-generator-modal').classList.remove('active');
});

document.getElementById('download-qr-btn').addEventListener('click', async () => {
    const img = document.getElementById('qr-generator-image');
    const spotId = img.dataset.spotId;
    const spotName = img.dataset.spotName;
    
    try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR_${spotName.replace(/\s+/g, '_')}_Spot${spotId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showNotification('QR Code downloaded!', 'success');
    } catch (error) {
        showNotification('Failed to download QR code', 'danger');
    }
});

document.getElementById('print-qr-btn').addEventListener('click', () => {
    const img = document.getElementById('qr-generator-image');
    const spotName = img.dataset.spotName;
    const spotLocation = document.getElementById('qr-generator-spot-location').textContent;
    const points = document.getElementById('qr-points-value').textContent;
    
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>QR Code - ${spotName}</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                .qr-container { border: 3px solid #0d9488; border-radius: 20px; padding: 30px; display: inline-block; }
                img { width: 300px; height: 300px; }
                h1 { color: #0d9488; margin: 20px 0 10px; }
                p { color: #64748b; margin: 5px 0; }
                .points { color: #f97316; font-weight: bold; font-size: 1.2rem; margin-top: 15px; }
                .footer { margin-top: 20px; font-size: 0.85rem; color: #94a3b8; }
            </style>
        </head>
        <body>
            <div class="qr-container">
                <img src="${img.src}" alt="QR Code">
                <h1>${spotName}</h1>
                <p><i class="fas fa-map-marker-alt"></i> ${spotLocation}</p>
                <p class="points"><i class="fas fa-coins"></i> +${points} Points</p>
                <div class="footer">
                    <p>Scan this QR code with the Tourgo app to earn points!</p>
                    <p>Place this at the tourist spot location.</p>
                </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
});

// TICKETS & REDEEM
document.getElementById('tickets-btn').addEventListener('click', () => { if (!currentUser) return showNotification('Login first', 'danger'); renderTicketsGrid(); document.getElementById('tickets-modal').classList.add('active'); });
document.getElementById('close-tickets-modal').addEventListener('click', () => document.getElementById('tickets-modal').classList.remove('active'));
document.getElementById('my-tickets-btn').addEventListener('click', () => showPage('mytickets'));
document.getElementById('redeem-btn').addEventListener('click', () => document.getElementById('redeem-modal').classList.add('active'));
document.getElementById('close-redeem-modal').addEventListener('click', () => document.getElementById('redeem-modal').classList.remove('active'));

document.querySelectorAll('#redeem-modal .btn-clean-redeem').forEach(btn => {
    btn.addEventListener('click', e => {
        const card = e.target.closest('.clean-card'); const cost = parseInt(card.dataset.cost);
        if (currentUser.points >= cost) { currentUser.points -= cost; updateUserUI(); showNotification('Redeemed!'); document.getElementById('redeem-modal').classList.remove('active'); }
        else showNotification('Not enough points', 'danger');
    });
});

function renderTicketsGrid() {
    const grid = document.getElementById('tickets-grid'); grid.innerHTML = '';
    dbTicketItems.forEach(item => {
        const canAfford = currentUser.points >= item.cost;
        const card = document.createElement('div'); card.className = 'clean-card';
        card.innerHTML = `<div class="card-icon bg-purple"><i class="fas ${item.icon}"></i></div><div class="card-details"><h4>${item.name}</h4><span class="card-cost">${item.cost} Pts</span></div><button class="btn-clean-redeem" ${!canAfford?'disabled':''} data-id="${item.id}">${canAfford?'Redeem':'No Pts'}</button>`;
        grid.appendChild(card);
    });
    document.querySelectorAll('#tickets-grid .btn-clean-redeem').forEach(b => b.addEventListener('click', e => redeemTicket(parseInt(e.target.dataset.id))));
}

function redeemTicket(id) {
    const item = dbTicketItems.find(i => i.id == id);
    if (currentUser.points < item.cost) return showNotification('Not enough points', 'danger');
    currentUser.points -= item.cost; updateUserUI();
    const code = 'TKT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const ticket = { id: Date.now(), code, itemName: item.name, itemIcon: item.icon, holderName: currentUser.name, holderEmail: currentUser.email, status: 'active', qrData: `TOURGO|ticket|${code}` };
    myTickets.push(ticket);
    adminNotifications.push({ id: Date.now(), message: `${currentUser.name} redeemed ${item.name}`, read: false });
    document.getElementById('tickets-modal').classList.remove('active');
    document.getElementById('ticket-qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticket.qrData}`;
    document.getElementById('ticket-code-display').textContent = ticket.code;
    document.getElementById('ticket-item-display').textContent = ticket.itemName;
    document.getElementById('ticket-holder-display').textContent = ticket.holderName;
    document.getElementById('ticket-confirm-modal').classList.add('active');
    showNotification('Ticket Redeemed!');
}
document.getElementById('close-ticket-confirm').addEventListener('click', () => document.getElementById('ticket-confirm-modal').classList.remove('active'));
document.getElementById('download-ticket-btn').addEventListener('click', () => showNotification('Ticket saved!'));

function renderMyTickets() {
    const grid = document.getElementById('mytickets-grid'); grid.innerHTML = '';
    const userTickets = myTickets.filter(t => t.holderEmail === currentUser?.email);
    if (userTickets.length === 0) { grid.innerHTML = '<div class="empty-state"><i class="fas fa-ticket-alt"></i><p>No tickets yet.</p></div>'; return; }
    userTickets.forEach(t => {
        grid.innerHTML += `<div class="my-ticket-card ${t.status}"><div class="my-ticket-header"><h4><i class="fas ${t.itemIcon}"></i> ${t.itemName}</h4><span class="ticket-status-badge ${t.status}">${t.status}</span></div><div class="my-ticket-qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${t.qrData}"></div><div class="my-ticket-code">${t.code}</div></div>`;
    });
}

// ADMIN PLACE REVIEWS
document.getElementById('admin-reviews-btn').addEventListener('click', () => showPage('admin-reviews'));

async function renderAdminPlaceReviews() {
    const grid = document.getElementById('places-reviews-grid');
    grid.innerHTML = '<p style="text-align:center; padding: 40px; color: var(--gray);">Loading places...</p>';
    
    try {
        const spotsRes = await fetch('get_data.php?type=spots');
        const spots = await spotsRes.json();
        const reviewsRes = await fetch('get_data.php?type=all_reviews');
        const allReviews = await reviewsRes.json();
        grid.innerHTML = '';
        
        if (spots.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-map-marker-alt"></i><p>No spots available yet.</p></div>';
            return;
        }
        
        spots.forEach(spot => {
            const spotReviews = allReviews.filter(r => r.item_type === 'spot' && r.item_id == spot.id);
            const avgRating = spotReviews.length > 0 
                ? (spotReviews.reduce((sum, r) => sum + parseInt(r.rating), 0) / spotReviews.length).toFixed(1)
                : (spot.rating || 0);
            const reviewCount = spotReviews.length || spot.review_count || 0;
            
            const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            spotReviews.forEach(r => {
                const rating = parseInt(r.rating);
                if (ratingDist[rating] !== undefined) ratingDist[rating]++;
            });
            
            const card = document.createElement('div');
            card.className = 'place-review-card';
            card.onclick = () => window.openPlaceReviewDetails(spot.id, spot.name, spot.image_url, spot.category, avgRating, reviewCount, spotReviews, ratingDist, spot.description, spot.points_reward);
            
            card.innerHTML = `
                <div class="place-review-image">
                    <img src="${spot.image_url}" alt="${spot.name}">
                    <div class="place-review-overlay">
                        <h4>${spot.name}</h4>
                    </div>
                </div>
                <div class="place-review-info">
                    <div class="place-review-stats">
                        <div class="place-review-rating">
                            <i class="fas fa-star"></i>
                            <span>${avgRating}</span>
                        </div>
                        <div class="place-review-count">${reviewCount} review${reviewCount !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="place-review-summary">${spot.description.substring(0, 80)}...</div>
                    <div class="place-review-footer">
                        <span class="place-review-points"><i class="fas fa-coins"></i> +${spot.points_reward} pts</span>
                        <span class="place-review-action">View Reviews <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = '<p style="color:red; text-align:center; padding: 40px;">Failed to load places.</p>';
    }
}

window.openPlaceReviewDetails = function(spotId, spotName, spotImage, spotCategory, avgRating, reviewCount, reviews, ratingDist, description, points) {
    const existingModal = document.getElementById('place-details-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'place-details-modal';
    modal.className = 'modal';
    
    const totalReviews = reviews.length || 1;
    const ratingBars = [5, 4, 3, 2, 1].map(star => {
        const count = ratingDist[star] || 0;
        const percentage = (count / totalReviews) * 100;
        return `
            <div class="rating-bar-row">
                <span class="star-label">${star} <i class="fas fa-star" style="color: var(--accent); font-size: 0.7rem;"></i></span>
                <div class="bar"><div class="bar-fill" style="width: ${percentage}%"></div></div>
                <span class="bar-count">${count}</span>
            </div>
        `;
    }).join('');
    
    const reviewsHtml = reviews.length > 0 
        ? reviews.map(r => `
            <div class="review-card">
                <div class="review-card-header">
                    <span class="review-card-user">${r.user_name}</span>
                    <span class="review-card-date">${new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div class="review-card-stars">${getStarsHTML(r.rating)}</div>
                <p class="review-card-text">${r.comment}</p>
                ${r.admin_reply ? `<div class="admin-reply-box"><strong>Admin Reply:</strong> ${r.admin_reply}</div>` : ''}
            </div>
        `).join('')
        : '<p style="text-align:center; color: var(--gray); padding: 20px;">No reviews yet. Be the first to review!</p>';
    
    modal.innerHTML = `
        <div class="modal-content place-details-modal-content">
            <div class="place-details-header">
                <img src="${spotImage}" alt="${spotName}">
                <button class="detail-close-btn" onclick="document.getElementById('place-details-modal').classList.remove('active')" style="position: absolute; top: 15px; right: 15px; background: rgba(255,255,255,0.95); border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; color: var(--dark); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"><i class="fas fa-times"></i></button>
                <div class="place-details-header-overlay">
                    <h2>${spotName}</h2>
                    <div class="place-meta">
                        <span><i class="fas fa-tag"></i> ${spotCategory}</span>
                        <span><i class="fas fa-star"></i> ${avgRating} (${reviewCount} reviews)</span>
                        <span><i class="fas fa-coins"></i> +${points} pts</span>
                    </div>
                </div>
            </div>
            <div class="place-details-body">
                <div class="place-details-section">
                    <h3><i class="fas fa-info-circle"></i> About This Place</h3>
                    <p style="color: var(--gray); line-height: 1.7;">${description}</p>
                </div>
                
                <div class="place-details-section">
                    <h3><i class="fas fa-chart-bar"></i> Rating Summary</h3>
                    <div class="rating-summary" style="display: flex; gap: 30px; align-items: center; padding: 20px; background: var(--light); border-radius: 12px;">
                        <div class="rating-big" style="text-align: center;">
                            <div class="number">${avgRating}</div>
                            <div class="stars">${getStarsHTML(avgRating)}</div>
                            <div class="count">${reviewCount} review${reviewCount !== 1 ? 's' : ''}</div>
                        </div>
                        <div class="rating-bars" style="flex: 1;">
                            ${ratingBars}
                        </div>
                    </div>
                </div>
                
                <div class="place-details-section">
                    <h3><i class="fas fa-comments"></i> User Reviews</h3>
                    ${reviewsHtml}
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
};

// SPOTS - Clickable cards
function renderTouristSpots() {
    const grid = document.getElementById('spots-grid'); grid.innerHTML = '';
    const isAdmin = currentUser?.role === 'admin';
    dbSpots.forEach(spot => {
        const card = document.createElement('div'); card.className = 'spot-card';
        card.onclick = (e) => {
            if (!e.target.closest('.admin-edit-icon')) {
                window.openSpotDetails(spot.id);
            }
        };
        card.innerHTML = `<div class="spot-card-image">
                <img src="${spot.image_url}" alt="${spot.name}">
                <div class="spot-points-badge"><i class="fas fa-coins"></i> +${spot.points_reward} pts</div>
                <div class="spot-category-badge">${spot.category}</div>
                ${isAdmin ? `<button class="admin-edit-icon" onclick="window.openEditSpot(${spot.id})" title="Edit spot"><i class="fas fa-edit"></i></button>` : ''}
            </div>
            <div class="spot-card-content">
                <h3 class="spot-card-title">${spot.name}</h3>
                <div class="spot-card-location"><i class="fas fa-map-marker-alt"></i> ${spot.location}</div>
                <div class="spot-card-rating"><span class="stars">${getStarsHTML(spot.rating)}</span><span>${spot.rating} (${spot.review_count||0} reviews)</span></div>
                <p class="spot-card-description">${spot.description.substring(0,100)}...</p>
            </div>`;
        grid.appendChild(card);
    });
}

window.openSpotDetails = async function(id) {
    const spot = dbSpots.find(s => s.id == id); if (!spot) return;
    currentSpotId = id; currentSpotRating = 0;
    document.getElementById('spot-detail-img').src = spot.image_url;
    document.getElementById('spot-detail-category').textContent = spot.category;
    document.getElementById('spot-detail-title').textContent = spot.name;
    document.getElementById('spot-detail-rating').textContent = spot.rating;
    document.getElementById('spot-review-count').textContent = `(${spot.review_count||0})`;
    document.getElementById('spot-detail-location').textContent = spot.location;
    document.getElementById('spot-detail-description').textContent = spot.description;
    document.getElementById('spot-detail-features').innerHTML = getFeaturesArray(spot.features).map(f => `<li>${f}</li>`).join('');
    document.querySelectorAll('#spot-star-input i').forEach(s => s.classList.remove('active'));
    document.getElementById('spot-comment-input').value = '';

    const list = document.getElementById('spot-reviews-list'); list.innerHTML = 'Loading...';
    const res = await fetch(`get_data.php?type=reviews&item_type=spot&item_id=${id}`);
    const reviews = await res.json();
    list.innerHTML = reviews.length ? reviews.map(r => `<div class="review-item"><div class="review-header"><span class="review-user">${r.user_name}</span><span class="review-stars">${getStarsHTML(r.rating)}</span></div><p class="review-text">${r.comment}</p>${r.admin_reply ? `<div class="admin-reply-box"><strong>Admin Reply:</strong> ${r.admin_reply}</div>` : ''}</div>`).join('') : '<p style="text-align:center; color:var(--gray);">No reviews yet.</p>';
    
    document.getElementById('admin-qr-actions').style.display = (currentUser?.role === 'admin') ? 'block' : 'none';
    
    document.getElementById('spot-details-modal').classList.add('active');
}
document.getElementById('close-spot-modal').addEventListener('click', () => document.getElementById('spot-details-modal').classList.remove('active'));
document.getElementById('share-spot-btn').addEventListener('click', () => showNotification('Shared!'));

document.querySelectorAll('#spot-star-input i').forEach(s => s.addEventListener('click', function() {
    currentSpotRating = parseInt(this.dataset.value);
    document.querySelectorAll('#spot-star-input i').forEach((st, i) => st.classList.toggle('active', i < currentSpotRating));
}));
document.getElementById('submit-spot-review').addEventListener('click', async () => {
    if (!currentUser) return showNotification('Login first', 'danger');
    if (!currentSpotRating) return showNotification('Select stars', 'danger');
    const fd = new FormData(); fd.append('user_id', currentUser.id); fd.append('user_name', currentUser.name);
    fd.append('item_type', 'spot'); fd.append('item_id', currentSpotId); fd.append('rating', currentSpotRating); fd.append('comment', document.getElementById('spot-comment-input').value);
    const res = await fetch('add_review.php', { method: 'POST', body: fd }); const data = await res.json();
    if (data.success) { showNotification('Posted!'); openSpotDetails(currentSpotId); loadDatabase(); } else showNotification(data.message, 'danger');
});

// PRODUCTS - Clickable cards
function renderProducts() {
    const grid = document.getElementById('products-grid'); grid.innerHTML = '';
    const isAdmin = currentUser?.role === 'admin';
    dbProducts.forEach(p => {
        const card = document.createElement('div'); card.className = 'product-card';
        card.onclick = (e) => {
            if (!e.target.closest('.admin-edit-icon')) {
                window.openProductDetails(p.id);
            }
        };
        card.innerHTML = `<div class="product-card-image">
                <img src="${p.image_url}" alt="${p.name}">
                <div class="product-price-tag">₱${parseFloat(p.price).toLocaleString()}</div>
                <div class="product-category-badge">${p.category}</div>
                ${isAdmin ? `<button class="admin-edit-icon" onclick="window.openEditProduct(${p.id})" title="Edit product"><i class="fas fa-edit"></i></button>` : ''}
            </div>
            <div class="product-card-content">
                <h3 class="product-card-name">${p.name}</h3>
                <div class="product-card-location"><i class="fas fa-store"></i> ${p.location}</div>
                <div class="product-card-rating"><span class="stars">${getStarsHTML(p.rating)}</span><span>${p.rating} (${p.review_count||0} reviews)</span></div>
                <p class="product-card-description">${p.description.substring(0,100)}...</p>
            </div>`;
        grid.appendChild(card);
    });
}

window.openProductDetails = async function(id) {
    const p = dbProducts.find(x => x.id == id); if (!p) return;
    currentProductId = id; currentProductRating = 0;
    document.getElementById('product-detail-img').src = p.image_url;
    document.getElementById('product-detail-category').textContent = p.category;
    document.getElementById('product-detail-name').textContent = p.name;
    document.getElementById('product-detail-price').textContent = `₱${parseFloat(p.price).toLocaleString()}`;
    document.getElementById('product-detail-rating').textContent = p.rating;
    document.getElementById('product-review-count').textContent = `(${p.review_count||0})`;
    document.getElementById('product-detail-description').textContent = p.description;
    document.getElementById('product-detail-features').innerHTML = getFeaturesArray(p.features).map(f => `<li>${f}</li>`).join('');
    document.querySelectorAll('#product-star-input i').forEach(s => s.classList.remove('active'));
    document.getElementById('product-comment-input').value = '';

    const list = document.getElementById('product-reviews-list'); list.innerHTML = 'Loading...';
    const res = await fetch(`get_data.php?type=reviews&item_type=product&item_id=${id}`);
    const reviews = await res.json();
    list.innerHTML = reviews.length ? reviews.map(r => `<div class="review-item"><div class="review-header"><span class="review-user">${r.user_name}</span><span class="review-stars">${getStarsHTML(r.rating)}</span></div><p class="review-text">${r.comment}</p>${r.admin_reply ? `<div class="admin-reply-box"><strong>Admin Reply:</strong> ${r.admin_reply}</div>` : ''}</div>`).join('') : '<p style="text-align:center; color:var(--gray);">No reviews yet.</p>';
    document.getElementById('product-details-modal').classList.add('active');
}
document.getElementById('close-product-modal').addEventListener('click', () => document.getElementById('product-details-modal').classList.remove('active'));
document.getElementById('buy-product-btn').addEventListener('click', () => { showNotification('Purchased!'); document.getElementById('product-details-modal').classList.remove('active'); });
document.getElementById('share-product-btn').addEventListener('click', () => showNotification('Shared!'));

document.querySelectorAll('#product-star-input i').forEach(s => s.addEventListener('click', function() {
    currentProductRating = parseInt(this.dataset.value);
    document.querySelectorAll('#product-star-input i').forEach((st, i) => st.classList.toggle('active', i < currentProductRating));
}));
document.getElementById('submit-product-review').addEventListener('click', async () => {
    if (!currentUser) return showNotification('Login first', 'danger');
    if (!currentProductRating) return showNotification('Select stars', 'danger');
    const fd = new FormData(); fd.append('user_id', currentUser.id); fd.append('user_name', currentUser.name);
    fd.append('item_type', 'product'); fd.append('item_id', currentProductId); fd.append('rating', currentProductRating); fd.append('comment', document.getElementById('product-comment-input').value);
    const res = await fetch('add_review.php', { method: 'POST', body: fd }); const data = await res.json();
    if (data.success) { showNotification('Posted!'); openProductDetails(currentProductId); loadDatabase(); }
});

// ADD/EDIT FORMS
document.getElementById('open-add-spot-btn').addEventListener('click', () => document.getElementById('add-spot-modal').classList.add('active'));
document.getElementById('close-add-spot-modal').addEventListener('click', () => document.getElementById('add-spot-modal').classList.remove('active'));
document.getElementById('open-add-product-btn').addEventListener('click', () => document.getElementById('add-product-modal').classList.add('active'));
document.getElementById('close-add-product-modal').addEventListener('click', () => document.getElementById('add-product-modal').classList.remove('active'));
document.getElementById('close-edit-spot-modal').addEventListener('click', () => document.getElementById('edit-spot-modal').classList.remove('active'));
document.getElementById('close-edit-product-modal').addEventListener('click', () => document.getElementById('edit-product-modal').classList.remove('active'));

['add-spot-image', 'edit-spot-image', 'add-product-image', 'edit-product-image'].forEach(id => {
    document.getElementById(id).addEventListener('change', function(e) {
        if (e.target.files[0]) { const prev = document.getElementById(id + '-preview'); prev.src = URL.createObjectURL(e.target.files[0]); prev.style.display = 'block'; }
    });
});

window.openEditSpot = function(id) {
    const s = dbSpots.find(x => x.id == id); if(!s) return;
    document.getElementById('edit-spot-id').value = s.id; document.getElementById('edit-spot-name').value = s.name;
    document.getElementById('edit-spot-category').value = s.category; document.getElementById('edit-spot-location').value = s.location;
    document.getElementById('edit-spot-points').value = s.points_reward; document.getElementById('edit-spot-desc').value = s.description;
    document.getElementById('edit-spot-features').value = s.features;
    document.getElementById('edit-spot-image-preview').src = s.image_url; document.getElementById('edit-spot-image-preview').style.display = 'block';
    document.getElementById('edit-spot-modal').classList.add('active');
}
window.openEditProduct = function(id) {
    const p = dbProducts.find(x => x.id == id); if(!p) return;
    document.getElementById('edit-product-id').value = p.id; document.getElementById('edit-product-name').value = p.name;
    document.getElementById('edit-product-category').value = p.category; document.getElementById('edit-product-location').value = p.location;
    document.getElementById('edit-product-price').value = p.price; document.getElementById('edit-product-desc').value = p.description;
    document.getElementById('edit-product-features').value = p.features;
    document.getElementById('edit-product-image-preview').src = p.image_url; document.getElementById('edit-product-image-preview').style.display = 'block';
    document.getElementById('edit-product-modal').classList.add('active');
}

async function handleFormSubmit(formId, phpFile, resetPreviewId) {
    document.getElementById(formId).addEventListener('submit', async (e) => {
        e.preventDefault(); const fd = new FormData(e.target);
        const fileInput = e.target.querySelector('input[type="file"]');
        if (fileInput && fileInput.files[0]) fd.append('image_base64', await fileToBase64(fileInput.files[0]));
        fd.append('lat', '16.4947'); fd.append('lng', '120.4594'); fd.append('rating', '0');
        const res = await fetch(phpFile, { method: 'POST', body: fd }); const data = await res.json();
        if (data.success) { showNotification(data.message); document.getElementById(formId.replace('form','modal')).classList.remove('active'); e.target.reset(); if(resetPreviewId) document.getElementById(resetPreviewId).style.display='none'; loadDatabase(); }
        else showNotification(data.message, 'danger');
    });
}
handleFormSubmit('add-spot-form', 'add_spot.php', 'add-spot-image-preview');
handleFormSubmit('edit-spot-form', 'edit_spot.php', null);
handleFormSubmit('add-product-form', 'add_product.php', 'add-product-image-preview');
handleFormSubmit('edit-product-form', 'edit_product.php', null);

// MAP
document.getElementById('explore-btn').addEventListener('click', () => showPage('map'));

document.querySelectorAll('.map-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentMapFilter = e.currentTarget.dataset.category;
        renderMapMarkers();
    });
});

function initMap() {
    if (map) { map.invalidateSize(); renderMapMarkers(); return; }
    map = L.map('interactive-map', { 
        center: [16.4947, 120.4594], 
        zoom: 14,
        zoomControl: false
    });
    
    L.control.zoom({ position: 'topright' }).addTo(map);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '© OpenStreetMap',
        maxZoom: 19
    }).addTo(map);
    
    renderMapMarkers();
}

function createCustomPin(category, spotId) {
    const icons = { nature: 'fa-leaf', adventure: 'fa-hiking', cultural: 'fa-landmark' };
    const icon = icons[category] || 'fa-map-marker-alt';
    
    return L.divIcon({
        className: 'custom-pin',
        html: `
            <div class="pin-wrapper" data-spot-id="${spotId}">
                <div class="pin-icon ${category}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="pin-pulse"></div>
            </div>
        `,
        iconSize: [50, 65],
        iconAnchor: [25, 65],
        popupAnchor: [0, -65]
    });
}

function renderMapMarkers() {
    if (!map) return; 
    markers.forEach(m => map.removeLayer(m)); 
    markers = [];
    
    const filteredSpots = currentMapFilter === 'all' ? dbSpots : dbSpots.filter(spot => spot.category === currentMapFilter);
    
    filteredSpots.forEach((s, index) => {
        const lat = parseFloat(s.lat), lng = parseFloat(s.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            const marker = L.marker([lat, lng], { icon: createCustomPin(s.category, s.id) }).addTo(map);
            
            const popupContent = `
                <div class="map-popup-container">
                    <img src="${s.image_url}" class="map-popup-img" alt="${s.name}">
                    <div class="map-popup-body">
                        <div class="map-popup-title">${s.name}</div>
                        <div class="map-popup-location"><i class="fas fa-map-marker-alt"></i> ${s.location}</div>
                        <div class="map-popup-meta">
                            <span class="rating"><i class="fas fa-star"></i> ${s.rating}</span>
                            <span class="points"><i class="fas fa-coins"></i> +${s.points_reward} pts</span>
                        </div>
                        <div class="map-popup-desc">${s.description.substring(0, 80)}...</div>
                        <button class="map-popup-btn" onclick="window.openSpotDetails(${s.id})"><i class="fas fa-info-circle"></i> View Details</button>
                    </div>
                </div>
            `;
            marker.bindPopup(popupContent, { maxWidth: 320, closeButton: true });
            marker.on('click', () => showMapSidebar(s));
            markers.push(marker);
            
            setTimeout(() => {
                const pinElement = marker.getElement();
                if (pinElement) {
                    pinElement.style.opacity = '0';
                    pinElement.style.transform = 'translateY(-20px)';
                    pinElement.style.transition = 'all 0.5s ease';
                    setTimeout(() => {
                        pinElement.style.opacity = '1';
                        pinElement.style.transform = 'translateY(0)';
                    }, 50);
                }
            }, index * 100);
        }
    });
}

function showMapSidebar(spot) {
    const sidebar = document.getElementById('map-sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');
    sidebarTitle.innerHTML = `<i class="fas fa-map-pin"></i> ${spot.name}`;
    const featuresHtml = getFeaturesArray(spot.features).map(f => `<li>${f}</li>`).join('');
    sidebarContent.innerHTML = `
        <div class="map-sidebar-content-clean">
            <div class="spot-detail-image"><img src="${spot.image_url}" alt="${spot.name}"></div>
            <h4>${spot.name}</h4>
            <div class="spot-detail-meta">
                <span><i class="fas fa-star"></i> ${spot.rating} Rating</span>
                <span><i class="fas fa-map-marker-alt"></i> ${spot.location}</span>
                <span><i class="fas fa-coins"></i> +${spot.points_reward} pts</span>
            </div>
            <p class="spot-detail-description">${spot.description}</p>
            <div class="spot-detail-features">
                <h5>What to Expect:</h5>
                <ul>${featuresHtml}</ul>
            </div>
            <div class="spot-detail-actions">
                <button class="btn-primary" onclick="window.openSpotDetails(${spot.id})"><i class="fas fa-info-circle"></i> View Full Details</button>
                <button class="btn-secondary" onclick="navigateToSpot(${spot.lat}, ${spot.lng})"><i class="fas fa-directions"></i> Navigate</button>
            </div>
        </div>
    `;
    sidebar.style.display = 'block';
}

document.getElementById('close-sidebar').addEventListener('click', () => {
    document.getElementById('map-sidebar').style.display = 'none';
    document.getElementById('sidebar-title').innerHTML = '<i class="fas fa-map-pin"></i> Select a location';
    document.getElementById('sidebar-content').innerHTML = `<div class="empty-sidebar"><i class="fas fa-map-marker-alt"></i><p>Click a pin to view details</p></div>`;
});

function navigateToSpot(lat, lng) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank'); }

// WEATHER
async function fetchWeather() {
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=16.4947&longitude=120.4594&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=Asia/Manila`);
        const data = await res.json();
        if (data && data.current) {
            const info = weatherCodeMap[data.current.weather_code] || { desc: 'Unknown', icon: 'fa-cloud', class: 'cloudy' };
            const w = document.getElementById('weather-widget'); w.className = `weather-widget ${info.class}`;
            w.innerHTML = `
                <div class="weather-content" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px;">
                    <div class="weather-main" style="display:flex; align-items:center; gap:15px;">
                        <i class="fas ${info.icon} weather-icon" style="font-size:3rem;"></i>
                        <div>
                            <div class="weather-temp" style="font-size:2.5rem; font-weight:800; color:white;">${Math.round(data.current.temperature_2m)}<small style="font-size:1.2rem;">°C</small></div>
                            <div class="weather-condition" style="color:rgba(255,255,255,0.9);">${info.desc}</div>
                            <div style="font-size:0.8rem; opacity:0.8;">Naguilian, La Union</div>
                        </div>
                    </div>
                    <div class="weather-details-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; flex:1; max-width:400px;">
                        <div class="weather-detail-item"><i class="fas fa-wind"></i><div class="w-label">Wind</div><div class="w-value">${data.current.wind_speed_10m} km/h</div></div>
                        <div class="weather-detail-item"><i class="fas fa-tint"></i><div class="w-label">Humidity</div><div class="w-value">${data.current.relative_humidity_2m}%</div></div>
                        <div class="weather-detail-item"><i class="fas fa-temperature-half"></i><div class="w-label">Feels Like</div><div class="w-value">${Math.round(data.current.apparent_temperature)}°C</div></div>
                    </div>
                </div>`;
        }
    } catch (e) { console.warn('Weather fetch failed'); }
}

// ANALYTICS
const analyticsData = {
    2025: { 'St. Michael Church': [200, 230, 250, 270, 300, 330, 350, 340, 320, 290, 260, 240], 'Naguilian River': [70, 90, 110, 130, 160, 180, 200, 190, 170, 140, 120, 100], 'Balete Tree Area': [150, 180, 200, 230, 270, 300, 330, 310, 290, 260, 240, 220], 'Public Market': [180, 210, 240, 270, 310, 340, 370, 350, 320, 280, 250, 220] },
    2026: { 'St. Michael Church': [250, 280, 300, 320, 350, 380, 400, 390, 370, 340, 310, 290], 'Naguilian River': [90, 110, 130, 150, 180, 200, 220, 210, 190, 160, 140, 120], 'Balete Tree Area': [180, 220, 250, 280, 320, 350, 380, 360, 340, 300, 280, 260], 'Public Market': [200, 240, 270, 300, 340, 370, 400, 380, 350, 310, 280, 250], 'Rice Terraces': [120, 150, 180, 210, 250, 280, 300, 290, 260, 220, 190, 160], 'Mountain Trail': [80, 100, 120, 140, 170, 200, 230, 220, 190, 150, 120, 100], 'Viewpoint': [150, 180, 210, 240, 280, 310, 340, 330, 300, 260, 230, 200], 'Heritage Sites': [100, 130, 160, 190, 220, 250, 270, 260, 240, 210, 180, 150] }
};

function initAnalytics() {
    const year = document.getElementById('analytics-year').value;
    const data = analyticsData[year] || analyticsData[2026];
    const locations = Object.keys(data); const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let total = 0; let locTotals = {}; let monthTotals = new Array(12).fill(0);
    locations.forEach(loc => { const t = data[loc].reduce((a,b)=>a+b,0); locTotals[loc]=t; total+=t; data[loc].forEach((v,i)=>monthTotals[i]+=v); });
    
    document.getElementById('total-year-visitors').textContent = total.toLocaleString();
    const sorted = Object.entries(locTotals).sort((a,b)=>b[1]-a[1]);
    document.getElementById('most-visited-place').textContent = sorted[0][0];
    document.getElementById('most-visited-count').textContent = `${sorted[0][1].toLocaleString()} visitors`;
    const peakIdx = monthTotals.indexOf(Math.max(...monthTotals));
    document.getElementById('peak-month').textContent = months[peakIdx];
    document.getElementById('peak-month-count').textContent = `${monthTotals[peakIdx].toLocaleString()} visitors`;
    
    if(monthlyChart) monthlyChart.destroy(); if(locationChart) locationChart.destroy(); if(trendChart) trendChart.destroy();
    const colors = ['#0d9488', '#f97316', '#fbbf24', '#ef4444', '#8b5cf6', '#10b981', '#ec4899', '#6366f1'];
    monthlyChart = new Chart(document.getElementById('monthlyChart').getContext('2d'), { type: 'bar', data: { labels: months, datasets: [{ data: monthTotals, backgroundColor: 'rgba(13, 148, 136, 0.7)' }] }, options: { responsive: true } });
    locationChart = new Chart(document.getElementById('locationChart').getContext('2d'), { type: 'pie', data: { labels: locations, datasets: [{ data: locations.map(l=>locTotals[l]), backgroundColor: colors }] }, options: { responsive: true } });
    trendChart = new Chart(document.getElementById('trendChart').getContext('2d'), { type: 'line', data: { labels: months, datasets: locations.map((l,i)=>({ label: l, data: data[l], borderColor: colors[i%8] })) }, options: { responsive: true } });
    
    const tbody = document.getElementById('analytics-table-body');
    tbody.innerHTML = '';
    sorted.slice(0, 8).forEach(([location, visitors], index) => {
        const percentage = ((visitors / total) * 100).toFixed(1);
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : 'rank-other';
        const trend = Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable';
        const trendIcon = trend === 'up' ? 'fa-arrow-up' : trend === 'down' ? 'fa-arrow-down' : 'fa-minus';
        const trendClass = `trend-${trend}`;
        const trendValue = trend === 'stable' ? '' : `${(Math.random() * 20 + 5).toFixed(1)}%`;
        tbody.innerHTML += `<tr><td><span class="rank-badge ${rankClass}">${index + 1}</span></td><td><strong>${location}</strong></td><td>${visitors.toLocaleString()}</td><td><span>${percentage}%</span><div class="progress-bar"><div class="progress-fill" style="width: ${percentage}%"></div></div></td><td class="${trendClass}"><i class="fas ${trendIcon}"></i> ${trendValue}</td></tr>`;
    });
}
document.getElementById('analyze-btn').addEventListener('click', () => { showNotification('Refreshed!'); initAnalytics(); });
document.getElementById('analytics-year').addEventListener('change', () => initAnalytics());

// ==================== SUPER INTELLIGENT AI CHATBOT ====================
class NaguilianAI {
    constructor() { this.context = { lastTopic: null, userPreferences: [], conversationHistory: [] }; }
    
    analyzeIntent(question) {
        const q = question.toLowerCase();
        
        // Specific Fact Matching
        if (q.includes('history') || q.includes('when was') || q.includes('founded') || q.includes('old')) return { type: 'fact', key: 'history' };
        if (q.includes('where') || q.includes('location') || q.includes('border') || q.includes('geography')) return { type: 'fact', key: 'geography' };
        if (q.includes('culture') || q.includes('tradition') || q.includes('weaving') || q.includes('abel') || q.includes('festival')) return { type: 'fact', key: 'culture' };
        if (q.includes('food') || q.includes('eat') || q.includes('delicacy') || q.includes('bagnet') || q.includes('empanada')) return { type: 'fact', key: 'food' };
        
        // Specific Spot Matching
        if (q.includes('church') || q.includes('saint') || q.includes('michael')) return { type: 'spot_info', key: 'church' };
        if (q.includes('river') || q.includes('kayak') || q.includes('rafting')) return { type: 'spot_info', key: 'river' };
        if (q.includes('weav') || q.includes('textile') || q.includes('abel')) return { type: 'spot_info', key: 'weaving' };
        if (q.includes('view') || q.includes('sunrise') || q.includes('saoay')) return { type: 'spot_info', key: 'viewpoint' };
        if (q.includes('market') || q.includes('shop') || q.includes('empanada')) return { type: 'spot_info', key: 'market' };
        
        // Standard Categories
        if (q.match(/\d+\s*hour|quick|short|rush|brief/)) return { type: 'time_recommendation', duration: 'short' };
        if (q.includes('half day') || q.includes('4 hour')) return { type: 'time_recommendation', duration: 'half_day' };
        if (q.includes('full day') || q.includes('whole day')) return { type: 'time_recommendation', duration: 'full_day' };
        if (q.includes('weekend') || q.includes('2 day')) return { type: 'time_recommendation', duration: 'weekend' };
        if (q.includes('rain') || q.includes('rainy') || q.includes('wet')) return { type: 'weather_recommendation', condition: 'rainy' };
        if (q.includes('sunny') || q.includes('hot') || q.includes('clear')) return { type: 'weather_recommendation', condition: 'sunny' };
        if (q.includes('cold') || q.includes('cool')) return { type: 'weather_recommendation', condition: 'cool' };
        if (q.includes('adventure') || q.includes('hike') || q.includes('thrill')) return { type: 'interest', category: 'adventure' };
        if (q.includes('nature') || q.includes('relax') || q.includes('peaceful')) return { type: 'interest', category: 'nature' };
        if (q.includes('photo') || q.includes('picture') || q.includes('instagram')) return { type: 'interest', category: 'photography' };
        if (q.includes('family') || q.includes('kids') || q.includes('children')) return { type: 'interest', category: 'family' };
        if (q.includes('couple') || q.includes('romantic') || q.includes('date')) return { type: 'interest', category: 'romantic' };
        if (q.includes('group') || q.includes('friends') || q.includes('barkada')) return { type: 'interest', category: 'group' };
        if (q.includes('souvenir') || q.includes('pasalubong') || q.includes('gift') || q.includes('buy')) return { type: 'shopping' };
        if (q.includes('craft') || q.includes('handmade')) return { type: 'shopping', subcategory: 'crafts' };
        if (q.includes('cheap') || q.includes('budget') || q.includes('affordable') || q.includes('free')) return { type: 'budget' };
        for (let spotName in naguilianKnowledge.spots) { if (q.includes(spotName)) return { type: 'specific_spot', spot: spotName }; }
        for (let prodName in naguilianKnowledge.products) { if (q.includes(prodName)) return { type: 'specific_product', product: prodName }; }
        if (q.includes('when') || q.includes('time') || q.includes('schedule') || q.includes('hours')) return { type: 'timing_info' };
        if (q.includes('how much') || q.includes('cost') || q.includes('price') || q.includes('fee')) return { type: 'pricing_info' };
        if (q.includes('ticket') || q.includes('redeem') || q.includes('points') || q.includes('reward')) return { type: 'points_tickets' };
        if (q.includes('weather') || q.includes('temperature') || q.includes('climate')) return { type: 'weather_info' };
        if (q.includes('safety') || q.includes('safe')) return { type: 'safety' };
        if (q.includes('contact') || q.includes('phone') || q.includes('email')) return { type: 'contact' };
        if (q.includes('total') || q.includes('visitor') || q.includes('statistics')) return { type: 'admin_stats' };
        if (q.includes('popular') || q.includes('top') || q.includes('best')) return { type: 'admin_popular' };
        if (q.includes('month') || q.includes('peak')) return { type: 'admin_peak' };
        if (q.includes('hello') || q.includes('hi') || q.includes('hey')) return { type: 'greeting' };
        if (q.includes('thank')) return { type: 'thanks' };
        if (q.includes('bye') || q.includes('goodbye')) return { type: 'goodbye' };
        if (q.includes('help') || q.includes('what can you')) return { type: 'help' };
        return { type: 'general' };
    }

    generateResponse(intent, question) {
        switch(intent.type) {
            case 'fact': return `📚 **About Naguilian:**\n\n${naguilianFacts[intent.key]}\n\nIs there anything else you'd like to know about our town?`;
            case 'spot_info': return `📍 **Spot Details:**\n\n${naguilianFacts.spots[intent.key]}\n\nWould you like to see this on the map?`;
            case 'greeting': return "👋 Kumusta! Welcome to Naguilian, La Union! I'm your local tourism AI guide. I know everything about our beautiful town - from our rich history and Abel Iloco weaving to the best spots for Bagnet and Empanadas. What would you like to know?";
            case 'thanks': return "🙏 You're very welcome! Enjoy your visit to Naguilian! Feel free to ask me anything else about our town.";
            case 'goodbye': return "👋 Goodbye! Have an amazing time exploring Naguilian, La Union! Come back anytime you need tourism information.";
            case 'help': return "🤖 I'm your comprehensive Naguilian Tourism AI! I can help with:\n\n• **Town Info:** History, geography, culture, and festivals\n• **Trip Planning:** Itineraries for any duration\n• **Spot Recommendations:** Based on your interests\n• **Food Guide:** Local delicacies and where to find them\n• **Weather Advice:** Best activities for any condition\n• **Shopping:** Souvenirs and local products\n• **Points & Tickets:** How to earn and redeem\n\nJust ask naturally! Try: 'Tell me about the history' or 'Where can I buy Abel Iloco?'";
            case 'time_recommendation': return this.getTimeRecommendation(intent.duration);
            case 'weather_recommendation': return this.getWeatherRecommendation(intent.condition);
            case 'interest': return this.getInterestRecommendation(intent.category, question);
            case 'shopping': return this.getShoppingRecommendation(intent.subcategory);
            case 'budget': return this.getBudgetRecommendation();
            case 'specific_spot': return this.getSpotDetails(intent.spot);
            case 'specific_product': return this.getProductDetails(intent.product);
            case 'timing_info': return "🕐 **Best Times to Visit Naguilian:**\n\n**By Season:**\n• **Dry Season (Nov-May):** Best for hiking, river activities, and outdoor photography.\n• **Wet Season (Jun-Oct):** Good for visiting the Weaving Center, Church, and enjoying hot local food.\n• **Cool Season (Dec-Feb):** Perfect for all activities, especially hiking (18-25°C).\n\n**By Time of Day:**\n• **Sunrise (5-7AM):** Best at Naguilian Viewpoint.\n• **Morning (8-11AM):** Perfect for Mountain Trail hike or Public Market.\n• **Midday (12-2PM):** Good for food tours and Church visits.\n• **Afternoon (3-5PM):** Ideal for Rice Terraces walks.\n• **Evening (5-7PM):** Great for River activities or relaxing at Balete Tree Area.";
            case 'pricing_info': return "💵 **Costs in Naguilian:**\n\n**Entrance:** Most spots are FREE to visit! You earn 30-100 points by scanning QR codes.\n\n**Local Food:**\n• Tupig (Grilled Rice Cake): ₱15\n• Ilocano Empanada: ₱25\n• Pinakbet (Vegetable Stew): ₱120\n• Ilocano Longganisa: ₱180\n• Bagnet (Crispy Pork): ₱350\n\n**Souvenirs:**\n• Small Bamboo Crafts: 50-150\n• Local Honey: ₱250\n• Abel Iloco Textile: ₱1,500\n\n**Points System:**\n• 500 pts = Free Water Bottle\n• 5,000 pts = Free Local Trip";
            case 'points_tickets': return "🎟️ **Points & Tickets System:**\n\n**How to Earn:**\n• Visit tourist spots and SCAN the QR codes placed there (30-100 pts each).\n• Total possible: 465 points from all 8 major spots!\n\n**How to Redeem:**\n1. Click 'Redeem Points' in the sidebar.\n2. Choose your reward.\n3. Show the generated QR code at the Naguilian Tourism Office.\n\n**Available Rewards:**\n• Water Bottle - 500 pts\n• Local Trip - 5,000 pts\n\n**Ticket Items:**\n• Museum Entry - 200 pts\n• Cultural Show - 500 pts\n• Boat Ride - 400 pts\n• Food Tasting - 350 pts\n• Photo Session - 600 pts\n• Guided Tour - 800 pts\n• Souvenir Pack - 1,000 pts\n• Festival VIP - 1,500 pts";
            case 'weather_info': return "🌤️ **Naguilian Weather Guide:**\n\n**Climate:** Tropical with two distinct seasons.\n• **Dry Season:** November to May (25-32°C). Best for hiking and river activities.\n• **Wet Season:** June to October (24-30°C). Good for indoor cultural tours and hot local food.\n• **Cool Season:** December to February (18-25°C). Perfect for all outdoor activities.\n\nCheck the Map page for live weather updates including temperature, wind speed, humidity, and 'feels like' temperature!";
            case 'safety': return "⚠️ **Safety Tips for Naguilian:**\n\n• Naguilian is a very safe and welcoming municipality.\n• Professional guides are available for adventure spots like the Mountain Trail and River.\n• First aid stations are located at major attractions.\n• **For Hiking:** Bring plenty of water, sunscreen, and wear good shoes. Check the weather before going.\n• **For River Activities:** Always wear life jackets and listen to guides.\n• Keep valuables secure and use hotel safes.\n• Emergency contacts are available at the Tourism Office in Town Proper.";
            case 'contact': return "📞 **Contact Naguilian Tourism:**\n\n• **Tourism Office:** Located in Town Proper, open Mon-Fri 8AM-5PM.\n• **AI Chat:** That's me! Available 24/7 for instant answers.\n• **Map Page:** Check for live weather updates.\n• **Emergency:** Local authorities are present at all major tourist spots.";
            case 'admin_stats': return "📊 **2026 Tourism Statistics:**\n\n• **Total Visitors:** 12,489 (+12.5% from last year)\n• **Total Attractions:** 8 major spots\n• **Points Collected by Tourists:** 45,670\n• **Most Popular Spot:** St. Michael Church (3,900 visitors)\n• **Peak Month:** July-August (Summer Vacation)";
            case 'admin_popular': return "🏆 **Top 5 Most Visited Spots:**\n\n1. **St. Michael Church** - 3,900 visitors (Cultural favorite)\n2. **Public Market** - 3,690 visitors (Food & Culture)\n3. **Balete Tree Area** - 3,480 visitors (Nature & Peace)\n4. **Naguilian Viewpoint** - 2,880 visitors (Photography)\n5. **Rice Terraces** - 2,640 visitors (Heritage)";
            case 'admin_peak': return "📈 **Peak Visitor Analysis:**\n\n• **Peak Months:** July-August (3,000+ visitors during summer vacation), December-January (2,800+ during cool season & festivals).\n• **Low Season:** February, September-October.\n• **Peak Days:** Weekends see 40% more traffic. Holidays see 60% more.\n• **Best Days to Visit:** Saturday and Sunday for the full festival atmosphere, or weekdays for a peaceful experience.";
            default: return this.getGeneralResponse(question);
        }
    }

    getTimeRecommendation(duration) {
        const recs = {
            short: "⏰ **Perfect 2-Hour Naguilian Itinerary:**\n\n1. **St. Michael Church** (30 mins) - Historic Spanish-era church in Poblacion.\n2. **Public Market** (1 hour) - Try authentic Bagnet and Empanada.\n3. **Heritage Sites** (30 mins) - Quick cultural tour.\n\n*Tip: Start early to avoid the midday heat!*",
            half_day: "🌅 **Perfect Half-Day (4-5 Hours):**\n\n1. **Balete Tree Area** (2 hours) - Peaceful nature walk.\n2. **Lunch at Public Market** (1 hour) - Enjoy local Ilocano food.\n3. **Rice Terraces** (1.5 hours) - Scenic views and photography.\n4. **Heritage Sites** (30 mins) - Cultural experience.\n\n*Bring: Water, comfortable shoes, and your camera!*",
            full_day: "🗓️ **Ultimate Full Day Naguilian Experience:**\n\n**Morning:** Naguilian Viewpoint sunrise → Mountain Trail hike.\n**Lunch:** Public Market local food feast.\n**Afternoon:** Balete Tree Area → Rice Terraces → Heritage Sites.\n**Evening:** St. Michael Church → Dinner at local restaurant.\n\n*Pro tip: Start by 5AM to maximize your day!*",
            weekend: "🎉 **Perfect Weekend Getaway:**\n\n**Day 1 - Nature & Adventure:** Viewpoint → Mountain Trail → Balete Tree Area → Local food dinner.\n**Day 2 - Culture & Shopping:** St. Michael Church → Heritage Sites → Public Market → River activities → Buy Abel Iloco souvenirs.\n\n*Book accommodations in Town Proper for easy access!*"
        };
        return recs[duration] || recs.short;
    }

    getWeatherRecommendation(condition) {
        const recs = {
            rainy: "️ **Rainy Day Activities in Naguilian:**\n\n• **Heritage Sites** - Explore indoor historical exhibits.\n• **St. Michael Church** - A peaceful historical shelter with beautiful architecture.\n• **Public Market** - Enjoy hot local food like Pinakbet and soup.\n• **Weaving Center** - Watch artisans create Abel Iloco textiles indoors.\n\n*The Naguilian River is also extra exciting during light rain!*",
            sunny: "☀️ **Perfect Sunny Day in Naguilian:**\n\n• **Viewpoint** - Best visibility for panoramic photos.\n• **Mountain Trail** - Great mountain views and fresh air.\n• **Balete Tree Area** - Perfect for a nature walk under the shade.\n• **Rice Terraces** - Scenic photography.\n• **River** - Water activities like kayaking.\n\n*Don't forget sunscreen and plenty of water!*",
            cool: "❄️ **Cool Weather (Dec-Feb) in Naguilian:**\n\n• **Rice Terraces** - Perfect hiking weather.\n• **Mountain Trail** - Crisp mountain air and excellent visibility.\n• **Balete Tree Area** - Peaceful walk in cool breeze.\n• **Public Market** - Enjoy hot local food like Bagnet and Empanada.\n\n*Temperature ranges from 18-25°C. Perfect for all outdoor activities!*"
        };
        return recs[condition] || recs.sunny;
    }

    getInterestRecommendation(category, question) {
        const recs = {
            food: "️ **Must-Try Naguilian Food:**\n\n• **Bagnet** (₱350) - Famous Ilocano crispy pork belly.\n• **Ilocano Empanada** (25) - Crispy orange wrapper with egg and papaya.\n• **Pinakbet** (₱120) - Traditional vegetable stew with bagoong.\n• **Longganisa** (₱180) - Garlicky Ilocano sausage.\n• **Tupig** (₱15) - Sweet grilled rice cake.\n\n*Best place to eat: Naguilian Public Market (go early morning)!*",
            adventure: "🧗 **Adventure Activities in Naguilian:**\n\n• **Mountain Trail** ⭐4.9 - Thrilling hike with breathtaking views (100 pts).\n• **Naguilian River** ⭐4.7 - Kayaking and rafting (50 pts).\n\n*Bring: Water, sunscreen, good hiking shoes, and a camera!*",
            nature: "🌿 **Nature Spots in Naguilian:**\n\n• **Balete Tree Area** ⭐4.8 - Ancient trees and peaceful environment (50 pts).\n• **Rice Terraces** ⭐4.7 - Agricultural heritage and scenic views (60 pts).\n• **Viewpoint** ⭐4.9 - Panoramic mountain views (60 pts).",
            culture: "🏛️ **Cultural Experiences in Naguilian:**\n\n• **St. Michael Church** ⭐4.6 - Spanish-era architecture (30 pts).\n• **Heritage Sites** ⭐4.6 - Local history and traditions (35 pts).\n• **Public Market** ⭐4.5 - Authentic Ilocano food culture (40 pts).\n• **Weaving Center** - Watch Abel Iloco being made.",
            photography: "📸 **Best Photo Spots in Naguilian:**\n\n• **Viewpoint** - 5-7AM for golden hour sunrise shots.\n• **Mountain Trail** - Rugged mountain landscapes.\n• **St. Michael Church** - Historical colonial architecture.\n• **Rice Terraces** - Natural beauty and green fields.",
            family: "👨‍👩‍👧‍👦 **Family-Friendly Spots:**\n\n• **Balete Tree Area** - Safe and peaceful for kids.\n• **Rice Terraces** - Easy walks and educational.\n• **St. Michael Church** - Quiet and respectful environment.\n• **Public Market** - Fun food experience for the whole family.",
            romantic: "💕 **Romantic Spots for Couples:**\n\n• **Viewpoint** - Watch the sunrise together.\n• **Balete Tree Area** - Peaceful walks under ancient trees.\n• **Rice Terraces** - Scenic views perfect for photos.\n• **Public Market** - Share authentic local food.",
            group: " **Group Activities:**\n\n• **River** - Team kayaking and rafting.\n• **Mountain Trail** - Group hiking adventure.\n• **Public Market** - Food tasting tour together.\n• **Rice Terraces** - Group photos and nature walks."
        };
        return recs[category] || recs.food;
    }

    getShoppingRecommendation(subcategory) {
        if (subcategory === 'crafts') {
            return "🧵 **Naguilian Crafts & Souvenirs:**\n\n• **Abel Iloco Textile** - ₱1,500 (Traditional handwoven fabric)\n• **Bamboo Crafts** - ₱50-500 (Eco-friendly items)\n• **Wooden Carvings** - 150-800\n\n*Shop at: Heritage Sites and Public Market!*";
        }
        return "🛍️ **Best Souvenirs from Naguilian:**\n\n• **Abel Iloco Textile** - ₱1,500\n• **Bamboo Crafts** - ₱150\n• **Local Honey** - ₱250\n• **Longganisa** - ₱180 (Vacuum-packed for travel)\n\n*Shop at: Public Market and Heritage Sites!*";
    }

    getBudgetRecommendation() {
        return "💰 **Budget-Friendly Naguilian Guide:**\n\n**Free Activities:** Church, Rice Terraces, Viewpoint (just scan QR to earn points!).\n**Affordable Food:** Tupig ₱15, Empanada ₱25, Pinakbet ₱120.\n**Budget Souvenirs:** Small bamboo crafts ₱50-100.\n\n**Budget Itinerary (~₱500):** Visit free spots + Eat Empanada & Pinakbet + Buy small crafts!";
    }

    getSpotDetails(spotName) {
        const spot = naguilianKnowledge.spots[spotName];
        if (!spot) return "I couldn't find that specific spot. Try asking about: St. Michael Church, Naguilian River, Balete Tree Area, Public Market, Rice Terraces, Heritage Sites, Mountain Trail, or Viewpoint.";
        return `📍 **${spot.name}**\n\n**Location:** ${spot.location}\n**Rating:** ⭐ ${spot.rating}/5\n**Points:** ${spot.points}\n**Category:** ${spot.category}\n**Difficulty:** ${spot.difficulty}\n**Duration:** ${spot.duration}\n\n**Description:** ${spot.description}\n\n**Features:**\n${spot.features.map(f => `• ${f}`).join('\n')}\n\n**Best Time:** ${spot.bestTime}\n**Tips:** ${spot.tips}\n\n**Family Friendly:** ${spot.familyFriendly ? 'Yes ✅' : 'No ⚠️'}`;
    }

    getProductDetails(productName) {
        const product = naguilianKnowledge.products[productName];
        if (!product) return "I couldn't find that product. Try asking about: Empanada, Bagnet, Abel Iloco, Bamboo Crafts, Local Honey, Tupig, Longganisa, or Pinakbet.";
        return `🛍️ **${product.name}**\n\n**Price:** ₱${product.price.toLocaleString()}\n**Rating:** ⭐ ${product.rating}/5\n**Location:** ${product.location}\n**Category:** ${product.category}\n\n**Description:** ${product.description}\n\n**Features:**\n${product.features.map(f => `• ${f}`).join('\n')}`;
    }

    getGeneralResponse(q) {
        if (q.includes('spot') || q.includes('place') || q.includes('visit')) return "🏞️ **Popular Spots in Naguilian:**\n\n**Nature:** Balete Tree Area, Rice Terraces, Viewpoint\n**Adventure:** Mountain Trail, River\n**Culture:** St. Michael Church, Heritage Sites, Public Market\n\nWhich type interests you? I can give you detailed recommendations!";
        if (q.includes('food') || q.includes('eat') || q.includes('restaurant')) return "🍽️ **Local Food Guide:** Bagnet (₱350), Empanada (₱25), Pinakbet (120), Longganisa (₱180), Tupig (₱15). Best at Naguilian Public Market!";
        return "🤖 I'm here to help with anything about Naguilian tourism! I know about our history, culture, food, spots, and events. Ask me things like:\n\n• 'Tell me about the history'\n• 'Where can I buy Abel Iloco?'\n• 'What to do if it rains?'\n• 'Best food in Naguilian?'";
    }
}

const ai = new NaguilianAI();

function processAIQuestion(q) {
    const intent = ai.analyzeIntent(q);
    return ai.generateResponse(intent, q);
}

function addChatMessage(msg, isUser) {
    const div = document.createElement('div'); div.className = `chat-message ${isUser?'user':'ai'}`;
    div.innerHTML = `<div class="message-avatar"><i class="fas fa-${isUser?'user':'robot'}"></i></div><div class="message-content"><p>${msg.replace(/\n/g, '<br>')}</p><span class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>`;
    const c = document.getElementById('chat-messages'); c.appendChild(div); c.scrollTop = c.scrollHeight;
}

document.getElementById('send-chat-btn').addEventListener('click', () => {
    const input = document.getElementById('chat-input'); const msg = input.value.trim(); if(!msg) return;
    addChatMessage(msg, true); input.value = '';
    setTimeout(() => addChatMessage(processAIQuestion(msg), false), 800);
});
document.getElementById('chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('send-chat-btn').click(); });

document.getElementById('ai-chat-btn').addEventListener('click', () => {
    const panel = document.getElementById('ai-chat-panel'); panel.classList.toggle('active');
    if (panel.classList.contains('active')) {
        const suggestions = currentUser?.role === 'admin' 
            ? ['Total visitors?', 'Most popular spot?', 'Peak month?', 'Tell me about the history']
            : ['Best for 2 hours?', 'Rainy day activities?', 'Family spots?', 'Local food?', 'How to earn points?', 'Where to buy Abel Iloco?'];
        const sugContainer = document.getElementById('chat-suggestions'); sugContainer.innerHTML = '';
        suggestions.forEach(s => {
            const chip = document.createElement('div'); chip.className = 'suggestion-chip'; chip.textContent = s;
            chip.addEventListener('click', () => { document.getElementById('chat-input').value = s; document.getElementById('send-chat-btn').click(); });
            sugContainer.appendChild(chip);
        });
    }
});
document.getElementById('close-chat-panel').addEventListener('click', () => document.getElementById('ai-chat-panel').classList.remove('active'));

function updateNotificationBadge() {
    const unread = adminNotifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-count'); badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none';
}
document.getElementById('notification-bell').addEventListener('click', () => {
    if (adminNotifications.length === 0) return showNotification('No notifications');
    showNotification(adminNotifications[adminNotifications.length-1].message);
    adminNotifications.forEach(n => n.read = true); updateNotificationBadge();
});

function addToActivity(text, time) {
    const list = document.getElementById('activity-list');
    const item = document.createElement('div'); item.className = 'activity-item'; item.innerHTML = `<p>${text}</p><small>${time}</small>`;
    list.insertBefore(item, list.firstChild);
    const items = list.querySelectorAll('.activity-item');
    for (let i = 1; i < items.length; i++) { if (items[i].querySelector('p').textContent === items[i-1].querySelector('p').textContent) items[i].remove(); }
    while (list.children.length > 5) list.removeChild(list.lastChild);
}

window.addEventListener('DOMContentLoaded', () => { loadDatabase(); addToActivity('System initialized', 'Today'); setInterval(fetchWeather, 600000); });