// =========================================
// Courier page (3_courier.html) – navigation cockpit
// Needs data.js (sample data + storage helpers) and Leaflet.
//
// Rules from the specification:
// - the courier picks an approved vehicle for the route
// - one active route at a time; a route can hold one or more orders
// - status flow: Initiated -> In Progress -> Completed / Cancelled
// - completing needs a proof of delivery (canvas signature or photo)
// - a cancelled order goes back to the list of available orders
// =========================================

// Logged-in courier (falls back to the demo courier)
let currentUser = null;
try { currentUser = JSON.parse(localStorage.getItem('currentUser')); } catch (e) { currentUser = null; }
const ME = (currentUser && currentUser.role === 'courier') ? currentUser.name : 'Miguel Santos';
document.getElementById('courier-name').textContent = ME;

const message = document.getElementById('courier-msg');
const vehicleSelect = document.getElementById('vehicle-select');
let messageTimer;
let map = null;
let mapLayer = null;


// --- 1. Helpers ---

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

function statusClass(status) {
    if (status === PDP_STATUS.IN_PROGRESS) return 'status-progress';
    if (status === PDP_STATUS.COMPLETED) return 'status-completed';
    if (status === PDP_STATUS.CANCELLED) return 'status-cancelled';
    return 'status-initiated';
}

