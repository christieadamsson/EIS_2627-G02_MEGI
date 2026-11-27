<?php
// DEV ONLY - WP1 test page. Lists client 1's orders and starts a payment via the real API.
// Open: http://localhost:8888/EIS_2627-G02_MEGI/backend/test_wp1.php
// TODO: remove before submission (the real Pay button goes on 2_client.html).
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/repositories/OrderRepository.php';

session_start();
$clientId = (int) ($_SESSION['user_id'] ?? 1);   // TODO: real auth
$orders   = (new OrderRepository())->findByClient($clientId);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>WP1 payment test</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #ccc; padding: .4rem .8rem; text-align: left; }
  #msg { margin-top: 1rem; color: #b00; }
</style>
</head>
<body>
<h1>WP1 payment test (client <?= $clientId ?>)</h1>
<table>
  <tr><th>Order</th><th>Product</th><th>Price</th><th>Status</th><th></th></tr>
  <?php foreach ($orders as $o): ?>
  <tr>
    <td><?= (int) $o['order_id'] ?></td>
    <td><?= htmlspecialchars($o['description']) ?></td>
    <td><?= $o['price'] === null ? '—' : '€' . number_format((float) $o['price'], 2) ?></td>
    <td><?= htmlspecialchars($o['status']) ?></td>
    <td><?php if ($o['status'] === 'Awaiting Payment'): ?>
      <button onclick="pay(<?= (int) $o['order_id'] ?>)">Pay</button>
    <?php endif; ?></td>
  </tr>
  <?php endforeach; ?>
</table>
<p id="msg"></p>
<script>
async function pay(orderId) {
  const msg = document.getElementById('msg');
  msg.textContent = 'Creating payment…';
  try {
    const res  = await fetch('api/payments/create.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId })
    });
    const data = await res.json();
    if (data.success) { window.location.href = data.url; }
    else { msg.textContent = 'Error ' + res.status + ': ' + data.error; }
  } catch (e) {
    msg.textContent = 'Network error: ' + e.message;
  }
}
</script>
</body>
</html>
