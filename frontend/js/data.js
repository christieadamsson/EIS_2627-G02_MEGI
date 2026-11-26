// =========================================
// PDP – shared sample data (Sprint 1 prototype)
// Used by: 0_homepage.html, 2_client.html, 3_courier.html, 4_admin.html, 5_staff.html
// There is no backend yet, so the data is kept in the browser (localStorage).
// This way an order created on the Client page shows up for the Courier and Staff.
// =========================================

// The depot is at FEUP – every order starts here (Sprint 1 requirement: FEUP marker)
const PDP_DEPOT = { name: 'PDP depot – FEUP', lat: 41.1780, lng: -8.5980 };

// Order status flow from the specification
const PDP_STATUS = {
    INITIATED: 'Initiated',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
};

// Helper: a date N days from today as YYYY-MM-DD (keeps the expiry alerts realistic)
function pdpDaysFromToday(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

// ---------- order timestamps ----------
// Every step of an order stores the exact moment it happened (ISO date + time):
//   createdAt   – client placed the order
//   acceptedAt  – a courier accepted it (added it to their route)
//   pickedUpAt  – the courier started the route (parcel picked up)
//   completedAt – delivered with proof of delivery
//   cancelledAt – the last delivery attempt was cancelled

// Current moment as an ISO string, e.g. 2026-11-25T14:32:10.000Z
function pdpNow() {
    return new Date().toISOString();
}

// A moment N days (and optional hours) from now – used for the sample data
function pdpDateTimeFromNow(days, hours) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(d.getHours() + (hours || 0));
    return d.toISOString();
}

// Readable date for the pages, e.g. "25 Nov 2026, 14:32".
// Older saved data only has a date (YYYY-MM-DD); then only the date is shown.
function pdpFormatDateTime(value) {
    if (!value) return '';
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const d = new Date(dateOnly ? value + 'T12:00:00' : value);
    if (isNaN(d)) return String(value);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    if (!dateOnly) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return d.toLocaleString('en-GB', options);
}

// The day (YYYY-MM-DD) of a stored timestamp – used to group orders per day
function pdpDayOf(value) {
    return value ? String(value).slice(0, 10) : '';
}

// The steps that already happened for an order, oldest first
function pdpOrderEvents(order) {
    return [
        { label: 'Placed',     at: order.createdAt },
        { label: 'Accepted by courier', at: order.acceptedAt },
        { label: 'Picked up',  at: order.pickedUpAt },
        { label: 'Delivered',  at: order.completedAt },
        { label: 'Last attempt cancelled', at: order.status !== PDP_STATUS.COMPLETED ? order.cancelledAt : null }
    ].filter(function (e) { return e.at; });
}