function showMessage(type, text) {
    message.className = 'courier-msg ' + (type === 'error' ? 'msg-error' : 'msg-success');
    message.textContent = text;
    message.hidden = false;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(function () { message.hidden = true; }, 5000);
    message.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function myVehicles() {
    return pdpGetVehicles().filter(function (v) { return v.courier === ME; });
}

// A vehicle can be used only if staff approved it and its documents are valid
function vehicleProblem(v) {
    if (v.status !== 'Approved') return 'waiting for staff approval';
    if (pdpDaysUntil(v.insuranceExpiry) < 0) return 'insurance expired';
    if (pdpDaysUntil(v.inspectionExpiry) < 0) return 'inspection expired';
    return '';
}

function selectedVehicle() {
    return myVehicles().find(function (v) { return v.plate === vehicleSelect.value; }) || null;
}

function routeOrders(orders) {
    return orders.filter(function (o) {
        return o.courier === ME && (o.status === PDP_STATUS.INITIATED || o.status === PDP_STATUS.IN_PROGRESS);
    });
}

function availableOrders(orders) {
    return orders.filter(function (o) { return !o.courier && o.status === PDP_STATUS.INITIATED; });
}

function completedOrders(orders) {
    return orders.filter(function (o) { return o.courier === ME && o.status === PDP_STATUS.COMPLETED; });
}

function routeWeight(route) {
    return route.reduce(function (sum, o) { return sum + Number(o.product.weightKg); }, 0);
}

function updateOrder(id, changes) {
    const orders = pdpGetOrders();
    const order = orders.find(function (o) { return o.id === id; });
    Object.assign(order, changes);
    pdpSaveOrders(orders);
    return order;
}


// --- 2. Rendering ---

function renderVehicleSelect(route, started) {
    const vehicles = myVehicles();
    const saved = localStorage.getItem('pdpCourierVehicle');
    const routeVehicle = started ? route[0].vehicle : null;

    vehicleSelect.innerHTML = '';
    if (vehicles.length === 0) {
        vehicleSelect.innerHTML = '<option value="">No vehicles registered</option>';
    }

    vehicles.forEach(function (v) {
        const problem = vehicleProblem(v);
        const option = document.createElement('option');
        option.value = v.plate;
        option.textContent = v.plate + ' – ' + v.type + ', ' + v.model + ' (max ' + v.maxWeightKg + ' kg)' +
            (problem ? ' – ' + problem : '');
        option.disabled = problem !== '';
        vehicleSelect.appendChild(option);
    });

    // Keep the vehicle of a running route, else the saved choice, else the first usable one
    const usable = vehicles.filter(function (v) { return vehicleProblem(v) === ''; });
    let value = routeVehicle || saved;
    if (!routeVehicle && !usable.some(function (v) { return v.plate === value; })) {
        value = usable.length ? usable[0].plate : '';
    }
    vehicleSelect.value = value || '';
    vehicleSelect.disabled = started;   // no vehicle change during a route
}

function renderLoad(route) {
    const vehicle = selectedVehicle();
    const weight = routeWeight(route);
    const max = vehicle ? vehicle.maxWeightKg : 0;
    const percent = max ? Math.min(100, (weight / max) * 100) : 0;

    document.getElementById('load-label').textContent = weight.toFixed(1) + ' / ' + max + ' kg';
    const fill = document.getElementById('load-fill');
    fill.style.width = percent + '%';
    fill.classList.toggle('over', max > 0 && weight > max);
}

function orderRow(order, buttonsHtml) {
    return `
        <div class="order-row">
            <div>
                <div class="order-row-id">${escapeHtml(order.id)}</div>
                <div class="order-row-name">${escapeHtml(order.recipient)}</div>
                <div class="order-row-meta">${escapeHtml(order.address)} · ${escapeHtml(order.product.weightKg)} kg${order.attempt > 1 ? ' · attempt ' + order.attempt : ''}</div>
                <span class="status-badge ${statusClass(order.status)}">${escapeHtml(order.status)}</span>
            </div>
            <div class="order-row-actions">${buttonsHtml}</div>
        </div>`;
}

function renderRoute(route, started) {
    const list = document.getElementById('route-list');
    const badge = document.getElementById('route-status');
    const startButton = document.getElementById('btn-start-route');

    if (route.length === 0) {
        list.innerHTML = '<p class="empty-text">Your route is empty. Add orders from the list below.</p>';
    } else {
        list.innerHTML = route.map(function (o) {
            const buttons = o.status === PDP_STATUS.IN_PROGRESS
                ? `<button type="button" class="btn-primary" data-action="complete" data-id="${o.id}">Complete</button>
                   <button type="button" class="btn-danger" data-action="cancel" data-id="${o.id}">Cancel</button>`
                : `<button type="button" class="btn-secondary" data-action="remove" data-id="${o.id}">Remove</button>`;
            return orderRow(o, buttons);
        }).join('');
    }

    badge.textContent = route.length === 0 ? 'No active route' : (started ? 'In Progress' : 'Being planned');
    badge.className = 'status-badge ' + (started ? 'status-progress' : 'status-initiated');
    startButton.hidden = started || route.length === 0;
}

function renderAvailable(available, started) {
    const list = document.getElementById('available-list');
    if (available.length === 0) {
        list.innerHTML = '<p class="empty-text">No orders waiting at the moment.</p>';
        return;
    }
    list.innerHTML = available.map(function (o) {
        return orderRow(o, `<button type="button" class="btn-secondary" data-action="add" data-id="${o.id}"
            ${started ? 'disabled title="Finish your current route first"' : ''}>Add to route</button>`);
    }).join('');
}

function renderCompleted(completed) {
    const body = document.getElementById('completed-body');
    if (completed.length === 0) {
        body.innerHTML = '<tr><td colspan="6" class="empty-text">No completed orders yet.</td></tr>';
        return;
    }
    body.innerHTML = completed.map(function (o) {
        return `<tr>
            <td><strong>${escapeHtml(o.id)}</strong></td>
            <td>${escapeHtml(o.recipient)}</td>
            <td>${escapeHtml(o.address)}</td>
            <td>${escapeHtml(o.completedAt || '')}</td>
            <td>${escapeHtml(o.vehicle || '')}</td>
            <td><span class="status-badge status-completed">${escapeHtml(o.pod ? o.pod.type : '')}</span></td>
        </tr>`;
    }).join('');
}

function renderMap(route) {
    const container = document.getElementById('courier-map');
    if (!window.L) {
        container.innerHTML = '<p class="empty-text" style="padding:20px;">The map could not load. Check your internet connection.</p>';
        return;
    }

    if (!map) {
        map = L.map('courier-map').setView([PDP_DEPOT.lat, PDP_DEPOT.lng], 14);
        pdpAddTileLayer(map);
    }

    if (mapLayer) mapLayer.remove();
    mapLayer = L.layerGroup().addTo(map);

    // Depot marker (FEUP)
    const depot = [PDP_DEPOT.lat, PDP_DEPOT.lng];
    L.marker(depot).addTo(mapLayer).bindPopup('<strong>' + PDP_DEPOT.name + '</strong><br>Start of every route');

    // Orders already delivered by this courier, in green
    completedOrders(pdpGetOrders()).forEach(function (o) {
        L.circleMarker([o.destLat, o.destLng], { radius: 6, color: '#ffffff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 })
            .addTo(mapLayer)
            .bindPopup(escapeHtml(o.id) + ' – delivered');
    });

    // Route: depot -> each stop, drawn as a polyline
    const points = [depot];
    route.forEach(function (o) { points.push([o.destLat, o.destLng]); });
    if (points.length > 1) {
        L.polyline(points, { color: '#0284c7', weight: 4, dashArray: '8 8' }).addTo(mapLayer);
    }
    route.forEach(function (o, index) {
        L.circleMarker([o.destLat, o.destLng], { radius: 9, color: '#ffffff', weight: 2, fillColor: '#101923', fillOpacity: 1 })
            .addTo(mapLayer)
            .bindPopup('<strong>Stop ' + (index + 1) + ': ' + escapeHtml(o.id) + '</strong><br>' +
                       escapeHtml(o.recipient) + '<br>' + escapeHtml(o.address));
    });

    if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    } else {
        map.setView(depot, 14);
    }
    setTimeout(function () { map.invalidateSize(); }, 100);
}

function render() {
    const orders = pdpGetOrders();
    const route = routeOrders(orders);
    const started = route.some(function (o) { return o.status === PDP_STATUS.IN_PROGRESS; });
    const available = availableOrders(orders);
    const completed = completedOrders(orders);

    document.getElementById('stat-route').textContent = route.length;
    document.getElementById('stat-available').textContent = available.length;
    document.getElementById('stat-completed').textContent = completed.length;

    renderVehicleSelect(route, started);
    renderMyVehicles(route, started);
    renderLoad(route);
    renderRoute(route, started);
    renderAvailable(available, started);
    renderCompleted(completed);
    renderMap(route);
}


// --- 3. Actions ---

function addToRoute(id) {
    const orders = pdpGetOrders();
    const route = routeOrders(orders);
    const order = orders.find(function (o) { return o.id === id; });
    const vehicle = selectedVehicle();

    if (route.some(function (o) { return o.status === PDP_STATUS.IN_PROGRESS; })) {
        showMessage('error', 'Finish your current route first – only one active route at a time.');
        return;
    }
    if (!vehicle) {
        showMessage('error', 'Please select an approved vehicle first.');
        return;
    }
    if (routeWeight(route) + Number(order.product.weightKg) > vehicle.maxWeightKg) {
        showMessage('error', order.id + ' does not fit: ' + vehicle.plate + ' (' + vehicle.type +
            ') carries at most ' + vehicle.maxWeightKg + ' kg.');
        return;
    }
    updateOrder(id, { courier: ME });
    showMessage('success', id + ' added to your route.');
    render();
}

function removeFromRoute(id) {
    updateOrder(id, { courier: null });
    showMessage('success', id + ' removed from your route.');
    render();
}

function startRoute() {
    const route = routeOrders(pdpGetOrders());
    const vehicle = selectedVehicle();

    if (route.length === 0) {
        showMessage('error', 'Add at least one order before starting the route.');
        return;
    }
    if (!vehicle) {
        showMessage('error', 'Please select an approved vehicle before starting the route.');
        return;
    }
    if (routeWeight(route) > vehicle.maxWeightKg) {
        showMessage('error', 'The route is too heavy for ' + vehicle.plate + '. Remove an order or choose a bigger vehicle.');
        return;
    }

    route.forEach(function (o) {
        updateOrder(o.id, { status: PDP_STATUS.IN_PROGRESS, vehicle: vehicle.plate });
    });
    showMessage('success', 'Route started with ' + route.length + ' order(s) using ' + vehicle.plate + '.');
    render();
}

function cancelOrder(id) {
    if (!confirm('Cancel delivery of ' + id + '? The order goes back to the list of available orders.')) return;
    const order = pdpGetOrders().find(function (o) { return o.id === id; });
    // This attempt is cancelled; the order returns to the list for a new attempt
    updateOrder(id, { status: PDP_STATUS.INITIATED, courier: null, vehicle: null, attempt: order.attempt + 1 });
    showMessage('success', id + ' was cancelled and returned to the available orders (attempt ' + (order.attempt + 1) + ').');
    render();
}


// --- 4. Proof of delivery (signature on a canvas or photo upload) ---

const overlay = document.getElementById('pod-overlay');
const canvas = document.getElementById('signature-canvas');
const ctx = canvas.getContext('2d');
const photoInput = document.getElementById('pod-photo');
const photoPreview = document.getElementById('pod-photo-preview');
const podError = document.getElementById('pod-error');
let podOrderId = null;
let podMode = 'Signature';
let hasSignature = false;
let drawing = false;

function setPodMode(mode) {
    podMode = mode;
    document.getElementById('pod-tab-signature').classList.toggle('active', mode === 'Signature');
    document.getElementById('pod-tab-photo').classList.toggle('active', mode === 'Photo');
    document.getElementById('pod-signature-panel').hidden = mode !== 'Signature';
    document.getElementById('pod-photo-panel').hidden = mode !== 'Photo';
    podError.textContent = '';
}

function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSignature = false;
}

function openPod(id) {
    const order = pdpGetOrders().find(function (o) { return o.id === id; });
    podOrderId = id;
    document.getElementById('pod-order-info').textContent = order.id + ' · ' + order.recipient + ' · ' + order.address;
    clearSignature();
    photoInput.value = '';
    photoPreview.hidden = true;
    setPodMode('Signature');
    overlay.hidden = false;
}

function closePod() {
    overlay.hidden = true;
    podOrderId = null;
}

function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
}

