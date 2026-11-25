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
        status: 'In Progress', attempt: 1, courier: 'Miguel Santos', vehicle: 'AA-12-BC',
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
        status: 'In Progress', attempt: 1, courier: 'Miguel Santos', vehicle: 'AA-12-BC',
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
        status: 'Completed', attempt: 1, courier: 'Miguel Santos', vehicle: 'AA-12-BC',
        createdAt: pdpDateTimeFromNow(-3, -2), acceptedAt: pdpDateTimeFromNow(-3, -1), pickedUpAt: pdpDateTimeFromNow(-2, -3),
        completedAt: pdpDateTimeFromNow(-2, -2), cancelledAt: null, pod: { type: 'Signature' }
    },
    {
        id: 'RR-1036', client: 'Carla Cliente', recipient: 'Pedro Lopes',
        address: 'Praça da Ribeira 2, Porto',
        originLat: 41.1780, originLng: -8.5980, destLat: 41.1407, destLng: -8.6131,
        product: { description: 'Headphones', category: 'Electronics', weightKg: 1, volumeM3: 0.005 },
        status: 'Completed', attempt: 1, courier: 'Miguel Santos', vehicle: '45-XY-90',
        createdAt: pdpDateTimeFromNow(-4, -5), acceptedAt: pdpDateTimeFromNow(-4, -4), pickedUpAt: pdpDateTimeFromNow(-3, -3),
        completedAt: pdpDateTimeFromNow(-3, -2), cancelledAt: null, pod: { type: 'Photo' }
    }
];

// Vehicles registered by couriers (3_courier.html) and audited by staff (5_staff.html).
// Only vehicles of real courier accounts – here the demo courier from login.js.
const PDP_DEFAULT_VEHICLES = [
    { plate: 'AA-12-BC', model: 'Renault Kangoo', type: 'Van', courier: 'Miguel Santos', maxWeightKg: 650, maxVolM3: 3.3,
      insuranceExpiry: pdpDaysFromToday(200), inspectionExpiry: pdpDaysFromToday(120), status: 'Approved', newDocument: false },
    { plate: '45-XY-90', model: 'Honda PCX 125', type: 'Moto', courier: 'Miguel Santos', maxWeightKg: 25, maxVolM3: 0.1,
      insuranceExpiry: pdpDaysFromToday(12), inspectionExpiry: pdpDaysFromToday(90), status: 'Approved', newDocument: false },
    { plate: 'BK-0007', model: 'Cargo bike', type: 'Bike', courier: 'Miguel Santos', maxWeightKg: 40, maxVolM3: 0.2,
      insuranceExpiry: pdpDaysFromToday(300), inspectionExpiry: pdpDaysFromToday(300), status: 'Pending', newDocument: true }
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

function pdpGetOrders() { return pdpLoad('pdpOrders', PDP_DEFAULT_ORDERS); }
function pdpSaveOrders(orders) { pdpSave('pdpOrders', orders); }

function pdpGetVehicles() { return pdpLoad('pdpVehicles', PDP_DEFAULT_VEHICLES); }
function pdpSaveVehicles(vehicles) { pdpSave('pdpVehicles', vehicles); }

function pdpFindOrder(id) {
    return pdpGetOrders().find(function (o) {
        return o.id.toUpperCase() === id.trim().toUpperCase();
    });
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
     'pendingStaff', 'registeredUsers', 'pdpUsersSeeded', 'currentUser', 'adminProfile'].forEach(function (key) {
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
    { name: 'Carla Cliente',   username: 'client',  email: 'client@pdp.pt',  phone: '912000001', nif: '500000001', password: 'client123',  role: 'client',  status: 'active' },
    { name: 'Miguel Santos',   username: 'courier', email: 'courier@pdp.pt', phone: '912000002', nif: '500000002', password: 'courier123', role: 'courier', status: 'active', approvedBy: 'Sofia Martins' },
    { name: 'Sofia Martins',   username: 'staff',   email: 'staff@pdp.pt',   phone: '912000003', nif: '500000003', password: 'staff123',   role: 'staff',   status: 'active', approvedBy: 'Admin PDP' },
    { name: 'Admin PDP',       username: 'admin',   email: 'admin@pdp.pt',   phone: '912000004', nif: '500000004', password: 'admin123',   role: 'admin',   status: 'active' },
    // waiting for approval, so the admin and staff pages have something to manage
    { name: 'Johan Lindström', username: 'johan',   email: 'johan@pdp.pt',   phone: '912000005', nif: '500000005', password: 'johan1234',  role: 'staff',   status: 'pending' },
    { name: 'Elin Berg',       username: 'elin',    email: 'elin@pdp.pt',    phone: '912000006', nif: '500000006', password: 'elin12345',  role: 'staff',   status: 'pending' },
    { name: 'Pedro Novo',      username: 'pedro',   email: 'pedro.novo@pdp.pt', phone: '912000007', nif: '500000007', password: 'pedro1234', role: 'courier', status: 'pending' }
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

function pdpGetUsers() {
    pdpSeedUsers();
    try {
        const saved = JSON.parse(localStorage.getItem('registeredUsers'));
        if (saved) return saved;
    } catch (e) { /* fall through */ }
    return JSON.parse(JSON.stringify(PDP_DEMO_USERS));
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
