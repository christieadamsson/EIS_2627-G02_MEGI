// Homepage metrics are derived from the same browser data as the role pages.
(function () {
    function registeredUsers() {
        try {
            return JSON.parse(localStorage.getItem('registeredUsers')) || [];
        } catch (error) {
            console.warn('Could not read registered users for homepage metrics.', error);
            return [];
        }
    }

    function renderMetrics() {
        const orders = pdpGetOrders();
        const users = registeredUsers();
        const vehicles = pdpGetVehicles();
        const activeCouriers = new Set(['Miguel Santos']);

        users.forEach(function (user) {
            if (user.role === 'courier' && user.status === 'active') activeCouriers.add(user.name);
        });

        document.getElementById('metric-orders').textContent = orders.length;
        document.getElementById('metric-active-orders').textContent = orders.filter(function (order) {
            return order.status === PDP_STATUS.INITIATED || order.status === PDP_STATUS.IN_PROGRESS;
        }).length;
        document.getElementById('metric-couriers').textContent = activeCouriers.size;
        document.getElementById('metric-vehicles').textContent = vehicles.filter(function (vehicle) {
            return vehicle.status === 'Approved';
        }).length;
    }

    document.addEventListener('DOMContentLoaded', renderMetrics);
    window.addEventListener('storage', renderMetrics);
    window.addEventListener('pageshow', renderMetrics);
})();
