<?php
// Template for backend/config/config.php
// Copy this file to config.php and fill in the real values.
// config.php is gitignored - NEVER commit the real API key (the repo is public).

// --- Application ---
define('APP_URL', 'http://localhost:8888/EIS_2627-G02_MEGI');

// --- Database (MAMP defaults) ---
// Use 127.0.0.1, not "localhost": with "localhost" PDO uses the Unix socket and ignores the port.
define('DB_HOST', '127.0.0.1');
define('DB_PORT', 8889);
define('DB_NAME', 'cms');
define('DB_USER', 'root');
define('DB_PASS', 'root');
define('DB_CHARSET', 'utf8mb4');

// --- MockGateway (WP1 payments, Stripe-style API) ---
define('MG_BASE_URL', 'https://mockgateway.com/api/base/stripe-vw6wix/v1');
define('MG_KEY', 'sk_test_REPLACE_ME');
define('MG_CURRENCY', 'EUR');
// Where MockGateway sends the client back after checkout (sent as return_url with every payment)
define('MG_RETURN_URL', APP_URL . '/backend/api/payments/return.php');
// CA bundle for HTTPS calls (fixes cURL SSL error 60 on MAMP). Never disable SSL verification.
define('MG_CAINFO', '/Applications/MAMP/Library/OpenSSL/cert.pem');
