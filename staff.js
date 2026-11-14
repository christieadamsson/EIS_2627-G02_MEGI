// =========================================
// Staff panel (5_staff.html) – courier & vehicle approvals
// Connected to the courier side through localStorage:
//   "registeredUsers" -> couriers who registered on 1_login.html (login.js).
//                        They stay 'pending' until staff approves them here.
//   "courierVehicles" -> vehicles registered by couriers, audited by staff.
// =========================================
(function () {
    const DAY = 24 * 60 * 60 * 1000;
    const WARNING_DAYS = 30; // documents expiring within 30 days get a warning

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

    // Date "n" days from today as YYYY-MM-DD, so the sample alerts always work
    function dateFromToday(days) {
        return new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
    }

    // --- 2. Sample test data (only added the first time) ---

    function seedSampleData() {
        if (localStorage.getItem('staffSampleData')) return;

        const users = readList('registeredUsers');
        users.push(
            { name: 'Rui Almeida',   username: 'rui.almeida',   email: 'rui@pdp.pt',      phone: '912345678', nif: '234567890',
              password: 'courier123', role: 'courier', status: 'pending', created_at: new Date().toISOString() },
            { name: 'Beatriz Nunes', username: 'beatriz.nunes', email: 'beatriz@pdp.pt',  phone: '936543210', nif: '245678901',
              password: 'courier123', role: 'courier', status: 'pending', created_at: new Date().toISOString() }
        );
        saveList('registeredUsers', users);

        saveList('courierVehicles', [
            { plate: 'AA-12-BC', model: 'Renault Kangoo', type: 'Van',   courier: 'Miguel Santos',
              max_weight_kg: 650, max_vol_m3: 3.3,
              insurance_expiry_date: dateFromToday(200), inspection_expiry_date: dateFromToday(-5),
              doc_updated: false, status: 'pending' },
            { plate: '45-XZ-78', model: 'Honda PCX 125',  type: 'Moto',  courier: 'Rui Almeida',
              max_weight_kg: 30, max_vol_m3: 0.15,
              insurance_expiry_date: dateFromToday(12), inspection_expiry_date: dateFromToday(300),
              doc_updated: false, status: 'pending' },
            { plate: 'BK-0007',  model: 'Urban Cargo Bike', type: 'Bike', courier: 'Beatriz Nunes',
              max_weight_kg: 40, max_vol_m3: 0.2,
              insurance_expiry_date: dateFromToday(365), inspection_expiry_date: dateFromToday(365),
              doc_updated: true, status: 'pending' },
            { plate: '12-AB-34', model: 'Iveco Daily',    type: 'Truck', courier: 'Miguel Santos',
              max_weight_kg: 3500, max_vol_m3: 12,
              insurance_expiry_date: dateFromToday(-20), inspection_expiry_date: dateFromToday(100),
              doc_updated: false, status: 'approved' }
        ]);

        localStorage.setItem('staffSampleData', 'done');
    }

    // --- 3. Document checks (insurance / inspection) ---

    // Returns 'expired', 'soon' or 'valid' plus the days left
    function checkDocument(dateString) {
        const today = new Date(new Date().toISOString().slice(0, 10));
        const daysLeft = Math.round((new Date(dateString) - today) / DAY);
        if (daysLeft < 0) return { state: 'expired', daysLeft: daysLeft };
        if (daysLeft <= WARNING_DAYS) return { state: 'soon', daysLeft: daysLeft };
        return { state: 'valid', daysLeft: daysLeft };
    }

    function documentCell(dateString) {
        const check = checkDocument(dateString);
        let note = 'Valid';
        if (check.state === 'expired') note = 'Expired ' + Math.abs(check.daysLeft) + ' days ago';
        if (check.state === 'soon') note = 'Expires in ' + check.daysLeft + ' days';
        return `<span class="doc-date doc-${check.state}">${dateString}<small>${note}</small></span>`;
    }

    function hasExpiredDocument(vehicle) {
        return checkDocument(vehicle.insurance_expiry_date).state === 'expired' ||
               checkDocument(vehicle.inspection_expiry_date).state === 'expired';
    }

    function isCourierPending(courierName) {
        return readList('registeredUsers').some(function (u) {
            return u.role === 'courier' && u.status === 'pending' && u.name === courierName;
        });
    }

    // --- 4. Rendering ---

    function renderAlerts() {
        const container = document.getElementById('vehicle-alerts');
        if (!container) return;

        const alerts = [];
        readList('courierVehicles').forEach(function (v) {
            [['Insurance', v.insurance_expiry_date], ['Inspection', v.inspection_expiry_date]].forEach(function (doc) {
                const check = checkDocument(doc[1]);
                if (check.state === 'expired') {
                    alerts.push({ level: 'expired', text: `${doc[0]} of ${v.plate} (${v.courier}) expired on ${doc[1]}.` });
                } else if (check.state === 'soon') {
                    alerts.push({ level: 'soon', text: `${doc[0]} of ${v.plate} (${v.courier}) expires in ${check.daysLeft} days.` });
                }
            });
            if (v.doc_updated) {
                alerts.push({ level: 'updated', text: `New certificate uploaded for ${v.plate} (${v.courier}). Please review.` });
            }
        });

        if (alerts.length === 0) {
            container.innerHTML = '<p class="empty-msg">No alerts. All vehicle documents are valid.</p>';
            return;
        }

        container.innerHTML = alerts.map(function (a) {
            return `<div class="alert alert-${a.level}">${a.text}</div>`;
        }).join('');
    }

    function renderPendingCouriers() {
        const container = document.getElementById('pending-couriers');
        if (!container) return;

        const pending = readList('registeredUsers').filter(function (u) {
            return u.role === 'courier' && u.status === 'pending';
        });
        document.getElementById('pending-couriers-count').textContent = pending.length;

        if (pending.length === 0) {
            container.innerHTML = '<p class="empty-msg">No couriers waiting for approval.</p>';
            return;
        }

        container.innerHTML = pending.map(function (c) {
            return `
                <li class="user-item">
                    <div>
                        <div class="user-name">${c.name}</div>
                        <div class="user-role">${c.email} · Phone ${c.phone} · NIF ${c.nif} · Registered ${c.created_at.slice(0, 10)}</div>
                    </div>
                    <div class="approval-actions">
                        <button class="btn-approve" data-action="approve-courier" data-id="${c.username}">Approve</button>
                        <button class="btn-reject" data-action="reject-courier" data-id="${c.username}">Reject</button>
                    </div>
                </li>`;
        }).join('');
    }

    function renderVehicles() {
        const tbody = document.getElementById('vehicle-table-body');
        if (!tbody) return;

        const vehicles = readList('courierVehicles');
        document.getElementById('pending-vehicles-count').textContent =
            vehicles.filter(function (v) { return v.status === 'pending'; }).length;

        if (vehicles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No vehicles registered.</td></tr>';
            return;
        }

        tbody.innerHTML = vehicles.map(function (v) {
            const expired = hasExpiredDocument(v);
            const courierPending = isCourierPending(v.courier);
            let statusBadge = '<span class="badge-pending">Pending</span>';
            if (v.status === 'approved') statusBadge = '<span class="badge-delivered">Approved</span>';
            if (v.status === 'approved' && expired) statusBadge = '<span class="badge-expired">Blocked – expired</span>';

            let actions = '';
            if (v.status === 'pending') {
                const blockReason = expired ? 'Documents expired' : (courierPending ? 'Approve the courier first' : '');
                actions = `
                    <button class="btn-approve" data-action="approve-vehicle" data-id="${v.plate}"
                        ${blockReason ? 'disabled title="' + blockReason + '"' : ''}>Approve</button>
                    <button class="btn-reject" data-action="reject-vehicle" data-id="${v.plate}">Reject</button>`;
            }
            if (v.doc_updated) {
                actions += `<button class="btn-review" data-action="review-vehicle" data-id="${v.plate}">Mark reviewed</button>`;
            }

            return `
                <tr class="${expired ? 'row-expired' : ''}">
                    <td class="order-id">${v.plate}</td>
                    <td><strong>${v.model}</strong><br><small>${v.type} · ${v.max_weight_kg} kg · ${v.max_vol_m3} m³</small></td>
                    <td>${v.courier}</td>
                    <td>${documentCell(v.insurance_expiry_date)}</td>
                    <td>${documentCell(v.inspection_expiry_date)}</td>
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
        alert(`${courier.name} is approved and can now log in as a courier.`);
    }

    function rejectCourier(username) {
        const users = readList('registeredUsers');
        const index = users.findIndex(function (u) { return u.username === username; });
        const courier = users[index];
        if (!confirm(`Reject ${courier.name}? Their account will be removed.`)) return;
        users.splice(index, 1);
        saveList('registeredUsers', users);

        // Vehicles of a rejected courier cannot be approved either
        saveList('courierVehicles', readList('courierVehicles').filter(function (v) {
            return v.courier !== courier.name;
        }));
    }

    function updateVehicle(plate, change) {
        const vehicles = readList('courierVehicles');
        const vehicle = vehicles.find(function (v) { return v.plate === plate; });
        change(vehicle, vehicles);
        saveList('courierVehicles', vehicles);
        return vehicle;
    }

    function approveVehicle(plate) {
        const vehicle = updateVehicle(plate, function (v) {
            v.status = 'approved';
            v.doc_updated = false;
        });
        alert(`Vehicle ${vehicle.plate} approved. ${vehicle.courier} can now use it for orders.`);
    }

    function rejectVehicle(plate) {
        if (!confirm(`Reject vehicle ${plate}?`)) return;
        saveList('courierVehicles', readList('courierVehicles').filter(function (v) {
            return v.plate !== plate;
        }));
    }

    function reviewVehicle(plate) {
        updateVehicle(plate, function (v) { v.doc_updated = false; });
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

    // --- 6. Start ---

    document.addEventListener('DOMContentLoaded', function () {
        seedSampleData();
        renderStaffPanel();
    });
})();
