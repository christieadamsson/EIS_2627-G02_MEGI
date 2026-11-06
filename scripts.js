// Data lists for the site
const dashboardData = {
    stats: [
      { title: "Revenue (week)", value: "€12.4K" },
      { title: "Deliveries", value: "474" },
      { title: "Active users", value: "3" },
      { title: "On-time", value: "99%" }
    ],
    weeklyDeliveries: [
      { day: "Mon", count: 40 },
      { day: "Tue", count: 55 },
      { day: "Wed", count: 48 },
      { day: "Thu", count: 75 },
      { day: "Fri", count: 62 },
      { day: "Sat", count: 90 },
      { day: "Sun", count: 95 }
    ],
    users: [
      { name: "MARCUS WALTER", role: "TEAM MEMBER", status: "ACTIVE" },
      { name: "PRISCILLA SI EN WEE", role: "TEAM MEMBER", status: "ACTIVE" },
      { name: "MARC ALEXANDER FERSCHKE", role: "TEAM MEMBER", status: "ACTIVE" },
      { name: "CHRISTIE ADAMSSON", role: "TEAM MEMBER", status: "DISABLED" }
    ]
  };
  
  // Funktions building the dashboard components
  function renderStats(stats) {
    const container = document.getElementById("stats-container");
    if (!container) return;
    container.innerHTML = stats.map(stat => `
      <div class="stat-card">
        <div class="stat-title">${stat.title}</div>
        <div class="stat-value">${stat.value}</div>
      </div>
    `).join('');
  }
  
  function renderChart(deliveries) {
    const container = document.getElementById("chart-container");
    if (!container) return;
    const maxCount = Math.max(...deliveries.map(d => d.count));
  
    container.innerHTML = deliveries.map(d => {
      const heightPercent = (d.count / maxCount) * 100;
      return `
        <div class="bar-group">
          <div class="bar" style="--bar-height: ${heightPercent}%;"></div>
          <span class="bar-day">${d.day}</span>
        </div>
      `;
    }).join('');
  }
  
  function renderUsers(users) {
    const container = document.getElementById("users-container");
    if (!container) return;
    container.innerHTML = users.map(user => {
      const isActive = user.status === "ACTIVE";
      return `
        <li class="user-item">
          <div>
            <div class="user-name">${user.name}</div>
            <div class="user-role">${user.role}</div>
          </div>
          <span class="badge ${isActive ? 'badge-active' : 'badge-disabled'}">
            ${user.status}
          </span>
        </li>
      `;
    }).join('');
  }
  
  // site starts 
  document.addEventListener("DOMContentLoaded", () => {
    renderStats(dashboardData.stats);
    renderChart(dashboardData.weeklyDeliveries);
    renderUsers(dashboardData.users);
  });