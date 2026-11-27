<?php
// WP1 smoke test: proves the MockGateway config works.
// Creates a €9.70 payment intent and prints id, status and checkout URL.
// Run in browser: http://localhost:8888/EIS_2627-G02_MEGI/backend/test_mockgateway.php
// or CLI:         php backend/test_mockgateway.php

require_once __DIR__ . '/config/config.php';

header('Content-Type: text/plain; charset=utf-8');

// Check mode: ?id=pi_... (browser) or `php test_mockgateway.php pi_...` (CLI)
// -> GET the payment intent and show its real status.
$checkId = $_GET['id'] ?? ($argv[1] ?? null);

$payload = [
    'amount'      => 970,               // integer cents (€9.70)
    'currency'    => MG_CURRENCY,
    'description' => 'Order TEST-1',
    'metadata'    => ['order_id' => 'TEST-1'],
];

if ($checkId !== null) {
    if (!preg_match('/^pi_[A-Za-z0-9]+$/', $checkId)) {
        echo "Invalid payment intent id\n";
        exit(1);
    }
    $ch = curl_init(MG_BASE_URL . '/payment_intents/' . $checkId);
    $options = [];
} else {
    $ch = curl_init(MG_BASE_URL . '/payment_intents');
    $options = [
        CURLOPT_POST       => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
    ];
}
$options += [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . MG_KEY,
        'Content-Type: application/json',
    ],
];
if (defined('MG_CAINFO') && is_file(MG_CAINFO)) {
    $options[CURLOPT_CAINFO] = MG_CAINFO;   // fixes SSL error 60 on MAMP; verification stays ON
}
curl_setopt_array($ch, $options);

$body = curl_exec($ch);
if ($body === false) {
    echo 'cURL error (' . curl_errno($ch) . '): ' . curl_error($ch) . "\n";
    exit(1);
}
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

$data = json_decode($body, true);
if ($httpCode >= 400 || !is_array($data)) {
    echo "Gateway returned HTTP $httpCode:\n$body\n";
    exit(1);
}

echo "HTTP:         $httpCode\n";
echo 'id:           ' . ($data['id'] ?? '?') . "\n";
echo 'status:       ' . ($data['status'] ?? '?') . "\n";
echo 'checkout URL: ' . ($data['next_action']['redirect_to_url']['url'] ?? '?') . "\n";
echo 'return URL:   ' . ($data['next_action']['redirect_to_url']['return_url'] ?? '?') . "\n";
echo 'amount:       ' . ($data['amount'] ?? '?') . ' ' . ($data['currency'] ?? '') . "\n";
echo 'PAID?         ' . (($data['status'] ?? '') === 'succeeded' ? 'YES' : 'no') . "\n";
