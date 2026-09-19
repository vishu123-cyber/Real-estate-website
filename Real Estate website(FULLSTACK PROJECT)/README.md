# LuxeEstate

An Express + MongoDB real estate app with property search, buyer accounts and favorites, agent listing management, inquiries, and administrator approval.

## Run locally

Requirements: Node.js 22 or newer and a running MongoDB instance. This project uses Node's built-in `.env` support, so `dotenv` is not needed.

From this folder (the one containing `server.js`):

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd start
```

Open http://localhost:3000. On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`. On macOS/Linux, use `npm`.

`npm start` also runs setup automatically. Setup creates `.env` only when it does not already exist, with a random JWT secret and a random administrator password. Existing configuration is preserved. Keep `.env` private; it is ignored by Git.

MongoDB defaults to `mongodb://127.0.0.1:27017/realestate`. For MongoDB Atlas or another instance, edit `MONGODB_URI` in `.env`. The server connects to MongoDB before accepting requests and reports startup failures. `GET /api/health` reports database readiness.

If the database is empty, optionally add six sample listings:

```powershell
npm.cmd run seed
```

Seeding adds missing samples without deleting or overwriting existing listings. Existing database data is never reset automatically.

## Accounts and workflows

- **Buyers:** `/signup.html` creates a buyer account; `/login.html` signs in. Search/filter listings, open their details, save favorites, and send property inquiries.
- **Agents:** register at `/agent-signup.html` with a name, phone, and 10-30 character license number. An administrator must approve the account before login at `/agent-login.html`. The dashboard manages the agent's own properties, photos, and inquiries.
- **Administrator:** open `/admin-login.html`. The username is the `ADMIN_USERNAME` value in `.env` (generated as `admin`); the password is `ADMIN_PASSWORD` in that same file. The previous hardcoded `admin123` password is no longer used. Approve/reject agents, view listings, remove listings, and read/delete inquiries.

Use a password of at least 8 characters for buyer/agent accounts. An agent can edit or delete only their own listings. Rejected agents immediately lose API access, including with previously issued tokens. Administrators can manage all listings.

Photos accept JPEG, PNG, GIF, or WebP, up to 10 files per request and 5 MB each. Files persist in `public/uploads`; keep this directory with your database backups. Property images and optional maps/fonts loaded from external services need internet access.

Changing `JWT_SECRET` invalidates existing logins. Sign in again if an older browser session stops working.

## Configuration

`.env.example` documents the supported variables:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | HTTP port, defaults to `3000` |
| `JWT_SECRET` | Random secret, at least 32 characters |
| `JWT_EXPIRES_IN` | Token lifetime, defaults to `1d` |
| `ADMIN_USERNAME` | Administrator login name |
| `ADMIN_PASSWORD` | Administrator password, at least 8 characters |
| `NODE_ENV` | `development` locally; `production` on a server |

Environment variables supplied by your host take precedence over `.env`. In production, supply your own secrets; setup does not generate production configuration. This app stores uploads on disk, so use a Node host with persistent storage for the full upload workflow. A serverless deployment needs persistent image storage integration; the included Vercel configuration alone does not provide that. No deployment is performed by these local setup commands.

## Checks and development

```powershell
npm.cmd test
npm.cmd run verify
npm.cmd run dev
```

Tests require local MongoDB and use a uniquely named `realestate_test_*` database that is removed afterwards. They cover signup/login, approval, access control, listing CRUD/filtering, favorites, inquiries, uploads, and revoked agent access. They do not use your `realestate` data. `verify` checks the running server and listing data without changing it; `dev` restarts the server when backend files change.

`node list_users.js` lists account metadata without password hashes. To reset a specific account password, set `RESET_EMAIL` and `RESET_PASSWORD` in the command environment, then run `node reset_password.js`. This updates only that account; there is no hardcoded target or default password.
