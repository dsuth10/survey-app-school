# Hosting the survey app on a school LAN

## Why use a production build for the classroom?

The stack is **React + Vite** (dev on port **3005**) and **Express** (port **3006**). In dev, Vite proxies `/api` to `http://localhost:3006` **on the teacher machine only** (the proxy runs server-side). The frontend uses **relative** `/api/...` URLs, so students who open `http://<teacher-ip>:3005` still talk to the teacher’s host for API calls.

For class use, **serving the built app from Express** is still the better default: **one port**, no Vite dev server, same origin for UI and API, and fewer moving parts.

**Do not** use Python’s `http.server` for this app: you need Express for `/api`, SQLite, and sessions.

---

## Recommended: one command (prints your LAN URLs)

From the **repository root**:

```bash
npm run serve:lan
```

This runs `npm run build` in `frontend/`, then starts the backend in production and prints `http://<your-LAN-IP>:3006` lines for students.

---

## Alternative: `.env` + `npm start` (matches a manual production setup)

### 1. Build the frontend

```bash
cd frontend
npm run build
```

Or from the repo root: `npm run build --prefix frontend`.

This creates `frontend/dist/`.

### 2. Configure the backend

Copy the example env file and edit it:

```bash
cd backend
cp .env.example .env
```

Set at least:

- `NODE_ENV=production` — required so Express serves `frontend/dist`
- `PORT=3006` — optional (default is 3006)
- `SESSION_SECRET` — use a long random string for real classroom use

### 3. Start the server

```bash
cd backend
npm start
```

Or from the **repository root** (after a build):

```bash
npm run classroom
```

(`classroom` = build frontend + `start:prod`, which forces production if `.env` forgot `NODE_ENV`.)

Students open **`http://<host-LAN-IPv4>:3006/`** (same port for pages and `/api`).

---

## Find your LAN IP

**Windows (PowerShell / CMD):**

```text
ipconfig
```

Use the **IPv4** address of the active Wi‑Fi or Ethernet adapter (e.g. `192.168.x.x`, `10.x.x.x`).

**Linux (e.g. Linux Mint):**

```bash
ip -4 addr show
```

or:

```bash
hostname -I
```

---

## Firewall

**Windows:** *Windows Defender Firewall → Advanced settings → Inbound Rules* — allow **TCP** on your app port (default **3006**) for the **Private** profile.

**Linux (ufw):**

```bash
sudo ufw allow 3006/tcp
sudo ufw reload
```

---

## Optional: keep the server running (PM2)

Useful if closing the terminal would stop Node.

```bash
npm install -g pm2
cd backend
pm2 start npm --name survey-app -- run start:prod
pm2 save
```

Ensure `frontend/dist` exists (`npm run build` in `frontend`) and `backend/.env` is set for production before starting.

---

## Development vs classroom

| Mode | What you run | Typical URL on the host |
|------|----------------|---------------------------|
| **Development** | From repo root: `npm run dev` (backend + Vite) | `http://localhost:3005` (API proxied to 3006 on the same PC) |
| **Classroom (LAN)** | `npm run serve:lan` or build + `npm run classroom` / `start:prod` | `http://<LAN-IP>:3006` for everyone |

For dev access from other machines on the LAN, Vite is configured with **`host: true`** so `http://<LAN-IP>:3005` works while the backend listens on **3006**; you still need firewall rules for both ports. Prefer **production on 3006** for lessons.

---

## Host checklist

1. **Student URL** — They must use **`http://<your-LAN-IP>:3006`**, not `localhost` on their own computer.
2. **Same network** — Host and clients must reach each other (watch for **Wi‑Fi client isolation** on school networks).
3. **Rebuild after UI changes** — Run `npm run build` in `frontend` (or `serve:lan` / `classroom`) before class if you changed the React app.
