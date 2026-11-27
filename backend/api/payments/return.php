<?php
// API - MockGateway sends the client's browser here after checkout (return_url).
// The query string is NOT trusted: PaymentService asks the gateway itself whether the payment succeeded.
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../services/PaymentService.php';

session_start();

// DEV: log what MockGateway puts in the URL, so we learn the real parameter names.
// TODO: remove before submission.
$logDir = __DIR__ . '/../../logs';
if (is_dir($logDir) || @mkdir($logDir, 0775, true)) {
    @file_put_contents($logDir . '/mockgateway_return.log',
        date('c') . ' ' . json_encode($_GET) . PHP_EOL, FILE_APPEND);
}

$piId = $_GET['payment_intent'] ?? $_GET['payment_id'] ?? $_GET['id'] ?? $_SESSION['last_payment_intent'] ?? null;

$clientPage = APP_URL . '/frontend/html/2_client.html';
$paid    = false;
$orderId = null;

if (is_string($piId) && preg_match('/^pi_[A-Za-z0-9]+$/', $piId)) {
    $service = new PaymentService();
    try {
        $orderId = $service->orderIdForPayment($piId);
        $paid    = $orderId !== null && $service->confirmPayment($piId);
    } catch (Throwable $e) {
        error_log('payments/return: ' . $e->getMessage());
    }
}
unset($_SESSION['last_payment_intent']);

$query = ['paid' => $paid ? 1 : 0];
if ($orderId !== null) {
    $query['order'] = $orderId;
}
header('Location: ' . $clientPage . '?' . http_build_query($query), true, 303);
exit;
