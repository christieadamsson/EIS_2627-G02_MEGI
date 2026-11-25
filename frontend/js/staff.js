// =========================================
// Staff panel (5_staff.html)
// Spec: pending courier & vehicle approvals, with visual alerts
//       for expired insurance / inspection.
//
// Needs data.js. Shares all data and rules with the courier page (3_courier.html):
//   "registeredUsers" -> all accounts (data.js). Staff manage the COURIERS:
//                        approve / reject new ones, edit, disable / enable, remove
//                        (shared component in people.js).
//   "pdpVehicles"     -> vehicles couriers register / renew on the courier page.
//                        Staff sets them to 'Approved' or 'Rejected' (with a reason
//                        the courier sees in "My vehicles").
//   "pdpOrders"       -> orders. Approved couriers pick them from "Available orders".
// Shared rules (document states, usable vehicles, courier status) live in data.js.
// =========================================
(function () {
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

    // Removes the made-up couriers that earlier versions of this page saved
    function removeOldSampleData() {
        const fakeEmails = ['rui@pdp.pt', 'beatriz@pdp.pt', 'rui.oliveira@pdp.pt', 'joao.pereira@pdp.pt', 'ines.rocha@pdp.pt'];
        const users = readList('registeredUsers');
        const realUsers = users.filter(function (u) { return fakeEmails.indexOf(u.email) === -1; });
        if (realUsers.length !== users.length) saveList('registeredUsers', realUsers);
        localStorage.removeItem('courierVehicles');
        localStorage.removeItem('staffSampleData');
    }

    // --- 2. Small helpers on top of the shared rules in data.js ---

    // Number of orders this vehicle is carrying on a route that is running now
    function ordersOnRoute(v) {
        return pdpActiveRouteOrders(v.courier).filter(function (o) { return o.vehicle === v.plate; }).length;
    }

    function documentCell(dateString) {
        const doc = pdpDocState(dateString);
        let note = 'Valid';
        if (doc.state === 'expired') note = 'Expired ' + Math.abs(doc.daysLeft) + ' days ago';
        if (doc.state === 'soon') note = 'Expires in ' + doc.daysLeft + ' days';
        return `<span class="doc-date doc-${doc.state}">${escapeHtml(dateString)}<small>${note}</small></span>`;
    }

    // --- 3. Rendering ---

    function renderAlerts() {
        const container = document.getElementById('vehicle-alerts');
        const alerts = [];

        pdpCourierVehicles().forEach(function (v) {
            if (v.status === PDP_VEHICLE.REJECTED) return;   // waiting for the courier, nothing to check
            [['Insurance', v.insuranceExpiry], ['Inspection', v.inspectionExpiry]].forEach(function (doc) {
                const check = pdpDocState(doc[1]);
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

    // Pending + approved couriers are rendered by people.js; this adds the info line above them
    function renderCourierInfo() {
        const available = pdpGetOrders().filter(function (o) {
            return !o.courier && o.status === PDP_STATUS.INITIATED;
        }).length;
        document.getElementById('pending-couriers-info').textContent =
            available + ' order(s) are waiting under "Available orders" on the courier page. ' +
            'A courier can take them after you approve their account and they register a vehicle there for approval below.';
    }

    // Extra line under each courier in the "Couriers" list
    function courierDetails(user) {
        const vehicles = pdpGetVehicles().filter(function (v) { return v.courier === user.name; });
        const approved = vehicles.filter(function (v) { return v.status === PDP_VEHICLE.APPROVED; }).length;
        const onRoute = pdpActiveRouteOrders(user.name).length;
        const delivered = pdpGetOrders().filter(function (o) {
            return o.courier === user.name && o.status === PDP_STATUS.COMPLETED;
        }).length;
        return vehicles.length + ' vehicle(s), ' + approved + ' approved · ' +
            (onRoute ? onRoute + ' order(s) on route now' : 'not on a route') + ' · ' + delivered + ' delivered';
    }

    function vehicleStatusCell(v, expired, onRoute) {
        let badge = '<span class="badge-pending">Pending</span>';
        if (v.status === PDP_VEHICLE.APPROVED) badge = '<span class="badge-delivered">Approved</span>';
        if (v.status === PDP_VEHICLE.APPROVED && expired) badge = '<span class="badge-expired">Blocked – expired</span>';
        if (v.status === PDP_VEHICLE.REJECTED) {
            badge = '<span class="badge-expired">Rejected</span>' +
                (v.rejectReason ? '<br><small>' + escapeHtml(v.rejectReason) + '</small>' : '') +
                '<br><small>Waiting for the courier to resubmit</small>';
        }
        if (onRoute) badge += `<br><small>On a route now (${onRoute} order${onRoute > 1 ? 's' : ''})</small>`;
        return badge;
    }

    function renderVehicles() {
        const tbody = document.getElementById('vehicle-table-body');
        const vehicles = pdpCourierVehicles();
        document.getElementById('pending-vehicles-count').textContent =
            vehicles.filter(function (v) { return v.status === PDP_VEHICLE.PENDING; }).length;

        if (vehicles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">No vehicles registered.</td></tr>';
            return;
        }

        tbody.innerHTML = vehicles.map(function (v) {
            const expired = pdpHasExpiredDocument(v);
            const courierStatus = pdpCourierStatus(v.courier);
            const courierPending = courierStatus === 'pending';
            const courierDisabled = courierStatus === 'disabled';
            const onRoute = ordersOnRoute(v);

            let actions = '';
            if (v.status === PDP_VEHICLE.PENDING) {
                const approveBlock = expired ? 'Documents expired' : (courierPending ? 'Approve the courier first' :
                    (courierDisabled ? 'Courier is disabled' : ''));
                actions = `
                    <button class="btn-approve" data-action="approve-vehicle" data-id="${escapeHtml(v.plate)}"
                        ${approveBlock ? 'disabled title="' + approveBlock + '"' : ''}>Approve</button>
                    <button class="btn-reject" data-action="reject-vehicle" data-id="${escapeHtml(v.plate)}"
                        ${onRoute ? 'disabled title="In use on an active route"' : ''}>Reject</button>`;
            }
            if (v.newDocument && v.status !== PDP_VEHICLE.REJECTED) {
                actions += `<button class="btn-review" data-action="review-vehicle" data-id="${escapeHtml(v.plate)}">Mark reviewed</button>`;
            }

            return `
                <tr class="${expired && v.status !== PDP_VEHICLE.REJECTED ? 'row-expired' : ''}">
                    <td class="order-id">${escapeHtml(v.plate)}</td>
                    <td><strong>${escapeHtml(v.model)}</strong><br><small>${escapeHtml(v.type)} · ${escapeHtml(v.maxWeightKg)} kg · ${escapeHtml(v.maxVolM3)} m³</small>
                        ${v.certificateFile ? '<br><small>Certificate: ' + escapeHtml(v.certificateFile) + '</small>' : ''}</td>
                    <td>${escapeHtml(v.courier)}${courierPending ? '<br><small>Courier pending</small>' : ''}${courierDisabled ? '<br><small>Courier disabled</small>' : ''}</td>
                    <td>${documentCell(v.insuranceExpiry)}</td>
                    <td>${documentCell(v.inspectionExpiry)}</td>
                    <td>${vehicleStatusCell(v, expired, onRoute)}</td>
                    <td><div class="approval-actions">${actions}</div></td>
                </tr>`;
        }).join('');
    }

    function renderStaffPanel() {
        renderAlerts();
        renderCourierInfo();
        renderVehicles();
        if (couriers) couriers.render();
    }

    // --- 4. Approve / reject actions ---

    function updateVehicle(plate, change) {
        const vehicles = pdpGetVehicles();
        const vehicle = vehicles.find(function (v) { return v.plate === plate; });
        change(vehicle);
        pdpSaveVehicles(vehicles);
        return vehicle;
    }

    function approveVehicle(plate) {
        const vehicle = updateVehicle(plate, function (v) {
            v.status = PDP_VEHICLE.APPROVED;
            v.newDocument = false;
            v.rejectReason = '';
        });
        alert(`Vehicle ${vehicle.plate} approved. ${vehicle.courier} can now select it on the courier page.`);
    }

    // The vehicle is kept with status 'Rejected' so the courier sees why and can resubmit
    function rejectVehicle(plate) {
        const vehicle = pdpGetVehicles().find(function (v) { return v.plate === plate; });
        if (ordersOnRoute(vehicle)) {
            alert(`${plate} is in use on an active route and cannot be rejected now.`);
            return;
        }
        const reason = prompt(`Why is ${plate} rejected? The courier will see this reason.`, '');
        if (reason === null) return;   // cancelled
        updateVehicle(plate, function (v) {
            v.status = PDP_VEHICLE.REJECTED;
            v.newDocument = false;
            v.rejectReason = reason.trim() || 'No reason given';
        });
    }

    function reviewVehicle(plate) {
        updateVehicle(plate, function (v) { v.newDocument = false; });
    }

    const actions = {
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

    // --- 5. Start ---

    let couriers = null;   // people.js manager for the courier accounts

    document.addEventListener('DOMContentLoaded', function () {
        removeOldSampleData();
        couriers = pdpPeopleManager({
            role: 'courier',
            pendingListId: 'pending-couriers',
            pendingCountId: 'pending-couriers-count',
            listId: 'courier-list',
            countId: 'courier-count',
            details: courierDetails,
            onChange: renderStaffPanel   // approving / disabling a courier changes the vehicle table too
        });
        renderStaffPanel();
    });
})();
