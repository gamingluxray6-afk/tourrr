let currentUser = null;
let currentSpotId = null, currentProductId = null;
let myTickets = [], adminNotifications = [];
let map = null, markers = [], currentMapFilter = 'all';
let monthlyChart = null, locationChart = null, trendChart = null;
let dbSpots = [], dbProducts = [], dbRecords = [], dbTicketItems = [];
let currentSpotRating = 0, currentProductRating = 0;
let qrScanner = null;

const NAGUILIAN_CENTER = [16.5314, 120.3941];
const NAGUILIAN_BOUNDS = [[16.43, 120.30], [16.66, 120.50]];

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
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dbCategories = [
    { slug: 'nature', name: 'Nature', icon: 'fa-leaf', color: '#10b981', spots: 0 },
    { slug: 'adventure', name: 'Adventure', icon: 'fa-person-hiking', color: '#ef4444', spots: 0 },
    { slug: 'cultural', name: 'Cultural', icon: 'fa-landmark', color: '#f59e0b', spots: 0 },
];
function catInfo(slug) {
    return dbCategories.find(c => c.slug === slug)
        || { slug: slug || 'other', name: slug ? String(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Other', icon: 'fa-map-pin', color: '#64748b' };
}
const catName = slug => catInfo(slug).name;
function catBadge(slug, extra = '') {
    const c = catInfo(slug);
    return `<span class="mp-cat ${extra}" style="background:${c.color}1f;color:${c.color}"><i class="fas ${esc(c.icon)}"></i> ${esc(c.name)}</span>`;
}
function catOptions(selected) {
    return dbCategories.map(c => `<option value="${esc(c.slug)}"${c.slug === selected ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
}
async function loadCategories() {
    try { const d = await (await fetch('api/categories_api.php')).json(); if (d.success && d.categories.length) dbCategories = d.categories; } catch (e) {}
}

function featuresHTML(str) { return getFeaturesArray(str).filter(Boolean).map(f => `<li>${esc(f)}</li>`).join(''); }
function reviewsHTML(reviews) {
    if (!reviews.length) return '<p class="dx-empty">No reviews yet. Be the first to leave one.</p>';
    return reviews.map(r => {
        const d = r.created_at ? new Date(String(r.created_at).replace(' ', 'T')) : null;
        const ds = d && !isNaN(d) ? d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        const mine = currentUser && r.user_id == currentUser.id;
        return `<div class="dx-rev${mine ? ' is-mine' : ''}"><div class="dx-av">${esc((r.user_name || '?').charAt(0).toUpperCase())}</div><div><div class="dx-rev-top"><span class="dx-rev-name">${esc(r.user_name)}${mine ? ' <em class="dx-you">You</em>' : ''}</span><span class="dx-rev-stars">${getStarsHTML(r.rating)}</span><span class="dx-rev-date">${ds}</span></div><p>${esc(r.comment)}</p>${r.admin_reply ? `<div class="dx-reply"><strong>Admin reply:</strong> ${esc(r.admin_reply)}</div>` : ''}</div></div>`;
    }).join('');
}
async function loadReviewsInto(listId, type, id) {
    const list = document.getElementById(listId); list.innerHTML = '<p class="dx-empty">Loading reviews...</p>';
    try {
        const res = await fetch(`api/get_data.php?type=reviews&item_type=${type}&item_id=${id}`);
        const reviews = await res.json();
        reviews.sort((a, b) => (currentUser && b.user_id == currentUser.id) - (currentUser && a.user_id == currentUser.id));
        list.innerHTML = reviewsHTML(reviews);
        const sum = document.getElementById(`${type}-rating-summary`);
        if (sum) { sum.innerHTML = ratingSummaryHTML(reviews); sum.hidden = !reviews.length; }
        fillMyReview(type, reviews);
    }
    catch (e) { list.innerHTML = '<p class="dx-empty">Could not load reviews.</p>'; }
}
function fillMyReview(type, reviews) {
    const mine = currentUser ? reviews.find(r => r.user_id == currentUser.id) : null;
    const rating = mine ? parseInt(mine.rating) || 0 : 0;
    if (type === 'spot') currentSpotRating = rating; else currentProductRating = rating;
    document.querySelectorAll(`#${type}-star-input i`).forEach((st, i) => st.classList.toggle('active', i < rating));
    document.getElementById(`${type}-comment-input`).value = mine ? (mine.comment || '') : '';
    document.getElementById(`submit-${type}-review`).textContent = mine ? 'Update review' : 'Post review';
    const compose = document.getElementById(`${type}-comment-input`).closest('.dx-compose');
    let note = compose.querySelector('.dx-mine-note');
    if (!note) { note = document.createElement('p'); note.className = 'dx-mine-note'; compose.prepend(note); }
    note.innerHTML = '<i class="fas fa-pen"></i> You already reviewed this place. Posting again updates your review.';
    note.hidden = !mine;
}
async function compressImage(file, maxSide = 1280, quality = 0.82) {
    try {
        const bmp = await createImageBitmap(file);
        const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', quality);
    } catch (e) { return fileToBase64(file); }
}
function fileToBase64(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve(r.result); r.onerror = reject; }); }

async function loadDatabase() {
    try {
        const [s, p, r, t] = await Promise.all([fetch('api/get_data.php?type=spots'), fetch('api/get_data.php?type=products'), fetch('api/get_data.php?type=records'), fetch('api/get_data.php?type=ticket_items'), loadCategories(), loadStores()]);
        dbSpots = await s.json(); dbProducts = await p.json(); dbRecords = await r.json(); dbTicketItems = await t.json();
        document.getElementById('dash-attractions-count').textContent = dbSpots.length;
        document.getElementById('dash-visitors').textContent = dbRecords.reduce((a, r) => a + (parseInt(r.visitors) || 0), 0).toLocaleString();
        try { const st = await (await fetch('api/get_data.php?type=stats')).json(); document.getElementById('dash-points-total').textContent = (st.points || 0).toLocaleString(); } catch (e) {}
        renderTouristSpots(); renderProducts(); renderRecords(); renderDashSpots();
        const mv = document.getElementById('map-view');
        if (map && mv && mv.classList.contains('active')) renderMapMarkers();
    } catch (e) { console.error(e); }
}

document.getElementById('closeLogin').addEventListener('click', () => document.getElementById('login-container').classList.remove('active'));
document.getElementById('closeSignup').addEventListener('click', () => document.getElementById('signup-container').classList.remove('active'));
document.getElementById('showSignup').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('login-container').classList.remove('active'); document.getElementById('signup-container').classList.add('active'); });
document.getElementById('showLogin').addEventListener('click', (e) => { e.preventDefault(); document.getElementById('signup-container').classList.remove('active'); document.getElementById('login-container').classList.add('active'); });

document.getElementById('login-submit').addEventListener('click', async () => {
    const fd = new FormData(); fd.append('action', 'login'); fd.append('email', document.getElementById('login-email').value); fd.append('password', document.getElementById('login-password').value);
    const res = await fetch('api/login_process.php', { method: 'POST', body: fd }); const data = await res.json();
    if (data.success) { currentUser = data.user; updateUserUI(); document.getElementById('login-container').classList.remove('active'); document.getElementById('login-password').value = ''; showNotification(`Welcome, ${currentUser.name}!`); syncVisitsFromServer(); loadMyTickets(); loadActivity(); showPage(startPage()); renderTouristSpots(); renderProducts(); renderRecords(); processPendingScan(); }
    else showNotification(data.message, 'danger');
});

document.getElementById('signup-submit').addEventListener('click', async () => {
    const v = id => document.getElementById(id).value.trim();
    const age = v('signup-age');
    if (!v('signup-name') || !v('signup-email')) return showNotification('Please enter your name and email.', 'danger');
    if (!/^\d+$/.test(age) || +age < 1 || +age > 120) return showNotification('Please enter your age (1-120).', 'danger');
    if (!v('signup-gender')) return showNotification('Please choose your gender.', 'danger');
    if (!v('signup-origin')) return showNotification('Please enter where you are from.', 'danger');
    if (document.getElementById('signup-password').value.length < 6) return showNotification('Password must be at least 6 characters.', 'danger');
    if (document.getElementById('signup-password').value !== document.getElementById('signup-confirm').value) return showNotification('The passwords do not match.', 'danger');
    const fd = new FormData(); fd.append('action', 'signup');
    fd.append('name', v('signup-name')); fd.append('email', v('signup-email')); fd.append('password', document.getElementById('signup-password').value);
    fd.append('age', age); fd.append('gender', v('signup-gender')); fd.append('origin', v('signup-origin'));
    const btn = document.getElementById('signup-submit'); btn.disabled = true;
    let data;
    try { data = await (await fetch('api/login_process.php', { method: 'POST', body: fd })).json(); }
    catch (e) { data = { success: false, message: 'Could not reach the server. Try again.' }; }
    btn.disabled = false;
    if (!data.success) return showNotification(data.message, 'danger');
    currentUser = data.user; updateUserUI();
    document.getElementById('signup-container').classList.remove('active');
    ['signup-name', 'signup-email', 'signup-age', 'signup-origin', 'signup-password', 'signup-confirm'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('signup-gender').value = '';
    showNotification(`Welcome to LakbayNaguilian, ${currentUser.name}!`);
    syncVisitsFromServer(); loadMyTickets(); loadActivity(); showPage(startPage()); renderTouristSpots(); renderProducts(); renderRecords(); processPendingScan();
});
document.getElementById('signup-confirm').addEventListener('keypress', e => { if (e.key === 'Enter') document.getElementById('signup-submit').click(); });

function doLogout() {
    fetch('api/logout.php').catch(() => {});
    document.getElementById('activity-list').innerHTML = '';
    currentUser = null; myTickets = [];
    document.getElementById('logout-modal').classList.remove('active');
    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    ['login-email', 'login-password'].forEach(id => { const el = document.getElementById(id); el.value = ''; el.defaultValue = ''; });
    document.getElementById('login-container').classList.add('active');
    renderTouristSpots(); renderProducts(); renderRecords();
    showNotification('You have logged out.');
}
document.getElementById('logout-btn').addEventListener('click', () => {
    if (!currentUser) return;
    document.getElementById('lo-text').textContent = `Are you sure you want to log out, ${String(currentUser.name).split(' ')[0]}?`;
    document.getElementById('logout-modal').classList.add('active');
    setTimeout(() => document.getElementById('logout-cancel').focus(), 50);
});
document.getElementById('logout-confirm').addEventListener('click', doLogout);
document.getElementById('logout-cancel').addEventListener('click', () => document.getElementById('logout-modal').classList.remove('active'));
document.getElementById('logout-modal').addEventListener('mousedown', e => { if (e.target.id === 'logout-modal') e.target.classList.remove('active'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('logout-modal').classList.remove('active'); });

function avatarFor(user) {
    if (user && user.profile_image) return user.profile_image;
    const words = String((user && user.name) || '').trim().split(/\s+/).filter(Boolean);
    let initials = words.slice(0, 2).map(w => Array.from(w)[0]).join('').toUpperCase();
    if (!initials) initials = 'T';
    initials = initials.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#14b8a6'/><stop offset='1' stop-color='#0f766e'/></linearGradient></defs><rect width='100' height='100' fill='url(#g)'/><text x='50' y='50' dy='.35em' text-anchor='middle' font-family='Arial,Helvetica,sans-serif' font-size='42' font-weight='700' fill='#ffffff'>" + initials + "</text></svg>";
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function updateUserUI() {
    if (!currentUser) return;
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Tourist';
    document.getElementById('points-count').textContent = parseInt(currentUser.points).toLocaleString();
    document.getElementById('modal-points-count').textContent = parseInt(currentUser.points).toLocaleString();
    document.getElementById('tickets-points-count').textContent = parseInt(currentUser.points).toLocaleString();
    const hr = new Date().getHours();
    document.getElementById('welcome-msg').textContent = `${hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'}, ${String(currentUser.name).split(' ')[0]}!`;
    document.getElementById('dh-date').textContent = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });
    document.getElementById('dh-sub').textContent = currentUser.role === 'admin'
        ? 'Here is how Naguilian tourism is doing today.'
        : 'Scan QR codes at tourist spots to earn points and collect rewards.';
    document.getElementById('tickets-issued-count').textContent = myTickets.length;
    const isAdmin = currentUser.role === 'admin';
    document.getElementById('nav-analytics').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('nav-records').parentElement.style.display = isAdmin ? 'none' : '';
    document.getElementById('nav-users').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('nav-admin-reviews').style.display = isAdmin ? 'block' : 'none';
    document.getElementById('admin-reviews-btn').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('analytics-btn').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('notification-bell').style.display = isAdmin ? 'flex' : 'none';
    document.getElementById('qr-scan-btn-main').style.display = 'flex';
    document.querySelectorAll('.admin-only-btn').forEach(b => b.style.display = isAdmin ? 'inline-flex' : 'none');
    updateNotificationBadge();
    refreshRedeemUI();
    document.getElementById('sidebar-profile-img').src = avatarFor(currentUser);
    document.getElementById('hdr-avatar-img').src = avatarFor(currentUser);
}

function showPage(pageId, fromHistory = false) {
    if (!currentUser) return document.getElementById('login-container').classList.add('active');
    if (!document.getElementById(`${pageId}-view`)) pageId = 'dashboard';
    if (pageId === 'records' && currentUser.role === 'admin') { showPage('analytics', fromHistory); return; }
    if (currentUser.role !== 'admin' && (pageId === 'analytics' || pageId === 'users' || pageId === 'admin-tickets' || pageId === 'admin-reviews')) return showNotification('Admin only', 'danger');
    if (!fromHistory) navHistoryPush(pageId);
    pageContents.forEach(p => p.classList.remove('active')); navLinks.forEach(l => l.classList.remove('active')); window.scrollTo({ top: 0 });
    document.getElementById(`${pageId}-view`).classList.add('active');
    document.querySelector('.main-content').dataset.page = pageId;
    document.querySelector(`nav a[data-page="${pageId}"]`)?.classList.add('active');
    const tab = document.querySelector(`.tb-item[data-tab="${pageId}"]`) || document.getElementById('tb-more');
    document.querySelectorAll('.tb-item').forEach(b => b.classList.toggle('active', b === tab));
    closeMoreSheet();
    if (pageId === 'spots') renderTouristSpots();
    if (pageId === 'products') renderProducts();
    if (pageId === 'records') renderRecords();
    if (pageId === 'mytickets') renderMyTickets();
    if (pageId === 'admin-reviews') renderAdminPlaceReviews();
    if (pageId === 'map') setTimeout(() => { initMap(); fetchWeather(); if (map) setTimeout(() => map.invalidateSize(), 250); }, 200);
    if (pageId === 'analytics') setTimeout(initAnalytics, 200);
    if (pageId === 'users' && window.loadUsers) window.loadUsers();
}
navLinks.forEach(l => l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.page); }));

document.querySelectorAll('.tb-item[data-tab]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.tab === 'more') return openMoreSheet();
    showPage(b.dataset.tab);
}));
document.getElementById('tb-scan').addEventListener('click', () => {
    if (!currentUser) return document.getElementById('login-container').classList.add('active');
    document.getElementById('qr-scan-btn-main').click();
});
document.getElementById('hdr-avatar').addEventListener('click', () => document.getElementById('open-profile-btn').click());

function openMoreSheet() {
    if (!currentUser) return document.getElementById('login-container').classList.add('active');
    const admin = currentUser.role === 'admin';
    const items = [
        ['map', 'fa-map-location-dot', 'Map', 't0'],
        !admin && ['records', 'fa-route', 'My visits', 't1'],
        ['mytickets', 'fa-wallet', 'My tickets', 't2'],
        ['#tickets-btn', 'fa-ticket', 'Get tickets', 't3'],
        ['#redeem-btn', 'fa-gift', 'Redeem', 't4'],
        admin && ['admin-reviews', 'fa-comments', 'Place reviews', 't5'],
        admin && ['analytics', 'fa-chart-line', 'Analytics', 't6'],
        admin && ['users', 'fa-users', 'Users', 't0'],
        ['#open-profile-btn', 'fa-user-pen', 'Edit profile', 't1'],
        ['#logout-btn', 'fa-right-from-bracket', 'Log out', 'out'],
    ].filter(Boolean);
    document.getElementById('ms-me').innerHTML = `<img src="${esc(avatarFor(currentUser))}" alt=""><div><b>${esc(currentUser.name)}</b><small>${admin ? 'Administrator' : 'Tourist'}</small></div>
        <span class="ms-pts"><i class="fas fa-coins"></i> ${(parseInt(currentUser.points) || 0).toLocaleString()}</span>`;
    document.getElementById('ms-grid').innerHTML = items.map(([go, ic, label, tone]) =>
        `<button type="button" class="ms-tile ${tone}" data-go="${go}"><i class="fas ${ic}"></i><span>${label}</span></button>`).join('');
    const sheet = document.getElementById('more-sheet');
    sheet.hidden = false; requestAnimationFrame(() => sheet.classList.add('open'));
}
function closeMoreSheet() {
    const sheet = document.getElementById('more-sheet');
    if (sheet.hidden) return;
    sheet.classList.remove('open'); setTimeout(() => { sheet.hidden = true; }, 220);
}
document.getElementById('more-sheet').addEventListener('click', e => {
    if (e.target.id === 'more-sheet') return closeMoreSheet();
    const t = e.target.closest('.ms-tile'); if (!t) return;
    const go = t.dataset.go;
    closeMoreSheet();
    if (go.startsWith('#')) document.querySelector(go).click(); else showPage(go);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMoreSheet(); });

let pendingDelete = null;
const GENERIC_WORDS = ['naguilian', 'park', 'falls', 'church', 'hall', 'rock', 'formation', 'plaza', 'area', 'parish', 'union'];
function fmtDate(d) {
    if (!d) return '-';
    const dt = new Date(String(d).length <= 10 ? d + 'T00:00:00' : d);
    return isNaN(dt) ? esc(d) : dt.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(d) {
    if (!d) return '-';
    const dt = new Date(String(d).replace(' ', 'T'));
    return isNaN(dt) ? esc(d) : dt.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function matchSpot(name) {
    const n = (name || '').toLowerCase().trim(); if (!n) return null;
    const hit = dbSpots.find(s => { const sn = s.name.toLowerCase(); return sn === n || sn.includes(n) || n.includes(sn); });
    if (hit) return hit;
    const words = n.split(/[^a-z]+/).filter(w => w.length > 3 && !GENERIC_WORDS.includes(w));
    let best = null, score = 0;
    dbSpots.forEach(s => { const sn = s.name.toLowerCase(); const sc = words.filter(w => sn.includes(w)).length; if (sc > score) { score = sc; best = s; } });
    return best;
}
const visitsKey = () => `tourgo_visits_${currentUser?.id}`;
function getVisits() { try { return JSON.parse(localStorage.getItem(visitsKey()) || '[]'); } catch (e) { return []; } }
function saveVisits(v) { try { localStorage.setItem(visitsKey(), JSON.stringify(v)); } catch (e) {} }
function logVisit(spot) {
    if (!currentUser) return;
    const v = getVisits();
    v.unshift({ id: Date.now(), spotId: spot.id, name: spot.name, points: parseInt(spot.points_reward) || 0, date: new Date().toISOString() });
    saveVisits(v);
    renderRecords();
}
function recordRows() {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
        return dbRecords.map(r => ({ kind: 'record', id: r.id, place: r.location, value: parseInt(r.visitors) || 0, date: r.record_date, spot: matchSpot(r.location) }))
            .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id);
    }
    return getVisits().map(v => ({ kind: 'visit', id: v.id, place: v.name, value: v.points, date: v.date, spot: dbSpots.find(s => s.id == v.spotId) || matchSpot(v.name) }));
}
const samePlace = (a, b) => (a.spot && b.spot) ? a.spot.id === b.spot.id : String(a.place).toLowerCase() === String(b.place).toLowerCase();

function renderRecords() {
    const tb = document.getElementById('records-tbody'); if (!tb) return;
    const admin = currentUser?.role === 'admin';
    document.getElementById('records-title').textContent = admin ? 'Tourism records' : 'My visits';
    document.getElementById('records-subtitle').textContent = admin ? 'Visitor counts logged for each place.' : 'Places you checked in to by scanning their QR code.';
    document.getElementById('records-value-head').textContent = admin ? 'Visitors' : 'Points earned';
    document.getElementById('add-record-table-btn').style.display = admin ? 'inline-flex' : 'none';
    const rows = recordRows();
    const total = rows.reduce((s, r) => s + r.value, 0);
    const places = new Set(rows.map(r => r.spot ? 's' + r.spot.id : r.place.toLowerCase())).size;
    const stats = admin ? [[rows.length, 'Records'], [total.toLocaleString(), 'Total visitors'], [places, 'Places']]
                        : [[rows.length, 'Visits'], [total.toLocaleString(), 'Points earned'], [places, 'Places visited']];
    stats.forEach((s, i) => { document.getElementById(`rec-stat-${i + 1}`).textContent = s[0]; document.getElementById(`rec-stat-${i + 1}-label`).textContent = s[1]; });
    if (!rows.length) {
        tb.innerHTML = `<div class="rec-empty mv-empty"><span><i class="fas fa-route"></i></span><h3>${admin ? 'No records yet' : 'No visits yet'}</h3><p>${admin ? 'Use Add record to log your first one.' : "Scan the QR code at a tourist spot to log your first visit and earn points."}</p></div>`;
        return;
    }
    const monthOf = d => { const x = new Date(String(d).replace(' ', 'T')); return isNaN(x) ? '' : x.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); };
    let last = null;
    tb.innerHTML = rows.map(r => {
        const m = monthOf(r.date), head = m !== last ? `<h4 class="mv-month">${esc(m)}</h4>` : ''; last = m;
        const thumb = r.spot ? `<img loading="lazy" decoding="async" class="mv-thumb" src="${esc(r.spot.image_url)}" alt="">` : '<span class="mv-thumb"><i class="fas fa-map-pin"></i></span>';
        return `${head}<button type="button" class="mv-row view-btn" data-kind="${r.kind}" data-id="${r.id}">${thumb}
            <span class="mv-txt"><b>${esc(r.place)}</b>${r.spot ? `<small><i class="fas fa-location-dot"></i> ${esc(r.spot.location)}</small>` : ''}<small class="mv-when"><i class="far fa-clock"></i> ${r.kind === 'visit' ? fmtDateTime(r.date) : fmtDate(r.date)}</small></span>
            <span class="mv-pts${r.value ? '' : ' zero'}">${admin ? r.value.toLocaleString() : '+' + r.value.toLocaleString()}<small>${admin ? 'visitors' : 'pts'}</small></span><i class="fas fa-chevron-right mv-go"></i></button>`;
    }).join('');
}

function findRow(kind, id) { return recordRows().find(r => r.kind === kind && r.id == id); }

function openRecordView(kind, id) {
    const row = findRow(kind, id); if (!row) return;
    const admin = kind === 'record', s = row.spot;
    const all = recordRows().filter(r => samePlace(r, row));
    const sum = all.reduce((t, r) => t + r.value, 0);
    document.getElementById('rv-thumb').innerHTML = s ? `<img loading="lazy" decoding="async" src="${esc(s.image_url)}" alt="">` : '<i class="fas fa-map-pin"></i>';
    document.getElementById('rv-place').textContent = row.place;
    document.getElementById('rv-sub').textContent = s ? catName(s.category) : (admin ? 'Tourism record' : 'Visit');
    document.getElementById('rv-date').textContent = row.kind === 'visit' ? fmtDateTime(row.date) : fmtDate(row.date);
    document.getElementById('rv-value-label').textContent = admin ? 'Visitors' : 'Points earned';
    document.getElementById('rv-value').textContent = admin ? row.value.toLocaleString() : '+' + row.value;
    document.getElementById('rv-total-label').textContent = admin ? 'All records here' : 'Your visits here';
    document.getElementById('rv-total').textContent = admin ? `${all.length} record${all.length !== 1 ? 's' : ''}, ${sum.toLocaleString()} visitors` : `${all.length} visit${all.length !== 1 ? 's' : ''}, ${sum.toLocaleString()} pts`;
    document.getElementById('rv-rating').innerHTML = s ? `<i class="fas fa-star" style="color:var(--accent)"></i> ${esc(s.rating)} (${s.review_count || 0})` : '-';
    document.getElementById('rv-location').textContent = s ? s.location : 'Not linked to a listed spot';
    document.getElementById('rv-about').textContent = s ? s.description : '-';
    document.getElementById('rv-kind').textContent = admin ? 'Tourism record' : 'My visit';
    document.getElementById('rv-value-icon').className = 'fas ' + (admin ? 'fa-users' : 'fa-coins');
    const others = all.filter(r => r.id != row.id).slice(0, 5);
    document.getElementById('rv-history-title').textContent = admin ? 'Other records here' : 'Your other visits here';
    document.getElementById('rv-history').innerHTML = others.length
        ? others.map(r => `<li><span><i class="far fa-calendar"></i> ${r.kind === 'visit' ? fmtDateTime(r.date) : fmtDate(r.date)}</span><b>${admin ? r.value.toLocaleString() + ' visitors' : '+' + r.value + ' pts'}</b></li>`).join('')
        : `<li class="rv-none">${admin ? 'This is the only record for this place.' : 'This is your only visit here.'}</li>`;
    document.querySelector('#record-view-modal .dx-scroll').scrollTop = 0;
    const open = document.getElementById('rv-open'); open.style.display = s ? 'inline-flex' : 'none';
    open.onclick = () => { document.getElementById('record-view-modal').classList.remove('active'); window.openSpotDetails(s.id); };
    document.getElementById('rv-delete').onclick = () => { document.getElementById('record-view-modal').classList.remove('active'); askDelete(kind, id); };
    document.getElementById('record-view-modal').classList.add('active');
}

function askDelete(kind, id) {
    const row = findRow(kind, id); if (!row) return;
    pendingDelete = { kind, id };
    document.getElementById('delete-modal-title').textContent = kind === 'visit' ? 'Delete this visit?' : 'Delete this record?';
    document.getElementById('delete-modal-text').textContent = `${row.place} on ${fmtDate(row.date)} will be removed. This can't be undone.`;
    document.getElementById('delete-modal').classList.add('active');
}

document.getElementById('records-tbody').addEventListener('click', e => {
    const b = e.target.closest('.view-btn, .delete-btn'); if (!b) return;
    if (b.classList.contains('view-btn')) openRecordView(b.dataset.kind, b.dataset.id);
    else askDelete(b.dataset.kind, b.dataset.id);
});
document.getElementById('cancel-delete').addEventListener('click', () => { pendingDelete = null; document.getElementById('delete-modal').classList.remove('active'); });
document.getElementById('confirm-delete').addEventListener('click', async () => {
    if (!pendingDelete) return;
    const p = pendingDelete; pendingDelete = null;
    document.getElementById('delete-modal').classList.remove('active');
    if (p.kind === 'visit') { saveVisits(getVisits().filter(v => v.id != p.id)); renderRecords(); return showNotification('Visit deleted.'); }
    try {
        const fd = new FormData(); fd.append('action', 'delete'); fd.append('id', p.id);
        const data = await (await fetch('api/records_api.php', { method: 'POST', body: fd })).json();
        if (data.success) { showNotification(data.message); await loadDatabase(); refreshAnalyticsIfOpen(); addToActivity(); } else showNotification(data.message, 'danger');
    } catch (err) { showNotification('Could not delete the record.', 'danger'); }
});
document.getElementById('close-record-view').addEventListener('click', () => document.getElementById('record-view-modal').classList.remove('active'));

document.getElementById('add-record-table-btn').addEventListener('click', () => {
    if (currentUser?.role !== 'admin') return showNotification('Admin only', 'danger');
    document.getElementById('record-place-list').innerHTML = dbSpots.map(s => `<option value="${esc(s.name)}">`).join('');
    document.getElementById('add-record-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('add-record-modal').classList.add('active');
});
document.getElementById('close-add-record').addEventListener('click', () => document.getElementById('add-record-modal').classList.remove('active'));
document.getElementById('add-record-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target); fd.append('action', 'add');
    try {
        const data = await (await fetch('api/records_api.php', { method: 'POST', body: fd })).json();
        if (data.success) { showNotification(data.message); e.target.reset(); document.getElementById('add-record-modal').classList.remove('active'); await loadDatabase(); refreshAnalyticsIfOpen(); addToActivity(); }
        else showNotification(data.message, 'danger');
    } catch (err) { showNotification('Could not save the record.', 'danger'); }
});

const DX_MODALS = '#spot-details-modal,#product-details-modal,#record-view-modal,#add-record-modal,#delete-modal';
document.querySelectorAll(DX_MODALS).forEach(m => m.addEventListener('mousedown', e => { if (e.target === m) m.classList.remove('active'); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll(DX_MODALS.split(',').map(s => s + '.active').join(',')).forEach(m => m.classList.remove('active')); });


document.getElementById('open-profile-btn').addEventListener('click', () => {
    if (!currentUser) return;
    document.getElementById('profile-name').value = currentUser.name;
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-phone').value = currentUser.phone || '';
    document.getElementById('profile-age').value = currentUser.age || '';
    document.getElementById('profile-gender').value = currentUser.gender || '';
    document.getElementById('profile-origin').value = currentUser.origin || '';
    document.getElementById('profile-password').value = '';
    document.getElementById('profile-avatar-input').value = '';
    document.getElementById('profile-avatar-preview').src = avatarFor(currentUser);
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
    const age = document.getElementById('profile-age').value.trim();
    if (age && (!/^\d+$/.test(age) || +age < 1 || +age > 120)) return showNotification('Please enter an age from 1 to 120.', 'danger');
    fd.append('age', age);
    fd.append('gender', document.getElementById('profile-gender').value);
    fd.append('origin', document.getElementById('profile-origin').value.trim());
    const newPass = document.getElementById('profile-password').value;
    if (newPass) fd.append('password', newPass);
    const avatarFile = document.getElementById('profile-avatar-input').files[0];
    if (avatarFile) fd.append('profile_image', await compressImage(avatarFile, 480, 0.85));

    const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
    try {
        const res = await fetch('api/update_profile.php', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            currentUser = { ...currentUser, ...data.user };
            updateUserUI();
            showNotification('Profile updated!');
            document.getElementById('profile-avatar-input').value = '';
            document.getElementById('profile-modal').classList.remove('active');
        } else {
            showNotification(data.message, 'danger');
        }
    } catch (error) { showNotification('Error updating profile', 'danger'); }
    btn.disabled = false;
});

document.getElementById('qr-scan-btn-main').addEventListener('click', () => {
    const admin = currentUser?.role === 'admin';
    document.getElementById('qr-scanner-title').textContent = admin ? 'Scan a ticket or reward' : 'Scan Spot QR Code';
    document.getElementById('qr-instruction').textContent = admin ? 'Point the camera at the tourist\'s ticket QR to check it and mark it as claimed' : 'Point your camera at the spot\'s QR code to earn points';
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

function qrBoxSize() { return Math.max(160, Math.min(250, Math.floor(Math.min(window.innerWidth, 500) * 0.65))); }

function showQRMessage(html) {
    const el = document.getElementById('qr-result');
    el.style.display = 'block'; el.innerHTML = html;
}

function qrGuideHTML(title, why) {
    return `<div class="qr-guide"><div class="qr-guide-ic"><i class="fas fa-mobile-alt"></i></div>
        <h4>${title}</h4>
        <p style="color:var(--gray);font-size:.85rem;margin-bottom:8px;">${why}</p>
        <ol><li>Close this and open your phone's <b>Camera</b> app</li><li>Point it at the spot's QR code</li><li>Tap the link that appears. Log in if asked and the points and your visit date are saved automatically</li></ol></div>`;
}

function startQRScanner(mode, expectedSpotId = null) {
    stopQRScanner();
    window.qrMode = mode; window.qrExpected = expectedSpotId; window.qrHandling = false;
    document.getElementById('qr-camera-btn').style.display = '';
    document.getElementById('qr-result').style.display = 'none';
    document.getElementById('qr-result').innerHTML = '';
    document.getElementById('qr-reader').style.display = '';

    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('qr-reader').style.display = 'none';
        showQRMessage(qrGuideHTML('Live scanner needs https', 'The live preview is blocked on a plain http:// address. Tap <b>Open Camera to Scan</b> below, point at the QR and the points are added automatically. You can also scan with the phone Camera app:'));
        return;
    }
    if (typeof Html5Qrcode === 'undefined') { document.getElementById('qr-reader').style.display = 'none'; showQRMessage(qrGuideHTML('Scanner is still loading', 'Please wait a few seconds and press Scan QR again, or use your phone\'s Camera app.')); return; }
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: qrBoxSize(), height: qrBoxSize() }, aspectRatio: 1.0 },
        (decodedText) => handleScannedQR(decodedText, mode, expectedSpotId),
        () => {}
    ).catch((err) => {
        qrScanner = null;
        document.getElementById('qr-reader').style.display = 'none';
        const denied = /NotAllowed|Permission|denied/i.test(String(err && (err.name || err)));
        showQRMessage(qrGuideHTML(denied ? 'Camera permission is off' : 'Camera could not start',
            denied ? 'Allow Camera for this site in your browser settings (lock icon in the address bar > Permissions), then press Scan QR again. Or use the phone Camera app:' : 'Another app may be using the camera. Close it and try again, or use the phone Camera app:'));
    });
}


