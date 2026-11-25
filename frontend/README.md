# PDP – Frontend (Presentation Layer)

This folder is the **presentation layer** of the Courier Management System (CMS):
the HTML pages, CSS and JavaScript the user sees in the browser, including the Leaflet.js maps.

> **Status:** Sprint 1 prototype. All data is still kept in the browser (`localStorage`).
> In Sprint 2 the pages are connected step by step to the PHP REST API in [`../backend`](../backend).

---

## Pages

| File | Who uses it | What it does |
|---|---|---|
| `index.html` | everyone | Redirects to the homepage |
| `0_homepage.html` | public (not logged in) | Landing page with public statistics (routes today, couriers, vehicles by type) |
| `1_login.html` | everyone | Login and registration (client, courier, staff) |
| `2_client.html` | client | Place orders, see price, track orders on a map |
| `3_courier.html` | courier | Pick orders, build a route, navigate on the map, proof of delivery, manage vehicles |
| `4_admin.html` | admin | KPIs/dashboard, manage users, approve staff |
| `5_staff.html` | staff | Approve couriers and vehicles, alerts for expired insurance/inspection |
| `6_team.html` | public | Team members |
| `7_customerservice.html` | public | Customer service / contact page |

After login each role is sent to its own page (see `rolePages` in `login.js`).

## Scripts

| File | Used by | Purpose |
|---|---|---|
| `data.js` | most pages | Shared sample data, order statuses, FEUP depot location and `pdpLoad`/`pdpSave` helpers |
| `login.js` | `1_login.html` | Login, register, redirect by role |
| `homepage.js` | `0_homepage.html` | Public metrics |
| `client.js` | `2_client.html` | Order form, pricing, Leaflet map + OSRM route |
| `courier.js` | `3_courier.html` | Available orders, route pooling, map, e-POD (signature/photo) |
| `scripts.js` | `4_admin.html`, `5_staff.html` | Shared dashboard data and staff approval logic |
| `admin.js` | `4_admin.html` | Admin KPIs and user management |
| `staff.js` | `5_staff.html` | Courier/vehicle approvals |

**Styles:** `style.css` is used by every page; `admin.css` adds the admin dashboard layout.

**Images:** `pigeon_logo.png` (logo), `delivery_pic.jpg` (homepage).

## External libraries / APIs

- **Leaflet 1.9.4** (from unpkg) – maps on the client and courier pages
- **OpenStreetMap** tiles – map background
- **OSRM** (`router.project-osrm.org`) – road route and distance between origin and destination

An internet connection is needed for the maps to load.

---

## How to run

### Sprint 1 prototype (no backend)
Open the folder in VS Code and start **Live Server** on `index.html`
(the port is set to `5501` in `.vscode/settings.json`).

Demo accounts (prototype only):

| Role | Username | Password |
|---|---|---|
| Client | `client` | `client123` |
| Courier | `courier` | `courier123` |
| Staff | `staff` | `staff123` |
| Admin | `admin` | `admin123` |

To reset the prototype data, clear the site's `localStorage` in the browser DevTools
(Application → Local Storage).

### Sprint 2 (with PHP backend)
Live Server **cannot run PHP**. Serve the frontend and backend from the **same origin**
so the login session cookie works:

- **XAMPP:** place the repository in `htdocs/` and open `http://localhost/<repo-folder>/frontend/`
- **or** from the repository root: `php -S localhost:8000` and open `http://localhost:8000/frontend/`

Import [`../database/schema.sql`](../database/schema.sql) in phpMyAdmin first.
All sample accounts in the database use the password `password`
(e.g. `admin`, `staff`, `carla`, `miguel`).

---

## Sprint 2 migration plan (localStorage → REST API)

Every page currently reads and writes `localStorage` (`pdpOrders`, `pdpVehicles`,
`registeredUsers`, `currentUser`, `pendingStaff`, `adminUsers`).
These are replaced by calls to the backend:

1. Add a small `api.js` with one `fetch` wrapper (JSON, `credentials: 'same-origin'`, error handling).
2. Replace the storage helpers in `data.js` (`pdpGetOrders`, `pdpSaveOrders`, …) with API calls.
3. `login.js` → `POST /api/auth/login` and `POST /api/auth/register` (passwords are hashed on the server).
4. Remove the hard-coded demo users and sample data once the endpoints work.

The frontend must **never** calculate prices or validate capacity on its own —
it only displays what the backend returns (business rules live in the PHP service layer).

## Conventions

- Page files are numbered (`0_` … `7_`) so they appear in navigation order.
- One JS file per page; shared code goes in `data.js` (later `api.js`).
- No frameworks – plain HTML, CSS and JavaScript.