canvas.addEventListener('pointerdown', function (e) {
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
});

canvas.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    const p = canvasPoint(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasSignature = true;
    podError.textContent = '';
});

['pointerup', 'pointercancel'].forEach(function (type) {
    canvas.addEventListener(type, function () { drawing = false; });
});

photoInput.addEventListener('change', function () {
    const file = photoInput.files[0];
    podError.textContent = '';
    if (!file) {
        photoPreview.hidden = true;
        return;
    }
    if (!file.type.startsWith('image/')) {
        podError.textContent = 'Please choose an image file (JPG or PNG).';
        photoInput.value = '';
        photoPreview.hidden = true;
        return;
    }
    photoPreview.src = URL.createObjectURL(file);
    photoPreview.hidden = false;
});

function submitPod() {
    let pod;
    if (podMode === 'Signature') {
        if (!hasSignature) {
            podError.textContent = 'Please ask the recipient to sign before submitting.';
            return;
        }
        pod = { type: 'Signature' };
    } else {
        if (!photoInput.files[0]) {
            podError.textContent = 'Please choose a delivery photo before submitting.';
            return;
        }
        pod = { type: 'Photo', fileName: photoInput.files[0].name };   // upload is simulated: only the name is kept
    }

    const id = podOrderId;
    updateOrder(id, { status: PDP_STATUS.COMPLETED, completedAt: pdpDaysFromToday(0), pod: pod });
    closePod();

    const remaining = routeOrders(pdpGetOrders()).length;
    showMessage('success', id + ' completed with ' + pod.type.toLowerCase() + ' proof.' +
        (remaining === 0 ? ' Route finished – you can plan a new one.' : ''));
    render();
}