document.getElementById('qr-camera-btn').addEventListener('click', () => document.getElementById('qr-camera-input').click());
async function decodeQRFromFile(file) {
    let bmp = null;
    try { bmp = await createImageBitmap(file); } catch (e) {}
    if (!bmp) {
        bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); });
    }
    if ('BarcodeDetector' in window) {
        try {
            const found = await new BarcodeDetector({ formats: ['qr_code'] }).detect(bmp);
            if (found.length && found[0].rawValue) return found[0].rawValue;
        } catch (e) {}
    }
    const W = bmp.width || bmp.naturalWidth, H = bmp.height || bmp.naturalHeight;
    for (const max of [1000, 1400, 700, 500]) {
        const k = Math.min(1, max / Math.max(W, H));
        const w = Math.round(W * k), h = Math.round(H * k);
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
        const blob = await new Promise(r => c.toBlob(r, 'image/png'));
        const box = document.createElement('div');
        box.id = 'qr-file-box'; box.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;height:${h}px;`;
        document.body.appendChild(box);
        const sc = new Html5Qrcode('qr-file-box');
        try {
            const text = await sc.scanFile(new File([blob], 'qr.png', { type: 'image/png' }), false);
            try { sc.clear(); } catch (x) {}
            box.remove();
            return text;
        } catch (err) { try { sc.clear(); } catch (x) {} box.remove(); }
    }
    throw new Error('QR not found');
}

document.getElementById('qr-camera-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    stopQRScanner();
    document.getElementById('qr-reader').style.display = 'none';
    showQRMessage('<p style="text-align:center;color:var(--gray);"><i class="fas fa-spinner fa-spin"></i> Reading QR code...</p>');
    let text;
    try { text = await decodeQRFromFile(file); }
    catch (err) {
        return showQRMessage(scanErr('fa-camera', 'Could not read the QR', 'Keep the whole QR square in the frame, close enough that it fills most of the screen, with no glare. Then tap Open Camera to Scan again.'));
    }
    handleScannedQR(text, window.qrMode || 'spot', window.qrExpected || null);
});

function stopQRScanner() {
    if (qrScanner) {
        const sc = qrScanner; qrScanner = null;
        sc.stop().then(() => sc.clear()).catch(() => {});
    }
}

function parseScanText(text) {
    text = String(text || '').trim();
    const tk = text.match(/[?&]ticket=([A-Za-z0-9]+)-([a-fA-F0-9]+)/);
    if (tk) return { type: 'ticket', id: tk[1].toUpperCase(), token: tk[2].toLowerCase() };
    let m = text.match(/[?&]scan=(\d+)-([A-Za-z0-9]+)/);
    if (m) return { type: 'spot', id: m[1], token: m[2] };
    const parts = text.split('|');
    if ((parts[0] || '').toUpperCase() === 'TOURGO') return { type: parts[1], id: parts[2], token: parts[3] || '' };
    return null;
}

const scanErr = (icon, title, msg) => `<div style="text-align:center;color:var(--danger);"><i class="fas ${icon}" style="font-size:2rem;margin-bottom:10px;"></i><h4 style="margin-bottom:10px;">${title}</h4><p style="color:var(--gray);font-size:.9rem;">${msg}</p></div>`;

async function submitScan(spotId, token, visit = { type: 'solo' }) {
    const spot = dbSpots.find(s => s.id == spotId);
    let d;
    try {
        const fd = new FormData(); fd.append('action', 'scan'); fd.append('spot_id', spotId); fd.append('token', token || '');
        fd.append('visit_type', visit.type);
        if (visit.type === 'group') fd.append('companions', JSON.stringify(visit.companions));
        d = await (await fetch('api/scan_qr.php', { method: 'POST', body: fd })).json();
    } catch (err) { return scanErr('fa-wifi', 'No connection', 'Could not reach the server. Try again.'); }
    if (!d.success) return scanErr('fa-exclamation-triangle', 'Could not add points', esc(d.message || 'Scan failed.'));

    currentUser.points = d.total; updateUserUI();
    const withWho = d.visit_type === 'group' ? ` with your group of ${d.group_size}` : '';
    if (d.already) {
        return `<div style="text-align:center;"><i class="fas fa-check-circle" style="font-size:3rem;color:var(--success);margin-bottom:10px;"></i><h4 style="color:var(--dark);margin-bottom:10px;">Already Visited!</h4><p style="color:var(--gray);">You've already earned points for ${esc(spot.name)}.${d.counted ? ` Your visit${withWho} was still counted.` : ''}</p><p style="color:var(--primary);font-weight:700;margin-top:10px;">Total: ${d.total.toLocaleString()} points</p></div>`;
    }
    logVisit(spot);
    syncVisitsFromServer();
    showNotification(`+${d.awarded} points earned at ${spot.name}!`, 'success');
    addToActivity(`Earned ${d.awarded} pts at ${spot.name}${withWho}`, 'Just now');
    return `<div style="text-align:center;"><i class="fas fa-trophy" style="font-size:3rem;color:var(--accent);margin-bottom:10px;"></i><h4 style="color:var(--primary);margin-bottom:10px;">Points Earned!</h4><p style="color:var(--dark);font-weight:600;margin-bottom:5px;">+${d.awarded} points</p><p style="color:var(--gray);font-size:.9rem;">for visiting ${esc(spot.name)}${withWho}</p><p style="color:var(--primary);font-weight:700;margin-top:10px;">Total: ${d.total.toLocaleString()} points</p></div>`;
}

async function runScanFlow(el, spotId, token, expectedSpotId = null) {
    if (!currentUser) return scanErr('fa-user-lock', 'Please log in', 'Log in to collect your points.');
    await (window.dbReady || Promise.resolve());
    const spot = dbSpots.find(s => s.id == spotId);
    if (!spot) return scanErr('fa-exclamation-triangle', 'Spot not found', 'This QR code does not match a spot in the app.');
    if (expectedSpotId && expectedSpotId != spotId) return scanErr('fa-exclamation-triangle', 'Different spot', `This QR code belongs to <b>${esc(spot.name)}</b>, not the spot you opened.`);

    el.innerHTML = '<p style="text-align:center;color:var(--gray);padding:12px 0;"><i class="fas fa-spinner fa-spin"></i> Checking QR code...</p>';
    let c;
    try {
        const fd = new FormData(); fd.append('action', 'check'); fd.append('spot_id', spotId); fd.append('token', token || '');
        c = await (await fetch('api/scan_qr.php', { method: 'POST', body: fd })).json();
    } catch (err) { return scanErr('fa-wifi', 'No connection', 'Could not reach the server. Try again.'); }
    if (!c.success) return scanErr('fa-exclamation-triangle', 'Could not add points', esc(c.message || 'Scan failed.'));

    if (c.already) return `<div style="text-align:center;"><i class="fas fa-check-circle" style="font-size:3rem;color:var(--success);margin-bottom:10px;"></i><h4 style="color:var(--dark);margin-bottom:10px;">Already checked in!</h4><p style="color:var(--gray);">You already checked in at <b>${esc(spot.name)}</b> and got your points. Each visitor is counted once per spot.</p><p style="color:var(--primary);font-weight:700;margin-top:10px;">Total: ${(parseInt(currentUser.points) || 0).toLocaleString()} points</p></div>`;
    const visit = await askVisitType(el, spot, c);
    el.innerHTML = `<p style="text-align:center;color:var(--gray);padding:12px 0;"><i class="fas fa-spinner fa-spin"></i> ${c.already ? 'Saving your visit...' : 'Adding your points...'}</p>`;
    return submitScan(spotId, token, visit);
}

function askVisitType(el, spot, check) {
    return new Promise(resolve => {
        let people = [{ gender: '', age: '' }];
        const note = check.already
            ? '<i class="fas fa-circle-info"></i> You already earned points here, but your visit will still be counted.'
            : `<i class="fas fa-coins"></i> You will earn <b>+${esc(check.points)} points</b>`;

        function chooser() {
            el.innerHTML = `<div class="vt">
                <div class="vt-spot"><img src="${esc(spot.image_url)}" alt=""><div><small>You're at</small><b>${esc(spot.name)}</b></div></div>
                <h4 class="vt-q">Who are you visiting with?</h4>
                <div class="vt-options">
                    <button type="button" class="vt-opt" data-type="solo"><span class="vt-ic"><i class="fas fa-user"></i></span><b>Solo</b><small>Just me</small></button>
                    <button type="button" class="vt-opt group" data-type="group"><span class="vt-ic"><i class="fas fa-users"></i></span><b>Group</b><small>With family or friends</small></button>
                </div>
                <p class="vt-note">${note}</p>
            </div>`;
            el.querySelector('[data-type="solo"]').onclick = () => resolve({ type: 'solo' });
            el.querySelector('[data-type="group"]').onclick = groupForm;
        }

        function personRow(p, i) {
            const g = v => `<button type="button" class="vt-g${p.gender === v ? ' on' : ''}" data-i="${i}" data-g="${v}">${v === 'male' ? '<i class="fas fa-mars"></i> Male' : v === 'female' ? '<i class="fas fa-venus"></i> Female' : 'Other'}</button>`;
            return `<div class="vt-person"><span class="vt-num">${i + 1}</span>
                <div class="vt-gender" role="group" aria-label="Gender of person ${i + 1}">${g('male')}${g('female')}${g('other')}</div>
                <label class="vt-age"><span>Age</span><input type="number" inputmode="numeric" min="0" max="120" data-i="${i}" value="${esc(p.age)}" placeholder="0"></label></div>`;
        }

        function groupForm() {
            el.innerHTML = `<div class="vt">
                <button type="button" class="vt-back"><i class="fas fa-arrow-left"></i> Back</button>
                <h4 class="vt-q">Your group</h4>
                <div class="vt-count"><span>How many people are with you?<small>Don't count yourself</small></span>
                    <div class="vt-stepper"><button type="button" data-d="-1" aria-label="Fewer people"><i class="fas fa-minus"></i></button><b id="vt-n">${people.length}</b><button type="button" data-d="1" aria-label="More people"><i class="fas fa-plus"></i></button></div></div>
                <p class="vt-sub">Gender and age of each person with you</p>
                <div class="vt-people">${people.map(personRow).join('')}</div>
                <p class="vt-total"><i class="fas fa-people-group"></i> Group of <b>${people.length + 1}</b> (you + ${people.length})</p>
                <p class="vt-err" hidden></p>
                <button type="button" class="btn-primary vt-go"><i class="fas fa-check"></i> ${check.already ? 'Save my visit' : 'Confirm & get points'}</button>
            </div>`;
            el.querySelector('.vt-back').onclick = chooser;
            el.querySelectorAll('.vt-stepper button').forEach(b => b.onclick = () => {
                const n = Math.min(50, Math.max(1, people.length + parseInt(b.dataset.d)));
                while (people.length < n) people.push({ gender: '', age: '' });
                people = people.slice(0, n);
                groupForm();
            });
            el.querySelectorAll('.vt-g').forEach(b => b.onclick = () => {
                people[b.dataset.i].gender = b.dataset.g;
                b.parentElement.querySelectorAll('.vt-g').forEach(x => x.classList.toggle('on', x === b));
            });
            el.querySelectorAll('.vt-age input').forEach(inp => inp.oninput = () => { people[inp.dataset.i].age = inp.value; });
            el.querySelector('.vt-go').onclick = () => {
                const bad = people.findIndex(p => !p.gender || p.age === '' || !/^\d+$/.test(String(p.age)) || +p.age > 120);
                const err = el.querySelector('.vt-err');
                if (bad >= 0) {
                    err.textContent = `Please choose the gender and enter the age (0-120) of person ${bad + 1}.`; err.hidden = false;
                    el.querySelectorAll('.vt-person')[bad].classList.add('vt-bad');
                    el.querySelectorAll('.vt-person')[bad].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    return;
                }
                resolve({ type: 'group', companions: people.map(p => ({ gender: p.gender, age: parseInt(p.age) })) });
            };
        }
        chooser();
    });
}

async function handleScannedQR(decodedText, mode, expectedSpotId) {
    stopQRScanner();
    const q = parseScanText(decodedText);
    if (!q) return showQRMessage(scanErr('fa-exclamation-triangle', 'Invalid QR Code', 'This is not a LakbayNaguilian spot or ticket QR code. If it is a LakbayNaguilian ticket, close LakbayNaguilian completely, open it again (to get the newest version) and scan once more.'));
    if (q.type === 'spot') {
        if (window.qrHandling) return;
        window.qrHandling = true;
        showQRMessage('');
        document.getElementById('qr-reader').style.display = 'none';
        document.getElementById('qr-camera-btn').style.display = 'none';
        const html = await runScanFlow(document.getElementById('qr-result'), q.id, q.token, expectedSpotId);
        window.qrHandling = false;
        if (scanOk(html)) { showQRMessage(html + goingToSpotHTML()); goToScannedSpot(q.id, 'qr-scanner-modal'); }
        else { showQRMessage(html); document.getElementById('qr-camera-btn').style.display = ''; }
    } else if (q.type === 'ticket') {
        if (window.qrHandling) return;
        window.qrHandling = true;
        showQRMessage('');
        document.getElementById('qr-reader').style.display = 'none';
        document.getElementById('qr-camera-btn').style.display = 'none';
        const el = document.getElementById('qr-result');
        const html = await runTicketCheck(el, q.id, q.token || '');
        if (html !== null) showQRMessage(html);
        window.qrHandling = false;
        const again = document.createElement('button');
        again.type = 'button'; again.className = 'dx-ghost tv-again'; again.innerHTML = '<i class="fas fa-qrcode"></i> Scan another';
        again.onclick = () => startQRScanner(window.qrMode || 'spot');
        el.appendChild(again);
    } else showQRMessage(scanErr('fa-exclamation-triangle', 'Unknown QR type', 'This QR code is not for scanning points.'));
}

let pendingScan = null, pendingTicket = null;
(function readScanLink() {
    const m = location.search.match(/[?&]scan=(\d+)-([A-Za-z0-9]+)/);
    if (m) { pendingScan = { id: m[1], token: m[2] }; try { history.replaceState(null, '', location.pathname); } catch (e) {} }
    const t = location.search.match(/[?&]ticket=([A-Za-z0-9]+)-([a-fA-F0-9]+)/);
    if (t) { pendingTicket = { code: t[1].toUpperCase(), token: t[2].toLowerCase() }; try { history.replaceState(null, '', location.pathname); } catch (e) {} }
})();

async function processPendingScan() {
    if (pendingTicket && currentUser) {
        const tk = pendingTicket; pendingTicket = null;
        const body = document.getElementById('scan-result-body');
        document.getElementById('close-scan-result').textContent = 'Done';
        document.getElementById('scan-result-modal').classList.add('active');
        const html = await runTicketCheck(body, tk.code, tk.token);
        if (html !== null) body.innerHTML = html;
        return;
    }
    if (!pendingScan || !currentUser) return;
    const scan = pendingScan; pendingScan = null;
    const body = document.getElementById('scan-result-body'), done = document.getElementById('close-scan-result');
    done.textContent = 'Cancel';
    document.getElementById('scan-result-modal').classList.add('active');
    const html = await runScanFlow(body, scan.id, scan.token);
    done.textContent = 'Done';
    if (scanOk(html)) { body.innerHTML = html + goingToSpotHTML(); goToScannedSpot(scan.id, 'scan-result-modal'); }
    else body.innerHTML = html;
}

const scanOk = html => html.includes('fa-trophy') || html.includes('Already Visited') || html.includes('Already checked in');
const goingToSpotHTML = () => '<p class="scan-go"><i class="fas fa-spinner fa-spin"></i> Opening this spot...</p>';
function goToScannedSpot(spotId, modalId) {
    setTimeout(() => {
        const m = document.getElementById(modalId); if (!m.classList.contains('active')) return;
        m.classList.remove('active');
        stopQRScanner();
        showPage('spots');
        window.openSpotDetails(spotId);
    }, 2200);
}
document.getElementById('close-scan-result').addEventListener('click', () => document.getElementById('scan-result-modal').classList.remove('active'));

async function restoreSession() {
    try {
        const d = await (await fetch('api/me.php')).json();
        if (d.success && d.user) {
            currentUser = d.user; updateUserUI();
            document.getElementById('login-container').classList.remove('active');
            await syncVisitsFromServer(); loadMyTickets(); loadActivity(); showPage(startPage());
            renderTouristSpots(); renderProducts(); renderRecords();
            await processPendingScan();
            return;
        }
    } catch (e) {}
    if (pendingScan) showNotification('Log in to collect your points', 'success');
    if (pendingTicket) showNotification('Log in as the admin to check this ticket', 'success');
}

async function syncVisitsFromServer() {
    try {
        const d = await (await fetch('api/scan_qr.php?action=history')).json();
        if (!d.success) return;
        saveVisits(d.visits.map(v => ({ id: v.id, spotId: v.spot_id, name: v.name, points: parseInt(v.points) || 0, date: v.scanned_at })));
        if (currentUser && currentUser.role !== 'admin') { currentUser.points = d.points; updateUserUI(); }
        renderRecords();
    } catch (e) {}
}

async function loadSpotQR(spot, regenerate = false) {
    const img = document.getElementById('qr-generator-image');
    img.style.opacity = '.3';
    try {
        const fd = new FormData(); fd.append('action', regenerate ? 'regenerate' : 'get'); fd.append('spot_id', spot.id);
        const d = await (await fetch('api/qr_api.php', { method: 'POST', body: fd })).json();
        if (!d.success) { showNotification(d.message || 'Could not load QR', 'danger'); return; }
        img.src = TourgoQR.toDataURL(d.qr_data, 600, '#0b3b38', '#ffffff', 4);
        const lt = document.getElementById('qr-link-text'); if (lt) lt.textContent = d.qr_data;
        img.onload = () => { img.style.opacity = '1'; };
        if (regenerate) showNotification('New QR created. Print it and replace the old one.', 'success');
    } catch (e) { showNotification('Network error', 'danger'); }
    img.style.opacity = '1';
}

function openQRGenerator(spot) {
    document.getElementById('qr-generator-spot-name').textContent = spot.name;
    document.getElementById('qr-generator-spot-location').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${esc(spot.location)}`;
    document.getElementById('qr-points-value').textContent = spot.points_reward;
    const img = document.getElementById('qr-generator-image');
    img.removeAttribute('src');
    img.dataset.spotId = spot.id; img.dataset.spotName = spot.name;
    document.getElementById('qr-generator-modal').classList.add('active');
    loadSpotQR(spot, false);
}

document.getElementById('regen-qr-btn').addEventListener('click', () => {
    const id = document.getElementById('qr-generator-image').dataset.spotId;
    const spot = dbSpots.find(s => s.id == id); if (!spot) return;
    if (confirm('Generate a NEW QR for this spot?\n\nThe old printed QR will stop working and must be replaced.')) loadSpotQR(spot, true);
});

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
                    <p>Scan this QR code with your phone camera to earn points!</p>
                    <p>Place this at the tourist spot location.</p>
                </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
});

document.getElementById('tickets-btn').addEventListener('click', () => openShop('ticket'));
document.getElementById('close-tickets-modal').addEventListener('click', () => document.getElementById('tickets-modal').classList.remove('active'));
document.getElementById('my-tickets-btn').addEventListener('click', () => showPage('mytickets'));
document.getElementById('redeem-btn').addEventListener('click', () => openShop('reward'));
document.getElementById('close-redeem-modal').addEventListener('click', () => document.getElementById('redeem-modal').classList.remove('active'));

async function loadMyTickets() {
    if (!currentUser) { myTickets = []; return; }
    try { const d = await (await fetch('api/redeem_points.php?action=mine')).json(); myTickets = d.success ? d.tickets : []; }
    catch (e) {  }
    document.getElementById('tickets-issued-count').textContent = myTickets.length;
    if (document.getElementById('mytickets-view').classList.contains('active')) renderMyTickets();
}
async function redeemItem(body, closeModalId) {
    if (currentUser?.role === 'admin') return showNotification('Admin accounts cannot redeem. Log in as a tourist.', 'danger');
    const fd = new FormData(); fd.append('action', 'redeem'); Object.entries(body).forEach(([k, v]) => fd.append(k, v));
    let d;
    try { d = await (await fetch('api/redeem_points.php', { method: 'POST', body: fd })).json(); }
    catch (e) { return showNotification('Network error', 'danger'); }
    if (d.total !== undefined) currentUser.points = d.total;
    updateUserUI();
    reloadTicketItems().then(refreshRedeemUI);
    if (!d.success) return showNotification(d.message || 'Could not redeem', 'danger');
    myTickets.unshift(d.ticket);
    document.getElementById('tickets-issued-count').textContent = myTickets.length;
    document.getElementById(closeModalId).classList.remove('active');
    showTicketConfirm(d.ticket);
    addToActivity(`Redeemed ${esc(d.ticket.name)} (-${d.ticket.points} pts)`, 'Just now');
}
function showTicketConfirm(t) {
    document.getElementById('ticket-confirm-title').textContent = t.kind === 'reward' ? 'Reward redeemed' : 'Ticket redeemed';
    document.getElementById('ticket-qr-img').src = TourgoQR.toDataURL(String(t.qr), 400, '#000000', '#ffffff', 4);
    document.getElementById('ticket-code-display').textContent = t.code;
    document.getElementById('ticket-item-display').textContent = t.name;
    document.getElementById('ticket-holder-display').textContent = currentUser.name;
    document.getElementById('ticket-confirm-modal').classList.add('active');
    showNotification(`${t.name} redeemed! Saved in My Tickets.`);
}
document.getElementById('view-my-tickets-btn').addEventListener('click', () => { document.getElementById('ticket-confirm-modal').classList.remove('active'); showPage('mytickets'); });

const SHOP = { ticket: { grid: 'tickets-grid', modal: 'tickets-modal', one: 'ticket', color: 'bg-purple' }, reward: { grid: 'rewards-grid', modal: 'redeem-modal', one: 'reward', color: 'bg-teal' } };
async function reloadTicketItems() { try { const d = await (await fetch('api/get_data.php?type=ticket_items')).json(); if (Array.isArray(d)) dbTicketItems = d; } catch (e) {} }
function slotsChip(item) {
    if (item.slots == null) return '';
    return item.left > 0 ? `<span class="ti-slots${item.left <= 5 ? ' low' : ''}"><i class="fas fa-user-group"></i> ${item.left} of ${item.slots} slot${item.slots === 1 ? '' : 's'} left</span>` : '<span class="ti-slots out"><i class="fas fa-ban"></i> Sold out</span>';
}
function renderShop(kind) {
    const S = SHOP[kind], grid = document.getElementById(S.grid); if (!grid || !currentUser) return;
    const admin = currentUser.role === 'admin', pts = parseInt(currentUser.points) || 0;
    const items = dbTicketItems.filter(i => (i.kind || 'ticket') === kind);
    document.getElementById(S.modal).classList.toggle('is-admin', admin);
    grid.innerHTML = (admin ? `<button type="button" class="ti-add" data-ti-new="${kind}"><span><i class="fas fa-plus"></i></span><div><b>Add a ${S.one}</b><small>Set the points needed and how many slots</small></div></button>` : '')
        + (items.length ? items.map(item => {
            const cost = parseInt(item.cost) || 1, out = item.slots != null && item.left <= 0, ok = pts >= cost;
            const icon = `<div class="card-icon ${S.color}"><i class="fas ${esc(item.icon || 'fa-ticket')}"></i></div>`;
            if (admin) return `<div class="clean-card rd-item ti-admin${out ? ' is-out' : ''}">${icon}<div class="card-details"><h4>${esc(item.name)}</h4><span class="card-cost">${cost.toLocaleString()} pts</span>
                <span class="rd-need">${item.slots == null ? `No slot limit · ${item.used} redeemed` : out ? `Sold out · all ${item.slots} slots taken` : `${item.used} of ${item.slots} slots taken · ${item.left} left`}</span>${item.slots != null ? `<div class="rd-bar"><i style="width:${Math.min(100, item.used / Math.max(1, item.slots) * 100)}%"></i></div>` : ''}</div>
                <div class="ti-acts"><button type="button" class="ti-ibtn" data-ti-edit="${item.id}" aria-label="Edit ${esc(item.name)}" title="Edit"><i class="fas fa-pen"></i></button><button type="button" class="ti-ibtn danger" data-ti-del="${item.id}" aria-label="Delete ${esc(item.name)}" title="Delete"><i class="fas fa-trash"></i></button></div></div>`;
            return `<div class="clean-card rd-item${ok && !out ? '' : ' is-short'}${out ? ' is-out' : ''}">${icon}<div class="card-details"><h4>${esc(item.name)}</h4><span class="card-cost">${cost.toLocaleString()} pts</span>${slotsChip(item)}
                <span class="rd-need">${out ? 'All slots are taken' : ok ? 'You can redeem this' : `${(cost - pts).toLocaleString()} more pts needed`}</span>${out ? '' : `<div class="rd-bar"><i style="width:${Math.min(100, pts / cost * 100)}%"></i></div>`}</div>
                <button type="button" class="btn-clean-redeem" data-ti-redeem="${item.id}"${ok && !out ? '' : ' disabled'}>${out ? 'Sold out' : ok ? 'Redeem' : 'Locked'}</button></div>`;
        }).join('') : `<p class="ti-none"><i class="fas fa-ticket"></i> No ${S.one}s yet.${admin ? ' Tap Add to make one.' : ' Check back soon.'}</p>`);
}
function refreshRedeemUI() { if (currentUser) { renderShop('ticket'); renderShop('reward'); } }
async function openShop(kind) {
    if (!currentUser) return showNotification('Login first', 'danger');
    renderShop(kind); document.getElementById(SHOP[kind].modal).classList.add('active');
    await reloadTicketItems(); renderShop(kind);
}
['tickets-grid', 'rewards-grid'].forEach(id => document.getElementById(id).addEventListener('click', e => {
    const find = v => dbTicketItems.find(i => i.id == v);
    const r = e.target.closest('[data-ti-redeem]');
    if (r) { const item = find(r.dataset.tiRedeem); if (!item) return; if ((parseInt(currentUser.points) || 0) < item.cost) return showNotification('Not enough points', 'danger'); return redeemItem({ type: item.kind || 'ticket', id: item.id }, SHOP[item.kind || 'ticket'].modal); }
    const n = e.target.closest('[data-ti-new]'); if (n) return openTiEditor(n.dataset.tiNew);
    const ed = e.target.closest('[data-ti-edit]'); if (ed) return openTiEditor(null, find(ed.dataset.tiEdit));
    const dl = e.target.closest('[data-ti-del]'); if (dl) return deleteTiItem(find(dl.dataset.tiDel));
}));

const TI_ICONS = ['fa-ticket', 'fa-landmark', 'fa-utensils', 'fa-ship', 'fa-masks-theater', 'fa-camera', 'fa-person-hiking', 'fa-gift', 'fa-star', 'fa-tint', 'fa-map-marked-alt', 'fa-mug-hot', 'fa-shirt', 'fa-bus', 'fa-bed', 'fa-music'];
function openTiEditor(kind, item = null) {
    if (currentUser?.role !== 'admin') return;
    kind = item ? (item.kind || 'ticket') : kind;
    const g = id => document.getElementById(id);
    g('ti-id').value = item ? item.id : ''; g('ti-kind').value = kind;
    g('ti-name').value = item ? item.name : ''; g('ti-cost').value = item ? item.cost : '';
    g('ti-slots').value = item && item.slots != null ? item.slots : '';
    g('ti-title').textContent = item ? `Edit "${item.name}"` : `New ${kind}`;
    g('ti-sub').textContent = kind === 'reward' ? 'Shows in the Redeem window. Tourists get it with their points.' : 'Shows in the Get tickets window. Tourists get it with their points.';
    const cur = item ? item.icon : (kind === 'reward' ? 'fa-gift' : 'fa-ticket');
    const list = TI_ICONS.includes(cur) ? TI_ICONS : [cur, ...TI_ICONS];
    g('ti-icons').dataset.icon = cur;
    g('ti-icons').innerHTML = list.map(ic => `<button type="button" class="ti-icon${ic === cur ? ' on' : ''}" data-icon="${esc(ic)}" role="radio" aria-checked="${ic === cur}" aria-label="${esc(ic.replace('fa-', '').replace(/-/g, ' '))}"><i class="fas ${esc(ic)}"></i></button>`).join('');
    g('ti-used').hidden = !(item && item.used); g('ti-used').innerHTML = item && item.used ? `<i class="fas fa-circle-info"></i> ${item.used} already redeemed, and these count toward the slots. Set slots above ${item.used} to keep it open.` : '';
    g('ti-delete').hidden = !item;
    g('ti-modal').classList.add('active');
    setTimeout(() => g('ti-name').focus(), 200);
}
document.getElementById('ti-icons').addEventListener('click', e => {
    const b = e.target.closest('.ti-icon'); if (!b) return;
    const box = document.getElementById('ti-icons'); box.dataset.icon = b.dataset.icon;
    box.querySelectorAll('.ti-icon').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
});
document.getElementById('close-ti-modal').addEventListener('click', () => document.getElementById('ti-modal').classList.remove('active'));
document.getElementById('ti-form').addEventListener('submit', async e => {
    e.preventDefault();
    const g = id => document.getElementById(id), fd = new FormData();
    fd.append('action', 'save'); fd.append('id', g('ti-id').value); fd.append('kind', g('ti-kind').value);
    fd.append('name', g('ti-name').value.trim()); fd.append('cost', g('ti-cost').value); fd.append('slots', g('ti-slots').value.trim()); fd.append('icon', g('ti-icons').dataset.icon || 'fa-ticket');
    const btn = g('ti-save'); btn.disabled = true;
    let d; try { d = await (await fetch('api/ticket_items_api.php', { method: 'POST', body: fd })).json(); } catch (x) { d = { success: false, message: 'No connection.' }; }
    btn.disabled = false;
    if (!d.success) return showNotification(d.message, 'danger');
    showNotification(d.message); g('ti-modal').classList.remove('active');
    await reloadTicketItems(); refreshRedeemUI(); addToActivity();
});
async function deleteTiItem(item) {
    if (!item || currentUser?.role !== 'admin') return;
    if (!confirm(`Delete "${item.name}"?\n\nTourists won't be able to get it anymore. Tickets already given out stay valid.`)) return;
    const fd = new FormData(); fd.append('action', 'delete'); fd.append('id', item.id);
    let d; try { d = await (await fetch('api/ticket_items_api.php', { method: 'POST', body: fd })).json(); } catch (x) { d = { success: false, message: 'No connection.' }; }
    showNotification(d.message, d.success ? 'success' : 'danger');
    if (d.success) { document.getElementById('ti-modal').classList.remove('active'); await reloadTicketItems(); refreshRedeemUI(); addToActivity(); }
}
document.getElementById('ti-delete').addEventListener('click', () => deleteTiItem(dbTicketItems.find(i => i.id == document.getElementById('ti-id').value)));
document.getElementById('close-ticket-confirm').addEventListener('click', () => document.getElementById('ticket-confirm-modal').classList.remove('active'));
document.getElementById('download-ticket-btn').addEventListener('click', async () => {
    const src = document.getElementById('ticket-qr-img').src, code = document.getElementById('ticket-code-display').textContent || 'ticket';
    try {
        const blob = await (await fetch(src)).blob(); const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `LakbayNaguilian_${code}.png`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
        showNotification('Ticket saved!');
    } catch (e) { window.open(src, '_blank'); }
});

