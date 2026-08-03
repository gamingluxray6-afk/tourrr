// Global variables
let currentUser = null;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const closeLogin = document.getElementById('closeLogin');
const closeSignup = document.getElementById('closeSignup');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const loginSubmit = document.getElementById('login-submit');
const signupSubmit = document.getElementById('signup-submit');
const analyzeBtn = document.getElementById('analyze-btn');
const notification = document.getElementById('notification');
const navigationMenu = document.getElementById('navigation-menu');
const pageContents = document.querySelectorAll('.page-content');
const actionButtons = document.querySelectorAll('.action-btn');
const userNameElement = document.getElementById('user-name');
const userRoleElement = document.getElementById('user-role');
const pointsCountElement = document.getElementById('points-count');

// Navigation Elements
const navLinks = document.querySelectorAll('nav a');
const dashboardLink = document.querySelector('nav a[data-page="dashboard"]');
const recordsLink = document.querySelector('nav a[data-page="records"]');
const analyticsLink = document.querySelector('nav a[data-page="analytics"]');
const mapLink = document.querySelector('nav a[data-page="map"]');
const settingsLink = document.querySelector('nav a[data-page="settings"]');

// Page Views
const dashboardView = document.getElementById('dashboard-view');
const recordsView = document.getElementById('records-view');
const analyticsView = document.getElementById('analytics-view');
const mapView = document.getElementById('map-view');
const settingsView = document.getElementById('settings-view');

// Action Buttons
const addRecordBtn = document.getElementById('add-record-btn');
const analyticsBtn = document.getElementById('analytics-btn');
const exploreBtn = document.getElementById('explore-btn');
const redeemBtn = document.getElementById('redeem-btn');

// User data
const users = [
    { email: 'admin@naguilan.gov', password: 'admin123', name: 'Admin User', role: 'admin', points: 0 },
    { email: 'john@tourist.com', password: 'tourist123', name: 'John Tourist', role: 'tourist', points: 1250 }
];

// Show Login Form
function showLoginForm() {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
}

// Show Signup Form
function showSignupForm() {
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
}

// Close Forms
function closeForms() {
    loginForm.classList.remove('active');
    signupForm.classList.remove('active');
}

// Show Notification
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Switch to specific page
function showPage(pageId) {
    // Hide all pages
    pageContents.forEach(page => {
        page.classList.remove('active');
    });
    
    // Remove active class from all nav links
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${pageId}-view`).classList.add('active');
    
    // Highlight selected nav link
    document.querySelector(`nav a[data-page="${pageId}"]`).classList.add('active');
    
    // Handle admin-only content
    if (currentUser && currentUser.role !== 'admin' && pageId === 'analytics') {
        showNotification('Access denied: Admin privileges required');
        showPage('dashboard');
    }
}

// Update UI based on user role
function updateUserUI() {
    if (!currentUser) return;
    
    userNameElement.textContent = currentUser.name;
    userRoleElement.textContent = currentUser.role === 'admin' ? 'Administrator' : 'Tourist Guide';
    pointsCountElement.textContent = currentUser.points;
    
    // Show/hide analytics based on user role
    if (currentUser.role === 'admin') {
        analyticsLink.style.display = 'block';
        analyticsBtn.style.display = 'flex';
    } else {
        analyticsLink.style.display = 'none';
        analyticsBtn.style.display = 'none';
    }
}

// Event Listeners for Navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('data-page');
        showPage(pageId);
    });
});

// Event Listeners for Action Buttons
addRecordBtn.addEventListener('click', () => {
    showNotification('Add record form opened');
});

analyticsBtn.addEventListener('click', () => {
    if (currentUser && currentUser.role === 'admin') {
        showPage('analytics');
    } else {
        showNotification('Admin access required for analytics');
    }
});

exploreBtn.addEventListener('click', () => {
    showPage('map');
});

redeemBtn.addEventListener('click', () => {
    showNotification('Redeem points feature activated');
});

// Form Event Listeners
closeLogin.addEventListener('click', closeForms);
closeSignup.addEventListener('click', closeForms);
showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    showSignupForm();
});
showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
});

loginSubmit.addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Find user in users array
    const user = users.find(u => u.email === email && u.password === password);
    
    if(user) {
        currentUser = user;
        updateUserUI();
        showNotification(`Welcome back, ${user.name}!`);
        closeForms();
        
        // Show dashboard after login
        setTimeout(() => {
            showPage('dashboard');
        }, 500);
    } else {
        showNotification('Invalid credentials. Try john@tourist.com / tourist123 or admin@naguilan.gov / admin123');
    }
});

signupSubmit.addEventListener('click', () => {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;
    
    if(name && email && password && confirm) {
        if(password === confirm) {
            // Add new user (in real app, this would go to server)
            users.push({
                email: email,
                password: password,
                name: name,
                role: 'tourist',
                points: 0
            });
            
            showNotification('Account created successfully! Please log in.');
            closeForms();
        } else {
            showNotification('Passwords do not match');
        }
    } else {
        showNotification('Please fill in all fields');
    }
});

analyzeBtn.addEventListener('click', () => {
    if (currentUser && currentUser.role === 'admin') {
        const period = document.getElementById('time-period').value;
        const year = document.getElementById('year-select').value;
        showNotification(`Analytics generated for ${period} (${year})`);
    } else {
        showNotification('Admin access required for analytics');
    }
});

// Simulate loading
window.addEventListener('load', () => {
    // Show login form by default
    showLoginForm();
});

// Initialize Chart (simulated)
document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('analytics-chart').getContext('2d');
    
    // Simple bar chart simulation
    const chartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [{
            label: 'Tourist Visits',
            data: [1200, 1900, 1500, 1800, 2200, 2500, 2800, 2600, 2400, 2000, 1800, 2100],
            backgroundColor: 'rgba(58, 134, 255, 0.7)',
            borderColor: 'rgba(58, 134, 255, 1)',
            borderWidth: 1
        }]
    };
    
    // Create a simple bar chart representation
    const canvas = document.getElementById('analytics-chart');
    const ctx2 = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Draw chart background
    ctx2.fillStyle = '#f8f9fa';
    ctx2.fillRect(0, 0, width, height);
    
    // Draw bars
    const barCount = 12;
    const barWidth = width / barCount * 0.8;
    const spacing = (width - (barCount * barWidth)) / (barCount + 1);
    const maxValue = Math.max(...chartData.datasets[0].data);
    
    for (let i = 0; i < barCount; i++) {
        const value = chartData.datasets[0].data[i];
        const barHeight = (value / maxValue) * (height - 50);
        const x = spacing + i * (barWidth + spacing);
        const y = height - barHeight - 20;
        
        // Draw bar
        ctx2.fillStyle = '#3a86ff';
        ctx2.fillRect(x, y, barWidth, barHeight);
        
        // Draw label
        ctx2.fillStyle = '#666';
        ctx2.font = '12px Arial';
        ctx2.textAlign = 'center';
        ctx2.fillText(chartData.labels[i], x + barWidth/2, height - 5);
        
        // Draw value on top of bar
        ctx2.fillStyle = '#333';
        ctx2.fillText(value.toString(), x + barWidth/2, y - 5);
    }
    
    // Draw title
    ctx2.fillStyle = '#333';
    ctx2.font = 'bold 16px Arial';
    ctx2.textAlign = 'center';
    ctx2.fillText('Tourist Visits Throughout the Year', width/2, 20);
});