document.getElementById('pod-tab-signature').addEventListener('click', function () { setPodMode('Signature'); });
document.getElementById('pod-tab-photo').addEventListener('click', function () { setPodMode('Photo'); });
document.getElementById('btn-clear-signature').addEventListener('click', clearSignature);
document.getElementById('btn-pod-cancel').addEventListener('click', closePod);
document.getElementById('btn-pod-submit').addEventListener('click', submitPod);
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) closePod();
});


// --- 4b. My vehicles: register a vehicle / renew documents ---
// Everything sent here gets status 'Pending' in pdpVehicles (data.js) and shows up
// under "Vehicle Approvals" and "Document Alerts" on the staff page (5_staff.html).
// The vehicle can only be used for a route after staff approves it.

const vehicleForm = document.getElementById('vehicle-form');
const vfError = document.getElementById('vf-error');
let renewPlate = null;   // null = registering a new vehicle, else the plate being renewed

function documentText(label, dateString) {
    const days = pdpDaysUntil(dateString);
    if (days < 0) return `<span class="doc-expired-text">${label} expired ${escapeHtml(dateString)}</span>`;
    if (days <= 30) return `<span class="doc-warning">${label} expires in ${days} days</span>`;
    return `${label} until ${escapeHtml(dateString)}`;
}