let MT_TAB = 'all';
function renderMyTickets() {
    const grid = document.getElementById('mytickets-grid'), sum = document.getElementById('mt-sum'), tabs = document.getElementById('mt-tabs');
    sum.hidden = tabs.hidden = !myTickets.length;
    if (myTickets.length === 0) {
        grid.innerHTML = `<div class="empty-state mt-empty"><i class="fas fa-ticket"></i><h3>No tickets yet</h3><p>Trade your points for entry tickets, experiences and rewards.</p>
            <button type="button" class="btn-primary mt-get" onclick="document.getElementById('tickets-btn').click()"><i class="fas fa-ticket"></i> Get tickets</button></div>`;
        return;
    }
    const active = myTickets.filter(t => t.status !== 'used'), used = myTickets.filter(t => t.status === 'used');
    const spent = myTickets.reduce((a, t) => a + (parseInt(t.points) || 0), 0);
    sum.innerHTML = [['teal', 'fa-ticket', active.length, 'Ready to use'], ['gray', 'fa-circle-check', used.length, 'Claimed'], ['amber', 'fa-coins', spent.toLocaleString(), 'Points spent']]
        .map(([c, i, n, l]) => `<div><span class="mv-ic ${c}"><i class="fas ${i}"></i></span><div><b>${n}</b><span>${l}</span></div></div>`).join('');
    tabs.innerHTML = [['all', 'All', myTickets.length], ['active', 'Ready to use', active.length], ['used', 'Claimed', used.length]]
        .map(([k, l, n]) => `<button type="button" class="us-tab${MT_TAB === k ? ' on' : ''}" data-mt="${k}" role="tab">${l} <em>${n}</em></button>`).join('');
    const ready = t => `<div class="mt2 is-active">
            <div class="mt2-top"><span class="mt2-ic"><i class="fas ${esc(t.icon)}"></i></span><div class="mt2-name"><b>${esc(t.name)}</b><small>${t.kind === 'reward' ? 'Reward' : 'Ticket'} · ${fmtDate(t.created_at)}</small></div><span class="mt2-badge">Ready</span></div>
            <div class="mt2-cut"></div>
            <div class="mt2-qr"><img src="${TourgoQR.toDataURL(String(t.qr), 300, '#000000', '#ffffff', 4)}" alt="Ticket QR code"></div>
            <div class="mt2-code"><small>Ticket code</small><b>${esc(t.code)}</b></div>
            <p class="mt2-note"><i class="fas fa-circle-info"></i> Show this QR at the Naguilian Tourism Office</p>
            <div class="mt2-foot"><span><i class="fas fa-coins"></i> ${parseInt(t.points).toLocaleString()} pts</span></div></div>`;
    const claimed = t => `<div class="mt2-row"><span class="mt2-ic"><i class="fas ${esc(t.icon)}"></i></span><div class="mt2-name"><b>${esc(t.name)}</b><small><i class="fas fa-circle-check"></i> Claimed ${esc(fmtDateTime(t.used_at))}</small></div><span class="mt2-rcode">${esc(t.code)}</span></div>`;
    const showA = MT_TAB !== 'used', showU = MT_TAB !== 'active';
    grid.innerHTML = (showA ? (active.length ? `<div class="mt2-grid">${active.map(ready).join('')}</div>` : `<p class="mt2-none"><i class="fas fa-ticket"></i> No tickets ready to use. <button type="button" onclick="document.getElementById('tickets-btn').click()">Get tickets</button></p>`) : '')
        + (showU && used.length ? `${MT_TAB === 'all' ? '<h4 class="mv-month">Claimed</h4>' : ''}<div class="mt2-list">${used.map(claimed).join('')}</div>` : '')
        + (MT_TAB === 'used' && !used.length ? '<p class="mt2-none"><i class="fas fa-circle-check"></i> Nothing claimed yet.</p>' : '');
}
document.getElementById('mt-tabs').addEventListener('click', e => { const b = e.target.closest('[data-mt]'); if (b) { MT_TAB = b.dataset.mt; renderMyTickets(); } });

async function runTicketCheck(el, code, token) {
    if (!currentUser) return scanErr('fa-user-lock', 'Please log in', 'Log in as the admin to check tickets.');
    if (currentUser.role !== 'admin') {
        const mine = myTickets.find(t => t.code === code);
        return `<div class="tv tv-info"><div class="tv-ic"><i class="fas fa-ticket"></i></div><h4>This is a LakbayNaguilian ${mine && mine.kind === 'reward' ? 'reward' : 'ticket'}</h4>
            <p>${mine ? `It's your <b>${esc(mine.name)}</b>. ` : ''}Show this QR code to the staff at the Naguilian Tourism Office. They will scan it to give it to you.</p></div>`;
    }
    if (!token)
        return `<div class="tv tv-bad"><div class="tv-ic"><i class="fas fa-clock-rotate-left"></i></div><h4>Old ticket</h4><p>This ticket was made with an older version of LakbayNaguilian and cannot be checked. Ask the tourist to open <b>My Tickets</b> and show a ticket from there.</p><small class="tv-code">${esc(code)}</small></div>`;
    el.innerHTML = '<p style="text-align:center;color:var(--gray);padding:14px 0;"><i class="fas fa-spinner fa-spin"></i> Checking ticket...</p>';
    const call = async action => {
        const fd = new FormData(); fd.append('action', action); fd.append('code', code); fd.append('token', token);
        return (await fetch('api/redeem_points.php', { method: 'POST', body: fd })).json();
    };
    let d;
    try { d = await call('verify'); } catch (e) { return scanErr('fa-wifi', 'No connection', 'Could not reach the server. Try again.'); }
    if (!d.success) return `<div class="tv tv-bad"><div class="tv-ic"><i class="fas fa-circle-xmark"></i></div><h4>Not a valid ticket</h4><p>${esc(d.message || 'This ticket was not found.')}</p><small class="tv-code">${esc(code)}</small></div>`;
    const draw = (t, justClaimed) => {
        const used = t.status === 'used';
        const banner = justClaimed ? ['tv-ok', 'fa-circle-check', 'Claimed! Give the item to the tourist.']
            : used ? ['tv-warn', 'fa-triangle-exclamation', `Already claimed ${fmtDateTime(t.used_at)}${t.used_by_name ? ' by ' + esc(t.used_by_name) : ''}`]
            : ['tv-ok', 'fa-circle-check', 'Valid ticket. Not used yet.'];
        el.innerHTML = `<div class="tv ${banner[0]}">
            <div class="tv-banner"><i class="fas ${banner[1]}"></i> ${banner[2]}</div>
            <div class="tv-item"><span class="tv-item-ic"><i class="fas ${esc(t.icon)}"></i></span><div><small>${t.kind === 'reward' ? 'Reward' : 'Ticket'}</small><b>${esc(t.name)}</b></div><em>${t.points.toLocaleString()} pts</em></div>
            <dl class="tv-rows">
                <div><dt>Tourist</dt><dd>${esc(t.holder_name || 'Deleted account')}${t.holder_email ? `<small>${esc(t.holder_email)}</small>` : ''}</dd></div>
                <div><dt>Redeemed</dt><dd>${esc(fmtDateTime(t.created_at))}</dd></div>
                <div><dt>Code</dt><dd class="tv-mono">${esc(t.code)}</dd></div>
                <div><dt>Status</dt><dd><span class="ticket-status-badge ${used ? 'used' : 'active'}">${used ? 'Claimed' : 'Active'}</span></dd></div>
            </dl>
            ${used ? '' : '<button type="button" class="btn-primary tv-claim"><i class="fas fa-hand-holding-heart"></i> Mark as claimed</button>'}
        </div>`;
        const btn = el.querySelector('.tv-claim');
        if (btn) btn.onclick = async () => {
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            try { const r = await call('claim'); if (r.success) { draw(r.ticket, r.claimed_now); showNotification(r.claimed_now ? `${r.ticket.name} claimed` : 'This ticket was already claimed', r.claimed_now ? 'success' : 'danger'); } else { btn.disabled = false; showNotification(r.message, 'danger'); } }
            catch (e) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-hand-holding-heart"></i> Mark as claimed'; showNotification('Network error', 'danger'); }
        };
    };
    draw(d.ticket, false);
    return null;
}

document.getElementById('admin-reviews-btn').addEventListener('click', () => showPage('admin-reviews'));
document.getElementById('analytics-btn').addEventListener('click', () => showPage('analytics'));

async function renderAdminPlaceReviews() {
    const grid = document.getElementById('places-reviews-grid');
    const statsEl = document.getElementById('places-reviews-stats');
    grid.innerHTML = '<p class="prc-msg"><i class="fas fa-spinner fa-spin"></i> Loading places...</p>';

    try {
        const spotsRes = await fetch('api/get_data.php?type=spots');
        const spots = await spotsRes.json();
        const reviewsRes = await fetch('api/get_data.php?type=all_reviews');
        const allReviews = await reviewsRes.json();
        grid.innerHTML = '';

        if (!Array.isArray(spots) || spots.length === 0) {
            if (statsEl) statsEl.innerHTML = '';
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-map-marker-alt"></i><p>No spots available yet.</p></div>';
            return;
        }

        const spotReviewsAll = allReviews.filter(r => r.item_type === 'spot');
        const overall = spotReviewsAll.length ? (spotReviewsAll.reduce((n, r) => n + parseInt(r.rating), 0) / spotReviewsAll.length).toFixed(1) : '0.0';
        if (statsEl) statsEl.innerHTML = `
            <div class="prc-stat"><span class="prc-stat-ico"><i class="fas fa-location-dot"></i></span><div><b>${spots.length}</b><small>Places</small></div></div>
            <div class="prc-stat"><span class="prc-stat-ico amber"><i class="fas fa-comments"></i></span><div><b>${spotReviewsAll.length}</b><small>Reviews</small></div></div>
            <div class="prc-stat"><span class="prc-stat-ico gold"><i class="fas fa-star"></i></span><div><b>${overall}</b><small>Average rating</small></div></div>`;

        spots.forEach(spot => {
            const spotReviews = allReviews.filter(r => r.item_type === 'spot' && r.item_id == spot.id);
            const avgRating = spotReviews.length > 0
                ? (spotReviews.reduce((sum, r) => sum + parseInt(r.rating), 0) / spotReviews.length).toFixed(1)
                : Number(spot.rating || 0).toFixed(1);
            const reviewCount = spotReviews.length || parseInt(spot.review_count) || 0;

            const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
            spotReviews.forEach(r => {
                const rating = parseInt(r.rating);
                if (ratingDist[rating] !== undefined) ratingDist[rating]++;
            });
            const maxDist = Math.max(1, ...Object.values(ratingDist));
            const mini = [5, 4, 3, 2, 1].map(n => `<i style="height:${Math.max(6, (ratingDist[n] / maxDist) * 100)}%" class="${ratingDist[n] ? 'on' : ''}" title="${n} star: ${ratingDist[n]}"></i>`).join('');

            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'place-review-card';
            card.onclick = () => window.openPlaceReviewDetails(spot.id, spot.name, spot.image_url, spot.category, avgRating, reviewCount, spotReviews, ratingDist, spot.description, spot.points_reward, spot.location);

            card.innerHTML = `
                <div class="prc-img">
                    <img src="${esc(spot.image_url)}" alt="${esc(spot.name)}" loading="lazy">
                    <span class="prc-cat">${esc(catName(spot.category))}</span>
                    <span class="prc-rate"><i class="fas fa-star"></i> ${avgRating}</span>
                </div>
                <div class="prc-body">
                    <h4>${esc(spot.name)}</h4>
                    <p class="prc-loc"><i class="fas fa-location-dot"></i> ${esc(spot.location)}</p>
                    <div class="prc-mid">
                        <div class="prc-stars"><span class="prc-starrow">${getStarsHTML(avgRating)}</span><small>${reviewCount} review${reviewCount !== 1 ? 's' : ''}</small></div>
                        <div class="prc-mini" aria-hidden="true">${mini}</div>
                    </div>
                    <div class="prc-foot">
                        <span class="prc-pts"><i class="fas fa-coins"></i> +${esc(spot.points_reward)} pts</span>
                        <span class="prc-go">View reviews <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>`;
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = '<p class="prc-msg error">Failed to load places.</p>';
    }
}

window.openPlaceReviewDetails = function (spotId, spotName, spotImage, spotCategory, avgRating, reviewCount, reviews, ratingDist, description, points, spotLocation) {
    document.getElementById('place-details-modal')?.remove();
    const R = { filter: 'all', sort: 'new', reviews: reviews.slice(), replying: null };
    const modal = document.createElement('div');
    modal.id = 'place-details-modal'; modal.className = 'modal';
    const fmtD = d => { const x = new Date(String(d).replace(' ', 'T')); return isNaN(x) ? '' : x.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }); };
    const needsReply = () => R.reviews.filter(r => !r.admin_reply).length;

    modal.innerHTML = `
        <div class="modal-content dx-card sx-card pr2-card">
            <button type="button" class="dx-close sx-close prd-close" aria-label="Close"><i class="fas fa-times"></i></button>
            <div class="dx-scroll">
                <div class="sx-hero"><img src="${esc(spotImage)}" alt="">
                    <div class="sx-hero-txt">${catBadge(spotCategory, 'sx-chip')}<h2 class="sx-title">${esc(spotName)}</h2>${spotLocation ? `<p class="sx-loc"><i class="fas fa-location-dot"></i> ${esc(spotLocation)}</p>` : ''}</div></div>
                <div class="sx-stats pr2-stats"></div>
                <div class="sx-body">
                    <section class="sx-sec"><h3><span class="sx-h-ic gold"><i class="fas fa-star"></i></span> Ratings</h3><div class="sx-rsum pr2-rsum"></div></section>
                    ${description ? `<section class="sx-sec"><h3><span class="sx-h-ic"><i class="fas fa-circle-info"></i></span> About this place</h3><p class="dx-about sx-about pr2-about">${esc(description)}</p></section>` : ''}
                    <section class="sx-sec">
                        <div class="pr2-revhead"><h3><span class="sx-h-ic"><i class="fas fa-comments"></i></span> Guest reviews <small class="pr2-count"></small></h3>
                            <span class="an-sel pr2-sort"><i class="fas fa-arrow-down-wide-short"></i><select aria-label="Sort reviews"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="low">Lowest rating first</option><option value="high">Highest rating first</option></select><i class="fas fa-chevron-down an-sel-caret"></i></span></div>
                        <div class="pr2-chips"></div>
                        <div class="pr2-list"></div>
                    </section>
                    <button type="button" class="dx-ghost pr2-open"><i class="fas fa-up-right-from-square"></i> Open this spot's page</button>
                </div>
            </div>
        </div>`;

    function draw() {
        const n = R.reviews.length;
        const avg = n ? R.reviews.reduce((a, r) => a + (parseInt(r.rating) || 0), 0) / n : parseFloat(avgRating) || 0;
        modal.querySelector('.pr2-stats').innerHTML = `
            <div class="sx-stat"><span class="sx-stat-ic gold"><i class="fas fa-star"></i></span><div><small>Average</small><b>${avg.toFixed(1)}</b><em>out of 5</em></div></div>
            <div class="sx-stat"><span class="sx-stat-ic teal"><i class="fas fa-comments"></i></span><div><small>Reviews</small><b>${n}</b><em>${R.reviews.filter(r => (r.comment || '').trim()).length} with comments</em></div></div>
            <div class="sx-stat ${needsReply() ? 'pr2-need' : ''}"><span class="sx-stat-ic amber"><i class="fas fa-reply"></i></span><div><small>Not replied</small><b>${needsReply()}</b><em>${needsReply() ? 'waiting for you' : 'all answered'}</em></div></div>`;
        const rs = modal.querySelector('.pr2-rsum'); rs.innerHTML = ratingSummaryHTML(R.reviews) || '<p class="pr2-none">No ratings yet.</p>';
        const cnt = s => R.reviews.filter(r => parseInt(r.rating) === s).length;
        modal.querySelector('.pr2-chips').innerHTML = [['all', 'All', n], ...[5, 4, 3, 2, 1].map(s => [String(s), `${s}<i class="fas fa-star"></i>`, cnt(s)]), ['reply', 'Not replied', needsReply()]]
            .map(([k, l, c]) => `<button type="button" class="pr2-chip${R.filter === k ? ' on' : ''}${k === 'reply' && c ? ' warn' : ''}" data-f="${k}" ${c || k === 'all' ? '' : 'disabled'}>${l} <em>${c}</em></button>`).join('');
        let list = R.reviews.filter(r => R.filter === 'all' || (R.filter === 'reply' ? !r.admin_reply : parseInt(r.rating) === +R.filter));
        const time = r => new Date(String(r.created_at).replace(' ', 'T')).getTime() || 0;
        list.sort({ new: (a, b) => time(b) - time(a), old: (a, b) => time(a) - time(b), low: (a, b) => a.rating - b.rating || time(b) - time(a), high: (a, b) => b.rating - a.rating || time(b) - time(a) }[R.sort]);
        modal.querySelector('.pr2-count').textContent = list.length === n ? `${n}` : `${list.length} of ${n}`;
        const admin = currentUser?.role === 'admin';
        modal.querySelector('.pr2-list').innerHTML = list.length ? list.map(r => `
            <article class="pr2-rev" data-id="${r.id}">
                <div class="pr2-rev-top"><span class="pr2-av">${esc((r.user_name || '?').charAt(0).toUpperCase())}</span>
                    <div><b>${esc(r.user_name)}</b><span class="pr2-stars">${getStarsHTML(r.rating)}</span></div><time>${fmtD(r.created_at)}</time></div>
                ${(r.comment || '').trim() ? `<p class="pr2-text">${esc(r.comment)}</p>` : '<p class="pr2-text muted">Rated without a comment.</p>'}
                ${R.replying == r.id ? `<form class="pr2-reply-form"><textarea maxlength="1000" placeholder="Write a reply to ${esc(r.user_name)}..." required>${esc(r.admin_reply || '')}</textarea>
                        <div><button type="button" class="dx-ghost pr2-cancel">Cancel</button><button type="submit" class="btn-primary pr2-send"><i class="fas fa-paper-plane"></i> ${r.admin_reply ? 'Save reply' : 'Send reply'}</button></div></form>`
                    : r.admin_reply ? `<div class="pr2-reply"><i class="fas fa-reply"></i><div><strong>Tourism office replied</strong><span>${esc(r.admin_reply)}</span></div>${admin ? '<button type="button" class="pr2-edit" aria-label="Edit reply"><i class="fas fa-pen"></i></button>' : ''}</div>`
                    : admin ? '<button type="button" class="pr2-reply-btn"><i class="fas fa-reply"></i> Reply</button>' : ''}
            </article>`).join('')
            : `<div class="prd-empty"><i class="far fa-comment-dots"></i><p>${n ? 'No reviews match this filter.' : 'No reviews yet for this place.'}</p></div>`;
        const ta = modal.querySelector('.pr2-reply-form textarea'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
    }

    modal.addEventListener('click', async e => {
        if (e.target === modal || e.target.closest('.prd-close')) return modal.classList.remove('active');
        const chip = e.target.closest('.pr2-chip'); if (chip && !chip.disabled) { R.filter = chip.dataset.f; R.replying = null; return draw(); }
        if (e.target.closest('.pr2-open')) { modal.classList.remove('active'); return window.openSpotDetails(spotId); }
        const card = e.target.closest('.pr2-rev'); if (!card) return;
        if (e.target.closest('.pr2-reply-btn, .pr2-edit')) { R.replying = card.dataset.id; return draw(); }
        if (e.target.closest('.pr2-cancel')) { R.replying = null; return draw(); }
    });
    modal.addEventListener('change', e => { if (e.target.closest('.pr2-sort')) { R.sort = e.target.value; draw(); } });
    modal.addEventListener('submit', async e => {
        e.preventDefault();
        const card = e.target.closest('.pr2-rev'), text = e.target.querySelector('textarea').value.trim(); if (!text) return;
        const btn = e.target.querySelector('.pr2-send'); btn.disabled = true;
        const fd = new FormData(); fd.append('review_id', card.dataset.id); fd.append('admin_reply', text);
        let d; try { d = await (await fetch('api/add_admin_reply.php', { method: 'POST', body: fd })).json(); } catch (x) { d = { success: false, message: 'No connection.' }; }
        if (!d.success) { btn.disabled = false; return showNotification(d.message || 'Could not send the reply.', 'danger'); }
        const r = R.reviews.find(x => x.id == card.dataset.id); if (r) r.admin_reply = text;
        R.replying = null; draw(); showNotification('Reply sent!'); addToActivity();
        if (document.getElementById('admin-reviews-view').classList.contains('active')) renderAdminPlaceReviews();
    });

    document.body.appendChild(modal);
    draw();
    setTimeout(() => modal.classList.add('active'), 10);
};
function searchFilter(items, inputId, countId, grid, noneTitle) {
    const raw = document.getElementById(inputId)?.value.trim() || '';
    const words = raw.toLowerCase().split(/\s+/).filter(Boolean);
    const count = document.getElementById(countId);
    if (!words.length) { if (count) count.textContent = ''; return items; }
    const found = items.filter(it => {
        const hay = [it.name, it.location, it.category, it.description, it.features].join(' ').toLowerCase();
        return words.every(w => hay.includes(w));
    });
    if (count) count.textContent = `${found.length} found`;
    if (items.length && !found.length) grid.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>${noneTitle}</h3><p>Nothing matches "${esc(raw)}".</p></div>`;
    return found;
}
function setupSearchBox(cfg) {
    const box = document.getElementById(cfg.boxId), input = box.querySelector('input'), drop = box.querySelector('.ls-drop'), clear = box.querySelector('.ls-clear');
    let hits = [], active = -1;
    const mark = (text, words) => {
        const re = new RegExp('(' + words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'ig');
        return String(text ?? '').split(re).map((part, i) => i % 2 ? `<mark>${esc(part)}</mark>` : esc(part)).join('');
    };
    function close() { drop.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; }
    function pick(i) { const it = hits[i]; if (!it) return; close(); input.blur(); cfg.open(it.id); }
    function setActive(i) {
        const rows = drop.querySelectorAll('.ls-item'); if (!rows.length) return;
        active = (i + rows.length) % rows.length;
        rows.forEach((r, j) => r.classList.toggle('active', j === active));
        rows[active].scrollIntoView({ block: 'nearest' });
    }
    function show() {
        const raw = input.value.trim(), words = raw.toLowerCase().split(/\s+/).filter(Boolean);
        clear.hidden = !raw;
        if (!words.length) { hits = []; close(); return; }
        hits = cfg.items().filter(it => { const hay = [it.name, it.location, it.category, it.description, it.features].join(' ').toLowerCase(); return words.every(w => hay.includes(w)); });
        active = -1;
        drop.innerHTML = hits.length
            ? `<div class="ls-drop-head">${hits.length} result${hits.length === 1 ? '' : 's'}</div>` + hits.slice(0, 8).map((it, i) => `<button type="button" class="ls-item" role="option" data-i="${i}">
                    <img src="${esc(it.image_url)}" alt="" loading="lazy">
                    <span class="ls-item-txt"><b>${mark(it.name, words)}</b><small><i class="fas ${cfg.placeIcon}"></i> ${mark(it.location || '', words)}</small></span>
                    <span class="ls-item-side"><em>${esc(it.points_reward !== undefined ? catName(it.category) : (it.category || ''))}</em>${cfg.badge(it)}</span>
                </button>`).join('')
            : `<div class="ls-none"><i class="fas fa-search"></i> No match for "${esc(raw)}"</div>`;
        drop.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    input.addEventListener('input', () => { cfg.render(); show(); });
    input.addEventListener('focus', show);
    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (drop.hidden) show(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Enter') { if (active >= 0) { e.preventDefault(); pick(active); } else close(); }
        else if (e.key === 'Escape') close();
    });
    drop.addEventListener('mousedown', e => e.preventDefault());
    drop.addEventListener('click', e => { const b = e.target.closest('.ls-item'); if (b) pick(+b.dataset.i); });
    clear.addEventListener('click', () => { input.value = ''; cfg.render(); show(); input.focus(); });
    document.addEventListener('click', e => { if (!box.contains(e.target)) close(); });
}
setupSearchBox({ boxId: 'spot-search-box', items: () => dbSpots, render: () => renderTouristSpots(), open: id => window.openSpotDetails(id), placeIcon: 'fa-map-marker-alt',
    badge: s => `<span class="ls-badge pts"><i class="fas fa-coins"></i> +${esc(s.points_reward)}</span>` });
setupSearchBox({ boxId: 'product-search-box', items: () => dbProducts, render: () => renderProducts(), open: id => window.openProductDetails(id), placeIcon: 'fa-store',
    badge: p => `<span class="ls-badge price">₱${parseFloat(p.price || 0).toLocaleString()}</span>` });

function itemPhotos(item) {
    return [item.image_url, ...(item.photos || []).map(p => p.image_url)].filter(Boolean);
}
function setupGallery(boxId, imgId, item) {
    const box = document.getElementById(boxId), img = document.getElementById(imgId);
    box.querySelectorAll('.gl-ui').forEach(el => el.remove());
    const pics = itemPhotos(item);
    let i = 0;
    const show = n => {
        i = (n + pics.length) % pics.length;
        img.src = pics[i];
        box.querySelectorAll('.gl-thumb').forEach((t, j) => t.classList.toggle('on', j === i));
        const c = box.querySelector('.gl-count'); if (c) c.textContent = `${i + 1} / ${pics.length}`;
        const on = box.querySelector('.gl-thumb.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const ui = document.createElement('div'); ui.className = 'gl-ui';
    ui.innerHTML = `<button type="button" class="gl-zoom" aria-label="View full screen"><i class="fas fa-expand"></i></button>` + (pics.length > 1 ? `
        <button type="button" class="gl-nav prev" aria-label="Previous photo"><i class="fas fa-chevron-left"></i></button>
        <button type="button" class="gl-nav next" aria-label="Next photo"><i class="fas fa-chevron-right"></i></button>
        <span class="gl-count"></span>
        <div class="gl-thumbs">${pics.map((p, j) => `<button type="button" class="gl-thumb" data-i="${j}" aria-label="Photo ${j + 1}"><img src="${esc(p)}" alt="" loading="lazy"></button>`).join('')}</div>` : '');
    box.appendChild(ui);
    ui.querySelector('.gl-zoom').onclick = () => openLightbox(pics, i);
    img.onclick = () => openLightbox(pics, i);
    if (pics.length > 1) {
        ui.querySelector('.prev').onclick = () => show(i - 1);
        ui.querySelector('.next').onclick = () => show(i + 1);
        ui.querySelectorAll('.gl-thumb').forEach(t => t.onclick = () => show(+t.dataset.i));
        let x0 = null;
        img.ontouchstart = e => { x0 = e.touches[0].clientX; };
        img.ontouchend = e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); };
    } else { img.ontouchstart = img.ontouchend = null; }
    box.classList.toggle('gl-many', pics.length > 1);
    show(0);
}

const LB = { pics: [], i: 0, el: null };
function openLightbox(pics, start) {
    if (!LB.el) {
        LB.el = document.createElement('div'); LB.el.className = 'lb'; LB.el.hidden = true;
        LB.el.innerHTML = `<button type="button" class="lb-close" aria-label="Close"><i class="fas fa-times"></i></button>
            <button type="button" class="lb-nav prev" aria-label="Previous photo"><i class="fas fa-chevron-left"></i></button>
            <img class="lb-img" alt=""><button type="button" class="lb-nav next" aria-label="Next photo"><i class="fas fa-chevron-right"></i></button>
            <div class="lb-bar"><span class="lb-count"></span><div class="lb-thumbs"></div></div>`;
        document.body.appendChild(LB.el);
        LB.el.querySelector('.lb-close').onclick = closeLightbox;
        LB.el.querySelector('.prev').onclick = () => lbShow(LB.i - 1);
        LB.el.querySelector('.next').onclick = () => lbShow(LB.i + 1);
        LB.el.addEventListener('click', e => { if (e.target === LB.el) closeLightbox(); });
        LB.el.querySelector('.lb-thumbs').addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (t) lbShow(+t.dataset.i); });
        let x0 = null; const im = LB.el.querySelector('.lb-img');
        im.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
        im.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) lbShow(LB.i + (dx < 0 ? 1 : -1)); });
        window.addEventListener('keydown', e => {
            if (LB.el.hidden) return;
            if (e.key === 'Escape') { e.stopPropagation(); closeLightbox(); }
            else if (e.key === 'ArrowLeft') lbShow(LB.i - 1);
            else if (e.key === 'ArrowRight') lbShow(LB.i + 1);
        }, true);
    }
    LB.pics = pics;
    const many = pics.length > 1;
    LB.el.classList.toggle('lb-many', many);
    LB.el.querySelector('.lb-thumbs').innerHTML = many ? pics.map((p, j) => `<button type="button" data-i="${j}"><img src="${esc(p)}" alt=""></button>`).join('') : '';
    LB.el.hidden = false; document.body.classList.add('lb-open');
    lbShow(start || 0);
}
function lbShow(n) {
    LB.i = (n + LB.pics.length) % LB.pics.length;
    LB.el.querySelector('.lb-img').src = LB.pics[LB.i];
    LB.el.querySelector('.lb-count').textContent = LB.pics.length > 1 ? `${LB.i + 1} / ${LB.pics.length}` : '';
    LB.el.querySelectorAll('.lb-thumbs button').forEach((b, j) => b.classList.toggle('on', j === LB.i));
}
function closeLightbox() { LB.el.hidden = true; document.body.classList.remove('lb-open'); }

function renderTouristSpots() {
    const grid = document.getElementById('spots-grid'); grid.innerHTML = '';
    const isAdmin = currentUser?.role === 'admin';
    if (!dbSpots.length) grid.innerHTML = `<div class="empty-state"><i class="fas fa-camera"></i><h3>No tourist spots yet</h3><p>${isAdmin ? 'Tap <b>Add Spot</b> to add your first tourist spot.' : 'Tourist spots will show up here soon.'}</p></div>`;
    searchFilter(dbSpots, 'spot-search', 'spot-search-count', grid, 'No spots found').forEach(spot => {
        const card = document.createElement('div'); card.className = 'spot-card';
        card.onclick = (e) => {
            if (!e.target.closest('.admin-edit-icon')) {
                window.openSpotDetails(spot.id);
            }
        };
        card.className = 'spot-card tc-card';
        const sc = catInfo(spot.category), n = parseInt(spot.review_count) || 0, pts = parseInt(spot.points_reward) || 0;
        card.innerHTML = `<div class="tc-img">
                <img loading="lazy" decoding="async" src="${esc(spot.image_url)}" alt="">
                <span class="tc-cat"><i style="background:${sc.color}"></i>${esc(catName(spot.category))}</span>
                ${isAdmin ? `<button class="admin-edit-icon tc-edit" onclick="window.openEditSpot(${spot.id})" title="Edit spot" aria-label="Edit spot"><i class="fas fa-pen"></i></button>` : ''}
                ${pts ? `<span class="tc-tag pts"><i class="fas fa-coins"></i> +${pts} pts</span>` : ''}
            </div>
            <div class="tc-body">
                <h3 class="tc-title">${esc(spot.name)}</h3>
                <p class="tc-sub"><i class="fas fa-location-dot"></i> ${esc(spot.location || 'Naguilian, La Union')}</p>
                ${spot.description ? `<p class="tc-desc">${esc(spot.description)}</p>` : ''}
                <div class="tc-foot">${n ? `<span class="tc-rate"><i class="fas fa-star"></i> ${esc(spot.rating)} <small>(${n} review${n === 1 ? '' : 's'})</small></span>` : '<span class="tc-rate none"><i class="far fa-star"></i> No reviews yet</span>'}<span class="tc-go">View <i class="fas fa-arrow-right"></i></span></div>
            </div>`;
        grid.appendChild(card);
    });
}

window.openSpotDetails = async function(id) {
    const spot = dbSpots.find(s => s.id == id); if (!spot) return;
    const modal = document.getElementById('spot-details-modal');
    if (!modal.classList.contains('active')) modal.querySelector('.dx-scroll').scrollTop = 0;
    currentSpotId = id; currentSpotRating = 0;
    setupGallery('spot-gallery', 'spot-detail-img', spot);
    document.getElementById('spot-detail-stars').innerHTML = getStarsHTML(spot.rating);
    document.getElementById('spot-detail-category').textContent = catName(spot.category);
    document.getElementById('spot-detail-title').textContent = spot.name;
    document.getElementById('spot-detail-rating').textContent = spot.rating;
    document.getElementById('spot-review-count').textContent = `(${spot.review_count||0})`;
    document.getElementById('spot-detail-points').textContent = `+${spot.points_reward} pts`;
    document.getElementById('spot-detail-location').textContent = spot.location;
    document.getElementById('spot-detail-description').textContent = spot.description;
    const spotFeat = featureChips(spot.features);
    document.getElementById('spot-detail-features').innerHTML = spotFeat;
    document.getElementById('spot-detail-features').closest('.sx-sec').hidden = !spotFeat;
    document.querySelectorAll('#spot-star-input i').forEach(s => s.classList.remove('active'));
    document.getElementById('spot-comment-input').value = '';
    document.getElementById('admin-qr-actions').style.display = (currentUser?.role === 'admin') ? 'contents' : 'none';
    const visits = getVisits().filter(v => v.spotId == spot.id);
    const tile = document.getElementById('spot-visit-tile');
    tile.classList.toggle('is-done', visits.length > 0);
    document.getElementById('spot-visit-status').textContent = visits.length ? (visits.length > 1 ? `Visited ${visits.length} times` : 'Visited') : 'Not yet';
    document.getElementById('spot-visit-sub').textContent = visits.length ? `Last: ${fmtDate(visits[0].date)}` : 'Scan the QR here to check in';
    modal.classList.add('active');
    loadReviewsInto('spot-reviews-list', 'spot', id);
    showSpotMiniMap(spot);
}

function featureChips(str) {
    const icons = [[/hand ?made|hand-?woven|woven|craft/i, 'fa-hand-sparkles'], [/organic|natural|no preservative/i, 'fa-leaf'], [/ingredient|local|native|farm/i, 'fa-seedling'],
        [/wine|basi|drink|juice|beverage/i, 'fa-wine-bottle'], [/coffee|tea/i, 'fa-mug-hot'], [/sweet|candy|delicacy|dessert|kakanin/i, 'fa-candy-cane'], [/gift|souvenir|pasalubong/i, 'fa-gift'],
        [/wood|bamboo|rattan|abaca/i, 'fa-tree'], [/durable|quality|sturdy/i, 'fa-shield-halved'], [/pack|size|piece|bottle|kg|gram|ml\b/i, 'fa-box'], [/fresh|daily/i, 'fa-clock'], [/price|cheap|afford/i, 'fa-tags'],
        [/park/i, 'fa-square-parking'], [/rest ?room|toilet|\bcr\b|comfort/i, 'fa-restroom'], [/swim|pool/i, 'fa-person-swimming'], [/food|restaurant|eat|cafe|dining|snack/i, 'fa-utensils'],
        [/view|scenic|sunset|sunrise|overlook/i, 'fa-binoculars'], [/hik|trail|trek|walk/i, 'fa-person-hiking'], [/wi-?fi|internet/i, 'fa-wifi'], [/camp|tent/i, 'fa-campground'], [/photo|picture|instagram/i, 'fa-camera'],
        [/shop|souvenir|store|pasalubong|market/i, 'fa-store'], [/picnic|cottage|hut|shed/i, 'fa-umbrella-beach'], [/water|fall|river|spring|lake|beach/i, 'fa-water'], [/church|history|heritage|museum|culture/i, 'fa-landmark'],
        [/family|kid|child/i, 'fa-children'], [/free|entrance|fee|ticket/i, 'fa-ticket'], [/guide|tour/i, 'fa-flag'], [/bike|cycl/i, 'fa-bicycle'], [/fish/i, 'fa-fish'], [/garden|tree|forest|nature|plant/i, 'fa-tree']];
    return getFeaturesArray(str).filter(f => /[a-z0-9]/i.test(f)).map(f => {
        const hit = icons.find(([re]) => re.test(f));
        return `<li><i class="fas ${hit ? hit[1] : 'fa-check'}"></i><span>${esc(f)}</span></li>`;
    }).join('');
}

let spotMiniMap = null, spotMiniMarker = null;
function showSpotMiniMap(spot) {
    const sec = document.getElementById('spot-map-sec');
    const lat = parseFloat(spot.lat), lng = parseFloat(spot.lng);
    if (typeof L === 'undefined' || isNaN(lat) || isNaN(lng)) { sec.hidden = true; return; }
    sec.hidden = false;
    document.getElementById('spot-map-loc').textContent = spot.location || spot.name;
    if (!spotMiniMap) {
        spotMiniMap = L.map('spot-mini-map', { zoomControl: false, attributionControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false });
        addBaseLayer(spotMiniMap, 'street');
    }
    if (spotMiniMarker) spotMiniMap.removeLayer(spotMiniMarker);
    spotMiniMarker = L.marker([lat, lng], { icon: createCustomPin(spot.category, spot.id) }).addTo(spotMiniMap);
    spotMiniMap.setView([lat, lng], 15);
    setTimeout(() => { spotMiniMap.invalidateSize(); spotMiniMap.setView([lat, lng], 15); }, 260);
}
document.getElementById('spot-map-open').addEventListener('click', () => {
    const s = dbSpots.find(x => x.id == currentSpotId); if (!s) return;
    document.getElementById('spot-details-modal').classList.remove('active');
    showPage('map');
    let tries = 0;
    const go = () => {
        if (!map) { if (tries++ < 30) setTimeout(go, 150); return; }
        map.invalidateSize(); map.flyTo([parseFloat(s.lat), parseFloat(s.lng)], 16, { duration: 0.8 }); showMapSidebar(s);
    };
    setTimeout(go, 450);
});

function ratingSummaryHTML(reviews) {
    if (!reviews.length) return '';
    const n = reviews.length, counts = [0, 0, 0, 0, 0, 0];
    reviews.forEach(r => { const v = Math.min(5, Math.max(1, parseInt(r.rating) || 0)); counts[v]++; });
    const avg = reviews.reduce((a, r) => a + (parseInt(r.rating) || 0), 0) / n;
    return `<div class="sx-rsum-big"><b>${avg.toFixed(1)}</b><span class="sx-stars">${getStarsHTML(avg)}</span><small>${n} review${n === 1 ? '' : 's'}</small></div>
        <div class="sx-rsum-bars">${[5, 4, 3, 2, 1].map(s => `<div class="sx-rbar"><span>${s}</span><i class="fas fa-star"></i><div><em style="width:${(counts[s] / n * 100).toFixed(0)}%"></em></div><small>${counts[s]}</small></div>`).join('')}</div>`;
}
document.getElementById('directions-spot-btn').addEventListener('click', () => { const s = dbSpots.find(x => x.id == currentSpotId); if (s) navigateToSpot(s.lat, s.lng); });
document.getElementById('close-spot-modal').addEventListener('click', () => document.getElementById('spot-details-modal').classList.remove('active'));
function shareItem(title, text) {
    const url = location.href.split('#')[0];
    if (navigator.share) navigator.share({ title, text, url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(`${title} - ${text} ${url}`).then(() => showNotification('Link copied!'));
    else showNotification(title);
}
document.getElementById('share-spot-btn').addEventListener('click', () => { const s = dbSpots.find(x => x.id == currentSpotId); if (s) shareItem(s.name, s.location); });

document.querySelectorAll('#spot-star-input i').forEach(s => s.addEventListener('click', function() {
    currentSpotRating = parseInt(this.dataset.value);
    document.querySelectorAll('#spot-star-input i').forEach((st, i) => st.classList.toggle('active', i < currentSpotRating));
}));
document.getElementById('submit-spot-review').addEventListener('click', async () => {
    if (!currentUser) return showNotification('Login first', 'danger');
    if (!currentSpotRating) return showNotification('Select stars', 'danger');
    const fd = new FormData(); fd.append('user_id', currentUser.id); fd.append('user_name', currentUser.name);
    fd.append('item_type', 'spot'); fd.append('item_id', currentSpotId); fd.append('rating', currentSpotRating); fd.append('comment', document.getElementById('spot-comment-input').value);
    const res = await fetch('api/add_review.php', { method: 'POST', body: fd }); const data = await res.json();
    if (data.success) { showNotification(data.message || 'Posted!'); openSpotDetails(currentSpotId); loadDatabase(); addToActivity(); } else showNotification(data.message, 'danger');
});

const storeKey = p => String(p.location || '').trim().toLowerCase().replace(/\s+/g, ' ');
const titleCase = s => String(s || '').replace(/\b\w/g, c => c.toUpperCase());
let dbStores = [];
async function loadStores() {
    try { const d = await (await fetch('api/stores_api.php')).json(); if (d.success) dbStores = d.stores; } catch (e) {}
}
function getStores() {
    const map = new Map();
    dbStores.forEach(s => map.set(storeKey({ location: s.name }), { key: storeKey({ location: s.name }), id: s.id, name: s.name, image: s.image_url || '', pin: (s.lat != null && s.lng != null) ? [parseFloat(s.lat), parseFloat(s.lng)] : null, items: [] }));
    dbProducts.forEach(p => {
        const k = storeKey(p); if (!k) return;
        if (!map.has(k)) map.set(k, { key: k, id: null, name: titleCase(String(p.location).trim()), image: '', pin: null, items: [] });
        map.get(k).items.push(p);
    });
    return [...map.values()].map(s => {
        const prices = s.items.map(p => parseFloat(p.price) || 0);
        const withPin = s.items.find(p => productCoords(p));
        return { ...s, min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0,
            at: s.pin || (withPin ? productCoords(withPin) : null), near: matchSpot(s.name) };
    }).sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name));
}
const peso = n => '₱' + (parseFloat(n) || 0).toLocaleString();
const priceRange = s => !s.items.length ? 'No items yet' : s.min === s.max ? peso(s.min) : `${peso(s.min)} – ${peso(s.max)}`;

let productsView = 'items';
document.getElementById('pv-tabs').addEventListener('click', e => {
    const b = e.target.closest('.pv-tab'); if (!b) return;
    productsView = b.dataset.pv;
    document.querySelectorAll('.pv-tab').forEach(x => x.classList.toggle('on', x === b));
    document.getElementById('product-search').placeholder = productsView === 'stores' ? 'Search stores or what they sell...' : 'Search local products...';
    renderProducts();
});

function renderStores(grid) {
    const q = (document.getElementById('product-search').value || '').trim().toLowerCase();
    const admin = currentUser?.role === 'admin';
    const stores = getStores().filter(s => (admin || s.items.length) && (!q || s.name.toLowerCase().includes(q) || s.items.some(p => [p.name, p.category, p.description].join(' ').toLowerCase().includes(q))));
    const cnt = document.getElementById('product-search-count'); if (cnt) cnt.textContent = q ? `${stores.length} found` : '';
    grid.classList.add('is-stores');
    const addCard = admin && !q ? `<button type="button" class="store-card store-add" data-store-new><span class="store-add-ic"><i class="fas fa-plus"></i></span><b>New store</b><small>Add a place where products are sold, then add its products</small></button>` : '';
    grid.innerHTML = addCard + (stores.length ? stores.map(s => `<button type="button" class="store-card" data-store="${esc(s.key)}">
            ${s.image
                ? `<div class="store-cover"><img src="${esc(s.image)}" alt="" loading="lazy">${s.items.length ? `<span class="store-items">${s.items.slice(0, 3).map(p => `<img src="${esc(p.image_url)}" alt="">`).join('')}${s.items.length > 3 ? `<em>+${s.items.length - 3}</em>` : ''}</span>` : ''}</div>`
                : `<div class="store-thumbs">${s.items.length ? s.items.slice(0, 4).map(p => `<img src="${esc(p.image_url)}" alt="" loading="lazy">`).join('') : '<span class="store-empty"><i class="fas fa-camera"></i> No photo or products yet</span>'}${s.items.length > 4 ? `<span class="store-more">+${s.items.length - 4}</span>` : ''}</div>`}
            <div class="store-info"><span class="store-ic"><i class="fas fa-store"></i></span><div><b>${esc(s.name)}</b>
                <small>${s.near && s.near.name.toLowerCase() !== s.key ? `Near ${esc(s.near.name)}` : 'Naguilian, La Union'}</small></div></div>
            <div class="store-meta"><span><i class="fas fa-bag-shopping"></i> ${s.items.length} item${s.items.length === 1 ? '' : 's'}</span><span><i class="fas fa-tag"></i> ${priceRange(s)}</span>${s.at ? '<span><i class="fas fa-location-dot"></i> On the map</span>' : ''}</div>
        </button>`).join('')
        : addCard ? '' : `<div class="empty-state"><i class="fas fa-store"></i><h3>${q ? 'No stores found' : 'No stores yet'}</h3><p>${q ? `Nothing matches "${esc(q)}".` : 'Stores show here when the tourism office adds them.'}</p></div>`);
}
document.getElementById('products-grid').addEventListener('click', e => { const c = e.target.closest('.store-card[data-store]'); if (c) openStore(c.dataset.store); });

window.openStore = function (key) {
    const s = getStores().find(x => x.key === key); if (!s) return;
    const admin = currentUser?.role === 'admin';
    document.getElementById('product-details-modal').classList.remove('active');
    const cover = s.items[0];
    document.getElementById('st-hero').innerHTML = `${s.image ? `<img src="${esc(s.image)}" alt="">` : cover ? `<img src="${esc(cover.image_url)}" alt="">` : '<div class="st-hero-empty"><i class="fas fa-store"></i></div>'}<div class="st-hero-txt"><span class="dx-chip sx-chip"><i class="fas fa-store"></i> Store</span>
        <h2>${esc(s.name)}</h2><p><i class="fas fa-location-dot"></i> ${s.near && s.near.name.toLowerCase() !== s.key ? `Near ${esc(s.near.name)} · ` : ''}${s.items.length} item${s.items.length === 1 ? '' : 's'} · ${priceRange(s)}</p></div>`;
    document.getElementById('st-count').textContent = `${s.items.length} item${s.items.length === 1 ? '' : 's'}`;
    document.getElementById('st-grid').innerHTML = (admin ? `<button type="button" class="st-item st-add" data-st-add><span><i class="fas fa-plus"></i></span><b>Add a product here</b></button>` : '')
        + (s.items.length ? s.items.map(p => `<button type="button" class="st-item" data-id="${p.id}">
            <img src="${esc(p.image_url)}" alt="" loading="lazy"><span class="st-price">${peso(p.price)}</span>
            <span class="st-item-txt"><b>${esc(p.name)}</b><small>${esc(p.category)} · <i class="fas fa-star"></i> ${esc(p.rating)}</small></span></button>`).join('')
        : admin ? '' : '<p class="st-none">This store has no products yet.</p>');
    document.getElementById('st-admin').innerHTML = admin && s.id ? `<button type="button" class="dx-ghost" data-st-edit><i class="fas fa-pen"></i> Edit store</button>${s.items.length ? '' : '<button type="button" class="dx-ghost danger" data-st-del><i class="fas fa-trash"></i> Delete store</button>'}` : '';
    document.getElementById('st-admin').hidden = !(admin && s.id);
    const buy = document.getElementById('st-buy'), dir = document.getElementById('st-dir');
    buy.hidden = dir.hidden = !s.at;
    buy.onclick = () => { document.getElementById('store-modal').classList.remove('active'); const it = s.items.find(p => productCoords(p)) || cover; it ? window.showProductOnMap(it) : (showPage('map'), setTimeout(() => map && map.flyTo(s.at, 17), 700)); };
    dir.onclick = () => s.at && navigateToSpot(s.at[0], s.at[1]);
    const modal = document.getElementById('store-modal');
    modal.dataset.key = s.key;
    modal.querySelector('.dx-scroll').scrollTop = 0;
    modal.classList.add('active');
};
document.getElementById('st-grid').addEventListener('click', e => {
    if (e.target.closest('[data-st-add]')) {
        const s = getStores().find(x => x.key === document.getElementById('store-modal').dataset.key);
        document.getElementById('store-modal').classList.remove('active');
        document.getElementById('open-add-product-btn').click();
        if (s) setTimeout(() => { const sel = document.querySelector('#add-product-form .prod-store-select'); fillStoreSelects(sel, s.name); sel.dispatchEvent(new Event('change')); }, 60);
        return;
    }
    const b = e.target.closest('.st-item[data-id]'); if (!b) return;
    document.getElementById('store-modal').classList.remove('active');
    window.openProductDetails(b.dataset.id);
});
document.getElementById('st-admin').addEventListener('click', async e => {
    const s = getStores().find(x => x.key === document.getElementById('store-modal').dataset.key); if (!s) return;
    if (e.target.closest('[data-st-edit]')) { document.getElementById('store-modal').classList.remove('active'); openStoreEdit(s); }
    if (e.target.closest('[data-st-del]')) {
        const fd = new FormData(); fd.append('action', 'delete'); fd.append('id', s.id);
        const d = await (await fetch('api/stores_api.php', { method: 'POST', body: fd })).json();
        showNotification(d.message, d.success ? 'success' : 'danger');
        if (d.success) { document.getElementById('store-modal').classList.remove('active'); await loadStores(); renderProducts(); addToActivity(); }
    }
});
document.getElementById('close-store-modal').addEventListener('click', () => document.getElementById('store-modal').classList.remove('active'));
document.getElementById('store-modal').addEventListener('mousedown', e => { if (e.target.id === 'store-modal') e.target.classList.remove('active'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('store-modal').classList.remove('active'); });

function fillStoreSelects(selectEl, value) {
    const stores = getStores().sort((a, b) => a.name.localeCompare(b.name));
    document.querySelectorAll('.prod-store-select').forEach(sel => {
        const want = sel === selectEl && value != null ? value : sel.value;
        const known = stores.some(s => s.key === storeKey({ location: want }));
        sel.innerHTML = `<option value="" disabled${known ? '' : ' selected'}>Choose a store</option>`
            + stores.map(s => `<option value="${esc(s.name)}"${s.key === storeKey({ location: want }) ? ' selected' : ''}>${esc(s.name)}</option>`).join('')
            + (!known && want ? `<option value="${esc(want)}" selected>${esc(want)}</option>` : '');
    });
}
document.getElementById('open-add-product-btn').addEventListener('click', () => fillStoreSelects());
[['add-product-form', 'addprod'], ['edit-product-form', 'editprod']].forEach(([formId, pin]) => {
    const sel = document.querySelector(`#${formId} .prod-store-select`);
    sel.addEventListener('change', () => {
        const s = getStores().find(x => x.key === storeKey({ location: sel.value }));
        if (s && s.at) setPinField(pin, s.at[0], s.at[1]);
    });
});

