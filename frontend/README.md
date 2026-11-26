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
| `4_admin.html` | admin | KPIs/dashboard, **manage staff** (approve/reject, add, edit, disable/enable, remove) |
| `5_staff.html` | staff | **Manage couriers** (approve/reject, edit, disable/enable, remove), approve vehicles, document alerts |
| `6_team.html` | public | Team members |
| `7_customerservice.html` | public | Customer service / contact page |
| `8_profile.html` | any logged-in user | **My account**: see and edit your own details (name, username, email, phone, NIF, citizen card) and change your password |

After login each role is sent to its own page (see `rolePages` in `login.js`).

## Scripts

| File | Used by | Purpose |
|---|---|---|
| `data.js` | all pages with data | Shared sample data, order statuses, FEUP depot, storage helpers and the **single account list** (`pdpGetUsers`, `pdpSetUserStatus`, `pdpRemoveUser`) |
| `people.js` | `4_admin.html`, `5_staff.html` | Reusable "manage people" component: admin → staff, staff → couriers |
| `login.js` | `1_login.html` | Login, register, redirect by role |
| `homepage.js` | `0_homepage.html` | Public metrics |
| `client.js` | `2_client.html` | Order form, pricing, Leaflet map + OSRM route |
| `courier.js` | `3_courier.html` | Available orders, route pooling, map, e-POD (signature/photo) |
| `admin.js` | `4_admin.html` | Admin KPIs, deliveries chart, sets up staff management |
| `staff.js` | `5_staff.html` | Vehicle approvals, document alerts, sets up courier management |
| `profile.js` | `8_profile.html` | Own account page; a new name is also updated on your orders/vehicles |

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
Open the repository in VS Code and click **Go Live** – the root `index.html` sends you straight to the homepage
(the port is set to `5501` in `.vscode/settings.json`).

Demo accounts (prototype only):

| Role | Name | Email (login) | Password |
|---|---|---|---|
| Client | Carla Cliente | `client@pdp.pt` | `client123` |
| Courier | Constantino Courier | `courier@pdp.pt` | `courier123` |
| Courier | Coraline Cargo | `coraline@pdp.pt` | `coraline123` |
| Courier | Confucius Courier | `confucius@pdp.pt` | `confucius123` |
| Courier | Cleopatra Carrier | `cleopatra@pdp.pt` | `cleopatra123` |
| Staff | Sofia Staff | `staff@pdp.pt` | `staff123` |
| Admin | António Admin | `admin@pdp.pt` | `admin123` |
| **Master (temporary, testing only)** | Master Tester | `master@pdp.pt` | `master123` |

**Master account (temporary):** while logged in as master, a **"View as"** menu appears in the header.
Pick any account to act as them without a password; opening a page of another role switches
automatically instead of showing "No access". Turn it off before handing in:
`PDP_MASTER_ENABLED = false` in `js/data.js` (and remove the account from `PDP_DEMO_USERS`).

Each extra courier has one approved vehicle (Coraline: van, Confucius: moto, Cleopatra: truck)
and one finished delivery in a different part of Porto (Matosinhos, Gaia, Foz). For WP3 that last drop-off is the courier's current location.

There are also accounts waiting for approval: staff `johan@pdp.pt` / `elin@pdp.pt` (approve on the admin page)
and courier `pedro.novo@pdp.pt` (approve on the staff page).

### Who manages whom

| Manager | Manages | Actions |
|---|---|---|
| Admin (`4_admin.html`) | Staff | Approve/reject registrations and staff proposals, add staff directly, edit, disable/enable, remove |
| Staff (`5_staff.html`) | Couriers | Approve/reject registrations, edit details (incl. name), disable/enable, remove |
| Staff (`5_staff.html`) | Clients | Edit personal details (incl. name) |
| Staff (`5_staff.html`) | Staff | **Propose** new staff only – the admin approves or rejects them |

**Page access:** `2_client.html`, `3_courier.html`, `5_staff.html` and `4_admin.html` only work for a logged-in,
active account with that role (`<body data-require-role="...">`, checked in `data.js`). Everyone else
sees a "No access" message with a login link that brings them back afterwards.

**Parcel tracking (Sprint 2):** only registered clients can track, and only their own parcels.
The homepage tracking box asks visitors to log in or register first.
The header "Login" button turns into "Log out" while someone is logged in.

A disabled account cannot log in. Disabling or removing a courier sends their unfinished
orders back to "Available orders"; removing a courier also removes their vehicles.

To reset the prototype data, clear the site's `localStorage` in the browser DevTools
(Application → Local Storage).

### Sprint 2 (with PHP backend)
Live Server **cannot run PHP**. Serve the frontend and backend from the **same origin**
so the login session cookie works:

- **XAMPP:** place the repository in `htdocs/` and open `http://localhost/<repo-folder>/frontend/html/`
- **or** from the repository root: `php -S localhost:8000` and open `http://localhost:8000/frontend/html/`

Import [`../database/schema.sql`](../database/schema.sql) in phpMyAdmin first.
All sample accounts in the database use the password `password`
(e.g. `admin`, `staff`, `carla`, `miguel`).

## WP3 – Dispatch flow (Sprint 2)

```
Client creates shipment ──► pays (WP1) ──► order = "Pending"   ← dispatch starts HERE, not at creation
                                              │
                    nearest courier WITH capacity gets the offer ── 60 s ──► accepts → order is theirs
                                              │                         └─► declines / no answer
                                              ▼
                    next-nearest courier with capacity ─────────── 60 s ──► …
                                              │
                    nobody left (all declined or no one has room)
                                              ▼
                    order stays in the shared list, any courier with room can take it
```

---

## Sprint 2 migration plan (localStorage → REST API)

Every page currently reads and writes `localStorage` (`pdpOrders`, `pdpVehicles`,
`registeredUsers`, `currentUser`).
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