const PDP_DEFAULT_ORDERS = [
    {
        id: 'RR-1042', client: 'Carla Cliente', recipient: 'Ana Silva',
        address: 'Rua de Santa Catarina 120, Porto',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1489, destLng: -8.6062,
        product: { description: 'Shoe box', category: 'Clothing', weightKg: 2.5, volumeM3: 0.012 },
        status: 'In Progress', attempt: 1, courier: 'Constantino Courier', vehicle: 'AA-12-BC',
        createdAt: pdpDateTimeFromNow(-1, -3), acceptedAt: pdpDateTimeFromNow(-1, -2), pickedUpAt: pdpDateTimeFromNow(0, -1),
        completedAt: null, cancelledAt: null, pod: null
    },
    {
        id: 'RR-1043', client: 'Empresa Norte Lda', recipient: 'Tiago Ferreira',
        address: 'Rua de Costa Cabral 250, Porto',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1655, destLng: -8.5985,
        product: { description: 'Office supplies', category: 'Documents', weightKg: 6, volumeM3: 0.03 },
        status: 'Initiated', attempt: 1, courier: null, vehicle: null,
        createdAt: pdpDateTimeFromNow(0, -2), acceptedAt: null, pickedUpAt: null,
        completedAt: null, cancelledAt: null, pod: null
    },
    {
        id: 'RR-1040', client: 'Carla Cliente', recipient: 'Rita Alves',
        address: 'Rua das Flores 33, Porto',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1430, destLng: -8.6140,
        product: { description: 'Ceramic vase', category: 'Fragile', weightKg: 4, volumeM3: 0.02 },
        status: 'In Progress', attempt: 1, courier: 'Constantino Courier', vehicle: 'AA-12-BC',
        createdAt: pdpDateTimeFromNow(-1, -1), acceptedAt: pdpDateTimeFromNow(-1, 0), pickedUpAt: pdpDateTimeFromNow(0, -1),
        completedAt: null, cancelledAt: null, pod: null
    },
    {
        id: 'RR-1039', client: 'Empresa Norte Lda', recipient: 'Marta Reis',
        address: 'Rua de Cedofeita 8, Porto',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1520, destLng: -8.6190,
        product: { description: 'Laptop', category: 'Electronics', weightKg: 3, volumeM3: 0.015 },
        status: 'Initiated', attempt: 2, courier: null, vehicle: null,
        createdAt: pdpDateTimeFromNow(-2, -4), acceptedAt: null, pickedUpAt: null,
        completedAt: null, cancelledAt: pdpDateTimeFromNow(-1, -5), pod: null
    },
    {
        id: 'RR-1041', client: 'Carla Cliente', recipient: 'João Costa',
        address: 'Avenida dos Aliados 45, Porto',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1475, destLng: -8.6110,
        product: { description: 'Books', category: 'Other', weightKg: 5, volumeM3: 0.02 },
        status: 'Completed', attempt: 1, courier: 'Constantino Courier', vehicle: 'AA-12-BC',
        createdAt: pdpDateTimeFromNow(-3, -2), acceptedAt: pdpDateTimeFromNow(-3, -1), pickedUpAt: pdpDateTimeFromNow(-2, -3),
        completedAt: pdpDateTimeFromNow(-2, -2), cancelledAt: null, pod: { type: 'Signature' }
    },
    {
        id: 'RR-1036', client: 'Carla Cliente', recipient: 'Pedro Lopes',
        address: 'Praça da Ribeira 2, Porto',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1407, destLng: -8.6131,
        product: { description: 'Headphones', category: 'Electronics', weightKg: 1, volumeM3: 0.005 },
        status: 'Completed', attempt: 1, courier: 'Constantino Courier', vehicle: '45-XY-90',
        createdAt: pdpDateTimeFromNow(-4, -5), acceptedAt: pdpDateTimeFromNow(-4, -4), pickedUpAt: pdpDateTimeFromNow(-3, -3),
        completedAt: pdpDateTimeFromNow(-3, -2), cancelledAt: null, pod: { type: 'Photo' }
    },
    // One finished delivery per extra courier, each in a different part of Porto.
    // WP3: a courier's location is their last drop-off, so the "nearest courier" differs per order.
    {
        id: 'RR-1030', client: 'Carla Cliente', recipient: 'Inês Matos',
        address: 'Avenida da República 800, Matosinhos',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1844, destLng: -8.6963,
        product: { description: 'Board games', category: 'Other', weightKg: 3, volumeM3: 0.015 },
        status: 'Completed', attempt: 1, courier: 'Coraline Cargo', vehicle: 'CR-01-AL',
        createdAt: pdpDateTimeFromNow(-2, -6), acceptedAt: pdpDateTimeFromNow(-2, -5), pickedUpAt: pdpDateTimeFromNow(-2, -4),
        completedAt: pdpDateTimeFromNow(-2, -3), cancelledAt: null, pod: { type: 'Signature' }
    },
    {
        id: 'RR-1031', client: 'Carla Cliente', recipient: 'Rui Gaio',
        address: 'Cais de Gaia 120, Vila Nova de Gaia',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1370, destLng: -8.6120,
        product: { description: 'Tea set', category: 'Fragile', weightKg: 2, volumeM3: 0.01 },
        status: 'Completed', attempt: 1, courier: 'Confucius Courier', vehicle: 'CF-88-WU',
        createdAt: pdpDateTimeFromNow(-1, -8), acceptedAt: pdpDateTimeFromNow(-1, -7), pickedUpAt: pdpDateTimeFromNow(-1, -6),
        completedAt: pdpDateTimeFromNow(-1, -5), cancelledAt: null, pod: { type: 'Photo' }
    },
    // Colleagues busy right now, so the courier page's "All deliveries" list shows who has what
    {
        id: 'RR-1034', client: 'Carla Cliente', recipient: 'Duarte Leça',
        address: 'Rua Hintze Ribeiro 50, Leça da Palmeira',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1910, destLng: -8.7020,
        product: { description: 'Desk lamp', category: 'Electronics', weightKg: 2, volumeM3: 0.02 },
        status: 'In Progress', attempt: 1, courier: 'Coraline Cargo', vehicle: 'CR-01-AL',
        createdAt: pdpDateTimeFromNow(0, -3), acceptedAt: pdpDateTimeFromNow(0, -2), pickedUpAt: pdpDateTimeFromNow(0, -1),
        completedAt: null, cancelledAt: null, pod: null
    },
    {
        id: 'RR-1035', client: 'Carla Cliente', recipient: 'Beatriz Boavista',
        address: 'Avenida da Boavista 1500, Porto',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1580, destLng: -8.6400,
        product: { description: 'Bookshelf', category: 'Other', weightKg: 35, volumeM3: 0.45 },
        status: 'Initiated', attempt: 1, courier: 'Cleopatra Carrier', vehicle: null,
        createdAt: pdpDateTimeFromNow(0, -2), acceptedAt: pdpDateTimeFromNow(0, -1), pickedUpAt: null,
        completedAt: null, cancelledAt: null, pod: null
    },
    {
        id: 'RR-1033', client: 'Carla Cliente', recipient: 'Filipa Foz',
        address: 'Avenida do Brasil 300, Foz do Douro, Porto',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1530, destLng: -8.6760,
        product: { description: 'Garden chairs', category: 'Other', weightKg: 18, volumeM3: 0.4 },
        status: 'Completed', attempt: 1, courier: 'Cleopatra Carrier', vehicle: 'CL-30-PA',
        createdAt: pdpDateTimeFromNow(-3, -6), acceptedAt: pdpDateTimeFromNow(-3, -5), pickedUpAt: pdpDateTimeFromNow(-3, -4),
        completedAt: pdpDateTimeFromNow(-3, -3), cancelledAt: null, pod: { type: 'Photo' }
    }
];