const SE = { returnTo: null };
function openStoreEdit(store = null, returnTo = null) {
    if (currentUser?.role !== 'admin') return;
    SE.returnTo = returnTo;
    document.getElementById('se-id').value = store && store.id ? store.id : '';
    document.getElementById('se-name').value = store ? store.name : '';
    document.getElementById('se-title').textContent = store ? `Edit "${store.name}"` : 'New store';
    setPinField('store', store && store.at ? store.at[0] : null, store && store.at ? store.at[1] : null);
    const prev = document.getElementById('se-image-preview'); document.getElementById('se-image').value = '';
    if (store && store.image) { prev.src = store.image; prev.style.display = 'block'; } else { prev.removeAttribute('src'); prev.style.display = 'none'; }
    document.getElementById('store-edit-modal').classList.add('active');
    setTimeout(() => document.getElementById('se-name').focus(), 250);
}
document.addEventListener('click', e => {
    const b = e.target.closest('[data-store-new]'); if (!b) return;
    e.preventDefault();
    openStoreEdit(null, b.closest('.input-group')?.querySelector('select') || null);
});
document.getElementById('close-store-edit').addEventListener('click', () => document.getElementById('store-edit-modal').classList.remove('active'));
document.getElementById('store-edit-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(); fd.append('action', 'save'); fd.append('id', document.getElementById('se-id').value);
    fd.append('name', document.getElementById('se-name').value.trim());
    fd.append('lat', document.getElementById('store-spot-lat').value); fd.append('lng', document.getElementById('store-spot-lng').value);
    if (!document.getElementById('store-spot-lat').value) return showNotification('Please pin where the store is on the map.', 'danger');
    const photo = document.getElementById('se-image').files[0];
    if (photo) fd.append('image_base64', await compressImage(photo));
    const btn = document.getElementById('se-save'); btn.disabled = true;
    let d; try { d = await (await fetch('api/stores_api.php', { method: 'POST', body: fd })).json(); } catch (x) { d = { success: false, message: 'No connection.' }; }
    btn.disabled = false;
    if (!d.success) return showNotification(d.message, 'danger');
    showNotification(d.message);
    document.getElementById('store-edit-modal').classList.remove('active');
    await loadStores(); await loadDatabase(); addToActivity();
    if (SE.returnTo) { fillStoreSelects(SE.returnTo, d.name); SE.returnTo.dispatchEvent(new Event('change')); SE.returnTo = null; }
    else { productsView = 'stores'; document.querySelectorAll('.pv-tab').forEach(x => x.classList.toggle('on', x.dataset.pv === 'stores')); renderProducts(); }
});
function renderProducts() {
    const grid = document.getElementById('products-grid'); grid.innerHTML = '';
    grid.classList.remove('is-stores');
    if (productsView === 'stores') return renderStores(grid);
    const isAdmin = currentUser?.role === 'admin';
    if (!dbProducts.length) grid.innerHTML = `<div class="empty-state"><i class="fas fa-shopping-bag"></i><h3>No products yet</h3><p>${isAdmin ? 'Tap <b>Add Product</b> to add your first local product.' : 'Local products will show up here soon.'}</p></div>`;
    searchFilter(dbProducts, 'product-search', 'product-search-count', grid, 'No products found').forEach(p => {
        const card = document.createElement('div'); card.className = 'product-card';
        card.onclick = (e) => {
            if (!e.target.closest('.admin-edit-icon')) {
                window.openProductDetails(p.id);
            }
        };
        card.className = 'product-card tc-card is-product';
        const n = parseInt(p.review_count) || 0;
        card.innerHTML = `<div class="tc-img">
                <img loading="lazy" decoding="async" src="${esc(p.image_url)}" alt="">
                ${p.category ? `<span class="tc-cat"><i></i>${esc(p.category)}</span>` : ''}
                ${isAdmin ? `<button class="admin-edit-icon tc-edit" onclick="window.openEditProduct(${p.id})" title="Edit product" aria-label="Edit product"><i class="fas fa-pen"></i></button>` : ''}
                <span class="tc-tag price">₱${parseFloat(p.price).toLocaleString()}</span>
            </div>
            <div class="tc-body">
                <h3 class="tc-title">${esc(p.name)}</h3>
                <p class="tc-sub"><i class="fas fa-store"></i> ${esc(p.location || 'Local store')}</p>
                ${p.description ? `<p class="tc-desc">${esc(p.description)}</p>` : ''}
                <div class="tc-foot">${n ? `<span class="tc-rate"><i class="fas fa-star"></i> ${esc(p.rating)} <small>(${n} review${n === 1 ? '' : 's'})</small></span>` : '<span class="tc-rate none"><i class="far fa-star"></i> No reviews yet</span>'}<span class="tc-go">View <i class="fas fa-arrow-right"></i></span></div>
            </div>`;
        grid.appendChild(card);
    });
}

window.openProductDetails = async function(id) {
    const p = dbProducts.find(x => x.id == id); if (!p) return;
    const modal = document.getElementById('product-details-modal');
    if (!modal.classList.contains('active')) modal.querySelector('.dx-scroll').scrollTop = 0;
    currentProductId = id; currentProductRating = 0;
    setupGallery('product-gallery', 'product-detail-img', p);
    document.getElementById('product-detail-category').textContent = p.category;
    document.getElementById('product-detail-name').textContent = p.name;
    document.getElementById('product-detail-price').textContent = `₱${parseFloat(p.price).toLocaleString()}`;
    document.getElementById('product-detail-location').textContent = p.location;
    document.getElementById('product-detail-rating').textContent = p.rating;
    document.getElementById('product-detail-stars').innerHTML = getStarsHTML(p.rating);
    document.getElementById('product-review-count').textContent = `${p.review_count || 0} review${p.review_count == 1 ? '' : 's'}`;
    document.getElementById('product-detail-description').textContent = p.description;
    const prodFeat = featureChips(p.features);
    document.getElementById('product-detail-features').innerHTML = prodFeat;
    document.getElementById('product-detail-features').closest('.sx-sec').hidden = !prodFeat;
    document.querySelectorAll('#product-star-input i').forEach(s => s.classList.remove('active'));
    document.getElementById('product-comment-input').value = '';
    const store = getStores().find(x => x.key === storeKey(p));
    const others = store ? store.items.filter(x => x.id != p.id) : [];
    document.getElementById('product-more-sec').hidden = !others.length;
    if (others.length) {
        document.getElementById('product-more-title').textContent = `More from ${store.name}`;
        document.getElementById('product-more-list').innerHTML = others.slice(0, 10).map(x => `<button type="button" class="st-mini" data-id="${x.id}">
            <img src="${esc(x.image_url)}" alt="" loading="lazy"><b>${esc(x.name)}</b><span>${peso(x.price)}</span></button>`).join('');
        document.getElementById('product-store-btn').innerHTML = `<i class="fas fa-store"></i> See all ${store.items.length} items from this store`;
        document.getElementById('product-store-btn').onclick = () => openStore(store.key);
    }
    document.getElementById('product-detail-location').closest('.sx-stat').onclick = store ? () => openStore(store.key) : null;
    document.getElementById('product-detail-location').closest('.sx-stat').classList.toggle('is-link', !!store);
    const near = matchSpot(p.location);
    document.getElementById('product-near').textContent = near && near.name !== p.location ? `Near ${near.name}` : 'Naguilian, La Union';
    modal.classList.add('active');
    loadReviewsInto('product-reviews-list', 'product', id);
    showProductMiniMap(p);
}
document.getElementById('close-product-modal').addEventListener('click', () => document.getElementById('product-details-modal').classList.remove('active'));

function productCoords(p) {
    let lat = parseFloat(p.lat), lng = parseFloat(p.lng);
    if (isNaN(lat) || isNaN(lng)) { const sp = matchSpot(p.location); if (sp) { lat = parseFloat(sp.lat); lng = parseFloat(sp.lng); } }
    return isNaN(lat) || isNaN(lng) ? null : [lat, lng];
}
let productMiniMap = null, productMiniMarker = null;
function showProductMiniMap(p) {
    const sec = document.getElementById('product-map-sec'), at = productCoords(p);
    document.getElementById('product-directions-btn').hidden = !at;
    if (typeof L === 'undefined' || !at) { sec.hidden = true; return; }
    sec.hidden = false;
    document.getElementById('product-map-loc').textContent = titleCase(p.location || p.name);
    if (!productMiniMap) {
        productMiniMap = L.map('product-mini-map', { zoomControl: false, attributionControl: false, scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false });
        addBaseLayer(productMiniMap, 'street');
    }
    if (productMiniMarker) productMiniMap.removeLayer(productMiniMarker);
    productMiniMarker = L.marker(at, { icon: L.divIcon({ className: 'custom-pin', html: '<div class="pin-wrapper"><div class="pin-icon shop"><i class="fas fa-shopping-bag"></i></div></div>', iconSize: [50, 65], iconAnchor: [25, 65] }) }).addTo(productMiniMap);
    productMiniMap.setView(at, 16);
    setTimeout(() => { productMiniMap.invalidateSize(); productMiniMap.setView(at, 16); }, 260);
}
document.getElementById('sidebar-content').addEventListener('click', e => { const b = e.target.closest('.msb-open-store'); if (b) openStore(b.dataset.store); });
document.getElementById('product-more-list').addEventListener('click', e => { const b = e.target.closest('.st-mini'); if (b) window.openProductDetails(b.dataset.id); });
document.getElementById('product-directions-btn').addEventListener('click', () => {
    const p = dbProducts.find(x => x.id == currentProductId), at = p && productCoords(p); if (at) navigateToSpot(at[0], at[1]);
});
document.getElementById('product-map-open').addEventListener('click', () => {
    const p = dbProducts.find(x => x.id == currentProductId); if (p) window.showProductOnMap(p);
});
let productMarker = null;
function clearProductMarker() { if (productMarker && map) map.removeLayer(productMarker); productMarker = null; }

function showProductSidebar(p, lat, lng) {
    document.getElementById('sidebar-title').innerHTML = '<i class="fas fa-shopping-bag"></i> Where to buy';
    document.getElementById('close-sidebar').hidden = false;
    const store = getStores().find(x => x.key === storeKey(p));
    const items = store ? [p, ...store.items.filter(x => x.id != p.id)] : [p];
    document.getElementById('sidebar-content').innerHTML = `
        <div class="msb msb-store">
            <div class="msb-hero"><img loading="lazy" decoding="async" src="${esc(p.image_url || '')}" alt="">
                <span class="mp-cat shop"><i class="fas fa-store"></i> Store</span>
                <div class="msb-hero-txt"><h4>${esc(store ? store.name : titleCase(p.location || 'Store'))}</h4><p><i class="fas fa-bag-shopping"></i> ${items.length} item${items.length === 1 ? '' : 's'}${store ? ' · ' + priceRange(store) : ''}</p></div></div>
            <p class="mp-hint"><i class="fas fa-store"></i> Everything you can buy here</p>
            <div class="mp-list">${items.map((x, i) => `<button type="button" class="mp-item${i === 0 ? ' is-cur' : ''}" onclick="window.openProductDetails(${x.id})"><img src="${esc(x.image_url)}" alt="" loading="lazy">
                <span><b>${esc(x.name)}</b><small>${esc(x.category)}</small><em><span class="mp-cat shop">${peso(x.price)}</span><span><i class="fas fa-star"></i> ${esc(x.rating)}</span></em></span><i class="fas fa-chevron-right"></i></button>`).join('')}</div>
            <div class="msb-actions">
                <button class="btn-primary" onclick="navigateToSpot(${lat}, ${lng})"><i class="fas fa-diamond-turn-right"></i> Directions</button>
                ${store ? `<button class="dx-ghost msb-open-store" data-store="${esc(store.key)}"><i class="fas fa-store"></i> Open store page</button>` : ''}
            </div>
        </div>`;
    const sb = document.getElementById('map-sidebar'); sb.style.display = 'block';
    if (window.innerWidth <= 900) setTimeout(() => sb.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600);
}

window.showProductOnMap = function (p) {
    let lat = parseFloat(p.lat), lng = parseFloat(p.lng);
    if (isNaN(lat) || isNaN(lng)) { const sp = matchSpot(p.location); if (sp) { lat = parseFloat(sp.lat); lng = parseFloat(sp.lng); } }
    document.getElementById('product-details-modal').classList.remove('active');
    showPage('map');
    if (isNaN(lat) || isNaN(lng)) { showNotification('The place to buy this has not been pinned on the map yet.', 'danger'); return; }
    let tries = 0;
    const go = () => {
        if (!map) { if (tries++ < 30) setTimeout(go, 150); return; }
        map.invalidateSize(); clearProductMarker();
        productMarker = L.marker([lat, lng], {
            title: p.name, zIndexOffset: 1000,
            icon: L.divIcon({ className: 'custom-pin', html: '<div class="pin-wrapper"><div class="pin-icon shop"><i class="fas fa-shopping-bag"></i></div><div class="pin-pulse"></div></div>', iconSize: [50, 65], iconAnchor: [25, 65], popupAnchor: [0, -60] })
        }).addTo(map);
        productMarker.bindPopup(`<div class="map-popup-container"><div class="map-popup-body"><div class="map-popup-title">${esc(p.name)}</div><div class="map-popup-location"><i class="fas fa-store"></i> ${esc(p.location || 'Buy here')}</div></div></div>`);
        map.flyTo([lat, lng], 17, { duration: 0.8 });
        showProductSidebar(p, lat, lng);
        setTimeout(() => { if (productMarker) productMarker.openPopup(); }, 900);
    };
    setTimeout(go, 450);
};
document.getElementById('buy-product-btn').addEventListener('click', () => {
    const p = dbProducts.find(x => x.id == currentProductId); if (p) window.showProductOnMap(p);
});
document.getElementById('share-product-btn').addEventListener('click', () => { const p = dbProducts.find(x => x.id == currentProductId); if (p) shareItem(p.name, p.location); });

