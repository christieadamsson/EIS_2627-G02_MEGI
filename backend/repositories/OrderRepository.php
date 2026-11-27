<?php
// DAL - SQL for the orders table (only what WP1 needs so far; teammates can add more methods).
require_once __DIR__ . '/Database.php';

class OrderRepository
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::get();
    }

    public function findById(int $orderId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT o.order_id, o.client_id, o.price, o.status, p.description
             FROM orders o
             JOIN product p ON p.product_id = o.product_id
             WHERE o.order_id = :id'
        );
        $stmt->execute([':id' => $orderId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** All orders of one client, newest first (used by the WP1 test page). */
    public function findByClient(int $clientId): array
    {
        $stmt = $this->db->prepare(
            'SELECT o.order_id, o.price, o.status, p.description
             FROM orders o
             JOIN product p ON p.product_id = o.product_id
             WHERE o.client_id = :client
             ORDER BY o.order_id DESC'
        );
        $stmt->execute([':client' => $clientId]);
        return $stmt->fetchAll();
    }

    /**
     * Changes the status only if the order is still in $fromStatus.
     * Returns false if the order was already moved on (safe against double requests).
     */
    public function updateStatus(int $orderId, string $fromStatus, string $toStatus): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE orders SET status = :to WHERE order_id = :id AND status = :from'
        );
        $stmt->execute([':to' => $toStatus, ':id' => $orderId, ':from' => $fromStatus]);
        return $stmt->rowCount() === 1;
    }
}
