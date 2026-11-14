// =========================================
// Client page (2_client.html)
// Needs data.js (sample data + storage helpers) and Leaflet.
// =========================================

document.addEventListener('DOMContentLoaded', () => {

    // Logged-in client (falls back to the demo client)
    let currentUser = null;
    try { currentUser = JSON.parse(localStorage.getItem('currentUser')); } catch (e) { currentUser = null; }
    const CLIENT = (currentUser && currentUser.role === 'client') ? currentUser.name : 'Carla Cliente';

    // UI Elements
    const btnTracking = document.getElementById('tab-tracking-btn');
    const btnOrders = document.getElementById('tab-orders-btn');
    const btnShipment = document.getElementById('tab-shipment-btn');

    const viewTracking = document.getElementById('view-tracking');
    const viewOrders = document.getElementById('view-orders');
    const viewShipment = document.getElementById('view-shipment');

    const bannerTitle = document.getElementById('banner-title');
    const bannerSubtitle = document.getElementById('banner-subtitle');

    // Map Variables
    const originLatitude = document.getElementById('origin-latitude');
    const originLongitude = document.getElementById('origin-longitude');
    const destinationLatitude = document.getElementById('destination-latitude');
    const destinationLongitude = document.getElementById('destination-longitude');
    let orderMap;
    let originMarker;
    let destinationMarker = null;
    let routeLine = null;

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }


    // --- TAB SWITCHING LOGIC ---
    function switchTab(activeBtn, activeView, title, subtitle) {
        // Reset all buttons & hide all views
        [btnTracking, btnOrders, btnShipment].forEach(btn => btn.classList.remove('active'));
        [viewTracking, viewOrders, viewShipment].forEach(view => view.style.display = 'none');

        // Activate selected
        activeBtn.classList.add('active');
        activeView.style.display = 'block';

        // Update Banner text dynamically
        bannerTitle.textContent = title;
        bannerSubtitle.textContent = subtitle;
    }

    function showTrackingTab() {
        switchTab(btnTracking, viewTracking, 'TRACK YOUR PARCEL', "Follow your parcel's delivery status.");
    }

    btnTracking.addEventListener('click', showTrackingTab);

    btnOrders.addEventListener('click', () => {
        renderOrders();
        switchTab(btnOrders, viewOrders, 'ORDERS', 'Everything you have sent with PDP.');
    });

    btnShipment.addEventListener('click', () => {
        switchTab(btnShipment, viewShipment, 'NEW SHIPMENT', 'Register a product and place a new order.');
        // Must initialize map AFTER the container is visible (display: block)
        setTimeout(initializeOrderMap, 100);
    });


    // --- TRACKING ---
    const trackingForm = document.getElementById('tracking-form');
    const trackingInput = document.getElementById('tracking-input');
    const trackingError = document.getElementById('tracking-input-error');

    const STEPS = ['Order received', 'In progress', 'Delivered'];

    function renderTracking(order) {
        const result = document.getElementById('tracking-result');
        const heading = document.getElementById('tracking-heading');
        const timeline = document.getElementById('tracking-timeline');
        const details = document.getElementById('tracking-details');

        let current = 0;
        if (order.status === PDP_STATUS.IN_PROGRESS) current = 1;
        if (order.status === PDP_STATUS.COMPLETED) current = 3;   // all steps done

        heading.textContent = order.id + ' · ' + (order.status === PDP_STATUS.INITIATED ? 'ORDER RECEIVED' :
            order.status === PDP_STATUS.COMPLETED ? 'DELIVERED' : order.status.toUpperCase());

        timeline.innerHTML = STEPS.map((step, i) => {
            let cls = 'timeline-step';
            if (order.status === PDP_STATUS.CANCELLED && i === 1) cls += ' is-cancelled';
            else if (i < current) cls += ' is-complete';
            else if (i === current) cls += ' is-current';
            return `<li class="${cls}"${i === current ? ' aria-current="step"' : ''}>${step}</li>`;
        }).join('');

        let html = `<p>To ${escapeHtml(order.recipient)} · ${escapeHtml(order.address)}</p>
            <p>From ${order.originLat.toFixed(4)}, ${order.originLng.toFixed(4)} → To ${order.destLat.toFixed(4)}, ${order.destLng.toFixed(4)}</p>
            <p>${escapeHtml(order.product.description)} (${escapeHtml(order.product.category)}) · ${escapeHtml(order.product.weightKg)} kg</p>`;
        if (order.courier) html += `<p>Courier: ${escapeHtml(order.courier)}${order.vehicle ? ' · Vehicle ' + escapeHtml(order.vehicle) : ''}</p>`;
        if (order.attempt > 1 && order.status !== PDP_STATUS.COMPLETED) html += `<p>Delivery attempt ${order.attempt} – an earlier attempt was cancelled.</p>`;
        if (order.status === PDP_STATUS.COMPLETED) html += `<p>Delivered on ${escapeHtml(order.completedAt)} · Proof: ${escapeHtml(order.pod ? order.pod.type : '—')}</p>`;
        details.innerHTML = html;
        result.hidden = false;
    }

    function track(value) {
        const number = value.trim();
        trackingInput.classList.remove('input-error');
        trackingError.textContent = '';

        if (number === '') {
            trackingInput.classList.add('input-error');
            trackingError.textContent = 'Please enter a tracking number.';
            document.getElementById('tracking-result').hidden = true;
            return;
        }
        if (!PDP_TRACKING_PATTERN.test(number)) {
            trackingInput.classList.add('input-error');
            trackingError.textContent = 'Tracking numbers look like RR-1042 (RR- followed by 4 digits).';
            document.getElementById('tracking-result').hidden = true;
            return;
        }
        const order = pdpFindOrder(number);
        if (!order) {
            trackingInput.classList.add('input-error');
            trackingError.textContent = 'No parcel found with number ' + number.toUpperCase() + '.';
            document.getElementById('tracking-result').hidden = true;
            return;
        }
        renderTracking(order);
    }

    trackingForm.addEventListener('submit', event => {
        event.preventDefault();
        track(trackingInput.value);
    });

    trackingInput.addEventListener('input', () => {
        trackingInput.classList.remove('input-error');
        trackingError.textContent = '';
    });


    // --- ORDERS (active + history) ---
    function badgeClass(status) {
        if (status === PDP_STATUS.IN_PROGRESS) return 'st-progress';
        if (status === PDP_STATUS.COMPLETED) return 'st-completed';
        if (status === PDP_STATUS.CANCELLED) return 'st-cancelled';
        return '';
    }

    function orderCard(o) {
        return `
            <div class="order-card">
                <div class="order-info">
                    <strong>${escapeHtml(o.recipient)} — ${escapeHtml(o.id)}</strong>
                    <span>${escapeHtml(o.address)}<br>${o.originLat.toFixed(4)}, ${o.originLng.toFixed(4)} → ${o.destLat.toFixed(4)}, ${o.destLng.toFixed(4)}</span>
                    <span class="status-badge-inline ${badgeClass(o.status)}">${escapeHtml(o.status)}</span>
                </div>
                <button type="button" class="btn-view-status" data-id="${escapeHtml(o.id)}">View status</button>
            </div>`;
    }

    function renderOrders() {
        const mine = pdpGetOrders().filter(o => o.client === CLIENT);
        const active = mine.filter(o => o.status === PDP_STATUS.INITIATED || o.status === PDP_STATUS.IN_PROGRESS);
        const history = mine.filter(o => o.status === PDP_STATUS.COMPLETED || o.status === PDP_STATUS.CANCELLED);

        document.getElementById('active-orders').innerHTML = active.length
            ? active.map(orderCard).join('') : '<p class="empty-text">No active orders.</p>';
        document.getElementById('history-orders').innerHTML = history.length
            ? history.map(orderCard).join('') : '<p class="empty-text">No completed orders yet.</p>';
    }

    // "View status" opens the tracking tab for that order
    viewOrders.addEventListener('click', event => {
        const button = event.target.closest('.btn-view-status');
        if (!button) return;
        trackingInput.value = button.dataset.id;
        showTrackingTab();
        track(button.dataset.id);
    });


    // --- MAP LOGIC ---
    function saveCoordinates(latInput, lngInput, lat, lng) {
        latInput.value = lat.toFixed(6);
        lngInput.value = lng.toFixed(6);
        clearFieldError(latInput);
        clearFieldError(lngInput);
    }

    function readPoint(latInput, lngInput) {
        if (latInput.value.trim() === '' || lngInput.value.trim() === '') return null;
        const lat = Number(latInput.value);
        const lng = Number(lngInput.value);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
        return { lat, lng };
    }

    // Draws the destination marker and the route polyline origin -> destination
    function updateRoute() {
        if (!orderMap) return;
        const origin = readPoint(originLatitude, originLongitude);
        const destination = readPoint(destinationLatitude, destinationLongitude);

        if (destination) {
            if (!destinationMarker) {
                destinationMarker = L.marker([destination.lat, destination.lng], {
                    draggable: true,
                    icon: new L.Icon.Default({ className: 'destination-marker' })
                }).addTo(orderMap).bindPopup('Destination');
                destinationMarker.on('dragend', event => {
                    const p = event.target.getLatLng();
                    saveCoordinates(destinationLatitude, destinationLongitude, p.lat, p.lng);
                    updateRoute();
                    updatePrice();
                });
            } else {
                destinationMarker.setLatLng([destination.lat, destination.lng]);
            }
        } else if (destinationMarker) {
            destinationMarker.remove();
            destinationMarker = null;
        }

        if (routeLine) {
            routeLine.remove();
            routeLine = null;
        }
        if (origin && destination) {
            routeLine = L.polyline([[origin.lat, origin.lng], [destination.lat, destination.lng]],
                { color: '#0284c7', weight: 4, dashArray: '8 8' }).addTo(orderMap);
            orderMap.fitBounds(routeLine.getBounds(), { padding: [40, 40], maxZoom: 15 });
        }
    }

    function initializeOrderMap() {
        if (!window.L) {
            document.getElementById('client-order-map').innerHTML =
                '<p class="empty-text" style="padding:20px;">The map could not load. Check your internet connection – you can still type the coordinates.</p>';
            return;
        }
        if (orderMap) {
            orderMap.invalidateSize(); // Fixes map rendering gray tiles
            return;
        }

        // Default origin: the PDP depot at FEUP
        const origin = { lat: PDP_DEPOT.lat, lng: PDP_DEPOT.lng };
        if (originLatitude.value === '') {
            originLatitude.value = origin.lat;
            originLongitude.value = origin.lng;
        }

        // Load Leaflet Map
        orderMap = L.map('client-order-map').setView([origin.lat, origin.lng], 13);
        pdpAddTileLayer(orderMap);

        // Add draggable marker
        originMarker = L.marker([origin.lat, origin.lng], { draggable: true })
            .addTo(orderMap)
            .bindPopup('Order origin – ' + PDP_DEPOT.name)
            .openPopup();

        function updateOrigin(lat, lng) {
            originMarker.setLatLng([lat, lng]);
            saveCoordinates(originLatitude, originLongitude, lat, lng);
            updateRoute();
            updatePrice();
        }

        function updateDestination(lat, lng) {
            saveCoordinates(destinationLatitude, destinationLongitude, lat, lng);
            updateRoute();
            updatePrice();
        }

        // Map Click Event: sets origin or destination, depending on the radio button
        orderMap.on('click', event => {
            const mode = document.querySelector('input[name="map-mode"]:checked').value;
            if (mode === 'origin') updateOrigin(event.latlng.lat, event.latlng.lng);
            else updateDestination(event.latlng.lat, event.latlng.lng);
        });

        // Marker Drag Event
        originMarker.on('dragend', event => {
            const position = event.target.getLatLng();
            updateOrigin(position.lat, position.lng);
        });

        // Manual Input Sync
        [originLatitude, originLongitude].forEach(input => {
            input.addEventListener('change', () => {
                const p = readPoint(originLatitude, originLongitude);
                if (p) {
                    originMarker.setLatLng([p.lat, p.lng]);
                    orderMap.setView([p.lat, p.lng]);
                    updateRoute();
                }
            });
        });
        [destinationLatitude, destinationLongitude].forEach(input => {
            input.addEventListener('change', updateRoute);
        });
    }


    // --- PRICE ESTIMATE ---
    const BASE_PRICE = 5.0;
    const RATE_PER_KG = 1.5;

    function positiveNumber(id) {
        const value = Number(document.getElementById(id).value);
        return document.getElementById(id).value.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
    }

    function distanceKm(a, b) {
        const R = 6371;
        const toRad = d => d * Math.PI / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }

    function updatePrice() {
        const l = positiveNumber('parcel-length');
        const w = positiveNumber('parcel-width');
        const h = positiveNumber('parcel-height');
        const kg = positiveNumber('parcel-weight');
        const origin = readPoint(originLatitude, originLongitude);
        const destination = readPoint(destinationLatitude, destinationLongitude);

        document.getElementById('price-distance').textContent =
            origin && destination ? distanceKm(origin, destination).toFixed(1) + ' km' : '—';

        if (l && w && h && kg) {
            const chargeable = Math.max(kg, (l * w * h) / 5000);
            document.getElementById('price-weight').textContent = chargeable.toFixed(2) + ' kg';
            document.getElementById('price-total').textContent = '€' + (BASE_PRICE + chargeable * RATE_PER_KG).toFixed(2);
        } else {
            document.getElementById('price-weight').textContent = '—';
            document.getElementById('price-total').textContent = '—';
        }
    }

    ['parcel-length', 'parcel-width', 'parcel-height', 'parcel-weight',
     'origin-latitude', 'origin-longitude', 'destination-latitude', 'destination-longitude'].forEach(id => {
        document.getElementById(id).addEventListener('input', updatePrice);
    });


    // --- SHIPMENT FORM VALIDATION ---
    const shipmentForm = document.getElementById('shipment-form');
    const shipmentMsg = document.getElementById('shipment-msg');

    function setFieldError(input, text) {
        input.classList.add('input-error');
        input.setAttribute('aria-invalid', 'true');
        document.getElementById(input.id + '-error').textContent = text;
    }

    function clearFieldError(input) {
        input.classList.remove('input-error');
        input.removeAttribute('aria-invalid');
        const error = document.getElementById(input.id + '-error');
        if (error) error.textContent = '';
    }

    function showShipmentMessage(type, text) {
        shipmentMsg.className = 'form-msg ' + (type === 'error' ? 'msg-error' : 'msg-success');
        shipmentMsg.textContent = text;
        shipmentMsg.hidden = false;
    }

    shipmentForm.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', () => {
            clearFieldError(input);
            if (shipmentMsg.classList.contains('msg-error')) shipmentMsg.hidden = true;
        });
    });

    function checkText(id, label, minLength) {
        const input = document.getElementById(id);
        const value = input.value.trim();
        if (value === '') {
            setFieldError(input, 'Please enter the ' + label + '.');
            return false;
        }
        if (value.length < minLength) {
            setFieldError(input, 'The ' + label + ' must have at least ' + minLength + ' characters.');
            return false;
        }
        return true;
    }

    function checkNumber(id, label, min, max) {
        const input = document.getElementById(id);
        const raw = input.value.trim();
        const value = Number(raw);
        if (raw === '') {
            setFieldError(input, 'Please enter the ' + label + '.');
            return false;
        }
        if (!Number.isFinite(value)) {
            setFieldError(input, 'The ' + label + ' must be a number.');
            return false;
        }
        if (value < min || value > max) {
            setFieldError(input, 'The ' + label + ' must be between ' + min + ' and ' + max + '.');
            return false;
        }
        return true;
    }

    shipmentForm.addEventListener('submit', event => {
        event.preventDefault();
        shipmentForm.querySelectorAll('input, select').forEach(clearFieldError);

        // Run every check so all problems are shown at once
        const checks = [
            checkText('recipient-name', 'recipient name', 2),
            checkText('delivery-address', 'delivery address', 5),
            checkText('product-description', 'product description', 2),
            checkText('product-category', 'category', 1),
            checkNumber('parcel-length', 'length', 1, 300),
            checkNumber('parcel-width', 'width', 1, 300),
            checkNumber('parcel-height', 'height', 1, 300),
            checkNumber('parcel-weight', 'weight', 0.1, 1000),
            checkNumber('origin-latitude', 'origin latitude', -90, 90),
            checkNumber('origin-longitude', 'origin longitude', -180, 180),
            checkNumber('destination-latitude', 'destination latitude', -90, 90),
            checkNumber('destination-longitude', 'destination longitude', -180, 180)
        ];

        if (checks.every(Boolean)) {
            const o = readPoint(originLatitude, originLongitude);
            const d = readPoint(destinationLatitude, destinationLongitude);
            if (o.lat === d.lat && o.lng === d.lng) {
                setFieldError(destinationLatitude, 'Origin and destination cannot be the same place.');
                checks.push(false);
            }
        }

        if (!checks.every(Boolean)) {
            showShipmentMessage('error', 'Please fix the highlighted fields.');
            const firstInvalid = shipmentForm.querySelector('.input-error');
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        // All valid: create the order (status Initiated) and save it
        const value = id => document.getElementById(id).value.trim();
        const l = Number(value('parcel-length'));
        const w = Number(value('parcel-width'));
        const h = Number(value('parcel-height'));
        const order = {
            id: pdpNextOrderId(),
            client: CLIENT,
            recipient: value('recipient-name'),
            address: value('delivery-address'),
            originLat: Number(value('origin-latitude')),
            originLng: Number(value('origin-longitude')),
            destLat: Number(value('destination-latitude')),
            destLng: Number(value('destination-longitude')),
            product: {
                description: value('product-description'),
                category: value('product-category'),
                weightKg: Number(value('parcel-weight')),
                volumeM3: Number(((l * w * h) / 1000000).toFixed(4))
            },
            status: PDP_STATUS.INITIATED,
            attempt: 1,
            courier: null,
            vehicle: null,
            createdAt: pdpDaysFromToday(0),
            completedAt: null,
            pod: null
        };
        const orders = pdpGetOrders();
        orders.push(order);
        pdpSaveOrders(orders);

        showShipmentMessage('success', 'Shipment created! Your tracking number is ' + order.id + '.');

        // Clear the form but keep the origin (the depot)
        ['recipient-name', 'delivery-address', 'product-description', 'product-category', 'parcel-length',
         'parcel-width', 'parcel-height', 'parcel-weight', 'destination-latitude', 'destination-longitude']
            .forEach(id => { document.getElementById(id).value = ''; });
        updateRoute();
        updatePrice();
    });


    // Opening 2_client.html#RR-1042 tracks that parcel straight away
    if (PDP_TRACKING_PATTERN.test(location.hash.slice(1))) {
        trackingInput.value = location.hash.slice(1).toUpperCase();
        track(trackingInput.value);
    }
});
