// =========================================
// Staff panel (5_staff.html)
// Spec: pending courier & vehicle approvals, with visual alerts
//       for expired insurance / inspection.
//
// Needs data.js. Uses the SAME localStorage data as the other pages:
//   "registeredUsers" -> courier accounts (login.js). A courier registered on
//                        1_login.html stays 'pending' until staff approves them.
//   "pdpVehicles"     -> vehicles of the couriers (data.js). The courier page only
//                        lets a courier use a vehicle staff set to 'Approved'
//                        with valid documents.
//   "pdpOrders"       -> orders (data.js). Approved couriers pick orders themselves
//                        from "Available orders" on 3_courier.html.
// =========================================
(function () {
    const WARNING_DAYS = 30; // documents expiring within 30 days get a warning
    const DEMO_COURIER = 'Miguel Santos'; // courier account built into login.js

    // --- 1. Storage helpers ---

    function readList(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveList(key, list) {
        localStorage.setItem(key, JSON.stringify(list));
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    // --- 2. Courier accounts for the vehicle owners in data.js ---
    // data.js has vehicles for couriers that had no account. They get one here,
    // so every courier on this page is a real account that can log in once approved.
    // João Pereira and Inês Rocha start as 'pending' to have something to approve.

    const SAMPLE_COURIERS = [
        { name: 'Rui Oliveira', username: 'rui.oliveira', email: 'rui.oliveira@pdp.pt', phone: '912000111', nif: '201000111', status: 'active' },
        { name: 'João Pereira', username: 'joao.pereira', email: 'joao.pereira@pdp.pt', phone: '913000222', nif: '202000222', status: 'pending' },
        { name: 'Inês Rocha',   username: 'ines.rocha',   email: 'ines.rocha@pdp.pt',   phone: '914000333', nif: '203000333', status: 'pending' }
    ];

    // Removes test data from earlier versions of this page
    function removeOldSampleData(users, vehicles) {
        const oldUsers = ['rui.almeida', 'beatriz.nunes'];
        const oldPlates = ['45-XZ-78', 'BK-0012'];
        localStorage.removeItem('courierVehicles');
        localStorage.removeItem('staffSampleData');
        return {
            users: users.filter(function (u) { return oldUsers.indexOf(u.username) === -1; }),
            vehicles: vehicles.filter(function (v) { return oldPlates.indexOf(v.plate) === -1; })
        };
    }

    function seedCourierAccounts() {
        const cleaned = removeOldSampleData(readList('registeredUsers'), pdpGetVehicles());
        const users = cleaned.users;
        pdpSaveVehicles(cleaned.vehicles);

        // Only couriers who still own a vehicle get an account
        // (so a rejected courier, whose vehicles are deleted, is not added again)
        SAMPLE_COURIERS.forEach(function (c) {
            const hasAccount = users.some(function (u) { return u.name === c.name; });
            const ownsVehicle = cleaned.vehicles.some(function (v) { return v.courier === c.name; });
            if (!hasAccount && ownsVehicle) {
                users.push(Object.assign({ password: 'courier123', role: 'courier', created_at: new Date().toISOString() }, c));
            }
        });
        saveList('registeredUsers', users);
    }

    // --- 3. Checks ---

    function courierStatus(name) {
        if (name === DEMO_COURIER) return 'active';
        const user = readList('registeredUsers').find(function (u) { return u.role === 'courier' && u.name === name; });
        return user ? user.status : 'unknown';
    }

    function checkDocument(dateString) {
        const daysLeft = pdpDaysUntil(dateString);
        if (daysLeft < 0) return { state: 'expired', daysLeft: daysLeft };
        if (daysLeft <= WARNING_DAYS) return { state: 'soon', daysLeft: daysLeft };
        return { state: 'valid', daysLeft: daysLeft };
    }

    function hasExpiredDocument(v) {
        return checkDocument(v.insuranceExpiry).state === 'expired' ||
               checkDocument(v.inspectionExpiry).state === 'expired';
    }

    function documentCell(dateString) {
        const check = checkDocument(dateString);
        let note = 'Valid';
        if (check.state === 'expired') note = 'Expired ' + Math.abs(check.daysLeft) + ' days ago';
        if (check.state === 'soon') note = 'Expires in ' + check.daysLeft + ' days';
        return `<span class="doc-date doc-${check.state}">${escapeHtml(dateString)}<small>${note}</small></span>`;
    }

    // --- 4. Rendering ---

    function renderAlerts() {
        const container = document.getElementById('vehicle-alerts');
        const alerts = [];

        pdpGetVehicles().forEach(function (v) {
            [['Insurance', v.insuranceExpiry], ['Inspection', v.inspectionExpiry]].forEach(function (doc) {
                const check = checkDocument(doc[1]);
                if (check.state === 'expired') {
                    alerts.push({ level: 'expired', text: `${doc[0]} of ${v.plate} (${v.courier}) expired on ${doc[1]}.` });
                } else if (check.state === 'soon') {
                    alerts.push({ level: 'soon', text: `${doc[0]} of ${v.plate} (${v.courier}) expires in ${check.daysLeft} days.` });
                }
            });
            if (v.newDocument) {
                alerts.push({ level: 'updated', text: `New certificate uploaded for ${v.plate} (${v.courier}). Please review.` });
            }
        });

        if (alerts.length === 0) {
            container.innerHTML = '<p class="empty-msg">No alerts. All vehicle documents are valid.</p>';
            return;
        }
        container.innerHTML = alerts.map(function (a) {
            return `<div class="alert alert-${a.level}">${escapeHtml(a.text)}</div>`;
        }).join('');
    }

    function renderPendingCouriers() {
        const container = document.getElementById('pending-couriers');
        const pending = readList('registeredUsers').filter(function (u) {
            return u.role === 'courier' && u.status === 'pending';
        });
        const available = pdpGetOrders().filter(function (o) {
            return !o.courier && o.status === PDP_STATUS.INITIATED;
        }).length;

        document.getElementById('pending-couriers-count').textContent = pending.length;
        document.getElementById('pending-couriers-info').textContent =
            available + ' order(s) are waiting under "Available orders" on the courier page. ' +
            'A courier can take them once their account and a vehicle are approved.';

        if (pending.length === 0) {
            container.innerHTML = '<p class="empty-msg">No couriers waiting for approval.</p>';
            return;
        }

        container.innerHTML = pending.map(function (c) {
            const vehicles = pdpGetVehicles().filter(function (v) { return v.courier === c.name; });
            const vehicleText = vehicles.length
                ? vehicles.map(function (v) { return v.plate + ' (' + v.type + ')'; }).join(', ')
                : 'no vehicle registered';
            return `
                <li class="user-item">
                    <div>
                        <div class="user-name">${escapeHtml(c.name)}</div>
                        <div class="user-role">${escapeHtml(c.email)} · Phone ${escapeHtml(c.phone)} · NIF ${escapeHtml(c.nif)} · Registered ${escapeHtml((c.created_at || '').slice(0, 10))}</div>
                        <div class="user-role">Vehicles: ${escapeHtml(vehicleText)}</div>
                    </div>
                    <div class="approval-actions">
                        <button class="btn-approve" data-action="approve-courier" data-id="${escapeHtml(c.username)}">Approve</button>
                        <button class="btn-reject" data-action="reject-courier" data-id="${escapeHtml(c.username)}">Reject</button>
                    </div>
                </li>`;
        }).join('');
    }

    function renderVehicles() {
        const tbody = document.getElementById('vehicle-table-body');
        const vehicles = pdpGetVehicles();
        document.getElementById('pending-vehicles-count').textContent =
            vehicles.filter(function (v) { return v.status === 'Pending'; }).length;

        if (vehicles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No vehicles registered.</td></tr>';
            return;
        }

        tbody.innerHTML = vehicles.map(function (v) {
            const expired = hasExpiredDocument(v);
            const courierPending = courierStatus(v.courier) === 'pending';

            let statusBadge = '<span class="badge-pending">Pending</span>';
            if (v.status === 'Approved') statusBadge = '<span class="badge-delivered">Approved</span>';
            if (v.status === 'Approved' && expired) statusBadge = '<span class="badge-expired">Blocked – expired</span>';

            let actions = '';
            if (v.status === 'Pending') {
                const blockReason = expired ? 'Documents expired' : (courierPending ? 'Approve the courier first' : '');
                actions = `
                    <button class="btn-approve" data-action="approve-vehicle" data-id="${escapeHtml(v.plate)}"
                        ${blockReason ? 'disabled title="' + blockReason + '"' : ''}>Approve</button>
                    <button class="btn-reject" data-action="reject-vehicle" data-id="${escapeHtml(v.plate)}">Reject</button>`;
            }
            if (v.newDocument) {
                actions += `<button class="btn-review" data-action="review-vehicle" data-id="${escapeHtml(v.plate)}">Mark reviewed</button>`;
            }

            return `
                <tr class="${expired ? 'row-expired' : ''}">
                    <td class="order-id">${escapeHtml(v.plate)}</td>
                    <td><strong>${escapeHtml(v.model)}</strong><br><small>${escapeHtml(v.type)} · ${v.maxWeightKg} kg · ${v.maxVolM3} m³</small></td>
                    <td>${escapeHtml(v.courier)}${courierPending ? '<br><small>Courier pending</small>' : ''}</td>
                    <td>${documentCell(v.insuranceExpiry)}</td>
                    <td>${documentCell(v.inspectionExpiry)}</td>
                    <td>${statusBadge}</td>
                    <td><div class="approval-actions">${actions}</div></td>
                </tr>`;
        }).join('');
    }

    function renderStaffPanel() {
        renderAlerts();
        renderPendingCouriers();
        renderVehicles();
    }

    // --- 5. Approve / reject actions ---

    function approveCourier(username) {
        const users = readList('registeredUsers');
        const courier = users.find(function (u) { return u.username === username; });
        courier.status = 'active'; // login.js now lets this courier log in
        saveList('registeredUsers', users);
        alert(`${courier.name} is approved and can now log in as a courier. ` +
              `Approve one of their vehicles so they can take available orders.`);
    }

    function rejectCourier(username) {
        const users = readList('registeredUsers');
        const index = users.findIndex(function (u) { return u.username === username; });
        const courier = users[index];
        if (!confirm(`Reject ${courier.name}? Their account and vehicles will be removed.`)) return;
        users.splice(index, 1);
        saveList('registeredUsers', users);
        pdpSaveVehicles(pdpGetVehicles().filter(function (v) { return v.courier !== courier.name; }));
    }

    function updateVehicle(plate, change) {
        const vehicles = pdpGetVehicles();
        const vehicle = vehicles.find(function (v) { return v.plate === plate; });
        change(vehicle);
        pdpSaveVehicles(vehicles);
        return vehicle;
    }

    function approveVehicle(plate) {
        const vehicle = updateVehicle(plate, function (v) {
            v.status = 'Approved';
            v.newDocument = false;
        });
        alert(`Vehicle ${vehicle.plate} approved. ${vehicle.courier} can now select it on the courier page.`);
    }

    function rejectVehicle(plate) {
        if (!confirm(`Reject vehicle ${plate}?`)) return;
        pdpSaveVehicles(pdpGetVehicles().filter(function (v) { return v.plate !== plate; }));
    }

    function reviewVehicle(plate) {
        updateVehicle(plate, function (v) { v.newDocument = false; });
    }

    const actions = {
        'approve-courier': approveCourier,
        'reject-courier': rejectCourier,
        'approve-vehicle': approveVehicle,
        'reject-vehicle': rejectVehicle,
        'review-vehicle': reviewVehicle
    };

    // One click listener for all approval buttons
    document.addEventListener('click', function (e) {
        const button = e.target.closest('[data-action]');
        if (!button || !actions[button.dataset.action]) return;
        actions[button.dataset.action](button.dataset.id);
        renderStaffPanel();
    });

    // Refresh when another tab (e.g. the courier page) changes the data
    window.addEventListener('storage', renderStaffPanel);

    // --- 6. Start ---

    document.addEventListener('DOMContentLoaded', function () {
        seedCourierAccounts();
        renderStaffPanel();
    });
})();
