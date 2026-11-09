// --- 1. Data för webbplatsen ---
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

const dispatchData = [
{ id: "RR-1042", recipient: "Ana Silva", address: "Rua Augusta 120, Lisboa", status: "In transit", courier: "Miguel" },
{ id: "RR-1041", recipient: "João Costa", address: "Av. da Liberdade 45, Lisboa", status: "Delivered", courier: "Sofia" },
{ id: "RR-1039", recipient: "Marta Reis", address: "Rua do Carmo 8, Lisboa", status: "Pending", courier: "Assign..." },
{ id: "RR-1036", recipient: "Pedro Lopes", address: "Praça do Comércio 2, Lisboa", status: "Delivered", courier: "Miguel" }
];


// --- 2. Renderingsfunktioner ---

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

function renderUsers() {
const container = document.getElementById("users-container");
if (!container) return;

let users = JSON.parse(localStorage.getItem("adminUsers")) || dashboardData.users;

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

function renderDispatchTable() {
const tbody = document.getElementById("dispatch-table-body");
if (!tbody) return;

tbody.innerHTML = dispatchData.map(item => {
  let badgeClass = "badge-pending";
  if (item.status === "In transit") badgeClass = "badge-transit";
  if (item.status === "Delivered") badgeClass = "badge-delivered";

  return `
    <tr>
      <td class="order-id">${item.id}</td>
      <td style="font-weight: 600;">${item.recipient}</td>
      <td style="color: #64748b;">${item.address}</td>
      <td><span class="${badgeClass}">${item.status}</span></td>
      <td>
        <select class="courier-select">
          <option ${item.courier === "Assign..." ? "selected" : ""}>Assign...</option>
          <option ${item.courier === "Miguel" ? "selected" : ""}>Miguel</option>
          <option ${item.courier === "Sofia" ? "selected" : ""}>Sofia</option>
          <option ${item.courier === "João" ? "selected" : ""}>João</option>
        </select>
      </td>
    </tr>
  `;
}).join('');
}

function renderStaffApprovals() {
const container = document.getElementById("staff-approvals-container");
if (!container) return;

let pendingStaff = JSON.parse(localStorage.getItem("pendingStaff")) || [
  { name: "Johan Lindström", role: "Logistics Coordinator" },
  { name: "Elin Berg", role: "Fleet Assistant" }
];

if (pendingStaff.length === 0) {
  container.innerHTML = "<p style='color: #7a869a; font-size: 14px; padding: 10px 0;'>No pending staff approvals at the moment.</p>";
  return;
}

container.innerHTML = pendingStaff.map((staff, index) => `
  <li class="user-item">
    <div>
      <div class="user-name">${staff.name}</div>
      <div class="user-role">${staff.role}</div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button onclick="approveStaff(${index})" class="badge badge-active" style="cursor: pointer; border: none; padding: 8px 16px;">Approve</button>
      <button onclick="rejectStaff(${index})" class="badge badge-disabled" style="cursor: pointer; padding: 8px 16px;">Reject</button>
    </div>
  </li>
`).join('');
}


// --- 3. Hantera godkännande / nekande ---

window.approveStaff = function(index) {
let pendingStaff = JSON.parse(localStorage.getItem("pendingStaff")) || [];
let users = JSON.parse(localStorage.getItem("adminUsers")) || dashboardData.users;

const approved = pendingStaff[index];

// Lägg till i användarlistan med status ACTIVE
users.push({
  name: approved.name.toUpperCase(),
  role: approved.role.toUpperCase(),
  status: "ACTIVE"
});

// Ta bort från väntande-listan
pendingStaff.splice(index, 1);

// Spara i localStorage
localStorage.setItem("adminUsers", JSON.stringify(users));
localStorage.setItem("pendingStaff", JSON.stringify(pendingStaff));

// Uppdatera gränssnittet
renderUsers();
renderStaffApprovals();

alert(`Approved ${approved.name} and moved to Users!`);
};

window.rejectStaff = function(index) {
let pendingStaff = JSON.parse(localStorage.getItem("pendingStaff")) || [];
alert(`Rejected ${pendingStaff[index].name}.`);
pendingStaff.splice(index, 1);
localStorage.setItem("pendingStaff", JSON.stringify(pendingStaff));
renderStaffApprovals();
};


// --- 4. Händelselyssnare vid sidladdning ---

document.addEventListener("DOMContentLoaded", () => {
// Kör befintliga dashboard-funktioner
renderStats(dashboardData.stats);
renderChart(dashboardData.weeklyDeliveries);
renderUsers();
renderDispatchTable();
renderStaffApprovals();

// Hantera formuläret för att lägga till personal (på Staff-sidan)
const staffForm = document.getElementById("add-staff-form");
if (staffForm) {
  staffForm.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const name = document.getElementById("new-staff-name").value;
    const role = document.getElementById("new-staff-role").value;
    
    let pendingStaff = JSON.parse(localStorage.getItem("pendingStaff")) || [
      { name: "Johan Lindström", role: "Logistics Coordinator" },
      { name: "Elin Berg", role: "Fleet Assistant" }
    ];
    
    pendingStaff.push({ name, role });
    localStorage.setItem("pendingStaff", JSON.stringify(pendingStaff));
    
    alert(`Successfully added ${name} to Pending Staff Approvals!`);
    staffForm.reset();
  });
}
});