document.querySelectorAll('#product-star-input i').forEach(s => s.addEventListener('click', function() {
    currentProductRating = parseInt(this.dataset.value);
    document.querySelectorAll('#product-star-input i').forEach((st, i) => st.classList.toggle('active', i < currentProductRating));
}));
document.getElementById('submit-product-review').addEventListener('click', async () => {
    if (!currentUser) return showNotification('Login first', 'danger');
    if (!currentProductRating) return showNotification('Select stars', 'danger');
    const fd = new FormData(); fd.append('user_id', currentUser.id); fd.append('user_name', currentUser.name);
    fd.append('item_type', 'product'); fd.append('item_id', currentProductId); fd.append('rating', currentProductRating); fd.append('comment', document.getElementById('product-comment-input').value);
    const res = await fetch('api/add_review.php', { method: 'POST', body: fd }); const data = await res.json();
    if (data.success) { showNotification(data.message || 'Posted!'); openProductDetails(currentProductId); loadDatabase(); addToActivity(); } else showNotification(data.message, 'danger');
});

document.getElementById('open-add-spot-btn').addEventListener('click', () => document.getElementById('add-spot-modal').classList.add('active'));
document.getElementById('close-add-spot-modal').addEventListener('click', () => document.getElementById('add-spot-modal').classList.remove('active'));
document.getElementById('open-add-product-btn').addEventListener('click', () => document.getElementById('add-product-modal').classList.add('active'));
document.getElementById('close-add-product-modal').addEventListener('click', () => document.getElementById('add-product-modal').classList.remove('active'));
document.getElementById('close-edit-spot-modal').addEventListener('click', () => document.getElementById('edit-spot-modal').classList.remove('active'));
document.getElementById('close-edit-product-modal').addEventListener('click', () => document.getElementById('edit-product-modal').classList.remove('active'));

document.querySelectorAll('.fm-card .fm-cancel').forEach(b => b.addEventListener('click', () => b.closest('.modal').classList.remove('active')));
['add-spot', 'add-product'].forEach(k => document.getElementById(`open-${k}-btn`).addEventListener('click', () => { document.querySelector(`#${k}-modal .fm-scroll`).scrollTop = 0; }));

['add-spot-image', 'edit-spot-image', 'add-product-image', 'edit-product-image'].forEach(id => {
    document.getElementById(id).addEventListener('change', function(e) {
        if (e.target.files[0]) { const prev = document.getElementById(id + '-preview'); prev.src = URL.createObjectURL(e.target.files[0]); prev.style.display = 'block'; }
    });
});

window.openEditSpot = function(id) {
    const s = dbSpots.find(x => x.id == id); if(!s) return;
    document.getElementById('edit-spot-id').value = s.id; document.getElementById('edit-spot-name').value = s.name;
    fillCatSelects(document.getElementById('edit-spot-category'), s.category); document.getElementById('edit-spot-location').value = s.location;
    document.getElementById('edit-spot-points').value = s.points_reward; document.getElementById('edit-spot-desc').value = s.description;
    document.getElementById('edit-spot-features').value = s.features;
    setPinField('edit', s.lat, s.lng);
    document.getElementById('edit-spot-image-preview').src = s.image_url; document.getElementById('edit-spot-image-preview').style.display = 'block';
    document.getElementById('edit-spot-image').value = ''; setMore('edit-spot-form', s.photos);
    document.querySelector('#edit-spot-modal .fm-scroll').scrollTop = 0;
    document.getElementById('edit-spot-modal').classList.add('active');
}
window.openEditProduct = function(id) {
    const p = dbProducts.find(x => x.id == id); if(!p) return;
    document.getElementById('edit-product-id').value = p.id; document.getElementById('edit-product-name').value = p.name;
    document.getElementById('edit-product-category').value = p.category; fillStoreSelects(document.getElementById('edit-product-location'), p.location);
    document.getElementById('edit-product-price').value = p.price; document.getElementById('edit-product-desc').value = p.description;
    document.getElementById('edit-product-features').value = p.features;
    setPinField('editprod', p.lat, p.lng);
    document.getElementById('edit-product-image-preview').src = p.image_url; document.getElementById('edit-product-image-preview').style.display = 'block';
    document.getElementById('edit-product-image').value = ''; setMore('edit-product-form', p.photos);
    document.querySelector('#edit-product-modal .fm-scroll').scrollTop = 0;
    document.getElementById('edit-product-modal').classList.add('active');
}

const MORE = {}, MAX_MORE = 10;
function moreRender(formId) {
    const s = MORE[formId];
    const kept = s.existing.filter(p => !s.removed.has(p.id));
    s.box.querySelector('.fm-more-list').innerHTML =
        s.existing.map(p => `<div class="fm-more-tile${s.removed.has(p.id) ? ' is-removed' : ''}"><img src="${esc(p.image_url)}" alt=""><button type="button" data-old="${p.id}" aria-label="${s.removed.has(p.id) ? 'Keep photo' : 'Remove photo'}"><i class="fas ${s.removed.has(p.id) ? 'fa-rotate-left' : 'fa-times'}"></i></button></div>`).join('') +
        s.files.map((f, j) => `<div class="fm-more-tile is-new"><img src="${f.url}" alt=""><button type="button" data-new="${j}" aria-label="Remove photo"><i class="fas fa-times"></i></button></div>`).join('');
    const total = kept.length + s.files.length;
    s.box.closest('.fm-sec').querySelector('.fm-more-count').textContent = total ? `${total} / ${MAX_MORE}` : '';
    s.box.querySelector('.fm-more-add').hidden = total >= MAX_MORE;
}
function setMore(formId, photos) {
    const s = MORE[formId]; s.files.forEach(f => URL.revokeObjectURL(f.url));
    s.existing = photos || []; s.removed = new Set(); s.files = [];
    moreRender(formId);
}
['add-spot-form', 'edit-spot-form', 'add-product-form', 'edit-product-form'].forEach(formId => {
    const box = document.querySelector(`#${formId} .fm-more`);
    MORE[formId] = { box, existing: [], removed: new Set(), files: [] };
    box.querySelector('input[type=file]').addEventListener('change', e => {
        const s = MORE[formId], room = MAX_MORE - (s.existing.filter(p => !s.removed.has(p.id)).length + s.files.length);
        const picked = [...e.target.files];
        picked.slice(0, Math.max(0, room)).forEach(file => s.files.push({ file, url: URL.createObjectURL(file) }));
        if (picked.length > room) showNotification(`Only ${MAX_MORE} extra photos are allowed.`, 'danger');
        e.target.value = ''; moreRender(formId);
    });
    box.addEventListener('click', e => {
        const b = e.target.closest('.fm-more-tile button'); if (!b) return;
        const s = MORE[formId];
        if (b.dataset.old) { const id = +b.dataset.old; s.removed.has(id) ? s.removed.delete(id) : s.removed.add(id); }
        else { const [f] = s.files.splice(+b.dataset.new, 1); if (f) URL.revokeObjectURL(f.url); }
        moreRender(formId);
    });
    moreRender(formId);
});

async function handleFormSubmit(formId, phpFile, resetPreviewId) {
    document.getElementById(formId).addEventListener('submit', async (e) => {
        e.preventDefault(); const fd = new FormData(e.target);
        const fileInput = e.target.querySelector('input[type="file"]');
        if (fileInput && fileInput.files[0]) fd.append('image_base64', await compressImage(fileInput.files[0]));
        const isSpot = phpFile.includes('spot'), isEdit = phpFile.startsWith('edit_');
        const old = isEdit ? (isSpot ? dbSpots : dbProducts).find(x => x.id == fd.get('id')) : null;
        fd.set('rating', old ? old.rating : 0);
        if (!fd.get('lat') || !fd.get('lng')) {
            if (old && old.lat != null && old.lng != null) { fd.set('lat', old.lat); fd.set('lng', old.lng); }
            else { showNotification(isSpot ? 'Please pin the spot on the map first.' : 'Please pin where to buy this product on the map.', 'danger'); return; }
        }
        showNotification('Saving...');
        const more = MORE[formId];
        if (more.files.length) fd.append('extra_photos', JSON.stringify(await Promise.all(more.files.map(f => compressImage(f.file)))));
        if (more.removed.size) fd.append('remove_photos', [...more.removed].join(','));
        const res = await fetch(phpFile, { method: 'POST', body: fd }); const data = await res.json();
        if (data.success) { showNotification(data.message, data.message.includes(', but:') ? 'danger' : 'success'); document.getElementById(formId.replace('form','modal')).classList.remove('active'); e.target.reset(); setMore(formId, []); if(resetPreviewId) document.getElementById(resetPreviewId).style.display='none'; loadDatabase(); }
        else showNotification(data.message, 'danger');
    });
}
handleFormSubmit('add-spot-form', 'api/add_spot.php', 'add-spot-image-preview');
handleFormSubmit('edit-spot-form', 'api/edit_spot.php', null);
handleFormSubmit('add-product-form', 'api/add_product.php', 'add-product-image-preview');
handleFormSubmit('edit-product-form', 'api/edit_product.php', null);



function initCustomScroll(el, opts = {}) {
    if (!el || el._cs) return; el._cs = true;
    const host = el.offsetParent || el.parentElement; if (!host) return;
    const padTop = opts.top ?? 16, padBottom = opts.bottom ?? 16;
    el.classList.add('cs-native-off');
    const track = document.createElement('div'); track.className = 'cs-track';
    const thumb = document.createElement('div'); thumb.className = 'cs-thumb'; track.appendChild(thumb);
    host.appendChild(track);
    let hideTimer;
    const poke = () => { track.classList.add('is-active'); clearTimeout(hideTimer); hideTimer = setTimeout(() => track.classList.remove('is-active'), 900); };
    const update = () => {
        const sh = el.scrollHeight, ch = el.clientHeight, max = sh - ch;
        if (max <= 2 || !ch) { track.style.display = 'none'; return; }
        track.style.display = '';
        const th = Math.max(0, ch - padTop - padBottom);
        track.style.top = (el.offsetTop + padTop) + 'px'; track.style.height = th + 'px';
        track.style.left = (el.offsetLeft + el.offsetWidth - 16) + 'px';
        const tl = Math.max(44, th * ch / sh);
        thumb.style.height = tl + 'px';
        thumb.style.transform = `translateY(${(th - tl) * (el.scrollTop / max)}px)`;
    };
    el.addEventListener('scroll', () => { update(); poke(); }, { passive: true });
    window.addEventListener('resize', update);
    if (window.ResizeObserver) { const ro = new ResizeObserver(update); ro.observe(el); [...el.children].forEach(c => ro.observe(c)); }
    new MutationObserver(update).observe(el, { childList: true, subtree: true, characterData: true });
    host.addEventListener('transitionend', update);
    el.addEventListener('mouseenter', poke);

    let startY = 0, startScroll = 0, dragging = false;
    thumb.addEventListener('pointerdown', e => {
        dragging = true; startY = e.clientY; startScroll = el.scrollTop;
        thumb.setPointerCapture(e.pointerId); track.classList.add('is-drag'); e.preventDefault();
    });
    thumb.addEventListener('pointermove', e => {
        if (!dragging) return;
        const th = track.clientHeight, tl = thumb.offsetHeight, max = el.scrollHeight - el.clientHeight;
        el.scrollTop = startScroll + (e.clientY - startY) * max / Math.max(1, th - tl);
    });
    const stop = () => { dragging = false; track.classList.remove('is-drag'); };
    thumb.addEventListener('pointerup', stop); thumb.addEventListener('pointercancel', stop);
    track.addEventListener('pointerdown', e => {
        if (e.target !== track) return;
        const r = thumb.getBoundingClientRect();
        el.scrollBy({ top: (e.clientY < r.top ? -1 : 1) * el.clientHeight * 0.85, behavior: 'smooth' });
    });
    update(); setTimeout(update, 350);
    el._csUpdate = update;
}
document.querySelectorAll('.pf-body').forEach(el => initCustomScroll(el, { top: 10, bottom: 10 }));
document.querySelectorAll('.dx-scroll').forEach(el => initCustomScroll(el, { top: 68, bottom: 16 }));

const pinPicker = { map: null, marker: null, others: null, target: null, lat: null, lng: null, preview: null, base: null, kind: 'street' };

function setPinField(target, lat, lng) {
    const latEl = document.getElementById(`${target}-spot-lat`), lngEl = document.getElementById(`${target}-spot-lng`);
    const btn = document.querySelector(`.pin-btn[data-pin-target="${target}"]`);
    if (!latEl || !lngEl || !btn) return;
    const la = parseFloat(lat), ln = parseFloat(lng), has = !isNaN(la) && !isNaN(ln);
    latEl.value = has ? la.toFixed(6) : ''; lngEl.value = has ? ln.toFixed(6) : '';
    btn.classList.toggle('is-set', has);
    btn.querySelector('b').textContent = has ? 'Location pinned' : 'Pin on map';
    btn.querySelector('small').textContent = has ? `${la.toFixed(5)}, ${ln.toFixed(5)} \u00b7 tap to move the pin` : 'Tap to drop a pin where this place is';
    btn.querySelector('.pin-btn-icon i').className = has ? 'fas fa-check' : 'fas fa-map-pin';
}

function pinPickerPlace(lat, lng, pan) {
    const [[s, w], [n, e]] = NAGUILIAN_BOUNDS;
    if (lat < s || lat > n || lng < w || lng > e) { showNotification('Please pick a spot inside Naguilian.', 'danger'); return; }
    pinPicker.lat = lat; pinPicker.lng = lng;
    if (!pinPicker.marker) {
        pinPicker.marker = L.marker([lat, lng], {
            draggable: true,
            icon: L.divIcon({ className: 'pp-pin', html: '<i class="fas fa-location-dot"></i>', iconSize: [44, 52], iconAnchor: [22, 50] })
        }).addTo(pinPicker.map);
        pinPicker.marker.on('dragend', () => { const p = pinPicker.marker.getLatLng(); pinPickerPlace(p.lat, p.lng); });
    } else pinPicker.marker.setLatLng([lat, lng]);
    if (pan) pinPicker.map.setView([lat, lng], Math.max(pinPicker.map.getZoom(), 16));
    clearPinPreview();
    document.querySelector('#pp-coords b').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('pp-coords').classList.add('has');
    document.getElementById('pp-copy').hidden = false;
    document.getElementById('pp-confirm').disabled = false;
    document.getElementById('pp-hint').classList.add('hide');
}

function parseCoords(text) {
    let s = String(text || '').trim();
    if (!s) return null;
    let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || s.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) || s.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (m) return { lat: +m[1], lng: +m[2] };
    const dms = [...s.matchAll(/(\d+(?:\.\d+)?)\s*°\s*(?:(\d+(?:\.\d+)?)\s*['′]\s*)?(?:(\d+(?:\.\d+)?)\s*(?:"|″|'')\s*)?([NSEW])?/gi)];
    if (dms.length >= 2) {
        const val = d => { let v = +d[1] + (+(d[2] || 0)) / 60 + (+(d[3] || 0)) / 3600; if (/[SW]/i.test(d[4] || '')) v = -v; return { v, h: (d[4] || '').toUpperCase() }; };
        const a = val(dms[0]), b = val(dms[1]);
        return (a.h === 'E' || a.h === 'W') ? { lat: b.v, lng: a.v } : { lat: a.v, lng: b.v };
    }
    const nums = s.replace(/[NSEW]/gi, ' ').match(/-?\d+(?:\.\d+)?/g);
    if (nums && nums.length >= 2) {
        let lat = +nums[0], lng = +nums[1];
        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) [lat, lng] = [lng, lat];
        return { lat, lng };
    }
    return null;
}
const insideNaguilian = (lat, lng) => { const [[s, w], [n, e]] = NAGUILIAN_BOUNDS; return lat >= s && lat <= n && lng >= w && lng <= e; };

function clearPinPreview() { if (pinPicker.preview) { pinPicker.map.removeLayer(pinPicker.preview); pinPicker.preview = null; } }
function previewCoords(lat, lng) {
    if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return showNotification('Those coordinates do not look right.', 'danger');
    clearPinPreview();
    const inside = insideNaguilian(lat, lng);
    if (!inside) {
        document.getElementById('pp-search-help').innerHTML = `<i class="fas fa-triangle-exclamation"></i> ${lat.toFixed(5)}, ${lng.toFixed(5)} is outside Naguilian. Please check the numbers.`;
        document.getElementById('pp-search-help').classList.add('err');
        return;
    }
    pinPicker.preview = L.marker([lat, lng], { icon: L.divIcon({ className: 'pp-ghost', html: '<span class="pp-ghost-ring"></span><i class="fas fa-location-dot"></i>', iconSize: [44, 52], iconAnchor: [22, 50] }), zIndexOffset: 900 }).addTo(pinPicker.map);
    const box = document.createElement('div'); box.className = 'pp-ask';
    box.innerHTML = `<b>Pin this location?</b><small>${lat.toFixed(6)}, ${lng.toFixed(6)}</small><div><button type="button" class="pp-ask-no">No</button><button type="button" class="pp-ask-yes"><i class="fas fa-check"></i> Yes, pin here</button></div>`;
    box.querySelector('.pp-ask-yes').onclick = () => { pinPickerPlace(lat, lng); pinPicker.map.closePopup(); showNotification('Pin placed. Press "Use this location" to save it.'); };
    box.querySelector('.pp-ask-no').onclick = () => { clearPinPreview(); };
    pinPicker.preview.bindPopup(box, { className: 'pp-ask-pop', closeButton: false, autoClose: false, closeOnClick: false, offset: [0, -42], maxWidth: 240 });
    pinPicker.map.flyTo([lat, lng], 17, { duration: 0.9 });
    pinPicker.map.once('moveend', () => { if (pinPicker.preview) pinPicker.preview.openPopup(); });
    document.getElementById('pp-hint').classList.add('hide');
}
document.getElementById('pp-search').addEventListener('submit', e => {
    e.preventDefault();
    const help = document.getElementById('pp-search-help');
    const c = parseCoords(document.getElementById('pp-coord-input').value);
    if (!c) { help.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Could not read those coordinates. Try: 16.5314, 120.3941'; help.classList.add('err'); return; }
    help.textContent = 'Paste from Google Maps: decimal numbers, degrees (16°31\'53"N 120°23\'38"E) or a Google Maps link.'; help.classList.remove('err');
    previewCoords(c.lat, c.lng);
});
document.getElementById('pp-copy').addEventListener('click', () => {
    if (pinPicker.lat == null) return;
    const t = `${pinPicker.lat.toFixed(6)}, ${pinPicker.lng.toFixed(6)}`;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => showNotification('Coordinates copied!')).catch(() => showNotification(t));
    else showNotification(t);
});
document.querySelectorAll('[data-pp-kind]').forEach(b => b.addEventListener('click', () => {
    if (!pinPicker.map || b.dataset.ppKind === pinPicker.kind) return;
    pinPicker.map.removeLayer(pinPicker.base);
    pinPicker.kind = b.dataset.ppKind; pinPicker.base = addBaseLayer(pinPicker.map, pinPicker.kind);
    document.querySelectorAll('[data-pp-kind]').forEach(x => x.classList.toggle('on', x === b));
}));

function openPinPicker(target) {
    const modal = document.getElementById('pin-picker-modal');
    pinPicker.target = target; pinPicker.lat = pinPicker.lng = null;
    document.querySelector('#pp-coords b').textContent = 'No pin yet';
    document.getElementById('pp-coords').classList.remove('has');
    document.getElementById('pp-copy').hidden = true;
    document.getElementById('pp-confirm').disabled = true;
    document.getElementById('pp-hint').classList.remove('hide');
    document.getElementById('pp-coord-input').value = '';
    const help = document.getElementById('pp-search-help'); help.classList.remove('err');
    help.textContent = 'Paste from Google Maps: decimal numbers, degrees (16°31\'53"N 120°23\'38"E) or a Google Maps link.';
    const form = document.querySelector(`.pin-btn[data-pin-target="${target}"]`).closest('form');
    const nm = form && form.querySelector('[name="name"]') ? form.querySelector('[name="name"]').value.trim() : '';
    document.getElementById('pp-sub').textContent = nm ? `Choose where "${nm}" is. Tap the map, drag the pin, or enter coordinates.` : 'Tap the map, drag the pin, or enter coordinates.';
    modal.classList.add('active');

    setTimeout(() => {
        if (!pinPicker.map) {
            pinPicker.map = L.map('pin-picker-map', { center: NAGUILIAN_CENTER, zoom: 14, minZoom: 11, maxBounds: NAGUILIAN_BOUNDS, maxBoundsViscosity: 0.9, zoomControl: false });
            L.control.zoom({ position: 'topright' }).addTo(pinPicker.map);
            pinPicker.kind = 'street'; pinPicker.base = addBaseLayer(pinPicker.map, 'street');
            pinPicker.others = L.layerGroup().addTo(pinPicker.map);
            pinPicker.map.on('click', e => pinPickerPlace(e.latlng.lat, e.latlng.lng));
        }
        pinPicker.map.invalidateSize();
        clearPinPreview();
        if (pinPicker.marker) { pinPicker.map.removeLayer(pinPicker.marker); pinPicker.marker = null; }

        pinPicker.others.clearLayers();
        const editingId = target === 'edit' ? document.getElementById('edit-spot-id').value : null;
        dbSpots.filter(x => x.id != editingId).forEach(x => {
            const la = parseFloat(x.lat), ln = parseFloat(x.lng);
            if (!isNaN(la) && !isNaN(ln)) L.circleMarker([la, ln], { radius: 6, color: '#fff', weight: 2, fillColor: '#0d9488', fillOpacity: .85, interactive: true })
                .bindTooltip(x.name, { direction: 'top' }).addTo(pinPicker.others);
        });

        const la = parseFloat(document.getElementById(`${target}-spot-lat`).value), ln = parseFloat(document.getElementById(`${target}-spot-lng`).value);
        if (!isNaN(la) && !isNaN(ln)) pinPickerPlace(la, ln, true);
        else pinPicker.map.setView(NAGUILIAN_CENTER, 14);
    }, 320);
}

function closePinPicker() { document.getElementById('pin-picker-modal').classList.remove('active'); }
document.querySelectorAll('.pin-btn').forEach(btn => btn.addEventListener('click', () => openPinPicker(btn.dataset.pinTarget)));
document.getElementById('pp-close').addEventListener('click', closePinPicker);
document.getElementById('pp-cancel').addEventListener('click', closePinPicker);
document.getElementById('pin-picker-modal').addEventListener('click', e => { if (e.target.id === 'pin-picker-modal') closePinPicker(); });
document.getElementById('pp-confirm').addEventListener('click', () => {
    if (pinPicker.lat == null) return;
    setPinField(pinPicker.target, pinPicker.lat, pinPicker.lng);
    closePinPicker();
    showNotification('Location pinned!');
});
document.getElementById('pp-locate').addEventListener('click', () => {
    if (!navigator.geolocation) return showNotification('Location is not available on this device.', 'danger');
    navigator.geolocation.getCurrentPosition(
        p => pinPickerPlace(p.coords.latitude, p.coords.longitude, true),
        () => showNotification('Could not get your location.', 'danger'),
        { enableHighAccuracy: true, timeout: 8000 });
});
document.getElementById('add-spot-form').addEventListener('reset', () => setTimeout(() => setPinField('add', null, null), 0));
document.getElementById('add-product-form').addEventListener('reset', () => setTimeout(() => setPinField('addprod', null, null), 0));

document.getElementById('explore-btn').addEventListener('click', () => showPage('map'));

function renderMapFilters(pinned) {
    const box = document.getElementById('map-filter-tabs');
    const cats = dbCategories.filter(c => pinned.some(s => s.category === c.slug) || c.slug === currentMapFilter);
    if (currentMapFilter !== 'all' && !cats.length) currentMapFilter = 'all';
    box.innerHTML = `<button class="map-filter-btn${currentMapFilter === 'all' ? ' active' : ''}" data-category="all"><i class="fas fa-globe"></i> All <em>${pinned.length}</em></button>`
        + cats.map(c => `<button class="map-filter-btn${currentMapFilter === c.slug ? ' active' : ''}" data-category="${esc(c.slug)}" style="--cat:${c.color}"><i class="fas ${esc(c.icon)}"></i> ${esc(c.name)} <em>${pinned.filter(s => s.category === c.slug).length}</em></button>`).join('');
}
document.getElementById('map-filter-tabs').addEventListener('click', e => {
    const b = e.target.closest('.map-filter-btn'); if (!b) return;
    currentMapFilter = b.dataset.category;
    renderMapMarkers();
});

function initMap() {
    if (typeof L === 'undefined') { showNotification('The map is still loading. Try again in a few seconds.', 'danger'); return; }
    if (map) { map.invalidateSize(); renderMapMarkers(); return; }
    map = L.map('interactive-map', { center: NAGUILIAN_CENTER, zoom: 13, minZoom: 11, maxBounds: NAGUILIAN_BOUNDS, maxBoundsViscosity: 0.8, zoomControl: false });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);
    mapBase = addBaseLayer(map, 'street');
    map.on('click', () => { if (isPhoneMap()) { hideMapPeek(); markers.forEach(m => m.getElement()?.classList.remove('is-sel')); } });
    addMapTools();
    loadClusterPlugin().then(ok => {
        spotLayer = ok ? L.markerClusterGroup({
            maxClusterRadius: 44, showCoverageOnHover: false, spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true,
            spiderfyDistanceMultiplier: 1.6,
            iconCreateFunction: c => {
                const kids = c.getAllChildMarkers(), n = kids.length;
                const cats = [...new Set(kids.map(k => k.spot && k.spot.category))].filter(Boolean);
                const col = cats.length === 1 ? catInfo(cats[0]).color : null;
                return L.divIcon({ className: 'mp-cluster-wrap', html: `<div class="mp-cluster"${col ? ` style="background:${col};box-shadow:0 0 0 6px ${col}40,0 8px 18px -6px rgba(0,0,0,.45)"` : ''}><b>${n}</b><small>spots</small></div>`, iconSize: [52, 52], iconAnchor: [26, 26] });
            },
        }) : L.layerGroup();
        spotLayer.addTo(map);
        renderMapMarkers();
    });
}

let spotLayer = null, clusterLoading = null;
function loadClusterPlugin() {
    if (L.markerClusterGroup) return Promise.resolve(true);
    return clusterLoading || (clusterLoading = new Promise(res => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
        s.onload = () => res(!!L.markerClusterGroup); s.onerror = () => res(false);
        document.head.appendChild(s);
    }));
}

const MAP_LAYERS = {
    street: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', opts: { subdomains: 'abc', maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' } },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', opts: { maxZoom: 19, maxNativeZoom: 17, attribution: 'Imagery &copy; Esri' } },
    labels: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', opts: { maxZoom: 19, maxNativeZoom: 17, pane: 'overlayPane' } },
};
let mapBase = null, mapKind = 'street';
function addBaseLayer(m, kind) {
    const cfg = MAP_LAYERS[kind] || MAP_LAYERS.street;
    const layer = L.tileLayer(cfg.url, cfg.opts);
    const group = L.layerGroup([layer]);
    if (kind === 'satellite') group.addLayer(L.tileLayer(MAP_LAYERS.labels.url, MAP_LAYERS.labels.opts));
    let loaded = false, errors = 0;
    layer.on('tileload', () => { loaded = true; });
    layer.on('tileerror', () => {
        if (loaded || kind === 'street' || ++errors < 4) return;
        m.removeLayer(group); showNotification('Satellite view is not available right now. Showing the normal map.', 'danger');
        if (m === map) { mapBase = addBaseLayer(m, 'street'); setMapKind('street'); }
    });
    group.addTo(m);
    m.getContainer().classList.toggle('is-street', kind === 'street');
    return group;
}
function setMapKind(kind) {
    mapKind = kind;
    document.querySelectorAll('.mp-tool[data-kind]').forEach(b => b.classList.toggle('on', b.dataset.kind === kind));
}
function addMapTools() {
    const Tools = L.Control.extend({ options: { position: 'topleft' }, onAdd() {
        const d = L.DomUtil.create('div', 'mp-tools');
        d.innerHTML = `<div class="mp-seg"><button type="button" class="mp-tool on" data-kind="street"><i class="fas fa-map"></i><span>Map</span></button><button type="button" class="mp-tool" data-kind="satellite"><i class="fas fa-satellite"></i><span>Satellite</span></button></div>
            <button type="button" class="mp-tool mp-fit" title="Show all spots"><i class="fas fa-expand"></i><span>All spots</span></button>`;
        L.DomEvent.disableClickPropagation(d);
        d.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => {
            if (b.dataset.kind === mapKind) return;
            map.removeLayer(mapBase); mapBase = addBaseLayer(map, b.dataset.kind); setMapKind(b.dataset.kind);
        });
        d.querySelector('.mp-fit').onclick = () => {
            const pts = markers.map(mk => mk.getLatLng());
            if (pts.length) map.flyToBounds(pts, { padding: [60, 60], maxZoom: 15, duration: 0.7 }); else map.flyTo(NAGUILIAN_CENTER, 13);
        };
        return d;
    } });
    const Legend = L.Control.extend({ options: { position: 'bottomleft' }, onAdd() {
        const d = L.DomUtil.create('div', 'mp-legend');
        d.id = 'mp-legend';
        return d;
    } });
    new Tools().addTo(map); new Legend().addTo(map);
}

const isPhoneMap = () => window.innerWidth <= 900;
function focusMapSpot(s, marker) {
    if (!map) return;
    marker = marker || markers.find(m => m.spot && m.spot.id == s.id);
    clearProductMarker();
    showMapSidebar(s);
    const at = [parseFloat(s.lat), parseFloat(s.lng)];
    const grouped = () => marker && !marker.getElement() && spotLayer && spotLayer.zoomToShowLayer;
    const done = (retry = true) => {
        if (retry && grouped()) return spotLayer.zoomToShowLayer(marker, () => done(false));
        markers.forEach(m => { const el = m.getElement(); if (el) el.classList.toggle('is-sel', m === marker); m.setZIndexOffset(m === marker ? 1000 : 0); });
        if (isPhoneMap()) { map.closePopup(); showMapPeek(s); }
        else { hideMapPeek(); if (marker) marker.openPopup(); }
    };
    if (grouped()) return done();
    if (map.getZoom() < 15) { map.flyTo(at, 15, { duration: 0.5 }); map.once('moveend', () => done()); }
    else { map.panTo(at, { animate: true }); done(); }
}
function showMapPeek(s) {
    const box = document.getElementById('mp-peek');
    box.innerHTML = `<button type="button" class="mpk-close" aria-label="Close"><i class="fas fa-times"></i></button>
        <img src="${esc(s.image_url)}" alt="">
        <div class="mpk-txt">${catBadge(s.category)}<b>${esc(s.name)}</b><small><i class="fas fa-location-dot"></i> ${esc(s.location)}</small>
            <span class="mpp-meta"><span><i class="fas fa-star"></i> ${esc(s.rating)}</span><span><i class="fas fa-coins"></i> +${esc(s.points_reward)} pts</span></span></div>
        <div class="mpk-btns"><button type="button" class="mpk-go"><i class="fas fa-circle-info"></i> Details</button><button type="button" class="mpk-dir"><i class="fas fa-diamond-turn-right"></i> Directions</button></div>`;
    box.querySelector('.mpk-close').onclick = () => { hideMapPeek(); markers.forEach(m => m.getElement()?.classList.remove('is-sel')); };
    box.querySelector('.mpk-go').onclick = () => window.openSpotDetails(s.id);
    box.querySelector('.mpk-dir').onclick = () => navigateToSpot(s.lat, s.lng);
    box.hidden = false; requestAnimationFrame(() => box.classList.add('show'));
}
function hideMapPeek() { const b = document.getElementById('mp-peek'); b.classList.remove('show'); b.hidden = true; }