// Vehicles registered by couriers (3_courier.html) and audited by staff (5_staff.html).
// Only vehicles of real courier accounts (the demo couriers in PDP_DEMO_USERS below).
const PDP_DEFAULT_VEHICLES = [
    { plate: 'AA-12-BC', model: 'Renault Kangoo', type: 'Van', courier: 'Constantino Courier', maxWeightKg: 650, maxVolM3: 3.3,
      insuranceExpiry: pdpDaysFromToday(200), inspectionExpiry: pdpDaysFromToday(120), status: 'Approved', newDocument: false },
    { plate: '45-XY-90', model: 'Honda PCX 125', type: 'Moto', courier: 'Constantino Courier', maxWeightKg: 25, maxVolM3: 0.1,
      insuranceExpiry: pdpDaysFromToday(12), inspectionExpiry: pdpDaysFromToday(90), status: 'Approved', newDocument: false },
    { plate: 'BK-0007', model: 'Cargo bike', type: 'Bike', courier: 'Constantino Courier', maxWeightKg: 40, maxVolM3: 0.2,
      insuranceExpiry: pdpDaysFromToday(300), inspectionExpiry: pdpDaysFromToday(300), status: 'Pending', newDocument: true },
    // Extra demo couriers – one approved vehicle each
    { plate: 'CR-01-AL', model: 'Citroën Berlingo', type: 'Van', courier: 'Coraline Cargo', maxWeightKg: 650, maxVolM3: 3.3,
      insuranceExpiry: pdpDaysFromToday(180), inspectionExpiry: pdpDaysFromToday(150), status: 'Approved', newDocument: false },
    { plate: 'CF-88-WU', model: 'Yamaha NMAX 125', type: 'Moto', courier: 'Confucius Courier', maxWeightKg: 25, maxVolM3: 0.1,
      insuranceExpiry: pdpDaysFromToday(240), inspectionExpiry: pdpDaysFromToday(200), status: 'Approved', newDocument: false },
    { plate: 'CL-30-PA', model: 'Mercedes Sprinter', type: 'Truck', courier: 'Cleopatra Carrier', maxWeightKg: 3500, maxVolM3: 20,
      insuranceExpiry: pdpDaysFromToday(90), inspectionExpiry: pdpDaysFromToday(60), status: 'Approved', newDocument: false }
];

// ---------- storage helpers ----------

function pdpLoad(key, fallback) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return saved || JSON.parse(JSON.stringify(fallback));
    } catch (e) {
        return JSON.parse(JSON.stringify(fallback));
    }
}

function pdpSave(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('Could not save to localStorage', e);
    }
}

function pdpGetOrders() { pdpMergeDemoExtras(); return pdpLoad('pdpOrders', PDP_DEFAULT_ORDERS); }
function pdpSaveOrders(orders) { pdpSave('pdpOrders', orders); }

function pdpGetVehicles() { pdpMergeDemoExtras(); return pdpLoad('pdpVehicles', PDP_DEFAULT_VEHICLES); }
function pdpSaveVehicles(vehicles) { pdpSave('pdpVehicles', vehicles); }

function pdpFindOrder(id) {
    return pdpGetOrders().find(function (o) {
        return o.id.toUpperCase() === id.trim().toUpperCase();
    });
}

// Tracking is only for registered clients, and only for their OWN orders
function pdpFindClientOrder(id, clientName) {
    const order = pdpFindOrder(id);
    return order && order.client === clientName ? order : null;
}

// ---------- login link that brings the user back afterwards ----------
// "1_login.html?next=2_client.html%23RR-1042" -> after logging in, login.js opens 2_client.html#RR-1042.
// Only a page file in the same folder is accepted (no other sites).
function pdpSafeNext(value) {
    const next = String(value || '');
    return /^[0-9A-Za-z_]+\.html(#[A-Za-z0-9-]+)?$/.test(next) ? next : '';
}

function pdpLoginUrl(next) {
    const safe = pdpSafeNext(next);
    return '1_login.html' + (safe ? '?next=' + encodeURIComponent(safe) : '');
}

// The current page, e.g. "2_client.html#RR-1042"
function pdpCurrentPage() {
    return location.pathname.split('/').pop() + location.hash;
}

function pdpNextOrderId() {
    const highest = pdpGetOrders().reduce(function (max, o) {
        return Math.max(max, parseInt(o.id.split('-')[1], 10));
    }, 1000);
    return 'RR-' + (highest + 1);
}

// Days until a date (negative = already expired)
function pdpDaysUntil(dateString) {
    const today = new Date(pdpDaysFromToday(0));
    return Math.round((new Date(dateString) - today) / 86400000);
}

// Removes all saved prototype data so every page starts from the sample data again
function pdpResetData() {
    ['pdpOrders', 'pdpVehicles', 'pdpPendingCouriers', 'pdpCourierVehicle', 'adminUsers',
     'pendingStaff', 'registeredUsers', 'pdpUsersSeeded', 'pdpDemoNames', 'pdpDemoExtras', 'currentUser', 'adminProfile'].forEach(function (key) {
        localStorage.removeItem(key);
    });
}

// Saved data from older versions had orders/vehicles of couriers without an account.
// Clear it once so every page starts from the cleaned sample data above.
const PDP_DATA_VERSION = '3';   // 3: orders store date + time of every step
try {
    if (localStorage.getItem('pdpDataVersion') !== PDP_DATA_VERSION) {
        ['pdpOrders', 'pdpVehicles', 'pdpCourierVehicle'].forEach(function (key) { localStorage.removeItem(key); });
        localStorage.setItem('pdpDataVersion', PDP_DATA_VERSION);
    }
} catch (e) { /* storage blocked: the sample data is used */ }

// =========================================
// Shared rules for couriers & vehicles
// Used by 3_courier.html, 5_staff.html and 4_admin.html, so all pages agree.
// =========================================

const PDP_WARNING_DAYS = 30;                // documents expiring within 30 days get a warning

// Vehicle status set by staff: courier sends 'Pending', staff sets 'Approved' or 'Rejected'
const PDP_VEHICLE = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };

// Logged-in user saved by login.js ({ name, role }) or null
function pdpCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser')); } catch (e) { return null; }
}

function pdpLogout() {
    try { localStorage.removeItem('currentUser'); } catch (e) { /* storage blocked */ }
}

