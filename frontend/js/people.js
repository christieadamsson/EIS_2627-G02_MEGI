// =========================================
// People manager – one component for both management pages:
//   4_admin.html: the admin manages STAFF (only the admin approves new staff)
//   5_staff.html: staff manage COURIERS and can PROPOSE new staff for the admin
// Needs data.js (pdpGetUsers, pdpSetUserStatus, pdpRemoveUser, ...).
//
// Usage:
//   pdpPeopleManager({
//       role: 'staff' | 'courier',        // which accounts this page manages
//       pendingListId, pendingCountId,    // "waiting for approval" list (approve / reject)
//       listId, countId,                  // approved accounts (edit / disable / enable / remove)
//       addFormId,                        // optional: form to create a new account directly
//       proposeOnly: true,                // optional: the form only PROPOSES an account (status pending,
//                                         //   someone else approves it); pending rows get no approve/reject
//       managerLabel: 'Admin' | 'Staff',  // optional: name used when nobody is logged in
//       formRole: 'admin' | 'staff',      // optional: only this logged-in role may submit the add form
//       details: function (user) {...},   // optional: extra text per row (e.g. vehicles, orders)
//       onChange: function () {...}       // optional: called after every change
//   });
// =========================================
function pdpPeopleManager(options) {
    const role = options.role;
    const roleName = role === 'staff' ? 'staff member' : 'courier';
    const pendingList = document.getElementById(options.pendingListId);
    const list = document.getElementById(options.listId);
    const addForm = options.addFormId ? document.getElementById(options.addFormId) : null;
    let editing = null;   // username of the row open in the edit form

    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE = /^(\+351)?\d{9}$/;

    function escapeHtml(text) {
        return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // Name of whoever is managing (shown as "approved by ...")
    function managerName() {
        const me = pdpCurrentUser();
        if (me && me.name) return me.name;
        return options.managerLabel || (role === 'staff' ? 'Admin' : 'Staff');
    }

    function accounts() {
        return pdpGetUsers().filter(function (u) { return u.role === role; });
    }

    function changed() {
        render();
        if (options.onChange) options.onChange();
    }

    // --- rendering ---

    // "912000001" or "+351912000001" -> "+351 912 000 001" (Portuguese country code by default)
    function formatPhone(phone) {
        const digits = String(phone || '').replace(/[^\d+]/g, '');
        if (!digits) return '';
        const match = digits.match(/^(\+\d{1,3})?(\d{9})$/);
        if (!match) return digits;   // unexpected format: show as entered
        const code = match[1] || '+351';
        return code + ' ' + match[2].replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    }

    // Row 1: username + email   ·   Row 2: phone + NIF + citizen card
    function contactLine(u) {
        const first = [u.username ? '@' + u.username : '', u.email].filter(Boolean).map(escapeHtml).join(' · ');
        const second = [u.phone ? 'Phone ' + formatPhone(u.phone) : '', u.nif ? 'NIF ' + u.nif : '',
                        u.citizenCard ? 'Citizen card ' + pdpFormatCitizenCard(u.citizenCard) : '']
            .filter(Boolean).map(escapeHtml).join(' · ');
        return first + (second ? '</div><div class="user-role">' + second : '');
    }

    // "Proposed by Sofia Martins on …" or "Registered online on …"
    function originLine(u) {
        const when = pdpFormatDateTime(u.created_at);
        const text = u.proposedBy ? 'Proposed by ' + u.proposedBy : 'Registered online';
        return escapeHtml(text + (when ? ' on ' + when : ''));
    }

    function pendingRow(u) {
        // A page that only proposes accounts cannot approve them
        const actionsHtml = options.proposeOnly
            ? '<span class="badge-pending">Waiting for admin</span>'
            : `<button type="button" class="btn-approve" data-people-action="approve" data-user="${escapeHtml(u.username)}">Approve</button>
               <button type="button" class="btn-reject" data-people-action="reject" data-user="${escapeHtml(u.username)}">Reject</button>`;
        return `
            <li class="user-item">
                <div>
                    <div class="user-name">${escapeHtml(u.name)}</div>
                    <div class="user-role">${contactLine(u)}</div>
                    <div class="user-role">${originLine(u)}</div>
                </div>
                <div class="approval-actions">${actionsHtml}</div>
            </li>`;
    }

    function memberRow(u) {
        const active = u.status === PDP_USER_STATUS.ACTIVE;
        const history = [];
        if (u.approvedBy) history.push('Approved by ' + u.approvedBy + (u.approvedAt ? ' on ' + pdpFormatDateTime(u.approvedAt) : ''));
        if (!active && u.disabledAt) history.push('Disabled on ' + pdpFormatDateTime(u.disabledAt));
        const extra = options.details ? options.details(u) : '';
        return `
            <li class="user-item${active ? '' : ' user-disabled'}">
                <div>
                    <div class="user-name">${escapeHtml(u.name)}</div>
                    <div class="user-role">${contactLine(u)}</div>
                    ${history.length ? `<div class="user-role">${escapeHtml(history.join(' · '))}</div>` : ''}
                    ${extra ? `<div class="user-role">${escapeHtml(extra)}</div>` : ''}
                </div>
                <div class="user-actions">
                    <span class="badge ${active ? 'badge-active' : 'badge-disabled'}">${active ? 'ACTIVE' : 'DISABLED'}</span>
                    <button type="button" class="btn-edit" data-people-action="edit" data-user="${escapeHtml(u.username)}">Edit</button>
                    <button type="button" class="btn-edit" data-people-action="${active ? 'disable' : 'enable'}" data-user="${escapeHtml(u.username)}">${active ? 'Disable' : 'Enable'}</button>
                    <button type="button" class="btn-remove" data-people-action="remove" data-user="${escapeHtml(u.username)}">Remove</button>
                </div>
            </li>`;
    }

    // Couriers are linked to orders and vehicles by name, so only contact details can change
    function editRow(u) {
        const nameLocked = role === 'courier';
        return `
            <li class="user-item user-editing">
                <form class="profile-form user-edit-form" data-user="${escapeHtml(u.username)}" novalidate>
                    <div class="profile-field">
                        <label>Full name</label>
                        <input type="text" name="name" value="${escapeHtml(u.name)}" ${nameLocked ? 'disabled title="Linked to orders and vehicles"' : 'required'}>
                    </div>
                    <div class="profile-field">
                        <label>Email</label>
                        <input type="email" name="email" value="${escapeHtml(u.email)}" required>
                    </div>
                    <div class="profile-field">
                        <label>Phone</label>
                        <input type="tel" name="phone" value="${escapeHtml(u.phone)}" placeholder="9 digits">
                    </div>
                    <div class="profile-field">
                        <label>NIF</label>
                        <input type="text" name="nif" value="${escapeHtml(u.nif)}" placeholder="9 digits">
                    </div>
                    <div class="profile-field">
                        <label>Citizen card number</label>
                        <input type="text" name="citizenCard" value="${escapeHtml(pdpFormatCitizenCard(u.citizenCard))}" placeholder="e.g. 12345678 9 ZZ4" maxlength="16">
                    </div>
                    <div class="profile-actions">
                        <button type="submit" class="btn-save">Save</button>
                        <button type="button" class="btn-edit" data-people-action="cancel">Cancel</button>
                        <span class="profile-msg" role="status"></span>
                    </div>
                </form>
            </li>`;
    }

    function render() {
        const all = accounts();
        const pending = all.filter(function (u) { return u.status === PDP_USER_STATUS.PENDING; });
        const members = all.filter(function (u) { return u.status !== PDP_USER_STATUS.PENDING; })
            .sort(function (a, b) { return a.name.localeCompare(b.name); });

        if (options.pendingCountId) document.getElementById(options.pendingCountId).textContent = pending.length;
        if (options.countId) {
            const activeCount = members.filter(function (u) { return u.status === PDP_USER_STATUS.ACTIVE; }).length;
            document.getElementById(options.countId).textContent = activeCount + ' / ' + members.length;
        }

        if (pendingList) {
            pendingList.innerHTML = pending.length
                ? pending.map(pendingRow).join('')
                : `<p class="empty-msg">No ${roleName}s waiting for approval.</p>`;
        }
        if (list) {
            list.innerHTML = members.length
                ? members.map(function (u) { return u.username === editing ? editRow(u) : memberRow(u); }).join('')
                : `<p class="empty-msg">No ${roleName}s yet.</p>`;
        }
    }

    // --- actions ---

    function releasedNote(released, name) {
        return released ? `\n${released} unfinished order(s) of ${name} went back to "Available orders".` : '';
    }

    const actions = {
        approve: function (u) {
            pdpSetUserStatus(u.username, PDP_USER_STATUS.ACTIVE, managerName());
            alert(`${u.name} is approved and can now log in.`);
        },
        reject: function (u) {
            if (!confirm(`Reject ${u.name}? The account will be deleted.`)) return;
            const released = pdpRemoveUser(u.username);
            if (released) alert(releasedNote(released, u.name).trim());
        },
        disable: function (u) {
            const onRoute = role === 'courier' ? pdpActiveRouteOrders(u.name).length : 0;
            const warning = onRoute ? `\n${u.name} is on a route with ${onRoute} order(s); they will go back to "Available orders".` : '';
            if (!confirm(`Disable ${u.name}? They will not be able to log in until enabled again.` + warning)) return;
            const released = pdpSetUserStatus(u.username, PDP_USER_STATUS.DISABLED, managerName());
            if (released) alert(releasedNote(released, u.name).trim());
        },
        enable: function (u) {
            pdpSetUserStatus(u.username, PDP_USER_STATUS.ACTIVE, managerName());
        },
        remove: function (u) {
            const extra = role === 'courier' ? ' Their vehicles are removed and unfinished orders go back to "Available orders".' : '';
            if (!confirm(`Remove ${u.name} permanently?` + extra)) return;
            const released = pdpRemoveUser(u.username);
            if (released) alert(releasedNote(released, u.name).trim());
        },
        edit: function (u) { editing = u.username; },
        cancel: function () { editing = null; }
    };

    function onClick(e) {
        const button = e.target.closest('[data-people-action]');
        if (!button) return;
        const action = button.dataset.peopleAction;
        const user = button.dataset.user ? pdpFindUser(button.dataset.user) : null;
        if (action !== 'cancel' && !user) return;
        if (action !== 'edit' && action !== 'cancel') editing = null;
        actions[action](user);
        changed();
    }

    function emailTaken(email, exceptUsername) {
        return pdpGetUsers().some(function (u) {
            return u.username !== exceptUsername && u.email.toLowerCase() === email.toLowerCase();
        });
    }

    function saveEdit(form) {
        const msg = form.querySelector('.profile-msg');
        const username = form.dataset.user;
        const user = pdpFindUser(username);
        const name = role === 'courier' ? user.name : form.elements.name.value.trim();
        const email = form.elements.email.value.trim();
        const phone = form.elements.phone.value.replace(/\s/g, '');
        const nif = form.elements.nif.value.trim();
        const citizenCard = pdpNormalizeCitizenCard(form.elements.citizenCard.value);

        function fail(text) {
            msg.className = 'profile-msg profile-msg-error';
            msg.textContent = text;
        }
        if (name.length < 3) return fail('Please enter the full name.');
        if (!EMAIL.test(email)) return fail('Please enter a valid email.');
        if (emailTaken(email, username)) return fail('Another account already uses this email.');
        if (phone && !PHONE.test(phone)) return fail('Phone: 9 digits (optionally +351).');
        if (nif && !/^\d{9}$/.test(nif)) return fail('NIF must have 9 digits.');
        if (citizenCard && !pdpIsValidCitizenCard(citizenCard)) return fail('Citizen card: use the format 12345678 9 ZZ4.');
        if (citizenCard && pdpCitizenCardTaken(citizenCard, username)) return fail('Another account already uses this citizen card number.');

        pdpUpdateUser(username, { name: name, email: email, phone: phone, nif: nif, citizenCard: citizenCard });
        editing = null;
        changed();
    }

    // Create an account: active straight away (admin adding staff),
    // or pending when this page only proposes it (staff proposing staff)
    function addAccount(form) {
        const msg = form.querySelector('.profile-msg');
        const v = function (name) { return form.elements[name].value.trim(); };
        const data = {
            name: v('name'), username: v('username'), email: v('email'),
            phone: v('phone').replace(/\s/g, ''), nif: v('nif'),
            citizenCard: pdpNormalizeCitizenCard(v('citizenCard')), password: form.elements.password.value
        };

        function fail(text) {
            msg.className = 'profile-msg profile-msg-error';
            msg.textContent = text;
        }
        if (options.formRole && !pdpHasAccess([options.formRole])) {
            return fail('Only a logged-in ' + (PDP_ROLE_LABELS[options.formRole] || options.formRole) + ' account can do this.');
        }
        if (data.name.length < 3) return fail('Please enter the full name.');
        if (!/^[A-Za-z0-9._]{3,20}$/.test(data.username)) return fail('Username: 3–20 letters, numbers, dot or underscore.');
        if (pdpGetUsers().some(function (u) { return u.username.toLowerCase() === data.username.toLowerCase(); })) {
            return fail('This username is already taken.');
        }
        if (!EMAIL.test(data.email)) return fail('Please enter a valid email.');
        if (emailTaken(data.email, null)) return fail('An account with this email already exists.');
        if (!PHONE.test(data.phone)) return fail('Phone: 9 digits (optionally +351).');
        if (!/^\d{9}$/.test(data.nif)) return fail('NIF must have 9 digits.');
        if (!pdpIsValidCitizenCard(data.citizenCard)) return fail('Citizen card: use the format 12345678 9 ZZ4.');
        if (pdpCitizenCardTaken(data.citizenCard, null)) return fail('An account with this citizen card number already exists.');
        if (data.password.length < 8 || !/[A-Za-z]/.test(data.password) || !/\d/.test(data.password)) {
            return fail('Temporary password: at least 8 characters with letters and numbers.');
        }

        const users = pdpGetUsers();
        const extra = options.proposeOnly
            ? { status: PDP_USER_STATUS.PENDING, proposedBy: managerName() }
            : { status: PDP_USER_STATUS.ACTIVE, approvedBy: managerName(), approvedAt: pdpNow() };
        users.push(Object.assign(data, { role: role, created_at: pdpNow() }, extra));
        pdpSaveUsers(users);

        form.reset();
        msg.className = 'profile-msg profile-msg-success';
        msg.textContent = options.proposeOnly
            ? `${data.name} was proposed. The admin has to approve the account before they can log in.`
            : `${data.name} was added and can log in with username "${data.username}".`;
        changed();
    }

    // --- start ---

    [pendingList, list].forEach(function (el) {
        if (el) el.addEventListener('click', onClick);
    });
    if (list) {
        list.addEventListener('submit', function (e) {
            if (!e.target.classList.contains('user-edit-form')) return;
            e.preventDefault();
            saveEdit(e.target);
        });
    }
    if (addForm) {
        addForm.addEventListener('submit', function (e) {
            e.preventDefault();
            addAccount(addForm);
        });
    }
    // Another tab (e.g. someone registering on the login page) changed the accounts
    window.addEventListener('storage', function (e) {
        if (e.key === 'registeredUsers' || e.key === 'pdpOrders' || e.key === 'pdpVehicles') render();
    });

    render();
    return { render: render };
}
