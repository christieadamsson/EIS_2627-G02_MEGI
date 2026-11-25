// =========================================
// Login & register page (1_login.html)
// Prototype only: accounts are kept in the browser (localStorage),
// passwords are not encrypted. A real backend replaces this in Sprint 2.
// =========================================

// Sample test accounts (also listed on the page)
const demoUsers = [
    { name: 'Carla Cliente',  username: 'client',  email: 'client@pdp.pt',  password: 'client123',  role: 'client',  status: 'active' },
    { name: 'Miguel Santos',  username: 'courier', email: 'courier@pdp.pt', password: 'courier123', role: 'courier', status: 'active' },
    { name: 'Sofia Martins',  username: 'staff',   email: 'staff@pdp.pt',   password: 'staff123',   role: 'staff',   status: 'active' },
    { name: 'Admin PDP',      username: 'admin',   email: 'admin@pdp.pt',   password: 'admin123',   role: 'admin',   status: 'active' }
];

// Page each role is sent to after logging in
const rolePages = {
    client: '2_client.html',
    courier: '3_courier.html',
    staff: '5_staff.html',
    admin: '4_admin.html'
};

const roleNames = { client: 'Client', courier: 'Courier', staff: 'Staff', admin: 'Admin' };

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const message = document.getElementById('auth-msg');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// --- 1. Stored accounts ---

function readStorage(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        return [];
    }
}

function getAllUsers() {
    return demoUsers.concat(readStorage('registeredUsers'));
}

function findUserByEmail(email) {
    return getAllUsers().find(function (user) {
        return user.email.toLowerCase() === email.toLowerCase();
    });
}

// Staff registered here appear under "Pending staff approvals" on the Admin page
// (scripts.js reads the same "pendingStaff" list). Once the admin approves them,
// they are in "adminUsers" and may log in.
function addToPendingStaff(name) {
    let pendingStaff = JSON.parse(localStorage.getItem('pendingStaff'));
    if (!pendingStaff) {
        // same default list scripts.js shows when nothing is saved yet
        pendingStaff = [
            { name: 'Johan Lindström', role: 'Logistics Coordinator' },
            { name: 'Elin Berg', role: 'Fleet Assistant' }
        ];
    }
    pendingStaff.push({ name: name, role: 'Staff (registered online)' });
    localStorage.setItem('pendingStaff', JSON.stringify(pendingStaff));
}

function isApprovedByAdmin(user) {
    const adminUsers = readStorage('adminUsers');
    return adminUsers.some(function (u) {
        return u.name === user.name.toUpperCase() && u.status === 'ACTIVE';
    });
}


// --- 2. Messages and field errors ---

function showMessage(type, text) {
    message.className = 'auth-msg ' + (type === 'error' ? 'msg-error' : 'msg-success');
    message.textContent = text;
    message.hidden = false;
}

function hideMessage() {
    message.hidden = true;
}

function setFieldError(input, text) {
    input.classList.add('input-error');
    input.setAttribute('aria-invalid', 'true');
    document.getElementById(input.id + '-error').textContent = text;
}

function clearFieldError(input) {
    input.classList.remove('input-error');
    input.removeAttribute('aria-invalid');
    document.getElementById(input.id + '-error').textContent = '';
}

function clearForm(form) {
    form.querySelectorAll('input, select').forEach(clearFieldError);
}

// Remove a field's error as soon as the user changes it
document.querySelectorAll('.auth-form input, .auth-form select').forEach(function (input) {
    input.addEventListener('input', function () {
        clearFieldError(input);
    });
});


// --- 3. Switching between Login and Register ---

function showForm(name) {
    const isLogin = name === 'login';
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
    tabLogin.classList.toggle('active', isLogin);
    tabRegister.classList.toggle('active', !isLogin);
    tabLogin.setAttribute('aria-selected', isLogin);
    tabRegister.setAttribute('aria-selected', !isLogin);
    hideMessage();
}

tabLogin.addEventListener('click', function () { showForm('login'); });
tabRegister.addEventListener('click', function () { showForm('register'); });

document.querySelectorAll('[data-switch]').forEach(function (link) {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        showForm(link.dataset.switch);
    });
});

// 1_login.html#register opens the register form directly
if (location.hash === '#register') {
    showForm('register');
}


// --- 4. Login ---

loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearForm(loginForm);

    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let valid = true;

    if (email === '') {
        setFieldError(emailInput, 'Please enter your email.');
        valid = false;
    } else if (!emailPattern.test(email)) {
        setFieldError(emailInput, 'Please enter a valid email address.');
        valid = false;
    }

    if (password === '') {
        setFieldError(passwordInput, 'Please enter your password.');
        valid = false;
    }

    if (!valid) {
        showMessage('error', 'Please fill in the highlighted fields.');
        return;
    }

    const user = findUserByEmail(email);
    if (!user || user.password !== password) {
        showMessage('error', 'Email or password is incorrect.');
        return;
    }

    if (user.status === 'pending' && !(user.role === 'staff' && isApprovedByAdmin(user))) {
        const approver = user.role === 'courier' ? 'a staff member' : 'an administrator';
        showMessage('error', 'Your account is waiting for approval by ' + approver + '.');
        return;
    }

    // Remember who is logged in, so other pages can use it later
    localStorage.setItem('currentUser', JSON.stringify({ name: user.name, role: user.role }));

    showMessage('success', 'Welcome, ' + user.name + '! Opening the ' + roleNames[user.role] + ' page…');
    setTimeout(function () {
        window.location.href = rolePages[user.role];
    }, 1200);
});


// --- 5. Register ---

registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearForm(registerForm);

    const nameInput = document.getElementById('reg-name');
    const usernameInput = document.getElementById('reg-username');
    const emailInput = document.getElementById('reg-email');
    const phoneInput = document.getElementById('reg-phone');
    const nifInput = document.getElementById('reg-nif');
    const roleInput = document.getElementById('reg-role');
    const passwordInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm');
    const termsInput = document.getElementById('reg-terms');

    const name = nameInput.value.trim();
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.replace(/\s/g, '');
    const nif = nifInput.value.trim();
    const role = roleInput.value;
    const password = passwordInput.value;
    let valid = true;

    if (name === '') {
        setFieldError(nameInput, 'Please enter your full name.');
        valid = false;
    }

    if (username === '') {
        setFieldError(usernameInput, 'Please choose a username.');
        valid = false;
    } else if (!/^[A-Za-z0-9._]{3,20}$/.test(username)) {
        setFieldError(usernameInput, '3–20 characters: letters, numbers, dot or underscore.');
        valid = false;
    } else if (getAllUsers().some(function (u) { return u.username.toLowerCase() === username.toLowerCase(); })) {
        setFieldError(usernameInput, 'This username is already taken.');
        valid = false;
    }

    if (email === '') {
        setFieldError(emailInput, 'Please enter your email.');
        valid = false;
    } else if (!emailPattern.test(email)) {
        setFieldError(emailInput, 'Please enter a valid email address.');
        valid = false;
    } else if (findUserByEmail(email)) {
        setFieldError(emailInput, 'An account with this email already exists.');
        valid = false;
    }

    if (phone === '') {
        setFieldError(phoneInput, 'Please enter your phone number.');
        valid = false;
    } else if (!/^(\+351)?\d{9}$/.test(phone)) {
        setFieldError(phoneInput, 'Enter 9 digits (optionally starting with +351).');
        valid = false;
    }

    if (nif === '') {
        setFieldError(nifInput, 'Please enter your NIF.');
        valid = false;
    } else if (!/^\d{9}$/.test(nif)) {
        setFieldError(nifInput, 'The NIF must have exactly 9 digits.');
        valid = false;
    }

    if (role === '') {
        setFieldError(roleInput, 'Please choose a role.');
        valid = false;
    }

    if (password === '') {
        setFieldError(passwordInput, 'Please choose a password.');
        valid = false;
    } else if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        setFieldError(passwordInput, 'At least 8 characters, with letters and numbers.');
        valid = false;
    }

    if (confirmInput.value === '') {
        setFieldError(confirmInput, 'Please repeat your password.');
        valid = false;
    } else if (confirmInput.value !== password) {
        setFieldError(confirmInput, 'The passwords do not match.');
        valid = false;
    }

    if (!termsInput.checked) {
        setFieldError(termsInput, 'Please accept the terms to continue.');
        valid = false;
    }

    if (!valid) {
        showMessage('error', 'Please fix the highlighted fields.');
        return;
    }

    // Clients can log in right away, couriers and staff need approval first
    const newUser = {
        name: name,
        username: username,
        email: email,
        phone: phone,
        nif: nif,
        password: password,
        role: role,
        status: role === 'client' ? 'active' : 'pending',
        created_at: new Date().toISOString()
    };

    const registered = readStorage('registeredUsers');
    registered.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(registered));

    if (role === 'staff') {
        addToPendingStaff(name);
    }

    registerForm.reset();
    showForm('login');
    document.getElementById('login-email').value = email;

    if (role === 'client') {
        showMessage('success', 'Account created. You can log in now.');
    } else {
        const approver = role === 'courier' ? 'a staff member' : 'an administrator';
        showMessage('success', 'Account created. ' + 'It must be approved by ' + approver + ' before you can log in.');
    }
});
