<?php
// DAL - all SQL for the payment table (WP1).
require_once __DIR__ . '/Database.php';

class PaymentRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::get();
    }

    /** Saves a new 'pending' payment and returns its id. */
    public function create(int $orderId, float $amount, string $type, string $gatewayReference): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO payment (order_id, amount, type, gateway_reference, status)
             VALUES (:order_id, :amount, :type, :ref, \'pending\')'
        );
        $stmt->execute([
            ':order_id' => $orderId,
            ':amount'   => number_format($amount, 2, '.', ''),
            ':type'     => $type,
            ':ref'      => $gatewayReference,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function findByGatewayReference(string $gatewayReference): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM payment WHERE gateway_reference = :ref');
        $stmt->execute([':ref' => $gatewayReference]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Marks the payment as paid. Only changes a payment that is not paid yet,
     * so it returns false if another request already did it (no double processing).
     */
    public function markPaid(int $paymentId): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE payment SET status = \'paid\', paid_at = NOW()
             WHERE payment_id = :id AND status <> \'paid\''
        );
        $stmt->execute([':id' => $paymentId]);
        return $stmt->rowCount() === 1;
    }

    /** Marks a still-pending payment as failed. A paid payment is never downgraded. */
    public function markFailed(int $paymentId): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE payment SET status = \'failed\'
             WHERE payment_id = :id AND status = \'pending\''
        );
        $stmt->execute([':id' => $paymentId]);
        return $stmt->rowCount() === 1;
    }
}
