// =========================================
// Admin panel (4_admin.html) – operational KPIs + managing STAFF
// Reads the same localStorage lists as the other pages:
//   "registeredUsers" -> all accounts (data.js). The admin approves, edits,
//                        disables and removes staff (shared component in people.js).
//   "pdpOrders"       -> orders shared with client/courier pages (data.js)
//   "pdpVehicles"     -> vehicles audited by staff (data.js, staff.js)
// =========================================
(function () {
    const DAY = 24 * 60 * 60 * 1000;
    const WARNING_DAYS = 30;

    // --- 1. Helpers ---

    function daysUntil(dateString) {
        const today = new Date(new Date().toISOString().slice(0, 10));
        return Math.round((new Date(dateString) - today) / DAY);
    }

    // --- 2. Operational KPIs ---

    function calculateKpis() {
        const orders = pdpGetOrders();
        const users = pdpGetUsers();
        // Only vehicles of real courier accounts (same list as the staff page)
        const vehicles = pdpCourierVehicles();
        function count(role, status) {
            return users.filter(function (u) { return u.role === role && (!status || u.status === status); }).length;
        }

        const delivered = orders.filter(function (o) { return o.status === PDP_STATUS.COMPLETED; }).length;
        const inTransit = orders.filter(function (o) { return o.status === PDP_STATUS.IN_PROGRESS; }).length;
        // Waiting under "Available orders" on the courier page
        const unassigned = orders.filter(function (o) { return !o.courier && o.status === PDP_STATUS.INITIATED; }).length;
        const deliveryRate = orders.length ? Math.round((delivered / orders.length) * 100) : 0;

        const activeCouriers = count('courier', PDP_USER_STATUS.ACTIVE);
        const pendingCouriers = count('courier', PDP_USER_STATUS.PENDING);
        const activeStaff = count('staff', PDP_USER_STATUS.ACTIVE);
        const pendingStaff = count('staff', PDP_USER_STATUS.PENDING);
        const disabledStaff = count('staff', PDP_USER_STATUS.DISABLED);
        const clients = count('client');

        let expiredDocs = 0;
        let expiringDocs = 0;
        vehicles.forEach(function (v) {
            [v.insuranceExpiry, v.inspectionExpiry].forEach(function (date) {
                const left = daysUntil(date);
                if (left < 0) expiredDocs++;
                else if (left <= WARNING_DAYS) expiringDocs++;
            });
        });
        const approvedVehicles = vehicles.filter(function (v) { return v.status === 'Approved'; }).length;
        const pendingVehicles = vehicles.filter(function (v) { return v.status === 'Pending'; }).length;

        return [
            { group: 'Orders', items: [
                { title: 'Orders in system', value: orders.length },
                { title: 'In transit', value: inTransit },
                { title: 'Delivered', value: deliveryRate + '%', note: delivered + ' of ' + orders.length },
                { title: 'Unassigned', value: unassigned, warn: unassigned > 0 }
            ] },
            { group: 'Fleet', items: [
                { title: 'Approved vehicles', value: approvedVehicles },
                { title: 'Vehicles to review', value: pendingVehicles, warn: pendingVehicles > 0 },
                { title: 'Expired documents', value: expiredDocs, danger: expiredDocs > 0 },
                { title: 'Expiring in 30 days', value: expiringDocs, warn: expiringDocs > 0 }
            ] },
            { group: 'People', items: [
                { title: 'Active couriers', value: activeCouriers },
                { title: 'Couriers to approve', value: pendingCouriers, warn: pendingCouriers > 0 },
                { title: 'Active staff', value: activeStaff, note: disabledStaff ? disabledStaff + ' disabled' : '' },
                { title: 'Staff to approve', value: pendingStaff, warn: pendingStaff > 0 },
                { title: 'Clients', value: clients }
            ] }
        ];
    }

    function renderKpis() {
        const container = document.getElementById('kpi-container');
        if (!container) return;

        container.innerHTML = calculateKpis().map(function (group) {
            return `
                <div class="kpi-group">
                    <h3 class="kpi-group-title">${group.group}</h3>
                    <div class="kpi-grid">
                        ${group.items.map(function (k) {
                            const state = k.danger ? 'kpi-danger' : (k.warn ? 'kpi-warn' : '');
                            return `
                                <div class="kpi-item ${state}">
                                    <div class="stat-title">${k.title}</div>
                                    <div class="kpi-value">${k.value}</div>
                                    ${k.note ? `<div class="kpi-note">${k.note}</div>` : ''}
                                </div>`;
                        }).join('')}
                    </div>
                </div>`;
        }).join('');
    }

    // --- 2b. Deliveries chart: completed orders per day, last 7 days ---
    // Same orders as the "Delivered" KPI (status Completed, day = completedAt).

    function deliveriesLastWeek() {
        const orders = pdpGetOrders().filter(function (o) { return o.status === PDP_STATUS.COMPLETED; });
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = pdpDaysFromToday(-i);
            days.push({
                label: i === 0 ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short' }),
                date: date,
                count: orders.filter(function (o) { return pdpDayOf(o.completedAt) === date; }).length
            });
        }
        return days;
    }

    function renderDeliveryChart() {
        const container = document.getElementById('chart-container');
        if (!container) return;

        const days = deliveriesLastWeek();
        const total = days.reduce(function (sum, d) { return sum + d.count; }, 0);
        const max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.count; })));

        document.getElementById('chart-total').textContent =
            total + ' order(s) delivered in the last 7 days · same data as the "Delivered" KPI above';

        container.innerHTML = days.map(function (d) {
            return `
                <div class="bar-group" title="${d.date}: ${d.count} delivered">
                    <span class="bar-count">${d.count}</span>
                    <div class="bar ${d.count === 0 ? 'bar-zero' : ''}" style="--bar-height: ${(d.count / max) * 100}%;"></div>
                    <span class="bar-day">${d.label}</span>
                </div>`;
        }).join('');
    }

    // --- 3. Start ---

    document.addEventListener('DOMContentLoaded', function () {
        renderKpis();
        renderDeliveryChart();
        // The admin manages staff accounts; every change updates the KPIs
        pdpPeopleManager({
            role: 'staff',
            pendingListId: 'pending-staff',
            pendingCountId: 'pending-staff-count',
            listId: 'staff-list',
            countId: 'staff-count',
            addFormId: 'add-staff-form',
            formRole: 'admin',   // only the admin adds staff directly
            onChange: renderKpis
        });
    });
})();
