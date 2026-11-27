<?php
// BLL - WP1 payment rules (MockGateway, Stripe-style API).
// No SQL here: database work goes through the repositories (DAL).
// Requires config/config.php to be loaded first (MG_* constants).
require_once __DIR__ . '/../repositories/Database.php';
require_once __DIR__ . '/../repositories/OrderRepository.php';
require_once __DIR__ . '/../repositories/PaymentRepository.php';

/** Business error with the HTTP code the API should answer with. */
class PaymentException extends RuntimeException
{
    public function __construct(string $message, private int $httpCode = 400)
    {
        parent::__construct($message);
    }

    public function getHttpCode(): int
    {
        return $this->httpCode;
    }
}

class PaymentService
{
    public const TYPE_ORDER = 'order';
    public const TYPE_RTO   = 'rto_adjustment';

    private OrderRepository $orders;
    private PaymentRepository $payments;

    public function __construct(?OrderRepository $orders = null, ?PaymentRepository $payments = null)
    {
        $this->orders   = $orders   ?? new OrderRepository();
        $this->payments = $payments ?? new PaymentRepository();
    }

    /**
     * Starts a payment for an order and returns the MockGateway checkout URL
     * the client's browser must be sent to.
     */
    public function startPayment(int $orderId, int $clientId, string $type = self::TYPE_ORDER): string
    {
        if ($type !== self::TYPE_ORDER) {
            // TODO(WP4): RTO adjustment - check the order is 'RTO Hold' and take the amount
            // from the re-weighting fee instead of orders.price.
            throw new PaymentException('RTO payments are not available yet', 501);
        }

        $order = $this->orders->findById($orderId);
        if ($order === null || (int) $order['client_id'] !== $clientId) {
            // Same answer for "missing" and "not yours", so other clients' order ids are not revealed
            throw new PaymentException('Order not found', 404);
        }
        if ($order['status'] !== 'Awaiting Payment') {
            throw new PaymentException('This order is not waiting for payment (status: ' . $order['status'] . ')', 409);
        }
        if ($order['price'] === null || (float) $order['price'] <= 0) {
            throw new PaymentException('This order has no price yet', 409);
        }

        // The amount ALWAYS comes from the database, never from the browser.
        $price = (float) $order['price'];

        $intent = $this->gatewayRequest('POST', '/payment_intents', [
            'amount'      => $this->toCents($price),
            'currency'    => MG_CURRENCY,
            'description' => 'Order ' . $orderId,
            'metadata'    => ['order_id' => (string) $orderId, 'type' => $type],
            'return_url'  => MG_RETURN_URL,
        ]);

        $piId = $intent['id'] ?? null;
        $url  = $intent['next_action']['redirect_to_url']['url'] ?? null;
        if (!is_string($piId) || !is_string($url)) {
            throw new PaymentException('Unexpected answer from the payment gateway', 502);
        }

        $this->payments->create($orderId, $price, $type, $piId);

        // Fallback for return.php in case the gateway does not put the id in the return URL
        if (session_status() === PHP_SESSION_ACTIVE) {
            $_SESSION['last_payment_intent'] = $piId;
        }

        return $url;
    }

    /**
     * Asks the gateway (server-side) whether the payment really succeeded and updates the DB.
     * Idempotent: calling it again for an already paid payment changes nothing and returns true.
     */
    public function confirmPayment(string $piId): bool
    {
        $payment = $this->payments->findByGatewayReference($piId);
        if ($payment === null) {
            throw new PaymentException('Unknown payment', 404);
        }
        if ($payment['status'] === 'paid') {
            return true;   // already processed (e.g. the client refreshed return.php)
        }

        // Trust ONLY the gateway's own answer, never the query string.
        $intent = $this->gatewayRequest('GET', '/payment_intents/' . rawurlencode($piId));

        $succeeded = ($intent['status'] ?? null) === 'succeeded'
            && (int) ($intent['amount'] ?? -1) === $this->toCents((float) $payment['amount'])
            && strtoupper((string) ($intent['currency'] ?? '')) === strtoupper(MG_CURRENCY);

        if (!$succeeded) {
            $this->payments->markFailed((int) $payment['payment_id']);
            return false;
        }

        $orderId = (int) $payment['order_id'];
        $isNewlyPaid = Database::transaction(function () use ($payment, $orderId) {
            if (!$this->payments->markPaid((int) $payment['payment_id'])) {
                return false;   // a parallel request already marked it paid
            }
            if ($payment['type'] === self::TYPE_ORDER) {
                // Paid -> enters the dispatch queue. Only now can couriers see it.
                $this->orders->updateStatus($orderId, 'Awaiting Payment', 'Pending');
            } else {
                // TODO(WP4): RTO adjustment paid -> move the order out of 'RTO Hold'.
            }
            return true;
        });

        if ($isNewlyPaid && $payment['type'] === self::TYPE_ORDER) {
            // TODO(WP3): DispatchService::dispatch($orderId);  -> offer the order to the nearest courier
        }

        return true;
    }

    /** Order id a payment belongs to (so return.php can send the client back to the right order). */
    public function orderIdForPayment(string $piId): ?int
    {
        $payment = $this->payments->findByGatewayReference($piId);
        return $payment === null ? null : (int) $payment['order_id'];
    }

    /** Euros -> integer cents. round() avoids 9.70 * 100 = 969.999... becoming 969. */
    private function toCents(float $euros): int
    {
        return (int) round($euros * 100);
    }

    /** Calls the MockGateway API and returns the decoded JSON. */
    private function gatewayRequest(string $method, string $path, ?array $body = null): array
    {
        $ch = curl_init(MG_BASE_URL . $path);
        $options = [
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . MG_KEY,
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            // SSL verification stays ON (cURL default). MAMP only needs to be told where the CA bundle is.
        ];
        if (defined('MG_CAINFO') && is_file(MG_CAINFO)) {
            $options[CURLOPT_CAINFO] = MG_CAINFO;
        }
        if ($body !== null) {
            $options[CURLOPT_POSTFIELDS] = json_encode($body);
        }
        curl_setopt_array($ch, $options);

        $raw = curl_exec($ch);
        if ($raw === false) {
            $error = curl_error($ch);
            error_log('MockGateway cURL error: ' . $error);
            throw new PaymentException('Payment gateway unreachable, please try again', 502);
        }
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new PaymentException('Invalid answer from the payment gateway', 502);
        }
        if ($httpCode >= 400) {
            error_log("MockGateway HTTP $httpCode: $raw");
            throw new PaymentException('Payment gateway error: ' . ($data['error']['message'] ?? "HTTP $httpCode"), 502);
        }
        return $data;
    }
}
