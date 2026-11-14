// =========================================
// Admin panel (4_admin.html) – operational KPIs + edit/remove users
// Reads the same localStorage lists as the other pages:
//   "registeredUsers" -> accounts created on 1_login.html (login.js)
//   "courierVehicles" -> vehicles audited by staff (staff.js)
//   "pendingStaff"    -> staff waiting for admin approval (scripts.js)
//   "adminUsers"      -> users approved by the admin (scripts.js)
// =========================================
(function () {
    const DAY = 24 * 60 * 60 * 1000;
    const WARNING_DAYS = 30;

    // --- 1. Storage helpers ---

    function readJSON(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key));
            return value === null ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function saveJSON(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function daysUntil(dateString) {
        const today = new Date(new Date().toISOString().slice(0, 10));
        return Math.round((new Date(dateString) - today) / DAY);
    }

    // --- 2. Operational KPIs ---

    function calculateKpis() {
        const orders = typeof dispatchData !== 'undefined' ? dispatchData : [];
        const registered = readJSON('registeredUsers', []);
        const vehicles = readJSON('courierVehicles', []);
        const pendingStaff = readJSON('pendingStaff', [
            { name: 'Johan Lindström' }, { name: 'Elin Berg' } // same default as scripts.js
        ]);

        const delivered = orders.filter(function (o) { return o.status === 'Delivered'; }).length;
        const inTransit = orders.filter(function (o) { return o.status === 'In transit'; }).length;
        const unassigned = orders.filter(function (o) { return o.courier === 'Assign...'; }).length;
        const deliveryRate = orders.length ? Math.round((delivered / orders.length) * 100) : 0;

        const couriers = registered.filter(function (u) { return u.role === 'courier'; });
        const activeCouriers = 1 + couriers.filter(function (u) { return u.status === 'active'; }).length; // +1 = demo courier
        const pendingCouriers = couriers.filter(function (u) { return u.status === 'pending'; }).length;
        const clients = 1 + registered.filter(function (u) { return u.role === 'client'; }).length; // +1 = demo client

        let expiredDocs = 0;
        let expiringDocs = 0;
        vehicles.forEach(function (v) {
            [v.insurance_expiry_date, v.inspection_expiry_date].forEach(function (date) {
                const left = daysUntil(date);
                if (left < 0) expiredDocs++;
                else if (left <= WARNING_DAYS) expiringDocs++;
            });
        });
        const approvedVehicles = vehicles.filter(function (v) { return v.status === 'approved'; }).length;
        const pendingVehicles = vehicles.filter(function (v) { return v.status === 'pending'; }).length;

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
                { title: 'Staff to approve', value: pendingStaff.length, warn: pendingStaff.length > 0 },
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

    // Approving/rejecting staff (scripts.js) changes the KPIs, so refresh them afterwards
    ['approveStaff', 'rejectStaff'].forEach(function (name) {
        const original = window[name];
        if (typeof original !== 'function') return;
        window[name] = function (index) {
            original(index);
            renderKpis();
        };
    });

    // --- 3. Users list: edit personal information / remove user ---

    let editingIndex = -1; // which user is open in the edit form (-1 = none)

    function escapeHtml(text) {
        return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Same list scripts.js shows: saved "adminUsers" or the default team members
    function getUsers() {
        const defaults = typeof dashboardData !== 'undefined' ? dashboardData.users : [];
        return readJSON('adminUsers', defaults.map(function (u) { return Object.assign({}, u); }));
    }

    function userRow(user, index) {
        const isActive = user.status === 'ACTIVE';
        const contact = [user.email, user.phone ? 'Phone ' + user.phone : ''].filter(Boolean).join(' · ');
        return `
            <li class="user-item">
                <div>
                    <div class="user-name">${escapeHtml(user.name)}</div>
                    <div class="user-role">${escapeHtml(user.role)}${contact ? ' · ' + escapeHtml(contact) : ''}</div>
                </div>
                <div class="user-actions">
                    <span class="badge ${isActive ? 'badge-active' : 'badge-disabled'}">${escapeHtml(user.status)}</span>
                    <button type="button" class="btn-edit" data-user-action="edit" data-index="${index}">Edit</button>
                    <button type="button" class="btn-remove" data-user-action="remove" data-index="${index}">Remove</button>
                </div>
            </li>`;
    }

    function userEditForm(user, index) {
        return `
            <li class="user-item user-editing">
                <form class="profile-form user-edit-form" data-index="${index}" novalidate>
                    <div class="profile-field">
                        <label>Full name</label>
                        <input type="text" name="name" value="${escapeHtml(user.name)}" required>
                    </div>
                    <div class="profile-field">
                        <label>Role</label>
                        <input type="text" name="role" value="${escapeHtml(user.role)}" required>
                    </div>
                    <div class="profile-field">
                        <label>Email</label>
                        <input type="email" name="email" value="${escapeHtml(user.email)}">
                    </div>
                    <div class="profile-field">
                        <label>Phone</label>
                        <input type="tel" name="phone" value="${escapeHtml(user.phone)}" placeholder="9 digits">
                    </div>
                    <div class="profile-field">
                        <label>Status</label>
                        <select name="status">
                            <option value="ACTIVE" ${user.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                            <option value="DISABLED" ${user.status !== 'ACTIVE' ? 'selected' : ''}>DISABLED</option>
                        </select>
                    </div>
                    <div class="profile-actions">
                        <button type="submit" class="btn-save">Save</button>
                        <button type="button" class="btn-edit" data-user-action="cancel">Cancel</button>
                        <span class="profile-msg" role="status"></span>
                    </div>
                </form>
            </li>`;
    }

    function renderUserList() {
        const container = document.getElementById('users-container');
        if (!container) return;
        const users = getUsers();

        if (users.length === 0) {
            container.innerHTML = '<p class="empty-users">No users.</p>';
            return;
        }
        container.innerHTML = users.map(function (user, index) {
            return index === editingIndex ? userEditForm(user, index) : userRow(user, index);
        }).join('');
    }

    // scripts.js calls renderUsers() on load and after approving staff -> use this version on the admin page
    window.renderUsers = renderUserList;

    function saveUserEdit(form) {
        const msg = form.querySelector('.profile-msg');
        const index = Number(form.dataset.index);
        const name = form.elements.name.value.trim();
        const role = form.elements.role.value.trim();
        const email = form.elements.email.value.trim();
        const phone = form.elements.phone.value.trim();

        function fail(text) {
            msg.className = 'profile-msg profile-msg-error';
            msg.textContent = text;
        }
        if (name.length < 3) return fail('Please enter the full name.');
        if (role.length < 2) return fail('Please enter a role.');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email.');
        if (phone && !/^\d{9}$/.test(phone)) return fail('Phone must have 9 digits.');

        const users = getUsers();
        Object.assign(users[index], {
            name: name.toUpperCase(),   // same format as the rest of the list
            role: role.toUpperCase(),
            email: email,
            phone: phone,
            status: form.elements.status.value
        });
        saveJSON('adminUsers', users);

        editingIndex = -1;
        renderUserList();
    }

    function removeUser(index) {
        const users = getUsers();
        if (!confirm(`Remove ${users[index].name} from the users?`)) return;
        users.splice(index, 1);
        saveJSON('adminUsers', users);
        editingIndex = -1;
        renderUserList();
    }

    function setupUserList() {
        const container = document.getElementById('users-container');
        if (!container) return;

        container.addEventListener('click', function (e) {
            const button = e.target.closest('[data-user-action]');
            if (!button) return;
            const action = button.dataset.userAction;
            if (action === 'edit') editingIndex = Number(button.dataset.index);
            if (action === 'cancel') editingIndex = -1;
            if (action === 'remove') return removeUser(Number(button.dataset.index));
            renderUserList();
        });

        container.addEventListener('submit', function (e) {
            if (!e.target.classList.contains('user-edit-form')) return;
            e.preventDefault();
            saveUserEdit(e.target);
        });
    }

    // --- 4. Start ---

    document.addEventListener('DOMContentLoaded', function () {
        renderKpis();
        setupUserList();
        renderUserList();
    });
})();