// =========================================
// Page access by role
// A page declares who may use it:  <body data-require-role="staff">  (several: "staff admin")
// Anyone else (not logged in, wrong role, or account no longer active) sees a
// message with a login link instead of the page.
// Prototype only – in Sprint 2 the PHP backend checks the session (requireRole()).
// =========================================
const PDP_ROLE_LABELS = { client: 'Client', courier: 'Courier', staff: 'Staff', admin: 'Admin' };
const PDP_ROLE_PAGES = { client: '2_client.html', courier: '3_courier.html', staff: '5_staff.html', admin: '4_admin.html' };

// =========================================
// TEMPORARY master account for testing (master@pdp.pt / master123)
// While logged in as master, a "View as" menu in the header switches to ANY account
// without a password, and pages for other roles switch automatically instead of
// showing "No access". The session keeps master: true so you can always switch back.
// To remove before handing in: set PDP_MASTER_ENABLED = false (or delete the account).
// =========================================
const PDP_MASTER_ENABLED = true;

function pdpIsMasterSession() {
    const me = pdpCurrentUser();
    if (!PDP_MASTER_ENABLED || !me || !me.master) return false;
    const master = pdpGetUsers().find(function (u) { return u.master && u.status === PDP_USER_STATUS.ACTIVE; });
    return !!master;
}

// Act as another account (keeps the master flag in the session)
function pdpMasterActAs(username) {
    const user = pdpFindUser(username);
    if (!user) return null;
    pdpSave('currentUser', { name: user.name, username: user.username, role: user.role, master: true });
    return user;
}