function mapSpotList() {
    const list = (currentMapFilter === 'all' ? dbSpots : dbSpots.filter(s => s.category === currentMapFilter)).filter(s => !isNaN(parseFloat(s.lat)) && !isNaN(parseFloat(s.lng)));
    document.getElementById('sidebar-title').innerHTML = `<i class="fas fa-list"></i> Spots on the map <small class="mp-count">${list.length}</small>`;
    document.getElementById('sidebar-content').innerHTML = list.length ? `<p class="mp-hint"><i class="fas fa-hand-pointer"></i> Tap a spot or a pin to see it</p><div class="mp-list">${list.map(s => `
        <button type="button" class="mp-item" data-id="${s.id}"><img src="${esc(s.image_url)}" alt="" loading="lazy">
            <span><b>${esc(s.name)}</b><small><i class="fas fa-location-dot"></i> ${esc(s.location)}</small><em>${catBadge(s.category)}<span><i class="fas fa-star"></i> ${esc(s.rating)}</span></em></span>
            <i class="fas fa-chevron-right"></i></button>`).join('')}</div>`
        : '<div class="empty-sidebar"><i class="fas fa-map-marker-alt"></i><p>No pinned spots in this category yet.</p></div>';
    document.getElementById('close-sidebar').hidden = true;
    document.getElementById('map-sidebar').style.display = 'block';
}
document.getElementById('sidebar-content').addEventListener('click', e => {
    const b = e.target.closest('.mp-item'); if (!b) return;
    const s = dbSpots.find(x => x.id == b.dataset.id); if (!s || !map) return;
    focusMapSpot(s);
    if (isPhoneMap()) document.querySelector('.mp-mapbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

function createCustomPin(category, spotId, index = 0) {
    const c = catInfo(category);
    return L.divIcon({
        className: 'custom-pin',
        html: `<div class="pin-wrapper" style="animation-delay:${index * 80}ms"><div class="pin-icon" style="background:${c.color}"><i class="fas ${esc(c.icon)}"></i></div><div class="pin-pulse" style="background:${c.color}4d"></div></div>`,
        iconSize: [50, 65], iconAnchor: [25, 65], popupAnchor: [0, -60]
    });
}

function renderMapMarkers() {
    if (!map || !spotLayer) return;
    spotLayer.clearLayers(); markers = [];
    const list = currentMapFilter === 'all' ? dbSpots : dbSpots.filter(s => s.category === currentMapFilter);
    const points = [];
    list.forEach((s, i) => {
        const lat = parseFloat(s.lat), lng = parseFloat(s.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const marker = L.marker([lat, lng], { icon: createCustomPin(s.category, s.id, i), title: s.name });
        spotLayer.addLayer(marker);
        marker.bindPopup(`<div class="mpp"><img src="${esc(s.image_url)}" alt="" loading="lazy"><div class="mpp-txt"><b>${esc(s.name)}</b><small><i class="fas fa-location-dot"></i> ${esc(s.location)}</small>
            <span class="mpp-meta"><span><i class="fas fa-star"></i> ${esc(s.rating)}</span><span><i class="fas fa-coins"></i> +${esc(s.points_reward)} pts</span></span></div></div>
            <button class="mpp-btn" onclick="window.openSpotDetails(${s.id})">View details <i class="fas fa-arrow-right"></i></button>`,
            { maxWidth: 290, minWidth: 260, className: 'mp-popup', autoPanPaddingTopLeft: [20, 70], autoPanPaddingBottomRight: [20, 40] });
        marker.spot = s;
        marker.on('click', () => focusMapSpot(s, marker));
        markers.push(marker); points.push([lat, lng]);
    });
    if (points.length) map.fitBounds(points, { padding: [60, 60], maxZoom: 15 });
    const pinned = dbSpots.filter(s => !isNaN(parseFloat(s.lat)) && !isNaN(parseFloat(s.lng)));
    renderMapFilters(pinned);
    const lg = document.getElementById('mp-legend');
    if (lg) lg.innerHTML = dbCategories.filter(c => pinned.some(s => s.category === c.slug)).map(c => `<span><i style="background:${c.color}"></i> ${esc(c.name)}</span>`).join('');
    document.getElementById('mp-sub').textContent = `${pinned.length} tourist spot${pinned.length === 1 ? '' : 's'} pinned in Naguilian, La Union`;
    if (!document.querySelector('#sidebar-content .msb, #sidebar-content .map-sidebar-content-clean')) mapSpotList();
}

function showMapSidebar(spot) {
    const sidebar = document.getElementById('map-sidebar');
    const sidebarTitle = document.getElementById('sidebar-title');
    const sidebarContent = document.getElementById('sidebar-content');
    sidebarTitle.innerHTML = `<i class="fas fa-arrow-left mp-back" aria-hidden="true"></i> Spot details`;
    document.getElementById('close-sidebar').hidden = false;
    sidebarContent.innerHTML = `
        <div class="msb">
            <div class="msb-hero"><img loading="lazy" decoding="async" src="${esc(spot.image_url)}" alt="">
                ${catBadge(spot.category)}
                <div class="msb-hero-txt"><h4>${esc(spot.name)}</h4><p><i class="fas fa-location-dot"></i> ${esc(spot.location)}</p></div></div>
            <div class="msb-stats">
                <div><i class="fas fa-star"></i><b>${esc(spot.rating)}</b><small>${spot.review_count || 0} review${spot.review_count == 1 ? '' : 's'}</small></div>
                <div><i class="fas fa-coins"></i><b>+${esc(spot.points_reward)}</b><small>points</small></div>
                <div><i class="fas fa-camera"></i><b>${itemPhotos(spot).length}</b><small>photo${itemPhotos(spot).length === 1 ? '' : 's'}</small></div>
            </div>
            <p class="msb-desc">${esc(spot.description)}</p>
            ${spot.features ? `<ul class="sx-features msb-feat">${featureChips(spot.features)}</ul>` : ''}
            <div class="msb-actions">
                <button class="btn-primary" onclick="window.openSpotDetails(${spot.id})"><i class="fas fa-circle-info"></i> View full details</button>
                <button class="dx-ghost" onclick="navigateToSpot(${spot.lat}, ${spot.lng})"><i class="fas fa-diamond-turn-right"></i> Directions</button>
            </div>
        </div>`;
    sidebar.style.display = 'block';
}

document.getElementById('close-sidebar').addEventListener('click', () => {
    clearProductMarker(); hideMapPeek(); if (map) map.closePopup();
    markers.forEach(m => m.getElement()?.classList.remove('is-sel'));
    mapSpotList();
});
document.getElementById('sidebar-title').addEventListener('click', e => { if (e.target.closest('.mp-back')) document.getElementById('close-sidebar').click(); });

function navigateToSpot(lat, lng) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank'); }

function wxInfo(code, isDay = 1) {
    code = Number(code);
    if (code === 0) return { desc: 'Clear sky', icon: isDay ? 'fa-sun' : 'fa-moon', cls: isDay ? 'sunny' : 'night' };
    if (code === 1) return { desc: 'Mainly clear', icon: isDay ? 'fa-sun' : 'fa-moon', cls: isDay ? 'sunny' : 'night' };
    if (code === 2) return { desc: 'Partly cloudy', icon: isDay ? 'fa-cloud-sun' : 'fa-cloud-moon', cls: 'cloudy' };
    if (code === 3) return { desc: 'Overcast', icon: 'fa-cloud', cls: 'cloudy' };
    if (code === 45 || code === 48) return { desc: 'Foggy', icon: 'fa-smog', cls: 'cloudy' };
    if (code >= 51 && code <= 57) return { desc: 'Drizzle', icon: 'fa-cloud-rain', cls: 'rainy' };
    if (code === 61 || code === 80) return { desc: 'Light rain', icon: 'fa-cloud-rain', cls: 'rainy' };
    if (code === 63 || code === 81) return { desc: 'Moderate rain', icon: 'fa-cloud-showers-heavy', cls: 'rainy' };
    if (code === 65 || code === 82 || code === 66 || code === 67) return { desc: 'Heavy rain', icon: 'fa-cloud-showers-heavy', cls: 'rainy' };
    if (code >= 71 && code <= 77) return { desc: 'Snow', icon: 'fa-snowflake', cls: 'cloudy' };
    if (code >= 95) return { desc: 'Thunderstorm', icon: 'fa-cloud-bolt', cls: 'stormy' };
    return { desc: 'Cloudy', icon: 'fa-cloud', cls: 'cloudy' };
}
const windDir = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((deg % 360) + 360) % 360 / 45) % 8];
const windWord = kmh => kmh < 6 ? 'Calm' : kmh < 20 ? 'Light breeze' : kmh < 39 ? 'Breezy' : kmh < 62 ? 'Strong wind' : 'Very strong wind';

async function fetchWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=16.5314&longitude=120.3941'
            + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code,is_day'
            + '&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
            + '&wind_speed_unit=kmh&timezone=Asia/Manila&forecast_days=2');
        const data = await res.json();
        if (!data || !data.current) return;
        const c = data.current, info = wxInfo(c.weather_code, c.is_day);
        const w = document.getElementById('weather-widget'); w.className = `weather-widget wx2 ${info.cls}`;
        const nowIdx = Math.max(0, data.hourly.time.findIndex(t => t >= c.time.slice(0, 13)));
        const hours = data.hourly.time.slice(nowIdx + 1, nowIdx + 7).map((t, k) => {
            const j = nowIdx + 1 + k, hi = wxInfo(data.hourly.weather_code[j], data.hourly.is_day[j]);
            const h = +t.slice(11, 13), label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
            return `<div class="wx2-hour"><small>${label}</small><i class="fas ${hi.icon}"></i><b>${Math.round(data.hourly.temperature_2m[j])}°</b><em><i class="fas fa-droplet"></i> ${data.hourly.precipitation_probability[j] ?? 0}%</em></div>`;
        }).join('');
        const rainNow = data.hourly.precipitation_probability[nowIdx] ?? 0;
        const wind = Math.round(c.wind_speed_10m), gust = Math.round(c.wind_gusts_10m || 0), dir = c.wind_direction_10m || 0;
        const updated = new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
        w.innerHTML = `
            <div class="wx2-now">
                <div class="wx2-top"><span class="wx2-place"><i class="fas fa-location-dot"></i> Naguilian, La Union</span><span class="wx2-upd">Updated ${updated}</span></div>
                <div class="wx2-main"><i class="fas ${info.icon} wx2-icon"></i><div><div class="wx2-temp">${Math.round(c.temperature_2m)}<sup>°C</sup></div><div class="wx2-desc">${info.desc}</div></div></div>
                <div class="wx2-range"><span><i class="fas fa-arrow-up"></i> ${Math.round(data.daily.temperature_2m_max[0])}°</span><span><i class="fas fa-arrow-down"></i> ${Math.round(data.daily.temperature_2m_min[0])}°</span><span>Feels like ${Math.round(c.apparent_temperature)}°</span></div>
            </div>
            <div class="wx2-side">
                <div class="wx2-tiles">
                    <div class="wx2-tile wx2-wind">
                        <div class="wx2-compass" aria-label="Wind from ${windDir(dir)}"><span class="n">N</span><span class="e">E</span><span class="s">S</span><span class="w">W</span><i class="fas fa-location-arrow" style="transform: rotate(${(dir + 180 - 45).toFixed(0)}deg)"></i></div>
                        <div><small>Wind</small><b>${wind} <span>km/h</span></b><em>${windWord(wind)} · from ${windDir(dir)}${gust ? ` · gusts ${gust}` : ''}</em></div>
                    </div>
                    <div class="wx2-tile"><span class="wx2-ic"><i class="fas fa-droplet"></i></span><div><small>Humidity</small><b>${c.relative_humidity_2m}<span>%</span></b><div class="wx2-bar"><i style="width:${c.relative_humidity_2m}%"></i></div></div></div>
                    <div class="wx2-tile"><span class="wx2-ic"><i class="fas fa-umbrella"></i></span><div><small>Chance of rain</small><b>${rainNow}<span>%</span></b><div class="wx2-bar rain"><i style="width:${rainNow}%"></i></div></div></div>
                </div>
                <div class="wx2-hours">${hours}</div>
            </div>`;
    } catch (e) { console.warn('Weather fetch failed'); }
}

