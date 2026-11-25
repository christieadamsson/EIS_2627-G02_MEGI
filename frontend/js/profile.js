// =========================================
// My account (8_profile.html) – every logged-in user sees and edits their OWN details
// Needs data.js: pdpCurrentAccount, pdpUpdateOwnAccount, pdpChangeOwnPassword.
// A new name is copied to the user's orders / vehicles (pdpRenameEverywhere),
// so a client keeps their order history and a courier keeps their vehicles.
// =========================================
(function () {
    // Wrong role / not logged in: data.js already shows the "No access" message
    if (!pdpHasAccess(['client', 'courier', 'staff', 'admin'])) return;

    const FIELDS = ['name', 'username', 'email', 'phone', 'nif', 'citizenCard'];
    const form = document.getElementById('profile-form');
    const msg = document.getElementById('profile-msg');
    const passwordForm = document.getElementById('password-form');
    const passwordMsg = document.getElementById('password-msg');

    function showMsg(element, type, text) {
        element.className = 'profile-msg ' + (type === 'error' ? 'profile-msg-error' : 'profile-msg-success');
        element.textContent = text;
    }

    function setFieldError(field, text) {
        const input = form.elements[field];
        const error = document.getElementById('profile-' + field + '-error');
        input.classList.toggle('input-error', !!text);
        if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
        if (error) error.textContent = text || '';
    }

    // "Approved by Sofia Staff on 24 Nov 2026, 10:15" etc.
    function renderFacts(user) {
        const facts = [
            ['Role', PDP_ROLE_LABELS[user.role] || user.role],
            ['Status', user.status === PDP_USER_STATUS.ACTIVE ? 'Active' : user.status],
            ['Member since', pdpFormatDateTime(user.created_at) || '—']
        ];
        if (user.approvedBy) {
            facts.push(['Approved by', user.approvedBy + (user.approvedAt ? ' on ' + pdpFormatDateTime(user.approvedAt) : '')]);
        }
        if (user.proposedBy) facts.push(['Proposed by', user.proposedBy]);

        const list = document.getElementById('account-facts');
        list.innerHTML = '';
        facts.forEach(function (fact) {
            const item = document.createElement('div');
            const term = document.createElement('dt');
            const value = document.createElement('dd');
            term.textContent = fact[0];
            value.textContent = fact[1];
            item.append(term, value);
            list.append(item);
        });
        document.getElementById('profile-heading').textContent = user.name;
    }

    function fillForm(user) {
        FIELDS.forEach(function (field) {
            const value = field === 'citizenCard' ? pdpFormatCitizenCard(user.citizenCard) : (user[field] || '');
            form.elements[field].value = value;
            setFieldError(field, '');
        });
    }

    function render() {
        const user = pdpCurrentAccount();
        renderFacts(user);
        fillForm(user);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        const changes = {};
        FIELDS.forEach(function (field) { changes[field] = form.elements[field].value; });

        const result = pdpUpdateOwnAccount(changes);
        FIELDS.forEach(function (field) { setFieldError(field, result.errors ? result.errors[field] : ''); });
        if (result.errors) {
            showMsg(msg, 'error', result.errors.form || 'Please fix the highlighted fields.');
            return;
        }
        render();
        // The header shows the new name too
        document.querySelectorAll('.btn-login, .btn-account').forEach(function (el) { el.title = result.user.name; });
        showMsg(msg, 'success', 'Your details were saved.');
    });

    // Undo: back to the saved values
    document.getElementById('profile-reset').addEventListener('click', function () {
        fillForm(pdpCurrentAccount());
        msg.textContent = '';
    });

    // Remove a field's error as soon as the user types
    FIELDS.forEach(function (field) {
        form.elements[field].addEventListener('input', function () { setFieldError(field, ''); });
    });

    passwordForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const error = pdpChangeOwnPassword(
            passwordForm.elements.current.value,
            passwordForm.elements.next.value,
            passwordForm.elements.confirm.value
        );
        if (error) {
            showMsg(passwordMsg, 'error', error);
            return;
        }
        passwordForm.reset();
        showMsg(passwordMsg, 'success', 'Your password was changed. Use it the next time you log in.');
    });

    render();
})();
