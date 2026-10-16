(function () {
    const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function setupSearch(cfg) {
        const view = document.getElementById(cfg.viewId);
        const header = view && view.querySelector('.section-header');
        if (!header || document.getElementById(cfg.inputId)) return;

        const wrap = document.createElement('div');
        wrap.className = 'list-search';
        wrap.innerHTML = '<i class="fas fa-search"></i><input type="search" id="' + cfg.inputId + '" placeholder="' + cfg.placeholder + '" autocomplete="off"><span class="ls-count"></span>';
        header.insertAdjacentElement('afterend', wrap);
        const input = wrap.querySelector('input');
        const count = wrap.querySelector('.ls-count');

        function apply() {
            const grid = document.getElementById(cfg.gridId);
            if (!grid) return;
            const old = grid.querySelector('.ls-empty');
            if (old) old.remove();

            const words = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
            const cards = Array.from(grid.querySelectorAll(cfg.cardSel));
            let data = [];
            try { data = cfg.get() || []; } catch (e) { data = []; }
            const byIndex = cards.length === data.length;

            let shown = 0;
            cards.forEach((card, i) => {
                let hay = '';
                if (byIndex) {
                    const d = data[i];
                    hay = cfg.fields.map(f => d[f]).join(' ');
                } else hay = card.textContent;
                hay = hay.toLowerCase();
                const ok = words.every(w => hay.includes(w));
                card.style.display = ok ? '' : 'none';
                if (ok) shown++;
            });

            count.textContent = words.length ? shown + ' found' : '';
            if (words.length && cards.length && shown === 0) {
                const box = document.createElement('div');
                box.className = 'empty-state ls-empty';
                box.innerHTML = '<i class="fas fa-search"></i><h3>' + cfg.noneTitle + '</h3><p>Nothing matches "' + escHtml(input.value.trim()) + '".</p>';
                grid.appendChild(box);
            }
        }

        input.addEventListener('input', apply);

        const original = window[cfg.renderFn];
        if (typeof original === 'function') {
            window[cfg.renderFn] = function () {
                const r = original.apply(this, arguments);
                apply();
                return r;
            };
        }
        apply();
    }

    setupSearch({
        viewId: 'spots-view', gridId: 'spots-grid', cardSel: '.spot-card', inputId: 'spot-search',
        placeholder: 'Search spots by name, place, category...', noneTitle: 'No spots found',
        renderFn: 'renderTouristSpots', get: () => dbSpots,
        fields: ['name', 'location', 'category', 'description', 'features']
    });
    setupSearch({
        viewId: 'products-view', gridId: 'products-grid', cardSel: '.product-card', inputId: 'product-search',
        placeholder: 'Search products by name, store, category...', noneTitle: 'No products found',
        renderFn: 'renderProducts', get: () => dbProducts,
        fields: ['name', 'location', 'category', 'description', 'features']
    });
})();

