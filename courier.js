// =========================================
// Courier page (3_courier.html) – today's route
// =========================================

// Today's stops. Status is one of: 'pending', 'transit', 'delivered'
const stops = [
    { id: 'RR-1042', name: 'Ana Silva',   address: 'Rua Augusta 120, Lisboa',     status: 'transit' },
    { id: 'RR-1039', name: 'Marta Reis',  address: 'Rua do Carmo 8, Lisboa',      status: 'pending' },
    { id: 'RR-1036', name: 'Pedro Lopes', address: 'Praça do Comércio 2, Lisboa', status: 'delivered' }
];

const statusLabels = {
    pending: 'Pending',
    transit: 'In transit',
    delivered: 'Delivered'
};

const stopsGrid = document.getElementById('stops-grid');
const message = document.getElementById('courier-msg');
let messageTimer;

// Build one card per stop
function renderStops() {
    stopsGrid.innerHTML = '';

    stops.forEach(function (stop) {
        const card = document.createElement('article');
        card.className = 'stop-card';
        card.innerHTML = `
            <div class="stop-info">
                <p class="stop-id">${stop.id}</p>
                <h4 class="stop-name">${stop.name}</h4>
                <p class="stop-address">${stop.address}</p>
                <span class="status-badge status-${stop.status}">${statusLabels[stop.status]}</span>
            </div>`;

        // Only stops that are not delivered yet get a button
        if (stop.status !== 'delivered') {
            const button = document.createElement('button');
            button.className = 'btn-deliver';
            button.textContent = 'Mark delivered';
            button.addEventListener('click', function () {
                markDelivered(stop.id);
            });
            card.appendChild(button);
        }

        stopsGrid.appendChild(card);
    });
}

// Count delivered / remaining stops and update the summary cards
function updateStats() {
    const delivered = stops.filter(function (stop) {
        return stop.status === 'delivered';
    }).length;

    document.getElementById('stat-total').textContent = stops.length;
    document.getElementById('stat-delivered').textContent = delivered;
    document.getElementById('stat-remaining').textContent = stops.length - delivered;

    return stops.length - delivered;
}

// Delivered stops are shown as dark dots on the map
function updateMap() {
    stops.forEach(function (stop) {
        const dot = document.querySelector(`.map-stop[data-stop="${stop.id}"]`);
        if (dot) {
            dot.classList.toggle('done', stop.status === 'delivered');
        }
    });
}

function showMessage(text) {
    message.textContent = text;
    message.hidden = false;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(function () {
        message.hidden = true;
    }, 3000);
}

function markDelivered(id) {
    const stop = stops.find(function (s) {
        return s.id === id;
    });
    stop.status = 'delivered';

    const remaining = render();
    if (remaining === 0) {
        showMessage('All stops delivered. Route complete.');
    } else {
        showMessage(`${stop.id} marked as delivered.`);
    }
}

function render() {
    renderStops();
    updateMap();
    return updateStats();
}

render();
