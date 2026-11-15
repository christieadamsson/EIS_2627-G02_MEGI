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

    // --- 2. No made-up data: everything shown comes from real accounts ---
    // Couriers: registered on 1_login.html (+ the demo courier in login.js).
    // Vehicles: those of real couriers, as seen and registered on 3_courier.html.

    // Removes the made-up couriers/vehicles that earlier versions of this page saved
    function removeOldSampleData() {
        const fakeEmails = ['rui@pdp.pt', 'beatriz@pdp.pt', 'rui.oliveira@pdp.pt', 'joao.pereira@pdp.pt', 'ines.rocha@pdp.pt'];
        const users = readList('registeredUsers');
        const realUsers = users.filter(function (u) { return fakeEmails.indexOf(u.email) === -1; });
        if (realUsers.length !== users.length) saveList('registeredUsers', realUsers);

        const fakePlates = ['45-XZ-78', 'BK-0012'];
        const vehicles = pdpGetVehicles();
        const realVehicles = vehicles.filter(function (v) { return fakePlates.indexOf(v.plate) === -1; });
        if (realVehicles.length !== vehicles.length) pdpSaveVehicles(realVehicles);

        localStorage.removeItem('courierVehicles');
        localStorage.removeItem('staffSampleData');
    }

    // --- 3. Checks ---

    // 'active', 'pending', or 'unknown' when no such courier account exists
    function courierStatus(name) {
        if (name === DEMO_COURIER) return 'active';
        const user = readList('registeredUsers').find(function (u) { return u.role === 'courier' && u.name === name; });
        return user ? user.status : 'unknown';
    }

    // Only vehicles of real courier accounts (hides data.js samples of couriers that do not exist)
    function courierVehicles() {
        return pdpGetVehicles().filter(function (v) { return courierStatus(v.courier) !== 'unknown'; });
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

        courierVehicles().forEach(function (v) {
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
            'A courier can take them after you approve their account and they register a vehicle there for approval below.';

        if (pending.length === 0) {
            container.innerHTML = '<p class="empty-msg">No couriers waiting for approval.</p>';
            return;
        }

        container.innerHTML = pending.map(function (c) {
            return `
                <li class="user-item">
                    <div>
                        <div class="user-name">${escapeHtml(c.name)}</div>
                        <div class="user-role">${escapeHtml(c.email)} · Phone ${escapeHtml(c.phone)} · NIF ${escapeHtml(c.nif)} · Registered ${escapeHtml((c.created_at || '').slice(0, 10))}</div>
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
        const vehicles = courierVehicles();
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
                    <td><strong>${escapeHtml(v.model)}</strong><br><small>${escapeHtml(v.type)} · ${escapeHtml(v.maxWeightKg)} kg · ${escapeHtml(v.maxVolM3)} m³</small>
                        ${v.certificateFile ? '<br><small>Certificate: ' + escapeHtml(v.certificateFile) + '</small>' : ''}</td>
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
              `They can now register a vehicle on the courier page; it will appear below for approval.`);
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
        removeOldSampleData();
        renderStaffPanel();
    });
})();