(function () {
    const $ = id => document.getElementById(id);
    const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const p2 = n => String(n).padStart(2, '0');
    const d2s = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
    const dateOnly = v => String(v || '').slice(0, 10);
    const nf = n => Number(n || 0).toLocaleString();
    const s2d = s => new Date(s + 'T12:00:00');
    const longDate = s => s2d(s).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const shortDate = s => s2d(s).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    const WX = { days: {}, scans: [], sel: '', msg: '' };

    function wxStyle(code) {
        code = Number(code);
        if (code >= 95) return { icon: 'fa-bolt', cls: 'stormy' };
        if (code >= 80 || code === 63 || code === 65) return { icon: 'fa-cloud-showers-heavy', cls: 'rainy' };
        if (code >= 51) return { icon: 'fa-cloud-rain', cls: 'rainy' };
        if (code >= 45) return { icon: 'fa-smog', cls: 'cloudy' };
        if (code <= 1) return { icon: 'fa-sun', cls: 'sunny' };
        if (code === 2) return { icon: 'fa-cloud-sun', cls: 'cloudy' };
        return { icon: 'fa-cloud', cls: 'cloudy' };
    }
    const isAdmin = () => { try { return !!currentUser && currentUser.role === 'admin'; } catch (x) { return false; } };

    function dayData(date) {
        const places = {};
        let visitors = 0, checkins = 0;
        let recs = [];
        try { recs = dbRecords || []; } catch (x) { recs = []; }
        recs.forEach(r => {
            if (dateOnly(r.record_date) !== date) return;
            const v = parseInt(r.visitors) || 0;
            const name = String(r.location || '').trim() || 'Unknown place';
            visitors += v;
            (places[name] = places[name] || { visitors: 0, checkins: 0 }).visitors += v;
        });
        WX.scans.forEach(s => {
            if (!s.name || dateOnly(s.scanned_at) !== date) return;
            checkins++;
            (places[s.name] = places[s.name] || { visitors: 0, checkins: 0 }).checkins++;
        });
        return { visitors, checkins, places };
    }

    function ensurePanel() {
        let panel = $('wx-panel');
        if (panel) return panel;
        const anchor = $('an-empty');
        if (!anchor) return null;
        panel = document.createElement('div');
        panel.id = 'wx-panel';
        panel.className = 'wx-panel';
        panel.innerHTML =
            '<div class="wx-head">' +
              '<h3><i class="fas fa-cloud-sun"></i> Day review &amp; weather</h3>' +
              '<div class="wx-pick">' +
                '<input type="date" id="wx-date" aria-label="Pick a day">' +
                '<button type="button" id="wx-today">Today</button>' +
                '<button type="button" id="wx-yesterday">Yesterday</button>' +
              '</div>' +
            '</div>' +
            '<div id="wx-day"></div>' +
            '<div id="wx-places" class="wx-places"></div>' +
            '<div class="wx-table-wrap"><table class="wx-table"><thead><tr>' +
              '<th>Date</th><th>Weather</th><th>High / Low</th><th>Rain</th><th>Visitors</th><th>QR check-ins</th>' +
            '</tr></thead><tbody id="wx-body"></tbody></table></div>' +
            '<p class="wx-note" id="wx-note"></p>';
        anchor.insertAdjacentElement('beforebegin', panel);

        $('wx-date').addEventListener('change', ev => { if (ev.target.value) { WX.sel = ev.target.value; render(); } });
        $('wx-today').addEventListener('click', () => { WX.sel = d2s(new Date()); render(); });
        $('wx-yesterday').addEventListener('click', () => { const d = new Date(); d.setDate(d.getDate() - 1); WX.sel = d2s(d); render(); });
        $('wx-body').addEventListener('click', ev => {
            const tr = ev.target.closest('tr[data-date]');
            if (tr) { WX.sel = tr.dataset.date; render(); }
        });
        return panel;
    }

    function render() {
        if (!isAdmin()) return;
        const panel = ensurePanel();
        if (!panel) return;
        const today = d2s(new Date());
        if (!WX.sel) WX.sel = today;
        $('wx-date').value = WX.sel;

        const w = WX.days[WX.sel];
        const dd = dayData(WX.sel);
        let now;
        if (w) {
            const st = wxStyle(w.weather_code);
            now = '<div class="wx-now ' + st.cls + '"><i class="fas ' + st.icon + '"></i><div><b>' + e(w.summary || 'Weather') + '</b><span>' + e(longDate(WX.sel)) + '</span></div></div>';
        } else {
            now = '<div class="wx-now none"><i class="fas fa-cloud"></i><div><b>No weather saved</b><span>' + e(longDate(WX.sel)) + '</span></div></div>';
        }
        const val = (x, unit) => (x === null || x === undefined || x === '') ? '-' : Number(x).toFixed(1).replace(/\.0$/, '') + unit;
        $('wx-day').innerHTML = '<div class="wx-day">' + now + '<div class="wx-stats">' +
            '<div class="wx-stat"><small>High</small><b>' + (w ? val(w.temp_max, '°C') : '-') + '</b></div>' +
            '<div class="wx-stat"><small>Low</small><b>' + (w ? val(w.temp_min, '°C') : '-') + '</b></div>' +
            '<div class="wx-stat"><small>Rain</small><b>' + (w ? val(w.rain_mm, ' mm') : '-') + '</b></div>' +
            '<div class="wx-stat"><small>Wind (max)</small><b>' + (w ? val(w.wind_max, ' km/h') : '-') + '</b></div>' +
            '<div class="wx-stat"><small>Visitors</small><b>' + nf(dd.visitors) + '</b></div>' +
            '<div class="wx-stat"><small>QR check-ins</small><b>' + nf(dd.checkins) + '</b></div>' +
            '</div></div>';

        const pl = Object.entries(dd.places).sort((a, b) => (b[1].visitors + b[1].checkins) - (a[1].visitors + a[1].checkins));
        $('wx-places').innerHTML = pl.length
            ? 'Places on this day: ' + pl.map(([n, o]) => '<b>' + e(n) + '</b> (' + nf(o.visitors) + ' visitors, ' + nf(o.checkins) + ' check-ins)').join(' · ')
            : 'No visitor records or check-ins on this day.';

        const dates = new Set(Object.keys(WX.days));
        try { (dbRecords || []).forEach(r => { const d = dateOnly(r.record_date); if (d) dates.add(d); }); } catch (x) {}
        WX.scans.forEach(s => { const d = dateOnly(s.scanned_at); if (d) dates.add(d); });
        const list = Array.from(dates).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse().slice(0, 60);
        $('wx-body').innerHTML = list.length ? list.map(d => {
            const x = WX.days[d], q = dayData(d);
            const st = x ? wxStyle(x.weather_code) : null;
            return '<tr data-date="' + d + '" class="' + (d === WX.sel ? 'is-sel' : '') + '">' +
                '<td>' + e(shortDate(d)) + '</td>' +
                '<td>' + (x ? '<i class="fas ' + st.icon + '"></i>' + e(x.summary) : '<span style="color:var(--gray)">Not saved</span>') + '</td>' +
                '<td>' + (x ? val(x.temp_max, '°') + ' / ' + val(x.temp_min, '°C') : '-') + '</td>' +
                '<td>' + (x ? val(x.rain_mm, ' mm') : '-') + '</td>' +
                '<td>' + nf(q.visitors) + '</td><td>' + nf(q.checkins) + '</td></tr>';
        }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:22px">No days to show yet</td></tr>';

        const note = $('wx-note');
        note.className = 'wx-note' + (WX.msg ? ' err' : '');
        note.textContent = WX.msg || 'Weather is saved automatically each time you open Analytics (it also fills in the last 60 days). Tap a row to review that day.';
    }

    async function loadAll(sync) {
        if (!isAdmin()) return;
        if (sync) {
            try {
                const r = await (await fetch('weather_api.php?action=sync')).json();
                WX.msg = r.success ? '' : (r.message || 'Could not save the weather.');
            } catch (x) { WX.msg = 'Could not save the weather (no connection).'; }
        }
        try {
            const w = await (await fetch('weather_api.php?action=list&days=1000')).json();
            if (w.success) { WX.days = {}; (w.rows || []).forEach(r => { WX.days[r.log_date] = r; }); }
            else if (!WX.msg) WX.msg = w.message || '';
        } catch (x) {}
        try {
            const a = await (await fetch('analytics_api.php')).json();
            WX.scans = (a && a.success && Array.isArray(a.scans)) ? a.scans : [];
        } catch (x) { WX.scans = []; }
        render();
    }

    const origInit = window.initAnalytics;
    window.initAnalytics = async function () {
        let r;
        if (typeof origInit === 'function') r = await origInit.apply(this, arguments);
        loadAll(true);
        return r;
    };

    const refresh = $('analyze-btn');
    if (refresh) refresh.addEventListener('click', () => loadAll(true));

    const origLoadDb = window.loadDatabase;
    if (typeof origLoadDb === 'function') {
        window.loadDatabase = async function () {
            const r = await origLoadDb.apply(this, arguments);
            if ($('wx-panel')) render();
            return r;
        };
    }
})();