function vehicleBadge(v) {
    if (v.status !== 'Approved') {
        return '<span class="status-badge status-initiated">Waiting for staff</span>';
    }
    if (vehicleProblem(v)) return '<span class="status-badge status-cancelled">Blocked – documents expired</span>';
    return '<span class="status-badge status-completed">Approved</span>';
}

function renderMyVehicles(route, started) {
    const list = document.getElementById('my-vehicles-list');
    const vehicles = myVehicles();
    const routeVehicle = started ? route[0].vehicle : null;

    if (vehicles.length === 0) {
        list.innerHTML = '<p class="empty-text">You have no vehicles yet. Register one to start taking orders.</p>';
        return;
    }

    list.innerHTML = vehicles.map(function (v) {
        const inUse = v.plate === routeVehicle;
        return `
            <div class="order-row">
                <div>
                    <div class="order-row-id">${escapeHtml(v.plate)}</div>
                    <div class="order-row-name">${escapeHtml(v.model)}</div>
                    <div class="order-row-meta">${escapeHtml(v.type)} · max ${escapeHtml(v.maxWeightKg)} kg · ${escapeHtml(v.maxVolM3)} m³</div>
                    <div class="order-row-meta">${documentText('Insurance', v.insuranceExpiry)} · ${documentText('Inspection', v.inspectionExpiry)}</div>
                    ${vehicleBadge(v)}
                </div>
                <div class="order-row-actions">
                    <button type="button" class="btn-secondary" data-vehicle-action="renew" data-plate="${escapeHtml(v.plate)}"
                        ${inUse ? 'disabled title="Finish your current route first"' : ''}>Renew documents</button>
                </div>
            </div>`;
    }).join('');
}

