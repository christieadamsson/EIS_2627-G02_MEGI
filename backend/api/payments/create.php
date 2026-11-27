<?php
// API - POST /backend/api/payments/create.php   body: {"order_id": 8}
// Answers {success:true, url} (send the browser to url) or {success:false, error}.
// Thin layer: reads the request, calls PaymentService, writes JSON. No rules, no SQL.
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../services/PaymentService.php';

session_start();
header('Content-Type: application/json; charset=utf-8');

function respond(int $code, array $body): never
{
    http_response_code($code);
    echo json_encode($body);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['success' => false, 'error' => 'Use POST']);
}

// TODO: replace with real auth (logged-in user with role 'client') when login is built.
$clientId = (int) ($_SESSION['user_id'] ?? 1);

$input   = json_decode(file_get_contents('php://input'), true);
$orderId = filter_var($input['order_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
if ($orderId === false) {
    respond(400, ['success' => false, 'error' => 'order_id must be a positive integer']);
}

try {
    $url = (new PaymentService())->startPayment($orderId, $clientId);
    respond(200, ['success' => true, 'url' => $url]);
} catch (PaymentException $e) {
    respond($e->getHttpCode(), ['success' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('payments/create: ' . $e->getMessage());
    respond(500, ['success' => false, 'error' => 'Internal error']);
}
