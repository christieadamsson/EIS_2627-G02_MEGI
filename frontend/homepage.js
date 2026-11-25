// Homepage metrics are derived from the same browser data as the role pages.
(function () {
    function renderMetrics() {
        const orders = pdpGetOrders();
        const vehicles = pdpGetVehicles();
        const activeCouriers = pdpGetUsers().filter(function (user) {
            return user.role === 'courier' && user.status === PDP_USER_STATUS.ACTIVE;
        }).length;

        document.getElementById('metric-orders').textContent = orders.length;
        document.getElementById('metric-active-orders').textContent = orders.filter(function (order) {
            return order.status === PDP_STATUS.INITIATED || order.status === PDP_STATUS.IN_PROGRESS;
        }).length;
        document.getElementById('metric-couriers').textContent = activeCouriers;
        document.getElementById('metric-vehicles').textContent = vehicles.filter(function (vehicle) {
            return vehicle.status === 'Approved';
        }).length;
    }

    document.addEventListener('DOMContentLoaded', renderMetrics);
    window.addEventListener('storage', renderMetrics);
    window.addEventListener('pageshow', renderMetrics);
})();