(function () {
    const AN = { scans: [], reviews: [], preset: 'all', from: '', to: '', place: 'all', metric: 'visitors', type: 'line',
        rank: { q: '', cat: 'all', trend: 'all', sort: 'count', limit: '15' }, rankRows: [] };
    const charts = {};
    const p2 = n => String(n).padStart(2, '0');
    const d2s = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
    const s2d = s => new Date(s + 'T12:00:00');
    const addDays = (s, n) => { const d = s2d(s); d.setDate(d.getDate() + n); return d2s(d); };
    const daysBetween = (a, b) => Math.round((s2d(b) - s2d(a)) / 86400000);
    const dateOnly = v => String(v || '').slice(0, 10);
    const nf = n => Number(n || 0).toLocaleString();
    const fmtShort = s => s2d(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    const fmtLong = s => s2d(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    const $ = id => document.getElementById(id);
    const metricKey = () => AN.metric === 'visitors' ? 'visitors' : 'checkins';
    const metricName = () => AN.metric === 'visitors' ? 'visitors' : 'check-ins';
    const COLORS = ['#0d9488', '#f97316', '#6366f1', '#fbbf24', '#ec4899', '#10b981', '#8b5cf6', '#ef4444', '#94a3b8'];
    const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    async function loadData() {
        try {
            const [a, r] = await Promise.all([fetch('api/analytics_api.php').then(x => x.json()), fetch('api/get_data.php?type=all_reviews').then(x => x.json())]);
            AN.scans = (a && a.success && Array.isArray(a.scans)) ? a.scans : [];
            AN.reviews = Array.isArray(r) ? r : [];
        } catch (e) { AN.scans = []; AN.reviews = []; }
    }

    AN.wx = {}; AN.wxDone = new Set(); AN.wxBusy = false; AN.wxMsg = ''; AN.wxCtx = null;
    function wxStyle(code) {
        code = Number(code);
        if (code >= 95) return { icon: 'fa-bolt', cls: 'stormy' };
        if (code >= 51) return { icon: code >= 63 ? 'fa-cloud-showers-heavy' : 'fa-cloud-rain', cls: 'rainy' };
        if (code >= 45) return { icon: 'fa-smog', cls: 'cloudy' };
        if (code <= 1) return { icon: 'fa-sun', cls: 'sunny' };
        return { icon: code === 2 ? 'fa-cloud-sun' : 'fa-cloud', cls: 'cloudy' };
    }
    const isRainy = w => w && ((parseFloat(w.rain_mm) || 0) >= 1 || Number(w.weather_code) >= 51);
    const wxVal = (x, unit) => (x === null || x === undefined || x === '') ? '-' : Number(x).toFixed(1).replace(/\.0$/, '') + unit;

    async function syncWeather(from, to) {
        const key = from + '|' + to;
        if (AN.wxDone.has(key)) return;
        AN.wxDone.add(key); AN.wxBusy = true; drawWeather();
        try {
            const s = await (await fetch(`api/weather_api.php?action=sync&from=${from}&to=${to}`)).json();
            AN.wxMsg = s.success ? '' : (s.message || 'Could not save the weather.');
        } catch (e) { AN.wxMsg = 'Could not save the weather (no connection).'; AN.wxDone.delete(key); }
        try {
            const l = await (await fetch(`api/weather_api.php?action=list&from=${from}&to=${to}`)).json();
            if (l.success) (l.rows || []).forEach(r => { AN.wx[r.log_date] = r; });
        } catch (e) {}
        AN.wxBusy = false; drawWeather();
    }

    function drawWeather() {
        const box = $('an-weather'); if (!box || !AN.wxCtx) return;
        const { from, to, cur } = AN.wxCtx;
        const today = d2s(new Date()), end = to > today ? today : to;
        const perDay = {}; cur.forEach(r => { const o = perDay[r.date] || (perDay[r.date] = { visitors: 0, checkins: 0 }); o.visitors += r.visitors; o.checkins += r.checkins; });
        const days = []; for (let d = end; d >= from && days.length < 1000; d = addDays(d, -1)) days.push(d);
        const withWx = days.filter(d => AN.wx[d]);
        const rainy = withWx.filter(d => isRainy(AN.wx[d])), dry = withWx.filter(d => !isRainy(AN.wx[d]));
        const key = metricKey(), avgOn = list => list.length ? list.reduce((a, d) => a + ((perDay[d] || {})[key] || 0), 0) / list.length : 0;
        const highs = withWx.map(d => parseFloat(AN.wx[d].temp_max)).filter(v => !isNaN(v));
        const rainTotal = withWx.reduce((a, d) => a + (parseFloat(AN.wx[d].rain_mm) || 0), 0);

        const status = AN.wxBusy ? '<span class="wx-status busy"><i class="fas fa-spinner fa-spin"></i> Saving weather...</span>'
            : AN.wxMsg ? `<span class="wx-status err"><i class="fas fa-triangle-exclamation"></i> ${esc(AN.wxMsg)}</span>`
            : `<span class="wx-status ok"><i class="fas fa-circle-check"></i> Weather saved for ${nf(withWx.length)} of ${nf(days.length)} day${days.length === 1 ? '' : 's'}</span>`;
        const chips = withWx.length ? `<div class="wx-chips">
                <div class="wx-chip"><i class="fas fa-cloud-rain"></i><div><b>${nf(rainy.length)}</b><small>rainy day${rainy.length === 1 ? '' : 's'}</small></div></div>
                <div class="wx-chip"><i class="fas fa-sun"></i><div><b>${nf(dry.length)}</b><small>dry day${dry.length === 1 ? '' : 's'}</small></div></div>
                <div class="wx-chip"><i class="fas fa-temperature-half"></i><div><b>${highs.length ? (highs.reduce((a, b) => a + b, 0) / highs.length).toFixed(1) + '°C' : '-'}</b><small>average high</small></div></div>
                <div class="wx-chip"><i class="fas fa-droplet"></i><div><b>${rainTotal.toFixed(1).replace(/\.0$/, '')} mm</b><small>total rain</small></div></div>
                ${rainy.length && dry.length ? `<div class="wx-chip wide"><i class="fas fa-scale-balanced"></i><div><b>${nf(Math.round(avgOn(dry) * 10) / 10)} vs ${nf(Math.round(avgOn(rainy) * 10) / 10)}</b><small>${metricName()} per day: dry vs rainy</small></div></div>` : ''}
            </div>` : '';
        if (!AN.wxDay || AN.wxDay > today) AN.wxDay = end;
        const dayHtml = drawWeatherDay(AN.wxDay, today);

        const view = AN.wxView || 'month';
        const months = {}; days.forEach(d => { (months[d.slice(0, 7)] = months[d.slice(0, 7)] || []).push(d); });
        if (AN.wxMonth && !months[AN.wxMonth]) AN.wxMonth = null;
        const avgOf = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
        const monthName = m => s2d(m + '-01').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
        const monthRows = Object.entries(months).map(([m, ds]) => {
            const ws = ds.map(d => AN.wx[d]).filter(Boolean);
            const hi = avgOf(ws.map(w => parseFloat(w.temp_max)).filter(v => !isNaN(v))), lo = avgOf(ws.map(w => parseFloat(w.temp_min)).filter(v => !isNaN(v)));
            const wet = ws.filter(isRainy).length, rain = ws.reduce((a, w) => a + (parseFloat(w.rain_mm) || 0), 0);
            const vis = ds.reduce((a, d) => a + ((perDay[d] || {}).visitors || 0), 0), chk = ds.reduce((a, d) => a + ((perDay[d] || {}).checkins || 0), 0);
            const st = !ws.length ? null : wet > ws.length / 2 ? wxStyle(61) : wet ? wxStyle(2) : wxStyle(0);
            return `<tr data-month="${m}"><td><b class="wx-mname">${monthName(m)}</b><small class="wx-msub">${nf(ws.length)} of ${nf(ds.length)} days saved</small></td>
                <td>${st ? `<span class="wx-tag ${st.cls}"><i class="fas ${st.icon}"></i> ${nf(wet)} rainy · ${nf(ws.length - wet)} dry</span>` : `<span class="wx-tag none">${AN.wxBusy ? 'Saving...' : 'Not saved'}</span>`}</td>
                <td>${hi != null ? wxVal(hi, '°') + ' / ' + wxVal(lo, '°C') : '-'}</td><td>${ws.length ? wxVal(rain, ' mm') : '-'}</td>
                <td>${nf(vis)}</td><td>${nf(chk)}</td><td class="wx-go"><i class="fas fa-chevron-right"></i></td></tr>`;
        }).join('');
        const dayList = AN.wxMonth ? months[AN.wxMonth] : days.slice(0, 62);
        const rowsHtml = dayList.map(d => {
            const w = AN.wx[d], q = perDay[d] || { visitors: 0, checkins: 0 }, st = w ? wxStyle(w.weather_code) : null;
            return `<tr data-day="${d}" class="${d === AN.wxDay ? 'is-sel' : ''}"><td>${fmtLong(d)}</td>
                <td>${w ? `<span class="wx-tag ${st.cls}"><i class="fas ${st.icon}"></i> ${esc(w.summary)}</span>` : `<span class="wx-tag none">${AN.wxBusy ? 'Saving...' : 'Not saved'}</span>`}</td>
                <td>${w ? wxVal(w.temp_max, '°') + ' / ' + wxVal(w.temp_min, '°C') : '-'}</td><td>${w ? wxVal(w.rain_mm, ' mm') : '-'}</td>
                <td>${nf(q.visitors)}</td><td>${nf(q.checkins)}</td></tr>`;
        }).join('');
        const nMonths = Object.keys(months).length;
        const switcher = `<div class="wx-view" role="tablist"><button type="button" data-wxv="month" class="${view === 'month' ? 'on' : ''}"><i class="fas fa-calendar"></i> By month <em>${nf(nMonths)}</em></button><button type="button" data-wxv="day" class="${view === 'day' ? 'on' : ''}"><i class="fas fa-calendar-day"></i> By day <em>${nf(days.length)}</em></button></div>`;
        const table = view === 'month'
            ? `<div class="an-table-scroll"><table class="wx-table wx-months"><thead><tr><th>Month</th><th>Weather</th><th>Avg high / low</th><th>Total rain</th><th>Visitors</th><th>QR check-ins</th><th></th></tr></thead>
                <tbody>${monthRows || '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:22px">No months in this range</td></tr>'}</tbody></table></div><p class="wx-note">Tap a month to see its days.</p>`
            : `${AN.wxMonth ? `<div class="wx-mbar"><button type="button" class="wx-allm"><i class="fas fa-arrow-left"></i> All months</button><b>${monthName(AN.wxMonth)}</b></div>` : ''}
                <div class="an-table-scroll"><table class="wx-table"><thead><tr><th>Date</th><th>Weather</th><th>High / Low</th><th>Rain</th><th>Visitors</th><th>QR check-ins</th></tr></thead>
                <tbody>${rowsHtml || '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:22px">No days in this range</td></tr>'}</tbody></table></div>
                ${!AN.wxMonth && days.length > dayList.length ? `<p class="wx-note">Showing the latest ${dayList.length} of ${nf(days.length)} days. Use By month to see older ones.</p>` : ''}`;
        box.innerHTML = `<div class="wx-head"><h3><i class="fas fa-cloud-sun"></i> Weather in this range</h3>${status}</div>${dayHtml}${chips}
            <details class="wx-days"${window.AN_WXOPEN ? ' open' : ''}><summary><i class="fas fa-table-list"></i> Weather by month and day <em>${nf(nMonths)} month${nMonths === 1 ? '' : 's'}</em><i class="fas fa-chevron-down wx-days-caret"></i></summary>
            ${switcher}${table}</details>`;
    }
    function drawWeatherDay(day, today) {
        const w = AN.wx[day];
        if (!w && !AN.wxBusy) syncWeather(day, day);
        const dayRows = (AN.wxCtx.all || []).filter(r => r.date === day);
        const visitors = dayRows.reduce((a, r) => a + r.visitors, 0), checkins = dayRows.reduce((a, r) => a + r.checkins, 0);
        const places = {}; dayRows.forEach(r => { places[r.place] = (places[r.place] || 0) + r.visitors + r.checkins; });
        const placeList = Object.entries(places).sort((a, b) => b[1] - a[1]);
        const v = (x, unit, dp = 1) => (x === null || x === undefined || x === '') ? '-' : Number(x).toFixed(dp).replace(/\.0$/, '') + unit;
        const st = w ? wxStyle(w.weather_code) : { icon: 'fa-cloud', cls: 'none' };
        const uvWord = u => u == null || u === '' ? '' : u < 3 ? 'Low' : u < 6 ? 'Moderate' : u < 8 ? 'High' : u < 11 ? 'Very high' : 'Extreme';
        const tile = (ic, label, val, sub = '') => `<div class="wxd-tile"><i class="fas ${ic}"></i><div><small>${label}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}</div></div>`;
        const pick = `<div class="wxd-pick">
                <button type="button" class="wxd-nav" data-step="-1" aria-label="Day before"><i class="fas fa-chevron-left"></i></button>
                <span class="wxd-date"><input type="date" id="wxd-date" class="cal-native" value="${day}" max="${today}" tabindex="-1" aria-hidden="true"><button type="button" class="cal-btn" data-cal-for="wxd-date"><i class="fas fa-calendar-day"></i><span>${s2d(day).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span><i class="fas fa-chevron-down cal-caret"></i></button></span>
                <button type="button" class="wxd-nav" data-step="1" aria-label="Day after" ${day >= today ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
                ${day !== today ? '<button type="button" class="wxd-today">Today</button>' : ''}
            </div>`;
        if (!w) return `<div class="wxd">${pick}<div class="wxd-empty"><i class="fas ${AN.wxBusy ? 'fa-spinner fa-spin' : 'fa-cloud'}"></i> ${AN.wxBusy ? 'Getting the weather for ' + fmtLong(day) + '...' : 'No weather saved for ' + fmtLong(day) + (AN.wxMsg ? ': ' + esc(AN.wxMsg) : '.')}</div></div>`;
        return `<div class="wxd">${pick}
            <div class="wxd-main ${st.cls}">
                <i class="fas ${st.icon} wxd-icon"></i>
                <div class="wxd-now"><small>${s2d(day).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</small>
                    <b>${esc(w.summary || 'Weather')}</b>
                    <span>${v(w.temp_max, '°')} / ${v(w.temp_min, '°C')}${w.temp_mean != null ? ` · average ${v(w.temp_mean, '°C')}` : ''}</span></div>
                <div class="wxd-visits"><b>${nf(visitors)}</b><small>visitors</small><b>${nf(checkins)}</b><small>QR check-ins</small></div>
            </div>
            <div class="wxd-grid">
                ${tile('fa-temperature-arrow-up', 'Feels like (max)', v(w.feels_max, '°C'))}
                ${tile('fa-droplet', 'Humidity', v(w.humidity, '%', 0))}
                ${tile('fa-cloud', 'Cloud cover', v(w.cloud, '%', 0))}
                ${tile('fa-cloud-rain', 'Rain', v(w.rain_mm, ' mm'), w.rain_hours != null ? `${v(w.rain_hours, ' h')} of rain` : '')}
                ${tile('fa-wind', 'Wind', v(w.wind_max, ' km/h'), [w.gust_max != null ? `gusts ${v(w.gust_max, '')}` : '', w.wind_dir != null ? `from ${windDir(w.wind_dir)}` : ''].filter(Boolean).join(' · '))}
                ${tile('fa-sun', 'Sunshine', v(w.sun_hours, ' h'), w.uv_max != null && w.uv_max !== '' ? `UV ${v(w.uv_max, '')} · ${uvWord(+w.uv_max)}` : '')}
                ${tile('fa-cloud-sun', 'Sunrise / sunset', w.sunrise ? `${w.sunrise} · ${w.sunset}` : '-')}
            </div>
            ${placeList.length ? `<p class="wxd-places"><i class="fas fa-location-dot"></i> Visited that day: ${placeList.slice(0, 6).map(([n, c]) => `<b>${esc(n)}</b> (${nf(c)})`).join(', ')}</p>` : '<p class="wxd-places muted"><i class="fas fa-location-dot"></i> No visitors recorded that day.</p>'}
        </div>`;
    }
    document.getElementById('an-weather').addEventListener('click', e => {
        const vb = e.target.closest('[data-wxv]'), mrow = e.target.closest('tr[data-month]'), allm = e.target.closest('.wx-allm');
        if (vb) { AN.wxView = vb.dataset.wxv; AN.wxMonth = null; return drawWeather(); }
        if (allm) { AN.wxView = 'month'; AN.wxMonth = null; return drawWeather(); }
        if (mrow) { AN.wxView = 'day'; AN.wxMonth = mrow.dataset.month; return drawWeather(); }
        const nav = e.target.closest('.wxd-nav'), row = e.target.closest('tr[data-day]'), td = e.target.closest('.wxd-today');
        if (nav && !nav.disabled) AN.wxDay = addDays(AN.wxDay, +nav.dataset.step);
        else if (row) AN.wxDay = row.dataset.day;
        else if (td) AN.wxDay = d2s(new Date());
        else return;
        drawWeather();
        if (row) document.querySelector('#an-weather .wxd').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    document.getElementById('an-weather').addEventListener('change', e => {
        if (e.target.id === 'wxd-date' && e.target.value) { AN.wxDay = e.target.value; drawWeather(); }
    });

    function allRows() {
        const out = [];
        dbRecords.forEach(r => {
            const raw = String(r.location || '').trim(); if (!raw) return;
            const sp = matchSpot(raw);
            out.push({ date: dateOnly(r.record_date), place: sp ? sp.name : raw, cat: sp ? sp.category : 'other', visitors: parseInt(r.visitors) || 0, checkins: 0, points: 0 });
        });
        AN.scans.filter(s => s.name).forEach(s => out.push({ date: dateOnly(s.scanned_at), place: s.name, cat: s.category || 'other', visitors: 0, checkins: 1, points: parseInt(s.points) || 0 }));
        return out.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.date));
    }

    function getRange(rows) {
        const today = d2s(new Date()), now = new Date(), y = now.getFullYear(), m = now.getMonth();
        let from, to;
        switch (AN.preset) {
            case 'today': from = to = today; break;
            case '7d': to = today; from = addDays(today, -6); break;
            case '30d': to = today; from = addDays(today, -29); break;
            case 'month': from = `${y}-${p2(m + 1)}-01`; to = today; break;
            case 'year': from = `${y}-01-01`; to = today; break;
            case 'custom': from = AN.from || AN.to || today; to = AN.to || AN.from || today; break;
            default: { const ds = rows.map(r => r.date).sort(); from = ds[0] || today; to = ds[ds.length - 1] || today; }
        }
        if (from > to) [from, to] = [to, from];
        return { from, to };
    }

    const slice = (rows, f, t, place) => rows.filter(r => r.date >= f && r.date <= t && (place === 'all' || r.place === place));
    const sum = (arr, k) => arr.reduce((a, r) => a + r[k], 0);
    const pctChange = (cur, prev) => prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? null : 0);
    const bucketKey = (s, g) => { if (g === 'day') return s; if (g === 'month') return s.slice(0, 7); const d = s2d(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d2s(d); };
    function bucketList(from, to, g) {
        const keys = [], seen = new Set(); let cur = from;
        while (cur <= to && keys.length < 1000) { const k = bucketKey(cur, g); if (!seen.has(k)) { seen.add(k); keys.push(k); } cur = addDays(cur, 1); }
        return keys;
    }
    const bucketLabel = (k, g) => g === 'month' ? s2d(k + '-01').toLocaleDateString('en-PH', { month: 'short', year: 'numeric' }) : (g === 'week' ? 'Wk ' : '') + fmtShort(k);

    function deltaChip(cur, prev, hasPrev) {
        if (!hasPrev) return '';
        const c = pctChange(cur, prev);
        if (c === null) return '<span class="an-delta up"><i class="fas fa-arrow-trend-up"></i> New</span>';
        if (Math.abs(c) < 1) return '<span class="an-delta flat"><i class="fas fa-minus"></i> Steady</span>';
        return `<span class="an-delta ${c > 0 ? 'up' : 'down'}"><i class="fas fa-arrow-trend-${c > 0 ? 'up' : 'down'}"></i> ${Math.abs(c).toFixed(0)}%</span>`;
    }

    function reviewsIn(f, t, place) {
        let list = AN.reviews.filter(r => { const d = dateOnly(r.created_at); return d >= f && d <= t; });
        if (place !== 'all') { const sp = dbSpots.find(s => s.name === place); list = sp ? list.filter(r => r.item_type === 'spot' && r.item_id == sp.id) : []; }
        return list;
    }
    const avg = list => list.length ? list.reduce((a, r) => a + (parseFloat(r.rating) || 0), 0) / list.length : 0;

    function fillPlaces(rows) {
        const sel = $('an-place'), keep = AN.place;
        const names = [...new Set([...dbSpots.map(s => s.name), ...rows.map(r => r.place)])].filter(Boolean).sort((a, b) => a.localeCompare(b));
        sel.innerHTML = '<option value="all">All places</option>' + names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
        sel.value = names.includes(keep) ? keep : 'all'; AN.place = sel.value;
    }

    function mkChart(id, cfg, emptyMsg) {
        if (charts[id]) { charts[id].destroy(); delete charts[id]; }
        const box = $(id).parentElement;
        let msg = box.querySelector('.an-chart-empty');
        if (emptyMsg) {
            if (!msg) { msg = document.createElement('div'); msg.className = 'an-chart-empty'; box.appendChild(msg); }
            msg.innerHTML = `<i class="fas fa-chart-simple"></i><span>${emptyMsg}</span>`; msg.hidden = false;
            $(id).style.visibility = 'hidden';
            return;
        }
        if (msg) msg.hidden = true;
        $(id).style.visibility = '';
        charts[id] = new Chart($(id).getContext('2d'), cfg);
    }

    function donutLegend(id, labels, data, colors) {
        const sum = data.reduce((a, b) => a + b, 0);
        $(id).innerHTML = labels.map((l, i) => `<li><i style="background:${colors[i % colors.length]}"></i><span title="${esc(l)}">${esc(l)}</span><b>${nf(data[i])}</b><small>${sum ? (data[i] / sum * 100).toFixed(0) : 0}%</small></li>`).join('');
    }

    const compact = n => Math.abs(n) >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k' : n;
    const crosshair = { id: 'crosshair', afterDatasetsDraw(ch) {
        const a = ch.tooltip && ch.tooltip.getActiveElements(); if (!a || !a.length) return;
        const x = a[0].element.x, { top, bottom } = ch.chartArea, ctx = ch.ctx;
        ctx.save(); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(18,48,47,.18)'; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.restore();
    } };

    function render() {
        const rows = allRows();
        const key = metricKey();
        const { from, to } = getRange(rows);
        const hasPrev = AN.preset !== 'all';
        const len = daysBetween(from, to) + 1;
        const pf = addDays(from, -len), pt = addDays(from, -1);
        const cur = slice(rows, from, to, AN.place);
        const prev = hasPrev ? slice(rows, pf, pt, AN.place) : [];
        const revs = reviewsIn(from, to, AN.place);

        const rangeTxt = from === to ? fmtLong(from) : `${fmtLong(from)} to ${fmtLong(to)}`;
        $('an-range-label').textContent = (AN.preset === 'all' ? 'All time: ' : '') + rangeTxt + (AN.place !== 'all' ? ' · ' + AN.place : '');
        if (AN.preset !== 'custom') { $('an-from').value = from; $('an-to').value = to; }
        calRefreshButtons();

        AN.wxCtx = { from, to, cur, all: slice(rows, '0000-00-00', '9999-12-31', AN.place) };
        syncWeather(hasPrev ? pf : from, to);

        const empty = !cur.length && !revs.length;
        $('an-empty').style.display = empty ? 'block' : 'none';
        $('an-body').style.display = empty ? 'none' : 'block';
        if (empty) { Object.keys(charts).forEach(k => { charts[k].destroy(); delete charts[k]; }); return; }

        const totals = { visitors: sum(cur, 'visitors'), checkins: sum(cur, 'checkins'), points: sum(cur, 'points') };
        const prevT = { visitors: sum(prev, 'visitors'), checkins: sum(prev, 'checkins') };
        const total = totals[key];

        const byDay = {}; cur.forEach(r => { byDay[r.date] = (byDay[r.date] || 0) + r[key]; });
        const dayEntries = Object.entries(byDay).sort((a, b) => b[1] - a[1]);
        const busiest = dayEntries.length && dayEntries[0][1] > 0 ? dayEntries[0] : null;
        const today = d2s(new Date());
        const days = Math.max(1, daysBetween(from, to > today ? today : to) + 1);

        const byPlace = {}; cur.forEach(r => { const o = byPlace[r.place] || (byPlace[r.place] = { visitors: 0, checkins: 0, cat: r.cat }); o.visitors += r.visitors; o.checkins += r.checkins; if (r.cat !== 'other') o.cat = r.cat; });
        dbSpots.filter(s => AN.place === 'all' || s.name === AN.place).forEach(s => {
            if (!byPlace[s.name]) byPlace[s.name] = { visitors: 0, checkins: 0, cat: s.category };
            else byPlace[s.name].cat = s.category;
        });
        const placeList = Object.entries(byPlace).map(([name, o]) => ({ name, ...o })).sort((a, b) => b[key] - a[key] || b.visitors - a.visitors || a.name.localeCompare(b.name));
        const top = placeList.length && placeList[0][key] > 0 ? placeList[0] : null;
        const ratedAvg = avg(revs);

        const prevTxt = hasPrev ? `<small class="an-vs">vs previous ${len} day${len > 1 ? 's' : ''}</small>` : '';
        $('an-kpis').innerHTML = [
            ['fa-users', 'Recorded visitors', nf(totals.visitors), deltaChip(totals.visitors, prevT.visitors, hasPrev) + prevTxt],
            ['fa-qrcode', 'QR check-ins', nf(totals.checkins), deltaChip(totals.checkins, prevT.checkins, hasPrev) + prevTxt],
            ['fa-coins', 'Points given out', nf(totals.points), '<small class="an-vs">from QR check-ins</small>'],
            ['fa-star', 'Average rating', revs.length ? ratedAvg.toFixed(1) + ' / 5' : '-', `<small class="an-vs">${revs.length} review${revs.length === 1 ? '' : 's'} in this range</small>`],
            ['fa-trophy', 'Top place', top ? esc(top.name) : '-', top ? `<small class="an-vs">${nf(top[key])} ${metricName()}</small>` : ''],
            ['fa-calendar-day', 'Busiest day', busiest ? fmtShort(busiest[0]) : '-', busiest ? `<small class="an-vs">${nf(busiest[1])} ${metricName()}</small>` : ''],
            ['fa-gauge-high', 'Daily average', nf(Math.round(total / days * 10) / 10), `<small class="an-vs">${metricName()} per day</small>`],
        ].map(([ic, lab, val, extra], i) => `<div class="an-kpi"><div class="an-kpi-ic c${i % 4}"><i class="fas ${ic}"></i></div><div><span class="an-kpi-lab">${lab}</span><b class="an-kpi-val ${val.length > 12 ? 'sm' : ''}">${val}</b><div class="an-kpi-ex">${extra}</div></div></div>`).join('');

        const ins = [];
        if (top && placeList.length > 1 && total > 0) ins.push(`<b>${esc(top.name)}</b> is the most popular place with ${nf(top[key])} ${metricName()} (${(top[key] / total * 100).toFixed(0)}% of the total).`);
        if (busiest) ins.push(`The busiest day was <b>${fmtLong(busiest[0])}</b> with ${nf(busiest[1])} ${metricName()}.`);
        if (hasPrev) { const c = pctChange(total, prevT[key]); if (c === null) ins.push(`There were no ${metricName()} in the previous ${len} days, so everything here is new.`); else if (Math.abs(c) >= 1) ins.push(`${metricName()[0].toUpperCase() + metricName().slice(1)} are <b>${c > 0 ? 'up' : 'down'} ${Math.abs(c).toFixed(0)}%</b> compared with the previous ${len} days.`); }
        const wk = cur.filter(r => { const d = s2d(r.date).getDay(); return d === 0 || d === 6; });
        if (total > 0 && days >= 7) { const share = sum(wk, key) / total * 100; ins.push(`Weekends bring <b>${share.toFixed(0)}%</b> of ${metricName()}.`); }
        if (totals.visitors > 0 && totals.checkins > 0) ins.push(`QR check-ins equal <b>${(totals.checkins / totals.visitors * 100).toFixed(0)}%</b> of the recorded visitors.`);
        const rated = {}; revs.filter(r => r.item_type === 'spot').forEach(r => { (rated[r.item_id] = rated[r.item_id] || []).push(r); });
        const bestRated = Object.entries(rated).map(([id, l]) => ({ sp: dbSpots.find(s => s.id == id), a: avg(l), n: l.length })).filter(x => x.sp).sort((a, b) => b.a - a.a || b.n - a.n)[0];
        if (bestRated) ins.push(`Best rated place: <b>${esc(bestRated.sp.name)}</b> (${bestRated.a.toFixed(1)} stars from ${bestRated.n} review${bestRated.n === 1 ? '' : 's'}).`);
        $('an-insights').innerHTML = ins.length ? `<div class="an-ins-title"><i class="fas fa-lightbulb"></i> What the numbers say</div><ul>${ins.slice(0, 5).map(t => `<li>${t}</li>`).join('')}</ul>` : '';
        drawWeather();

        Chart.defaults.font.family = "'Figtree', 'Inter', system-ui, sans-serif"; Chart.defaults.font.size = 12; Chart.defaults.color = '#7a8f8d';
        const tooltip = { backgroundColor: '#fff', titleColor: '#12302f', bodyColor: '#41585a', borderColor: '#e3ebea', borderWidth: 1, padding: { x: 12, y: 10 }, cornerRadius: 12, caretSize: 6, boxPadding: 6, usePointStyle: true, titleFont: { weight: '700', size: 13 }, bodyFont: { size: 12 } };
        const legendTop = { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 16, font: { size: 12, weight: '600' } } };
        const gridY = { color: '#eef3f2', drawTicks: false, lineWidth: 1 }, noBorder = { display: false, dash: [4, 4] };
        const yTicks = { precision: 0, padding: 10, maxTicksLimit: 6, callback: v => compact(v) };
        const xTicks = { padding: 8, maxRotation: 0, autoSkip: true, autoSkipPadding: 16 };
        const anim = { duration: 600, easing: 'easeOutQuart' };

        const span = len, g = span <= 45 ? 'day' : span <= 200 ? 'week' : 'month';
        const keys = bucketList(from, to, g);
        const vals = Object.fromEntries(keys.map(k => [k, 0])); cur.forEach(r => { const k = bucketKey(r.date, g); if (k in vals) vals[k] += r[key]; });
        $('an-time-title').textContent = `${metricName()[0].toUpperCase() + metricName().slice(1)} per ${g}`;
        const fade = c => { const { chart } = c, a = chart.chartArea; if (!a) return 'rgba(13,148,136,.12)'; const gr = chart.ctx.createLinearGradient(0, a.top, 0, a.bottom); gr.addColorStop(0, 'rgba(13,148,136,.28)'); gr.addColorStop(.7, 'rgba(13,148,136,.04)'); gr.addColorStop(1, 'rgba(13,148,136,0)'); return gr; };
        const isBar = AN.type === 'bar';
        const sets = [{ label: 'This period', data: keys.map(k => vals[k]), borderColor: '#0d9488', backgroundColor: isBar ? '#14b8a6' : fade, hoverBackgroundColor: '#0d9488', fill: !isBar, tension: .4, cubicInterpolationMode: 'monotone', borderWidth: isBar ? 0 : 2.5, borderRadius: 8, borderSkipped: false, maxBarThickness: 28,
            pointRadius: isBar || keys.length > 20 ? 0 : 3, pointBackgroundColor: '#fff', pointBorderColor: '#0d9488', pointBorderWidth: 2, pointHoverRadius: 6, pointHoverBackgroundColor: '#0d9488', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 3 }];
        if (hasPrev && g === 'day') {
            const pv = {}; slice(rows, pf, pt, AN.place).forEach(r => { pv[r.date] = (pv[r.date] || 0) + r[key]; });
            sets.push({ label: 'Previous period', data: keys.map(k => pv[addDays(k, -len)] || 0), borderColor: '#fdba74', borderDash: [5, 5], backgroundColor: '#fdba74', fill: false, tension: .4, cubicInterpolationMode: 'monotone', borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: '#f97316', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2, type: 'line' });
        }
        mkChart('anTimeChart', { type: isBar ? 'bar' : 'line', data: { labels: keys.map(k => bucketLabel(k, g)), datasets: sets },
            options: { responsive: true, maintainAspectRatio: false, animation: anim, layout: { padding: { top: 4, right: 4 } }, interaction: { mode: 'index', intersect: false },
                plugins: { legend: sets.length > 1 ? legendTop : { display: false }, tooltip },
                scales: { x: { grid: { display: false }, border: { display: false }, ticks: { ...xTicks, maxTicksLimit: 10 } }, y: { beginAtZero: true, grace: '8%', grid: gridY, border: noBorder, ticks: yTicks } } },
            plugins: [crosshair] }, total ? '' : `No ${metricName()} in this range`);

        const pl = placeList.filter(p => p[key] > 0); const topP = pl.slice(0, 7), rest = pl.slice(7).reduce((a, p) => a + p[key], 0);
        const plLabels = topP.map(p => p.name).concat(rest ? ['Others'] : []), plData = topP.map(p => p[key]).concat(rest ? [rest] : []);
        const center = (big, small) => ({ id: 'centerText', afterDraw(ch) { const { ctx, chartArea: { left, right, top: tp, bottom } } = ch; const cx = (left + right) / 2, cy = (tp + bottom) / 2; ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#12302f'; ctx.font = "800 22px 'Figtree', sans-serif"; ctx.fillText(big, cx, cy - 8); ctx.fillStyle = '#7a8f8d'; ctx.font = "600 11px 'Figtree', sans-serif"; ctx.fillText(small, cx, cy + 13); ctx.restore(); } });
        const ring = { borderWidth: 3, borderColor: '#fff', hoverBorderColor: '#fff', borderRadius: 4, hoverOffset: 5 };
        const donutOpts = { responsive: true, maintainAspectRatio: false, animation: { animateRotate: true, duration: 700 }, cutout: '74%', layout: { padding: 6 }, plugins: { legend: { display: false }, tooltip } };
        mkChart('anPlaceChart', { type: 'doughnut', data: { labels: plLabels, datasets: [{ data: plData, backgroundColor: COLORS, ...ring }] }, options: donutOpts, plugins: [center(compact(total), metricName())] }, plData.length ? '' : 'No places to compare yet');
        donutLegend('anPlaceLegend', plLabels, plData, COLORS);

        const dow = [0, 0, 0, 0, 0, 0, 0]; cur.forEach(r => { dow[(s2d(r.date).getDay() + 6) % 7] += r[key]; });
        const dmax = Math.max(...dow);
        mkChart('anDowChart', { type: 'bar', data: { labels: DOW, datasets: [{ label: metricName(), data: dow, backgroundColor: dow.map(v => v === dmax && dmax > 0 ? '#f97316' : '#bfe9e3'), hoverBackgroundColor: dow.map(v => v === dmax && dmax > 0 ? '#ea580c' : '#14b8a6'), borderRadius: 8, borderSkipped: false, maxBarThickness: 34, categoryPercentage: .7 }] },
            options: { responsive: true, maintainAspectRatio: false, animation: anim, plugins: { legend: { display: false }, tooltip: { ...tooltip, callbacks: { title: it => it[0].label + (it[0].raw === dmax && dmax > 0 ? '  · busiest' : '') } } },
                scales: { x: { grid: { display: false }, border: { display: false }, ticks: { padding: 8, font: { weight: '600' } } }, y: { beginAtZero: true, grace: '8%', grid: gridY, border: noBorder, ticks: yTicks } } } }, dmax > 0 ? '' : `No ${metricName()} in this range`);

        const cats = {}; cur.forEach(r => { const c = r.cat || 'other'; cats[c] = (cats[c] || 0) + r[key]; });
        const catE = Object.entries(cats).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        const catLabels = catE.map(([c]) => catName(c)), catData = catE.map(([, v]) => v);
        const catCols = catE.map(([c]) => c === 'other' ? '#94a3b8' : catInfo(c).color);
        mkChart('anCatChart', { type: 'doughnut', data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: catCols, ...ring }] }, options: donutOpts, plugins: [center(String(catE.length), catE.length === 1 ? 'category' : 'categories')] }, catData.length ? '' : 'No categories to compare yet');
        donutLegend('anCatLegend', catLabels, catData, catCols);

        const rl = Object.entries(rated).map(([id, l]) => ({ sp: dbSpots.find(s => s.id == id), a: avg(l), n: l.length })).filter(x => x.sp).sort((a, b) => b.a - a.a).slice(0, 8);
        $('anRatingChart').parentElement.style.height = rl.length ? Math.max(150, 46 + rl.length * 40) + 'px' : '';
        mkChart('anRatingChart', { type: 'bar', data: { labels: rl.map(x => x.sp.name.length > 22 ? x.sp.name.slice(0, 21) + '…' : x.sp.name), datasets: [
                { label: 'Average rating', data: rl.map(x => +x.a.toFixed(2)), backgroundColor: '#fbbf24', hoverBackgroundColor: '#f59e0b', borderRadius: 999, borderSkipped: false, barThickness: 12, grouped: false, order: 1 },
                { label: 'track', data: rl.map(() => 5), backgroundColor: '#f3f6f5', hoverBackgroundColor: '#f3f6f5', borderRadius: 999, borderSkipped: false, barThickness: 12, grouped: false, order: 2 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: anim,
                plugins: { legend: { display: false }, tooltip: { ...tooltip, filter: it => it.datasetIndex === 0, callbacks: { title: it => rl[it[0].dataIndex].sp.name, label: it => ` ${it.raw.toFixed(1)} of 5 stars (${rl[it.dataIndex].n} review${rl[it.dataIndex].n === 1 ? '' : 's'})` } } },
                scales: { x: { min: 0, max: 5, grid: { display: false }, border: { display: false }, ticks: { stepSize: 1, padding: 6, callback: v => v + '★' } }, y: { grid: { display: false }, border: { display: false }, ticks: { padding: 8, color: '#2e4748', font: { weight: '600' } } } } } }, rl.length ? '' : 'No ratings in this range yet');

        const prevPlace = {}; prev.forEach(r => { prevPlace[r.place] = (prevPlace[r.place] || 0) + r[key]; });
        AN.rankRows = placeList.map((p, i) => {
            const sp = dbSpots.find(s => s.name === p.name), rv = sp ? revs.filter(r => r.item_type === 'spot' && r.item_id == sp.id) : [];
            const c = hasPrev ? pctChange(p[key], prevPlace[p.name] || 0) : 0;
            const trend = !hasPrev ? 'none' : c === null ? 'new' : Math.abs(c) < 2 ? 'steady' : c > 0 ? 'up' : 'down';
            return { ...p, rank: i + 1, share: total > 0 ? p[key] / total * 100 : 0, change: c, trend, rating: rv.length ? avg(rv) : null, ratingCount: rv.length };
        });
        const rankCats = dbCategories.map(c => c.slug).concat(AN.rankRows.some(r => !r.cat || r.cat === 'other') ? ['other'] : []);
        const catSel = $('an-rank-cat');
        catSel.innerHTML = '<option value="all">All categories</option>' + rankCats.map(c => `<option value="${esc(c)}">${esc(catName(c))}</option>`).join('');
        catSel.value = rankCats.includes(AN.rank.cat) ? AN.rank.cat : 'all'; AN.rank.cat = catSel.value;
        $('an-rank-trend').disabled = !hasPrev;
        if (!hasPrev && AN.rank.trend !== 'all') { AN.rank.trend = 'all'; $('an-rank-trend').value = 'all'; }
        drawRanking();

        const logs = AN.scans.filter(s => s.name && dateOnly(s.scanned_at) >= from && dateOnly(s.scanned_at) <= to && (AN.place === 'all' || s.name === AN.place))
            .sort((a, b) => String(b.scanned_at).localeCompare(String(a.scanned_at)));
        $('an-log-note').textContent = logs.length ? `(${nf(logs.length)} in this range${logs.length > 100 ? ', showing latest 100' : ''})` : '';
        $('an-log-body').innerHTML = logs.length ? logs.slice(0, 100).map(s => `<tr><td><span class="an-when">${fmtDateTime(s.scanned_at)}</span></td>
                <td><div class="an-who"><span class="an-av">${esc((s.user_name || '?').trim().charAt(0).toUpperCase())}</span><div><strong>${esc(s.user_name || 'Deleted account')}</strong>${s.user_email ? `<small>${esc(s.user_email)}</small>` : ''}</div></div></td>
                <td>${esc(s.name)}</td><td>${visitCell(s)}</td><td>${parseInt(s.points) ? `<span class="an-pts">+${parseInt(s.points)}</span>` : '<span class="an-pts zero">0</span>'}</td></tr>`).join('')
            : '<tr><td colspan="5" class="an-none">No QR check-ins in this range</td></tr>';

    }
    window.refreshAnalyticsIfOpen = () => { if (document.getElementById('analytics-view').classList.contains('active')) render(); };

    function visitCell(s) {
        if (s.visit_type !== 'group') return '<span class="an-visit solo"><i class="fas fa-user"></i> Solo</span>';
        const label = { male: 'M', female: 'F', other: 'Other' };
        const who = (s.companions || []).map(c => `${label[c.gender] || '?'} ${c.age}`).join(', ');
        return `<span class="an-visit group"><i class="fas fa-users"></i> Group of ${parseInt(s.group_size) || 1}</span>${who ? `<small class="an-visit-who">With: ${esc(who)}</small>` : ''}`;
    }

    function drawRanking() {
        const R = AN.rank, all = AN.rankRows || [];
        const q = R.q.trim().toLowerCase();
        let list = all.filter(p => (!q || p.name.toLowerCase().includes(q)) && (R.cat === 'all' || (p.cat || 'other') === R.cat) && (R.trend === 'all' || p.trend === R.trend));
        const key = metricKey();
        const sorters = {
            count: (a, b) => a.rank - b.rank,
            visitors: (a, b) => b.visitors - a.visitors || a.rank - b.rank,
            checkins: (a, b) => b.checkins - a.checkins || a.rank - b.rank,
            rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || b.ratingCount - a.ratingCount || a.rank - b.rank,
            trend: (a, b) => (b.change === null ? Infinity : Math.abs(b.change || 0)) - (a.change === null ? Infinity : Math.abs(a.change || 0)) || a.rank - b.rank,
            name: (a, b) => a.name.localeCompare(b.name),
        };
        list = list.slice().sort(sorters[R.sort] || sorters.count);
        const matched = list.length;
        if (R.limit !== 'all') list = list.slice(0, parseInt(R.limit));
        const filtered = q || R.cat !== 'all' || R.trend !== 'all';
        $('an-rank-note').textContent = all.length ? (filtered ? `${matched} of ${all.length} places` : `${all.length} place${all.length === 1 ? '' : 's'}`) + (matched > list.length ? `, showing ${list.length}` : '') : '';
        $('an-rank-reset').hidden = !filtered && R.sort === 'count' && R.limit === '15';
        const trendHtml = p => {
            if (p.trend === 'none') return '<span class="an-trend trend-stable"><i class="fas fa-minus"></i> -</span>';
            if (p.trend === 'new') return '<span class="an-trend trend-up"><i class="fas fa-wand-magic-sparkles"></i> New</span>';
            if (p.trend === 'steady') return '<span class="an-trend trend-stable"><i class="fas fa-minus"></i> Steady</span>';
            return `<span class="an-trend trend-${p.trend}"><i class="fas fa-arrow-trend-${p.trend}"></i> ${Math.abs(p.change).toFixed(0)}%</span>`;
        };
        $('analytics-table-body').innerHTML = list.length ? list.map(p => {
            const rc = p.rank === 1 ? 'rank-1' : p.rank === 2 ? 'rank-2' : p.rank === 3 ? 'rank-3' : 'rank-other';
            return `<tr><td><span class="rank-badge ${rc}">${p.rank}</span></td><td><strong>${esc(p.name)}</strong><small class="an-cat">${esc(catName(p.cat || 'other'))}</small></td><td class="${key === 'visitors' ? 'an-hot' : ''}">${nf(p.visitors)}</td><td class="${key === 'checkins' ? 'an-hot' : ''}">${nf(p.checkins)}</td><td><div class="an-share"><div class="an-share-bar"><i style="width:${p.share.toFixed(1)}%"></i></div><span>${p.share.toFixed(1)}%</span></div></td><td>${trendHtml(p)}</td><td>${p.rating !== null ? '<i class="fas fa-star" style="color:#fbbf24"></i> ' + p.rating.toFixed(1) + ` <small>(${p.ratingCount})</small>` : '-'}</td></tr>`;
        }).join('') : `<tr><td colspan="7" class="an-none">${all.length ? 'No places match these filters' : 'No places yet in this range'}</td></tr>`;
    }

    function exportCsv() {
        const rows = allRows(), { from, to } = getRange(rows);
        const list = slice(rows, from, to, AN.place).sort((a, b) => a.date.localeCompare(b.date));
        if (!list.length) return showNotification('Nothing to export for this range.', 'danger');
        const q = v => '"' + String(v).replace(/"/g, '""') + '"';
        const csv = ['Date,Place,Category,Recorded visitors,QR check-ins,Points'].concat(list.map(r => [r.date, q(r.place), r.cat, r.visitors, r.checkins, r.points].join(','))).join('\r\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
        a.download = `tourgo-analytics-${from}_to_${to}.csv`; document.body.appendChild(a); a.click(); a.remove();
    }

    function setPreset(p) {
        AN.preset = p;
        document.querySelectorAll('#an-presets button').forEach(b => b.classList.toggle('active', b.dataset.preset === p));
        if (p !== 'custom') { $('an-month').value = ''; $('an-from').value = ''; $('an-to').value = ''; }
    }

    document.querySelectorAll('#an-presets button').forEach(b => b.addEventListener('click', () => { setPreset(b.dataset.preset); render(); }));
    $('an-month').addEventListener('change', e => {
        const v = e.target.value; if (!v) return;
        const [y, m] = v.split('-').map(Number);
        AN.from = `${y}-${p2(m)}-01`; AN.to = d2s(new Date(y, m, 0));
        setPreset('custom'); e.target.value = v; $('an-from').value = AN.from; $('an-to').value = AN.to; render();
    });
    const onDates = () => { AN.from = $('an-from').value; AN.to = $('an-to').value; if (!AN.from && !AN.to) return; const mo = $('an-month'); mo.value = ''; setPreset('custom'); $('an-from').value = AN.from; $('an-to').value = AN.to; render(); };
    $('an-from').addEventListener('change', onDates); $('an-to').addEventListener('change', onDates);
    $('an-place').addEventListener('change', e => { AN.place = e.target.value; render(); });
    $('an-metric').addEventListener('change', e => { AN.metric = e.target.value; render(); });
    document.querySelectorAll('#an-type button').forEach(b => b.addEventListener('click', () => { AN.type = b.dataset.type; document.querySelectorAll('#an-type button').forEach(x => x.classList.toggle('active', x === b)); render(); }));
    $('an-export').addEventListener('click', exportCsv);
    $('an-rank-q').addEventListener('input', e => { AN.rank.q = e.target.value; drawRanking(); });
    [['an-rank-cat', 'cat'], ['an-rank-trend', 'trend'], ['an-rank-sort', 'sort'], ['an-rank-limit', 'limit']]
        .forEach(([id, k]) => $(id).addEventListener('change', e => { AN.rank[k] = e.target.value; drawRanking(); }));
    $('an-rank-reset').addEventListener('click', () => {
        AN.rank = { q: '', cat: 'all', trend: 'all', sort: 'count', limit: '15' };
        $('an-rank-q').value = ''; $('an-rank-cat').value = 'all'; $('an-rank-trend').value = 'all'; $('an-rank-sort').value = 'count'; $('an-rank-limit').value = '15';
        drawRanking();
    });
    $('analyze-btn').addEventListener('click', async () => { AN.wxDone.clear(); await loadDatabase(); await loadData(); fillPlaces(allRows()); render(); showNotification('Analytics refreshed'); });

    window.initAnalytics = async function () {
        if (!currentUser || currentUser.role !== 'admin') return;
        if (typeof Chart === 'undefined') return showNotification('Charts are still loading. Press Refresh in a few seconds.', 'danger');
        await loadDatabase(); await loadData(); fillPlaces(allRows()); render();
    };
})();

(function () {
    let users = [], tab = 'all';
    const $ = id => document.getElementById(id);
    let NEW_DAYS = 7;
    const joinedAt = u => u.created_at ? new Date(String(u.created_at).replace(' ', 'T')) : null;
    const isNew = u => { const d = joinedAt(u); return d && !isNaN(d) && (Date.now() - d) < NEW_DAYS * 86400000; };
    const ago = d => {
        const s = Math.max(0, (Date.now() - d) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return `${Math.floor(s / 60)} min ago`;
        if (s < 86400) return `${Math.floor(s / 3600)} hour${Math.floor(s / 3600) === 1 ? '' : 's'} ago`;
        const days = Math.floor(s / 86400); return days === 1 ? 'yesterday' : `${days} days ago`;
    };
    function draw() {
        const q = $('us-search').value.trim().toLowerCase();
        const fresh = users.filter(isNew).sort((a, b) => joinedAt(b) - joinedAt(a));
        const tourists = users.filter(u => u.role !== 'admin').length;
        $('us-subtitle').textContent = `${users.length} account${users.length === 1 ? '' : 's'} (${tourists} tourist${tourists === 1 ? '' : 's'})${fresh.length ? ` · ${fresh.length} new this week` : ''}`;

        $('us-new').hidden = !users.length;
        $('us-new').innerHTML = fresh.length ? `<div class="us-new-head"><h3><i class="fas fa-user-plus"></i> New accounts <small>${NEW_DAYS === 1 ? 'last 24 hours' : `last ${NEW_DAYS} days`}</small></h3><span class="us-new-count">${fresh.length}</span></div>
            <div class="us-new-scroll"><button type="button" class="us-new-arrow prev" aria-label="Scroll left"><i class="fas fa-chevron-left"></i></button><div class="us-new-list">${fresh.slice(0, 30).map(u => `<button type="button" class="us-new-card" data-uid="${u.id}">
                <span class="us-av ${u.role === 'admin' ? 'admin' : ''}">${esc((u.name || '?').trim().charAt(0).toUpperCase())}</span>
                <b>${esc(u.name)}</b><small>${u.origin ? `<i class="fas fa-location-dot"></i> ${esc(u.origin)}` : esc(u.email)}</small>
                <em><i class="fas fa-clock"></i> ${ago(joinedAt(u))}</em></button>`).join('')}</div><button type="button" class="us-new-arrow next" aria-label="Scroll right"><i class="fas fa-chevron-right"></i></button></div>` : '<p class="us-new-none"><i class="fas fa-user-clock"></i> No new accounts in this time.</p>';
        $('us-new').innerHTML = (fresh.length ? $('us-new').innerHTML : `<div class="us-new-head"><h3><i class="fas fa-user-plus"></i> New accounts <small>${NEW_DAYS === 1 ? 'last 24 hours' : `last ${NEW_DAYS} days`}</small></h3><span class="us-new-count">0</span></div>${$('us-new').innerHTML}`);
        $('us-days').innerHTML = `<span><i class="fas fa-user-clock"></i> New =</span>${[[1, '1 day'], [7, '7 days'], [30, '30 days']].map(([d, l]) => `<button type="button" class="us-day${NEW_DAYS === d ? ' on' : ''}" data-days="${d}">${l}</button>`).join('')}`;

        const tabs = [['all', 'All', users.length], ['new', 'New', fresh.length], ['tourist', 'Tourists', tourists], ['admin', 'Admins', users.length - tourists]];
        $('us-tabs').innerHTML = tabs.map(([k, label, n]) => `<button type="button" role="tab" class="us-tab${tab === k ? ' on' : ''}${k === 'new' && n ? ' has-new' : ''}" data-tab="${k}" aria-selected="${tab === k}">${label} <em>${n}</em></button>`).join('');

        const list = users.filter(u => (tab === 'all' || (tab === 'new' ? isNew(u) : tab === 'admin' ? u.role === 'admin' : u.role !== 'admin'))
            && (!q || [u.name, u.email, u.origin, u.phone].some(v => String(v || '').toLowerCase().includes(q))));
        const n = list.length, s = n === 1 ? '' : 's';
        const what = { all: `all ${n} account${s}`, new: `${n} new account${s} (joined in the last ${NEW_DAYS} days)`, tourist: `${n} tourist${s}`, admin: `${n} admin${s}` }[tab];
        $('us-showing').innerHTML = `<i class="fas fa-filter"></i> Showing ${what}${q ? ` matching "<b>${esc(q)}</b>"` : ''}`
            + (tab === 'new' && n === users.length && n ? ' <span class="us-note">(every account is new right now)</span>' : '');
        const body = $('us-body'); body.classList.remove('us-flash'); void body.offsetWidth; body.classList.add('us-flash');
        const order = new Map([...users].sort((x, y) => String(x.created_at || '').localeCompare(String(y.created_at || '')) || x.id - y.id).map((x, i) => [x.id, i + 1]));
        const gender = { male: ['Male', 'fa-mars'], female: ['Female', 'fa-venus'], other: ['Other', 'fa-genderless'], prefer_not: ['Not said', 'fa-user-secret'] };
        $('us-body').innerHTML = list.length ? list.map(u => {
            const g = gender[u.gender];
            const about = [u.age ? `<span class="us-chip"><i class="fas fa-cake-candles"></i> ${parseInt(u.age)} yrs</span>` : '', g ? `<span class="us-chip"><i class="fas ${g[1]}"></i> ${g[0]}</span>` : '', u.origin ? `<span class="us-chip"><i class="fas fa-location-dot"></i> ${esc(u.origin)}</span>` : ''].join('');
            const nu = isNew(u);
            return `<tr class="${nu ? 'us-row-new' : ''}" data-uid="${u.id}">
                <td data-label="User"><div class="us-user"><span class="us-av ${u.role === 'admin' ? 'admin' : ''}">${esc((u.name || '?').trim().charAt(0).toUpperCase())}</span><div><strong>${esc(u.name)}${nu ? ' <span class="us-new-badge">New</span>' : ''}</strong><small>#${order.get(u.id)}${u.created_at ? ' · joined ' + (nu ? ago(joinedAt(u)) : fmtDate(u.created_at)) : ''}</small></div></div></td>
                <td data-label="Contact"><div class="us-contact"><span><i class="fas fa-envelope"></i> ${esc(u.email)}</span>${u.phone ? `<span><i class="fas fa-phone"></i> ${esc(u.phone)}</span>` : ''}</div></td>
                <td data-label="About"${about ? '' : ' class="us-td-empty"'}><div class="us-chips">${about || '<span class="us-none">Not given</span>'}</div></td>
                <td data-label="Role"><span class="us-role ${u.role === 'admin' ? 'admin' : ''}">${u.role === 'admin' ? 'Admin' : 'Tourist'}</span></td>
                <td data-label="Points"><b class="us-pts"><i class="fas fa-coins"></i> ${(parseInt(u.points) || 0).toLocaleString()}</b></td>
                <td data-label="Check-ins"><b>${parseInt(u.checkins) || 0}</b><small class="us-last">${u.last_checkin ? 'Last: ' + fmtDateTime(u.last_checkin) : 'No check-ins yet'}</small></td></tr>`;
        }).join('')
            : `<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:24px">${tab === 'new' ? `No new accounts in the last ${NEW_DAYS} days` : 'No users found'}</td></tr>`;
    }
    $('us-tabs').addEventListener('click', e => { const b = e.target.closest('.us-tab'); if (b) { tab = b.dataset.tab; draw(); } });
    $('us-days').addEventListener('click', e => { const b = e.target.closest('.us-day'); if (b) { NEW_DAYS = +b.dataset.days; draw(); } });
    $('us-new').addEventListener('click', e => {
        const arrow = e.target.closest('.us-new-arrow');
        if (arrow) { const l = $('us-new').querySelector('.us-new-list'); l.scrollBy({ left: (arrow.classList.contains('next') ? 1 : -1) * l.clientWidth * 0.8, behavior: 'smooth' }); return; }
        const c = e.target.closest('.us-new-card'); if (!c) return;
        let row = $('us-body').querySelector(`tr[data-uid="${c.dataset.uid}"]`);
        if (!row) { tab = 'all'; $('us-search').value = ''; draw(); row = $('us-body').querySelector(`tr[data-uid="${c.dataset.uid}"]`); }
        if (!row) return;
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.remove('us-row-flash'); void row.offsetWidth; row.classList.add('us-row-flash');
    });
    function usNewArrows() {
        const l = $('us-new').querySelector('.us-new-list'); if (!l) return;
        $('us-new').querySelector('.prev').hidden = l.scrollLeft < 8;
        $('us-new').querySelector('.next').hidden = l.scrollLeft + l.clientWidth >= l.scrollWidth - 8;
    }
    $('us-new').addEventListener('scroll', usNewArrows, true);
    $('us-new').addEventListener('wheel', e => {
        const l = e.target.closest('.us-new-list'); if (!l || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
        if (l.scrollWidth <= l.clientWidth) return;
        e.preventDefault(); l.scrollLeft += e.deltaY;
    }, { passive: false });
    window.addEventListener('resize', usNewArrows);
    new MutationObserver(() => setTimeout(usNewArrows, 30)).observe($('us-new'), { childList: true });
    window.loadUsers = async function () {
        if (!currentUser || currentUser.role !== 'admin') return;
        try { const d = await (await fetch('api/users_api.php')).json(); users = d.success ? d.users : []; if (!d.success) showNotification(d.message || 'Could not load users', 'danger'); }
        catch (e) { users = []; showNotification('Could not load users', 'danger'); }
        draw();
    };
    $('us-search').addEventListener('input', draw);
    $('us-refresh').addEventListener('click', window.loadUsers);
})();

function updateNotificationBadge() {
    const unread = adminNotifications.filter(n => !n.read).length;
    const badge = document.getElementById('notification-count'); badge.textContent = unread; badge.style.display = unread > 0 ? 'flex' : 'none';
}
document.getElementById('notification-bell').addEventListener('click', () => {
    adminNotifications.forEach(n => n.read = true); updateNotificationBadge();
    showPage('admin-reviews');
});

function renderDashSpots() {
    const box = document.getElementById('dh-spots'); if (!box) return;
    const top = dbSpots.slice().sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0) || (b.review_count || 0) - (a.review_count || 0)).slice(0, 4);
    box.innerHTML = top.length ? top.map(s => `<button type="button" class="dh-spot" data-id="${s.id}">
            <span class="dh-spot-img"><img loading="lazy" decoding="async" src="${esc(s.image_url)}" alt=""><em><i class="fas fa-coins"></i> +${esc(s.points_reward)}</em></span>
            <span class="dh-spot-txt"><b>${esc(s.name)}</b><small><i class="fas fa-location-dot"></i> ${esc(s.location)}</small><span class="dh-spot-rate"><i class="fas fa-star"></i> ${esc(s.rating)} <small>(${s.review_count || 0})</small></span></span>
        </button>`).join('')
        : '<p class="dh-none">Tourist spots will show up here soon.</p>';
}
document.getElementById('dh-spots').addEventListener('click', e => { const b = e.target.closest('.dh-spot'); if (b) window.openSpotDetails(b.dataset.id); });
document.getElementById('dh-all-spots').addEventListener('click', () => showPage('spots'));
document.getElementById('dh-explore').addEventListener('click', () => showPage('spots'));
document.getElementById('dh-scan').addEventListener('click', () => document.getElementById('qr-scan-btn-main').click());

function timeAgo(at, now) {
    const s = Math.max(0, (now - new Date(String(at).replace(' ', 'T'))) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) { const h = Math.floor(s / 3600); return `${h} hour${h === 1 ? '' : 's'} ago`; }
    const d = Math.floor(s / 86400); return d === 1 ? 'yesterday' : d < 7 ? `${d} days ago` : fmtDate(at);
}
async function loadActivity() {
    const list = document.getElementById('activity-list');
    if (!currentUser) { list.innerHTML = ''; return; }
    let d;
    try { d = await (await fetch('api/activity_api.php')).json(); } catch (e) { return; }
    if (!d.success) return;
    const now = new Date(String(d.now).replace(' ', 'T'));
    list.innerHTML = d.events.length ? d.events.map(e => `<div class="activity-item act-${e.tone}"><span class="act-ic"><i class="fas ${e.icon}"></i></span>
            <div><p>${e.text}</p><small>${timeAgo(e.at, now)}</small></div></div>`).join('')
        : `<div class="act-empty"><i class="fas fa-clock-rotate-left"></i><p>${currentUser.role === 'admin' ? 'What you do will show here: spots and products you add or edit, visitor records, review replies, tickets you give out and more.' : 'Your check-ins, reviews and tickets will show here.'}</p></div>`;
}
let activityTimer = null;
function addToActivity() { clearTimeout(activityTimer); activityTimer = setTimeout(loadActivity, 600); }
setInterval(() => { if (currentUser && !document.hidden) loadActivity(); }, 60000);

window.addEventListener('DOMContentLoaded', () => { window.dbReady = loadDatabase(); window.dbReady.then(restoreSession); setInterval(fetchWeather, 600000); });
document.getElementById('login-password').addEventListener('keypress', e => { if (e.key === 'Enter') document.getElementById('login-submit').click(); });

document.getElementById('open-profile-btn').addEventListener('click', () => {
    if (!currentUser) return;
    document.getElementById('profile-role-pill').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Tourist';
    document.getElementById('profile-password').value = '';
});
document.getElementById('profile-cancel').addEventListener('click', () => document.getElementById('profile-modal').classList.remove('active'));
document.getElementById('pf-eye').addEventListener('click', () => {
    const i = document.getElementById('profile-password'), show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    document.querySelector('#pf-eye i').className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
});
const PF_MODALS = '#profile-modal,#redeem-modal,#tickets-modal,#ticket-confirm-modal';
document.querySelectorAll(PF_MODALS).forEach(m => m.addEventListener('mousedown', e => { if (e.target === m) m.classList.remove('active'); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll(PF_MODALS.split(',').map(s => s + '.active').join(',')).forEach(m => m.classList.remove('active')); });

var NAV = { stack: [], pendingClose: 0, ignorePop: 0, lastExitTry: 0 };
function startPage() { const h = location.hash.replace('#', ''); return h && document.getElementById(h + '-view') ? h : 'dashboard'; }
function currentPageId() { return document.querySelector('.main-content').dataset.page || 'dashboard'; }
function navHistoryPush(pageId) {
    const st = history.state || {};
    if (st.page === pageId && !st.overlay && !NAV.stack.length) return;
    if (NAV.pendingClose > 0 || NAV.stack.length) {
        if (NAV.pendingClose > 0) NAV.pendingClose--;
        NAV.stack = [];
        history.replaceState({ page: pageId }, '', '#' + pageId);
        return;
    }
    history.pushState({ page: pageId }, '', '#' + pageId);
}

const OVERLAY_SEL = '.modal, #more-sheet, .lb';
const overlayOpen = el => el.classList.contains('modal') ? el.classList.contains('active') : el.id === 'more-sheet' ? el.classList.contains('open') : !el.hidden;
const overlayWasOpen = new WeakMap();
function onOverlayOpen(el) {
    if (NAV.stack.includes(el)) return;
    NAV.stack.push(el);
    if (NAV.pendingClose > 0) { NAV.pendingClose--; history.replaceState({ page: currentPageId(), overlay: true }, ''); }
    else history.pushState({ page: currentPageId(), overlay: true }, '');
}
function onOverlayClose(el) {
    const i = NAV.stack.indexOf(el); if (i < 0) return;
    NAV.stack.splice(i, 1);
    NAV.pendingClose++;
    setTimeout(() => { if (NAV.pendingClose > 0) { NAV.pendingClose--; NAV.ignorePop++; history.back(); } }, 0);
}
new MutationObserver(muts => {
    for (const m of muts) {
        const el = m.target;
        if (!el.matches || !el.matches(OVERLAY_SEL)) continue;
        const open = overlayOpen(el);
        if (open === !!overlayWasOpen.get(el)) continue;
        overlayWasOpen.set(el, open);
        open ? onOverlayOpen(el) : onOverlayClose(el);
    }
}).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });

function closeOverlayEl(el) {
    if (el.id === 'more-sheet') return closeMoreSheet();
    if (el.classList.contains('lb')) return closeLightbox();
    const btn = el.querySelector('#close-qr-scanner, [id^="close-"], .dx-close, .fm-close, .pp-close, .close-clean, #logout-cancel, #cancel-delete');
    if (btn) btn.click();
    if (el.classList.contains('active')) el.classList.remove('active');
}

window.addEventListener('popstate', e => {
    if (NAV.ignorePop > 0) { NAV.ignorePop--; return; }
    if (NAV.stack.length) {
        const el = NAV.stack.pop();
        closeOverlayEl(el);
        return;
    }
    const st = e.state || {};
    if (st.root) {
        if (!currentUser) return;
        if (Date.now() - NAV.lastExitTry < 2000) { history.back(); return; }
        NAV.lastExitTry = Date.now();
        showNotification('Press back again to exit LakbayNaguilian');
        history.pushState({ page: currentPageId() }, '', '#' + currentPageId());
        return;
    }
    if (st.page) showPage(st.page, true);
});

(function initHistory() {
    if (history.state && history.state.page) return;
    const p = startPage();
    history.replaceState({ page: p, root: true }, '');
    history.pushState({ page: p }, '', '#' + p);
})();

const CAT_ICONS = ['fa-leaf', 'fa-person-hiking', 'fa-landmark', 'fa-water', 'fa-mountain', 'fa-umbrella-beach', 'fa-tree', 'fa-church', 'fa-utensils', 'fa-mug-hot',
    'fa-campground', 'fa-binoculars', 'fa-camera', 'fa-bicycle', 'fa-fish', 'fa-horse', 'fa-seedling', 'fa-store', 'fa-masks-theater', 'fa-music',
    'fa-monument', 'fa-hot-tub-person', 'fa-person-swimming', 'fa-map-pin'];
const CAT_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#0d9488', '#f97316', '#64748b', '#84cc16', '#06b6d4', '#a16207'];
const CATF = { icon: CAT_ICONS[0], color: CAT_COLORS[3], returnTo: null };

function fillCatSelects(selectEl, value) {
    document.querySelectorAll('.spot-cat-select').forEach(sel => {
        const keep = sel === selectEl && value ? value : sel.value;
        sel.innerHTML = catOptions(keep);
        if (keep && dbCategories.some(c => c.slug === keep)) sel.value = keep;
    });
}
document.getElementById('open-add-spot-btn').addEventListener('click', () => fillCatSelects());

function catPreview() {
    const name = document.getElementById('cat-name').value.trim() || 'New category';
    document.getElementById('cat-preview').innerHTML = `<span class="pin-icon" style="background:${CATF.color}"><i class="fas ${CATF.icon}"></i></span>
        <span class="mp-cat" style="background:${CATF.color}1f;color:${CATF.color}"><i class="fas ${CATF.icon}"></i> ${esc(name)}</span><small>How it looks on the map and on spots</small>`;
    document.querySelectorAll('#cat-icons button').forEach(b => b.classList.toggle('on', b.dataset.icon === CATF.icon));
    document.querySelectorAll('#cat-colors button').forEach(b => b.classList.toggle('on', b.dataset.color === CATF.color));
}
function catResetForm() {
    document.getElementById('cat-id').value = ''; document.getElementById('cat-name').value = '';
    const used = dbCategories.map(c => c.color);
    CATF.icon = 'fa-map-pin'; CATF.color = CAT_COLORS.find(c => !used.includes(c)) || CAT_COLORS[3];
    document.getElementById('cat-form-title').textContent = 'New category';
    document.getElementById('cat-save').innerHTML = '<i class="fas fa-plus"></i> Add category';
    document.getElementById('cat-cancel-edit').hidden = true;
    document.getElementById('cat-remove').hidden = true;
    catPreview();
}
function renderCatList() {
    document.getElementById('cat-list').innerHTML = dbCategories.map(c => `<div class="cat-row" data-id="${c.id}">
            <span class="pin-icon sm" style="background:${c.color}"><i class="fas ${esc(c.icon)}"></i></span>
            <div class="cat-row-txt"><b>${esc(c.name)}</b><small>${c.spots || 0} spot${c.spots == 1 ? '' : 's'}</small></div>
            <button type="button" class="cat-act" data-act="edit" aria-label="Edit ${esc(c.name)}"><i class="fas fa-pen"></i></button>
            <button type="button" class="cat-act danger cat-del" data-act="delete" aria-label="Remove ${esc(c.name)}"><i class="fas fa-trash"></i><span>Remove</span></button>
            <div class="cat-move" hidden></div>
        </div>`).join('');
}
async function openCatModal(returnTo = null) {
    if (currentUser?.role !== 'admin') return;
    CATF.returnTo = returnTo;
    document.getElementById('cat-icons').innerHTML = CAT_ICONS.map(i => `<button type="button" data-icon="${i}" aria-label="${i.replace('fa-', '')}"><i class="fas ${i}"></i></button>`).join('');
    document.getElementById('cat-colors').innerHTML = CAT_COLORS.map(c => `<button type="button" data-color="${c}" style="background:${c}" aria-label="Colour ${c}"></button>`).join('');
    await loadCategories();
    renderCatList(); catResetForm();
    document.querySelector('#cat-modal .fm-scroll').scrollTop = 0;
    document.getElementById('cat-modal').classList.add('active');
    setTimeout(() => document.getElementById('cat-name').focus(), 250);
}
async function catAfterChange() {
    await loadCategories();
    renderCatList(); fillCatSelects();
    await loadDatabase();
    if (map) renderMapMarkers();
}
async function catPost(body) {
    const fd = new FormData(); Object.entries(body).forEach(([k, v]) => fd.append(k, v));
    try { return await (await fetch('api/categories_api.php', { method: 'POST', body: fd })).json(); }
    catch (e) { return { success: false, message: 'No connection. Try again.' }; }
}
document.getElementById('open-cat-btn').addEventListener('click', () => openCatModal());
document.addEventListener('click', e => { const b = e.target.closest('[data-cat-new]'); if (b) { e.preventDefault(); openCatModal(b.closest('.input-group').querySelector('select')); } });
document.getElementById('close-cat-modal').addEventListener('click', () => document.getElementById('cat-modal').classList.remove('active'));
document.getElementById('cat-modal').addEventListener('mousedown', e => { if (e.target.id === 'cat-modal') e.target.classList.remove('active'); });
document.getElementById('cat-name').addEventListener('input', catPreview);
document.getElementById('cat-icons').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { CATF.icon = b.dataset.icon; catPreview(); } });
document.getElementById('cat-colors').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { CATF.color = b.dataset.color; catPreview(); } });
document.getElementById('cat-cancel-edit').addEventListener('click', catResetForm);
document.getElementById('cat-remove').addEventListener('click', () => {
    const row = document.querySelector(`#cat-list .cat-row[data-id="${document.getElementById('cat-id').value}"]`); if (!row) return;
    row.querySelector('[data-act="delete"]').click();
});
document.getElementById('cat-form').addEventListener('submit', async e => {
    e.preventDefault();
    const id = document.getElementById('cat-id').value, name = document.getElementById('cat-name').value.trim();
    if (!name) return showNotification('Please enter a category name.', 'danger');
    const btn = document.getElementById('cat-save'); btn.disabled = true;
    const d = await catPost({ action: 'save', id, name, icon: CATF.icon, color: CATF.color });
    btn.disabled = false;
    if (!d.success) return showNotification(d.message, 'danger');
    showNotification(d.message);
    await catAfterChange();
    if (!id && CATF.returnTo && d.slug) { fillCatSelects(CATF.returnTo, d.slug); document.getElementById('cat-modal').classList.remove('active'); CATF.returnTo = null; return; }
    catResetForm();
});
document.getElementById('cat-list').addEventListener('click', async e => {
    const row = e.target.closest('.cat-row'); if (!row) return;
    const c = dbCategories.find(x => x.id == row.dataset.id); if (!c) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'edit') {
        document.getElementById('cat-id').value = c.id; document.getElementById('cat-name').value = c.name;
        CATF.icon = c.icon; CATF.color = c.color;
        document.getElementById('cat-form-title').textContent = `Edit "${c.name}"`;
        document.getElementById('cat-save').innerHTML = '<i class="fas fa-check"></i> Save changes';
        document.getElementById('cat-cancel-edit').hidden = false;
        document.getElementById('cat-remove').hidden = false;
        catPreview(); document.querySelector('#cat-modal .fm-scroll').scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    if (act === 'delete' || act === 'confirm-delete') {
        const move = row.querySelector('.cat-move');
        if (act === 'delete') {
            const others = dbCategories.filter(x => x.id !== c.id);
            move.innerHTML = `<p>${c.spots ? `<b>${c.spots} spot${c.spots == 1 ? '' : 's'}</b> use "${esc(c.name)}". Move ${c.spots == 1 ? 'it' : 'them'} to:` : `Remove "${esc(c.name)}"?`}</p>
                ${c.spots ? `<select class="cat-move-to">${others.map(o => `<option value="${esc(o.slug)}">${esc(o.name)}</option>`).join('')}</select>` : ''}
                <div><button type="button" class="dx-ghost" data-act="cancel">Cancel</button><button type="button" class="cat-del-yes" data-act="confirm-delete"><i class="fas fa-trash"></i> Remove</button></div>`;
            document.querySelectorAll('#cat-list .cat-move').forEach(m => { if (m !== move) m.hidden = true; });
            move.hidden = false;
            requestAnimationFrame(() => move.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
            return;
        }
        const d = await catPost({ action: 'delete', id: c.id, move_to: row.querySelector('.cat-move-to')?.value || '' });
        showNotification(d.message, d.success ? 'success' : 'danger');
        if (d.success) await catAfterChange();
        return;
    }
    if (act === 'cancel') row.querySelector('.cat-move').hidden = true;
});

const CAL = { input: null, btn: null, view: null, mode: 'date' };
const calPad = n => String(n).padStart(2, '0');
const calIso = d => `${d.getFullYear()}-${calPad(d.getMonth() + 1)}-${calPad(d.getDate())}`;
const calParse = s => { const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +(m[3] || 1)) : null; };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function calRefreshButtons() {
    document.querySelectorAll('.cal-btn[data-cal-for]').forEach(b => {
        const inp = document.getElementById(b.dataset.calFor); if (!inp) return;
        const span = b.querySelector('span'), d = calParse(inp.value);
        if (!span.dataset.empty) span.dataset.empty = span.textContent;
        span.textContent = !d ? span.dataset.empty
            : inp.type === 'month' ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
            : d.toLocaleDateString('en-PH', b.dataset.calFor === 'wxd-date' ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
        b.classList.toggle('has-value', !!d);
    });
}
function calOpen(btn) {
    const input = document.getElementById(btn.dataset.calFor); if (!input) return;
    CAL.input = input; CAL.btn = btn; CAL.mode = input.type === 'month' ? 'month' : 'date';
    const cur = calParse(input.value) || new Date();
    CAL.view = new Date(cur.getFullYear(), CAL.mode === 'month' ? 0 : cur.getMonth(), 1);
    calRender();
    const pop = document.getElementById('cal-pop'); pop.hidden = false;
    calPlace();
    document.querySelectorAll('.cal-btn.open').forEach(b => b.classList.remove('open')); btn.classList.add('open');
}
function calClose() {
    const pop = document.getElementById('cal-pop'); if (pop.hidden) return;
    pop.hidden = true; document.querySelectorAll('.cal-btn.open').forEach(b => b.classList.remove('open'));
}
function calPlace() {
    const pop = document.getElementById('cal-pop');
    if (window.innerWidth <= 600) { pop.classList.add('sheet'); pop.style.left = pop.style.top = ''; return; }
    pop.classList.remove('sheet');
    const r = CAL.btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    let top = r.bottom + 8; if (top + h > window.innerHeight - 8 && r.top - h - 8 > 8) top = r.top - h - 8;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
}
function calSet(value) {
    CAL.input.value = value;
    CAL.input.dispatchEvent(new Event('change', { bubbles: true }));
    calRefreshButtons(); calClose();
}
function calRender() {
    const pop = document.getElementById('cal-pop'), v = CAL.view, inp = CAL.input;
    const max = inp.max || calIso(new Date()), min = inp.min || '';
    const today = calIso(new Date()), sel = inp.value;
    const label = ({ 'an-from': 'Start date', 'an-to': 'End date', 'an-month': 'Month', 'wxd-date': 'Day' })[inp.id] || 'Date';
    let body;
    if (CAL.mode === 'month') {
        const y = v.getFullYear();
        body = `<div class="cal-head"><button type="button" class="cal-nav" data-cal-nav="-12" aria-label="Previous year"><i class="fas fa-chevron-left"></i></button><b>${y}</b>
                <button type="button" class="cal-nav" data-cal-nav="12" aria-label="Next year" ${`${y + 1}-01` > max.slice(0, 7) ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button></div>
            <div class="cal-months">${MONTHS.map((m, i) => { const val = `${y}-${calPad(i + 1)}`; const off = val > max.slice(0, 7);
                return `<button type="button" class="cal-m${val === sel ? ' sel' : ''}${val === today.slice(0, 7) ? ' today' : ''}" data-cal-pick="${val}" ${off ? 'disabled' : ''}>${m.slice(0, 3)}</button>`; }).join('')}</div>`;
    } else {
        const y = v.getFullYear(), m = v.getMonth();
        const first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
        const rf = document.getElementById('an-from')?.value, rt = document.getElementById('an-to')?.value;
        const inRange = d => (inp.id === 'an-from' || inp.id === 'an-to') && rf && rt && d > rf && d < rt;
        let cells = '';
        for (let i = 0; i < first; i++) cells += '<span></span>';
        for (let d = 1; d <= days; d++) {
            const iso = `${y}-${calPad(m + 1)}-${calPad(d)}`, off = iso > max || (min && iso < min);
            const cls = [iso === sel ? 'sel' : '', iso === today ? 'today' : '', inRange(iso) ? 'range' : '', (iso === rf || iso === rt) && (inp.id === 'an-from' || inp.id === 'an-to') ? 'edge' : ''].filter(Boolean).join(' ');
            cells += `<button type="button" class="cal-d ${cls}" data-cal-pick="${iso}" ${off ? 'disabled' : ''}>${d}</button>`;
        }
        const nextOff = calIso(new Date(y, m + 1, 1)) > max;
        body = `<div class="cal-head"><button type="button" class="cal-nav" data-cal-nav="-1" aria-label="Previous month"><i class="fas fa-chevron-left"></i></button><b>${MONTHS[m]} ${y}</b>
                <button type="button" class="cal-nav" data-cal-nav="1" aria-label="Next month" ${nextOff ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button></div>
            <div class="cal-week">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => `<span>${d}</span>`).join('')}</div>
            <div class="cal-days">${cells}</div>`;
    }
    pop.innerHTML = `<div class="cal-top"><span>${label}</span><button type="button" class="cal-x" aria-label="Close"><i class="fas fa-times"></i></button></div>${body}
        <div class="cal-foot"><button type="button" class="cal-clear"${inp.id === 'wxd-date' ? ' hidden' : ''}>Clear</button><button type="button" class="cal-today">${CAL.mode === 'month' ? 'This month' : 'Today'}</button></div>`;
}
document.addEventListener('click', e => {
    const btn = e.target.closest('.cal-btn[data-cal-for]');
    if (btn) { e.preventDefault(); return btn.classList.contains('open') ? calClose() : calOpen(btn); }
    const pop = document.getElementById('cal-pop');
    if (pop.hidden) return;
    if (!pop.contains(e.target)) return calClose();
    const nav = e.target.closest('[data-cal-nav]'), pick = e.target.closest('[data-cal-pick]');
    if (nav) { const v = CAL.view; CAL.view = new Date(v.getFullYear(), v.getMonth() + +nav.dataset.calNav, 1); calRender(); calPlace(); }
    else if (pick && !pick.disabled) calSet(pick.dataset.calPick);
    else if (e.target.closest('.cal-today')) calSet(CAL.mode === 'month' ? calIso(new Date()).slice(0, 7) : calIso(new Date()));
    else if (e.target.closest('.cal-clear')) calSet('');
    else if (e.target.closest('.cal-x')) calClose();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') calClose(); });
window.addEventListener('resize', () => { if (!document.getElementById('cal-pop').hidden) calPlace(); });
document.addEventListener('scroll', e => { if (!document.getElementById('cal-pop').hidden && window.innerWidth > 600 && !document.getElementById('cal-pop').contains(e.target)) calClose(); }, true);

document.getElementById('an-jump').addEventListener('click', e => {
    const b = e.target.closest('[data-jump]'); if (!b) return;
    document.getElementById(b.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('an-weather').addEventListener('toggle', e => { if (e.target.classList?.contains('wx-days')) window.AN_WXOPEN = e.target.open; }, true);
document.getElementById('se-image').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const prev = document.getElementById('se-image-preview'); prev.src = URL.createObjectURL(f); prev.style.display = 'block';
});
(function () {
    const OPTS = [...document.querySelectorAll('#origin-list option')].map(o => o.value);
    document.querySelectorAll('input[list="origin-list"]').forEach(inp => {
        inp.removeAttribute('list');
        inp.setAttribute('autocomplete', 'off');
        inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-expanded', 'false');
        inp.parentElement.classList.add('og-wrap');
        const box = document.createElement('div'); box.className = 'og-drop'; box.hidden = true; box.setAttribute('role', 'listbox');
        inp.insertAdjacentElement('afterend', box);
        const close = () => { box.hidden = true; inp.setAttribute('aria-expanded', 'false'); };
        const draw = () => {
            const typed = inp.value.trim(), q = typed.toLowerCase();
            const list = OPTS.filter(o => !q || o.toLowerCase().includes(q));
            const exact = OPTS.some(o => o.toLowerCase() === q);
            box.innerHTML = list.map(o => `<button type="button" class="og-opt${o.toLowerCase() === q ? ' on' : ''}" role="option" data-v="${esc(o)}"><i class="fas ${o.startsWith('Other') ? 'fa-globe' : 'fa-location-dot'}"></i><span>${esc(o)}</span></button>`).join('')
                + (typed && !exact ? `<button type="button" class="og-opt og-own" role="option" data-v="${esc(typed)}"><i class="fas fa-pen"></i><span>Use "${esc(typed)}"</span></button>` : '');
            box.hidden = !box.innerHTML; inp.setAttribute('aria-expanded', String(!box.hidden));
        };
        inp.addEventListener('focus', draw); inp.addEventListener('click', draw); inp.addEventListener('input', draw);
        ['pointerdown', 'mousedown'].forEach(ev => box.addEventListener(ev, e => e.preventDefault()));
        box.addEventListener('click', e => { const b = e.target.closest('.og-opt'); if (!b) return; inp.value = b.dataset.v; close(); inp.dispatchEvent(new Event('change', { bubbles: true })); });
        inp.addEventListener('blur', () => setTimeout(close, 150));
        inp.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'Enter' && !box.hidden) { if (e.key === 'Enter') e.preventDefault(); close(); } });
    });
})();