// Master opening a page of another role: switch to a fitting active account (demo accounts first)
function pdpMasterSwitchFor(roles) {
    const preferred = ['client', 'courier', 'staff', 'admin'];
    const candidates = pdpGetUsers().filter(function (u) {
        return roles.indexOf(u.role) !== -1 && u.status === PDP_USER_STATUS.ACTIVE && !u.master;
    }).sort(function (a, b) {
        const ia = preferred.indexOf(a.username), ib = preferred.indexOf(b.username);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return candidates.length ? pdpMasterActAs(candidates[0].username) : null;
}

// The "View as" menu in the header
function pdpSetupMasterSwitcher(group) {
    if (!pdpIsMasterSession()) return;
    const me = pdpCurrentUser();
    const select = document.createElement('select');
    select.className = 'master-switch';
    select.title = 'Master: act as any account';
    select.setAttribute('aria-label', 'View as');
    const groups = [['admin', 'Admins'], ['staff', 'Staff'], ['courier', 'Couriers'], ['client', 'Clients']];
    groups.forEach(function (g) {
        const users = pdpGetUsers().filter(function (u) { return u.role === g[0] && u.status === PDP_USER_STATUS.ACTIVE; });
        if (!users.length) return;
        const optgroup = document.createElement('optgroup');
        optgroup.label = g[1];
        users.forEach(function (u) {
            const option = document.createElement('option');
            option.value = u.username;
            option.textContent = (u.master ? '★ ' : '') + u.name;
            option.selected = u.username === me.username;
            optgroup.append(option);
        });
        select.append(optgroup);
    });
    select.addEventListener('change', function () {
        const user = pdpMasterActAs(select.value);
        if (!user) return;
        const here = location.pathname.split('/').pop();
        const required = (document.body.dataset.requireRole || '').split(/\s+/).filter(Boolean);
        // Stay on this page if the new account may use it (or it is public), otherwise open its own page
        if (!required.length || required.indexOf(user.role) !== -1) location.reload();
        else location.href = PDP_ROLE_PAGES[user.role] || here;
    });
    const label = document.createElement('span');
    label.className = 'master-label';
    label.textContent = 'View as';
    group.prepend(label, select);
}

function pdpHasAccess(roles) {
    const me = pdpCurrentUser();
    if (!me || roles.indexOf(me.role) === -1) return false;
    // The account must still exist and be active (e.g. not disabled after logging in)
    const account = pdpCurrentAccount();
    return !!account && account.status === PDP_USER_STATUS.ACTIVE;
}

function pdpGuardPage() {
    const body = document.body;
    const required = body && body.dataset.requireRole;
    if (!required) return true;
    const roles = required.split(/\s+/);
    // TEMPORARY master: switch to a fitting account instead of "No access"
    if (!pdpHasAccess(roles) && pdpIsMasterSession()) pdpMasterSwitchFor(roles);
    if (pdpHasAccess(roles)) {
        // Staff may have renamed this account: page scripts read the name from the session
        const me = pdpCurrentUser();
        const account = pdpCurrentAccount();
        if (account && me.name !== account.name) pdpSave('currentUser', Object.assign(me, { name: account.name }));
        return true;
    }

    const me = pdpCurrentUser();
    const needed = roles.map(function (r) { return PDP_ROLE_LABELS[r] || r; }).join(' or ');
    const reason = me
        ? 'You are logged in as ' + (PDP_ROLE_LABELS[me.role] || me.role) + ' (' + me.name + '). This page is only for ' + needed + ' accounts.'
        : 'Please log in with a ' + needed + ' account to use this page.';

    const main = document.querySelector('main');
    // Hide the page content but keep the black page banner (.team-banner) – on some pages
    // the banner is inside <main>. Page scripts still load, but nothing can be seen or used.
    // style.display is used because CSS like ".card { display: ... }" would override the hidden attribute.
    const banner = main ? main.querySelector(':scope > .team-banner') : null;
    if (main) {
        Array.prototype.forEach.call(main.children, function (child) {
            if (child !== banner) child.style.display = 'none';
        });
    }
    const box = document.createElement('section');
    box.className = 'access-denied';
    box.setAttribute('role', 'alert');
    const title = document.createElement('h2');
    title.textContent = 'No access';
    const text = document.createElement('p');
    text.textContent = reason;
    const link = document.createElement('a');
    link.href = pdpLoginUrl(pdpCurrentPage());   // come back here after logging in
    link.className = 'btn-save';
    link.textContent = me ? 'Log in with another account' : 'Go to login';
    link.addEventListener('click', pdpLogout);
    box.append(title, text, link);
    if (banner) banner.after(box);        // banner inside <main>: message right below it
    else if (main) main.prepend(box);     // banner above <main> (staff, admin): message at the top of <main>
    else body.prepend(box);
    return false;
}

// While someone is logged in, the header "Login" button becomes "Log out"
// and a "My account" link (8_profile.html) appears next to it
function pdpSetupLoginButton() {
    const me = pdpCurrentUser();
    document.querySelectorAll('.btn-login').forEach(function (button) {
        if (!me) return;
        const upper = button.textContent.trim() === button.textContent.trim().toUpperCase();
        button.textContent = upper ? 'LOG OUT' : 'Log out';
        button.title = 'Logged in as ' + me.name + ' (' + (PDP_ROLE_LABELS[me.role] || me.role) + ')';
        button.href = '1_login.html';
        button.addEventListener('click', pdpLogout);

        const account = document.createElement('a');
        account.href = '8_profile.html';
        account.className = 'btn-account';
        account.textContent = upper ? 'MY ACCOUNT' : 'My account';
        account.title = me.name;
        if (location.pathname.split('/').pop() === '8_profile.html') account.classList.add('active');
        const group = document.createElement('div');
        group.className = 'header-account';
        button.before(group);
        group.append(account, button);
        pdpSetupMasterSwitcher(group);
    });
}


// =========================================
// User accounts – ONE list for every page ("registeredUsers")
//   status: 'pending'  -> registered, waiting for approval (courier: by staff, staff: by admin)
//           'active'   -> can log in
//           'disabled' -> blocked by their manager, cannot log in
//   Who manages whom:  admin -> staff,  staff -> couriers
// Prototype only: passwords are kept in plain text in the browser.
// In Sprint 2 the PHP backend stores password_hash() values instead.
// =========================================

const PDP_USER_STATUS = { PENDING: 'pending', ACTIVE: 'active', DISABLED: 'disabled' };

// Accounts that exist from the start (also listed on 1_login.html)
const PDP_DEMO_USERS = [
    { name: 'Carla Cliente',   username: 'client',  email: 'client@pdp.pt',  phone: '912000001', nif: '500000001', citizenCard: '100000011ZZ1', password: 'client123',  role: 'client',  status: 'active' },
    { name: 'Constantino Courier', username: 'courier', email: 'courier@pdp.pt', phone: '912000002', nif: '500000002', citizenCard: '100000022ZZ2', password: 'courier123', role: 'courier', status: 'active', approvedBy: 'Sofia Staff' },
    { name: 'Sofia Staff',     username: 'staff',   email: 'staff@pdp.pt',   phone: '912000003', nif: '500000003', citizenCard: '100000033ZZ3', password: 'staff123',   role: 'staff',   status: 'active', approvedBy: 'António Admin' },
    { name: 'António Admin',   username: 'admin',   email: 'admin@pdp.pt',   phone: '912000004', nif: '500000004', citizenCard: '100000044ZZ4', password: 'admin123',   role: 'admin',   status: 'active' },
    // More active couriers (all approved by Sofia Staff) – so WP3 has several couriers to choose from
    { name: 'Coraline Cargo',   username: 'coraline',  email: 'coraline@pdp.pt',  phone: '912000008', nif: '500000008', citizenCard: '100000088ZZ8', password: 'coraline123',  role: 'courier', status: 'active', approvedBy: 'Sofia Staff' },
    { name: 'Confucius Courier', username: 'confucius', email: 'confucius@pdp.pt', phone: '912000009', nif: '500000009', citizenCard: '100000099ZZ9', password: 'confucius123', role: 'courier', status: 'active', approvedBy: 'Sofia Staff' },
    { name: 'Cleopatra Carrier', username: 'cleopatra', email: 'cleopatra@pdp.pt', phone: '912000011', nif: '500000011', citizenCard: '100000112ZZ2', password: 'cleopatra123', role: 'courier', status: 'active', approvedBy: 'Sofia Staff' },
    // waiting for approval, so the admin and staff pages have something to manage
    { name: 'Johan Lindström', username: 'johan',   email: 'johan@pdp.pt',   phone: '912000005', nif: '500000005', citizenCard: '100000055ZZ5', password: 'johan1234',  role: 'staff',   status: 'pending' },
    { name: 'Elin Berg',       username: 'elin',    email: 'elin@pdp.pt',    phone: '912000006', nif: '500000006', citizenCard: '100000066ZZ6', password: 'elin12345',  role: 'staff',   status: 'pending' },
    // TEMPORARY test account – see PDP_MASTER_ENABLED. Remove before handing in.
    { name: 'Master Tester',   username: 'master',  email: 'master@pdp.pt',  phone: '912000099', nif: '500000099', citizenCard: '100000999ZZ9', password: 'master123',  role: 'admin',   status: 'active', master: true },
    { name: 'Pedro Novo',      username: 'pedro',   email: 'pedro.novo@pdp.pt', phone: '912000007', nif: '500000007', citizenCard: '100000077ZZ7', password: 'pedro1234', role: 'courier', status: 'pending' }
];

// Adds the demo accounts once (and moves data from older prototype versions)
function pdpSeedUsers() {
    try {
        if (localStorage.getItem('pdpUsersSeeded') === '1') return;
        let users = JSON.parse(localStorage.getItem('registeredUsers')) || [];

        // Old version: staff approved by the admin were only in "adminUsers"
        const approvedNames = (JSON.parse(localStorage.getItem('adminUsers')) || [])
            .filter(function (u) { return u.status === 'ACTIVE'; })
            .map(function (u) { return String(u.name).toUpperCase(); });
        users.forEach(function (u) {
            if (u.role === 'staff' && u.status === 'pending' && approvedNames.indexOf(u.name.toUpperCase()) !== -1) {
                u.status = 'active';
            }
        });

        const now = new Date().toISOString();
        PDP_DEMO_USERS.forEach(function (demo) {
            const taken = users.some(function (u) {
                return u.username.toLowerCase() === demo.username || u.email.toLowerCase() === demo.email;
            });
            if (!taken) users.push(Object.assign({ created_at: now }, demo));
        });

        localStorage.setItem('registeredUsers', JSON.stringify(users));
        localStorage.removeItem('pendingStaff');   // replaced by status 'pending' in this list
        localStorage.removeItem('adminUsers');     // replaced by this list
        localStorage.setItem('pdpUsersSeeded', '1');
    } catch (e) { /* storage blocked: pdpGetUsers falls back to the demo accounts */ }
}

// Demo accounts have fixed names. Browsers that saved other names for them (older versions,
// or a rename on the "My account" page while testing) get the demo names back once.
// Matched by USERNAME; orders, vehicles and "approved by" follow via pdpRenameEverywhere.
const PDP_DEMO_NAMES_VERSION = '4';   // 4: Coraline Couriere -> Coraline Cargo

function pdpMigrateDemoNames() {
    try {
        if (localStorage.getItem('pdpDemoNames') === PDP_DEMO_NAMES_VERSION) return;
        localStorage.setItem('pdpDemoNames', PDP_DEMO_NAMES_VERSION);   // set first: the renames below read the users again
        const saved = JSON.parse(localStorage.getItem('registeredUsers')) || [];
        ['client', 'courier', 'staff', 'admin', 'coraline'].forEach(function (username) {
            const demo = PDP_DEMO_USERS.find(function (d) { return d.username === username; });
            const user = saved.find(function (u) { return u.username === username && u.role === demo.role; });
            if (!user || user.name === demo.name) return;
            const oldName = user.name;
            pdpRenameEverywhere(oldName, demo.name, demo.role);
            pdpUpdateUser(username, { name: demo.name });
            const me = pdpCurrentUser();
            if (me && me.username === username) pdpSave('currentUser', Object.assign(me, { name: demo.name }));
        });
    } catch (e) { /* storage blocked: nothing saved, nothing to rename */ }
}

// New demo data added later (extra couriers, their vehicles and deliveries) is merged once into
// browsers that already saved data – nothing that is already there is changed.
const PDP_DEMO_EXTRAS_VERSION = '4';   // 4: temporary master account   // 2: demo courier Cornelius Cargo removed · 3: colleagues' open deliveries added

function pdpMergeDemoExtras() {
    try {
        if (localStorage.getItem('pdpDemoExtras') === PDP_DEMO_EXTRAS_VERSION) return;
        localStorage.setItem('pdpDemoExtras', PDP_DEMO_EXTRAS_VERSION);
        // Remove the dropped demo courier (account, cargo bike, delivery) if version 1 had added him
        function drop(key, isOld) {
            const saved = JSON.parse(localStorage.getItem(key));
            if (saved) localStorage.setItem(key, JSON.stringify(saved.filter(function (x) { return !isOld(x); })));
        }
        drop('registeredUsers', function (u) { return u.username === 'cornelius' && u.name === 'Cornelius Cargo'; });
        drop('pdpVehicles', function (v) { return v.plate === 'BK-0042' && v.courier === 'Cornelius Cargo'; });
        drop('pdpOrders', function (o) { return o.id === 'RR-1032' && o.courier === 'Cornelius Cargo'; });
        function merge(key, defaults, sameItem) {
            const saved = JSON.parse(localStorage.getItem(key));
            if (!saved) return;   // nothing saved yet: the defaults are used anyway
            defaults.forEach(function (item) {
                if (!saved.some(function (s) { return sameItem(s, item); })) saved.push(JSON.parse(JSON.stringify(item)));
            });
            localStorage.setItem(key, JSON.stringify(saved));
        }
        const now = new Date().toISOString();
        merge('registeredUsers', PDP_DEMO_USERS.map(function (u) { return Object.assign({ created_at: now }, u); }),
            function (a, b) { return a.username.toLowerCase() === b.username || a.email.toLowerCase() === b.email; });
        merge('pdpVehicles', PDP_DEFAULT_VEHICLES, function (a, b) { return a.plate === b.plate; });
        merge('pdpOrders', PDP_DEFAULT_ORDERS, function (a, b) { return a.id === b.id; });
    } catch (e) { /* storage blocked: the defaults are used */ }
}

function pdpGetUsers() {
    pdpSeedUsers();
    pdpMergeDemoExtras();
    pdpMigrateDemoNames();
    try {
        const saved = JSON.parse(localStorage.getItem('registeredUsers'));
        if (saved) {
            // Demo accounts saved before the citizen card field existed get their number now
            let filled = false;
            saved.forEach(function (u) {
                if (u.citizenCard) return;
                const demo = PDP_DEMO_USERS.find(function (d) { return d.username === u.username; });
                if (demo) { u.citizenCard = demo.citizenCard; filled = true; }
            });
            if (filled) pdpSave('registeredUsers', saved);
            return saved;
        }
    } catch (e) { /* fall through */ }
    return JSON.parse(JSON.stringify(PDP_DEMO_USERS));
}

// ---------- citizen card number (Cartão de Cidadão) ----------
// Format: 8-digit civil ID + 1 check digit + 2 version characters + 1 check digit,
// e.g. "12345678 9 ZZ4". Stored without spaces in capitals ("123456789ZZ4").
function pdpNormalizeCitizenCard(value) {
    return String(value || '').replace(/[\s-]/g, '').toUpperCase();
}

function pdpIsValidCitizenCard(value) {
    return /^\d{9}[A-Z0-9]{2}\d$/.test(pdpNormalizeCitizenCard(value));
}

// "123456789ZZ4" -> "12345678 9 ZZ4"
function pdpFormatCitizenCard(value) {
    const cc = pdpNormalizeCitizenCard(value);
    return pdpIsValidCitizenCard(cc) ? cc.slice(0, 8) + ' ' + cc.slice(8, 9) + ' ' + cc.slice(9) : cc;
}

// true when another account (not exceptUsername) already uses this citizen card number
function pdpCitizenCardTaken(value, exceptUsername) {
    const cc = pdpNormalizeCitizenCard(value);
    return pdpGetUsers().some(function (u) {
        return u.username !== exceptUsername && pdpNormalizeCitizenCard(u.citizenCard) === cc;
    });
}

function pdpSaveUsers(users) { pdpSave('registeredUsers', users); }

function pdpFindUser(username) {
    return pdpGetUsers().find(function (u) { return u.username === username; }) || null;
}

// Changes one account; returns the updated account
function pdpUpdateUser(username, changes) {
    const users = pdpGetUsers();
    const user = users.find(function (u) { return u.username === username; });
    if (!user) return null;
    Object.assign(user, changes);
    pdpSaveUsers(users);
    return user;
}

// Approve / disable / enable an account.
// A courier who stops being active hands their unfinished orders back to "Available orders".
// Returns the number of released orders.
function pdpSetUserStatus(username, status, byName) {
    const before = pdpFindUser(username);
    if (!before) return 0;
    const changes = { status: status };
    if (before.status === PDP_USER_STATUS.PENDING && status === PDP_USER_STATUS.ACTIVE) {
        changes.approvedBy = byName || '';
        changes.approvedAt = pdpNow();
    }
    if (status === PDP_USER_STATUS.DISABLED) changes.disabledAt = pdpNow();
    const user = pdpUpdateUser(username, changes);
    return user.role === 'courier' && status !== PDP_USER_STATUS.ACTIVE ? pdpReleaseCourierOrders(user.name) : 0;
}

// Deletes an account (reject or remove). A courier's vehicles are removed too
// and their unfinished orders go back to "Available orders". Returns released orders.
function pdpRemoveUser(username) {
    const users = pdpGetUsers();
    const index = users.findIndex(function (u) { return u.username === username; });
    if (index === -1) return 0;
    const user = users.splice(index, 1)[0];
    pdpSaveUsers(users);
    if (user.role !== 'courier') return 0;
    pdpSaveVehicles(pdpGetVehicles().filter(function (v) { return v.courier !== user.name; }));
    return pdpReleaseCourierOrders(user.name);
}

// 'active', 'pending', 'disabled', or 'unknown' when there is no courier account with this name
function pdpCourierStatus(name) {
    const user = pdpGetUsers().find(function (u) { return u.role === 'courier' && u.name === name; });
    return user ? user.status : 'unknown';
}

// ---------- editing your own account (8_profile.html) ----------

// Checks personal details. Returns { field: 'message' } – empty object = all valid.
// exceptUsername: the account being edited (its own email/username/card do not count as "taken").
function pdpValidateAccount(data, exceptUsername) {
    const errors = {};
    const others = pdpGetUsers().filter(function (u) { return u.username !== exceptUsername; });
    const phone = String(data.phone || '').replace(/\s/g, '');

    if (String(data.name || '').trim().length < 3) errors.name = 'Please enter your full name.';

    if (!/^[A-Za-z0-9._]{3,20}$/.test(data.username || '')) {
        errors.username = '3–20 characters: letters, numbers, dot or underscore.';
    } else if (others.some(function (u) { return u.username.toLowerCase() === data.username.toLowerCase(); })) {
        errors.username = 'This username is already taken.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || '')) {
        errors.email = 'Please enter a valid email address.';
    } else if (others.some(function (u) { return u.email.toLowerCase() === data.email.toLowerCase(); })) {
        errors.email = 'Another account already uses this email.';
    }

    if (!/^(\+351)?\d{9}$/.test(phone)) errors.phone = 'Enter 9 digits (optionally starting with +351).';
    if (!/^\d{9}$/.test(data.nif || '')) errors.nif = 'The NIF must have exactly 9 digits.';

    if (!pdpIsValidCitizenCard(data.citizenCard)) {
        errors.citizenCard = 'Use the format on your card, e.g. 12345678 9 ZZ4.';
    } else if (pdpCitizenCardTaken(data.citizenCard, exceptUsername)) {
        errors.citizenCard = 'Another account already uses this citizen card number.';
    }
    return errors;
}

// Orders, vehicles and approvals point to people by NAME, so a new name is copied everywhere
function pdpRenameEverywhere(oldName, newName, role) {
    if (!oldName || oldName === newName) return;
    const orders = pdpGetOrders();
    orders.forEach(function (o) {
        if (role === 'client' && o.client === oldName) o.client = newName;
        if (role === 'courier' && o.courier === oldName) o.courier = newName;
    });
    pdpSaveOrders(orders);

    if (role === 'courier') {
        const vehicles = pdpGetVehicles();
        vehicles.forEach(function (v) { if (v.courier === oldName) v.courier = newName; });
        pdpSaveVehicles(vehicles);
    }

    // "Approved by" / "Proposed by" on other accounts
    const users = pdpGetUsers();
    users.forEach(function (u) {
        if (u.approvedBy === oldName) u.approvedBy = newName;
        if (u.proposedBy === oldName) u.proposedBy = newName;
    });
    pdpSaveUsers(users);
}

// The full account of whoever is logged in (or null)
function pdpCurrentAccount() {
    const me = pdpCurrentUser();
    if (!me) return null;
    return pdpGetUsers().find(function (u) {
        return me.username ? u.username === me.username : (u.name === me.name && u.role === me.role);
    }) || null;
}

// Saves the logged-in user's own details. Returns { errors } or { user }.
function pdpUpdateOwnAccount(changes) {
    const account = pdpCurrentAccount();
    if (!account) return { errors: { form: 'You are not logged in.' } };

    const data = {
        name: String(changes.name || '').trim(),
        username: String(changes.username || '').trim(),
        email: String(changes.email || '').trim(),
        phone: String(changes.phone || '').replace(/\s/g, ''),
        nif: String(changes.nif || '').trim(),
        citizenCard: pdpNormalizeCitizenCard(changes.citizenCard)
    };
    const errors = pdpValidateAccount(data, account.username);
    if (Object.keys(errors).length) return { errors: errors };

    pdpRenameEverywhere(account.name, data.name, account.role);
    const user = pdpUpdateUser(account.username, data);   // username may change here too

    // Keep the login session in step with the new name / username
    pdpSave('currentUser', { name: user.name, username: user.username, role: user.role });
    return { user: user };
}

// Changes the logged-in user's password. Returns '' on success or an error message.
// Prototype only: passwords are stored in plain text; Sprint 2 uses password_hash() in PHP.
function pdpChangeOwnPassword(current, next, confirmNext) {
    const account = pdpCurrentAccount();
    if (!account) return 'You are not logged in.';
    if (account.password !== current) return 'Your current password is not correct.';
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return 'New password: at least 8 characters, with letters and numbers.';
    if (next !== confirmNext) return 'The new passwords do not match.';
    if (next === current) return 'The new password must be different from the current one.';
    pdpUpdateUser(account.username, { password: next });
    return '';
}

// Vehicles of real courier accounts only
function pdpCourierVehicles() {
    return pdpGetVehicles().filter(function (v) { return pdpCourierStatus(v.courier) !== 'unknown'; });
}

// State of an insurance / inspection document: 'expired', 'soon' or 'valid'
function pdpDocState(dateString) {
    const daysLeft = pdpDaysUntil(dateString);
    if (daysLeft < 0) return { state: 'expired', daysLeft: daysLeft };
    if (daysLeft <= PDP_WARNING_DAYS) return { state: 'soon', daysLeft: daysLeft };
    return { state: 'valid', daysLeft: daysLeft };
}

function pdpHasExpiredDocument(v) {
    return pdpDocState(v.insuranceExpiry).state === 'expired' ||
           pdpDocState(v.inspectionExpiry).state === 'expired';
}

// Why a vehicle cannot be used for a route ('' = it can be used)
function pdpVehicleProblem(v) {
    if (v.status === PDP_VEHICLE.REJECTED) return 'rejected by staff';
    if (v.status !== PDP_VEHICLE.APPROVED) return 'waiting for staff approval';
    if (pdpDocState(v.insuranceExpiry).state === 'expired') return 'insurance expired';
    if (pdpDocState(v.inspectionExpiry).state === 'expired') return 'inspection expired';
    return '';
}

// Orders of a courier's route that is running right now (status In Progress)
function pdpActiveRouteOrders(courierName) {
    return pdpGetOrders().filter(function (o) {
        return o.courier === courierName && o.status === PDP_STATUS.IN_PROGRESS;
    });
}

// Puts all unfinished orders of a courier back under "Available orders".
// A delivery that was already on the road counts as a failed attempt.
function pdpReleaseCourierOrders(courierName) {
    const orders = pdpGetOrders();
    let released = 0;
    orders.forEach(function (o) {
        if (o.courier !== courierName) return;
        if (o.status !== PDP_STATUS.INITIATED && o.status !== PDP_STATUS.IN_PROGRESS) return;
        if (o.status === PDP_STATUS.IN_PROGRESS) {
            o.attempt += 1;
            o.cancelledAt = pdpNow();
        }
        o.status = PDP_STATUS.INITIATED;
        o.courier = null;
        o.vehicle = null;
        o.acceptedAt = null;
        o.pickedUpAt = null;
        released++;
    });
    if (released) pdpSaveOrders(orders);
    return released;
}

// Tracking number format used everywhere: RR- followed by 4 digits
const PDP_TRACKING_PATTERN = /^RR-\d{4}$/i;

// ---------- map tiles ----------
// OpenStreetMap's tile servers block requests without a "Referer" header,
// and browsers send none when a page is opened directly from disk (file://).
// So: on a web server (Live Server, NetBeans, GitHub Pages) we use the OpenStreetMap tiles;
// when the file is opened locally we use CARTO's tiles, which are also made from OpenStreetMap data.
function pdpAddTileLayer(map) {
    if (location.protocol === 'file:') {
        return L.tileLayer('https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_59hz_1_a8a64457799c889a69ec9071', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(map);
    }
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        referrerPolicy: 'strict-origin-when-cross-origin',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// ---------- run on every page (must stay at the END of data.js) ----------
// data.js is loaded at the end of every page, so the page content already exists here
try {
    if (typeof document !== 'undefined' && document.body) {
        pdpGuardPage();
        pdpSetupLoginButton();
    }
} catch (e) { console.warn('Access check failed', e); }