function openVehicleForm(plate) {
    renewPlate = plate || null;
    vehicleForm.reset();
    vfError.textContent = '';

    const today = pdpDaysFromToday(0);
    document.getElementById('vf-insurance').min = today;
    document.getElementById('vf-inspection').min = today;

    document.getElementById('vf-details').hidden = renewPlate !== null;
    document.getElementById('vehicle-form-title').textContent =
        renewPlate ? 'Renew documents – ' + renewPlate : 'Register a vehicle';

    if (renewPlate) {
        const v = myVehicles().find(function (x) { return x.plate === renewPlate; });
        document.getElementById('vf-insurance').value = v.insuranceExpiry;
        document.getElementById('vf-inspection').value = v.inspectionExpiry;
    }

    vehicleForm.hidden = false;
    vehicleForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeVehicleForm() {
    vehicleForm.hidden = true;
    renewPlate = null;
}

function submitVehicleForm(e) {
    e.preventDefault();
    vfError.textContent = '';

    function fail(text) { vfError.textContent = text; }

    const insurance = document.getElementById('vf-insurance').value;
    const inspection = document.getElementById('vf-inspection').value;
    const file = document.getElementById('vf-certificate').files[0];

    const vehicles = pdpGetVehicles();
    let vehicle;

    if (renewPlate === null) {
        const plate = document.getElementById('vf-plate').value.trim().toUpperCase();
        const model = document.getElementById('vf-model').value.trim();
        const weight = Number(document.getElementById('vf-weight').value);
        const volume = Number(document.getElementById('vf-volume').value);

        if (!/^[A-Z0-9-]{5,10}$/.test(plate)) return fail('Please enter a valid plate (letters, digits and "-").');
        if (vehicles.some(function (v) { return v.plate === plate; })) return fail('A vehicle with plate ' + plate + ' is already registered.');
        if (model.length < 2) return fail('Please enter the vehicle model.');
        if (!(weight > 0)) return fail('Please enter the maximum weight in kg.');
        if (!(volume > 0)) return fail('Please enter the maximum volume in m³.');

        vehicle = { plate: plate, model: model, type: document.getElementById('vf-type').value, courier: ME,
                    maxWeightKg: weight, maxVolM3: volume };
        vehicles.push(vehicle);
    } else {
        vehicle = vehicles.find(function (v) { return v.plate === renewPlate; });
    }

    if (!insurance || !inspection) return fail('Please enter both expiry dates.');
    if (pdpDaysUntil(insurance) < 0 || pdpDaysUntil(inspection) < 0) return fail('The documents must still be valid (date today or later).');
    if (!file) return fail('Please attach the certificate.');

    // Staff has to (re)approve the vehicle before it can be used
    Object.assign(vehicle, {
        insuranceExpiry: insurance,
        inspectionExpiry: inspection,
        certificateFile: file.name,     // upload is simulated: only the name is kept
        status: 'Pending',
        newDocument: true
    });
    pdpSaveVehicles(vehicles);

    showMessage('success', (renewPlate ? 'New documents for ' : 'Vehicle ') + vehicle.plate +
        ' sent to staff for approval. You can use it once it is approved.');
    closeVehicleForm();
    render();
}

document.getElementById('btn-new-vehicle').addEventListener('click', function () { openVehicleForm(null); });
document.getElementById('btn-vehicle-cancel').addEventListener('click', closeVehicleForm);
vehicleForm.addEventListener('submit', submitVehicleForm);
document.getElementById('my-vehicles-list').addEventListener('click', function (e) {
    const button = e.target.closest('button[data-vehicle-action="renew"]');
    if (button) openVehicleForm(button.dataset.plate);
});

// Staff approves vehicles on 5_staff.html: refresh when that happens in another tab
window.addEventListener('storage', function (e) {
    if (e.key === 'pdpVehicles' || e.key === 'pdpOrders') render();
});


// --- 5. Event wiring ---

// One listener for all order buttons (they are re-created on every render)
document.querySelector('.courier-section').addEventListener('click', function (e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === 'add') addToRoute(id);
    if (button.dataset.action === 'remove') removeFromRoute(id);
    if (button.dataset.action === 'complete') openPod(id);
    if (button.dataset.action === 'cancel') cancelOrder(id);
});

vehicleSelect.addEventListener('change', function () {
    localStorage.setItem('pdpCourierVehicle', vehicleSelect.value);
    renderLoad(routeOrders(pdpGetOrders()));
});

document.getElementById('btn-start-route').addEventListener('click', startRoute);

document.getElementById('btn-reset').addEventListener('click', function () {
    if (confirm('Reset all sample data (orders, vehicles, registrations) on every page?')) {
        pdpResetData();
        location.reload();
    }
});

render();
