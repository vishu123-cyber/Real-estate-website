# LuxeEstate — Real Estate Website

A full stack real estate application for browsing homes, managing property listings, and connecting buyers with agents. Built with HTML, CSS, JavaScript, Express, and MongoDB, with Vercel Blob for property photos in the deployed application.

**Website:** [realestatewebsite-sable.vercel.app](https://realestatewebsite-sable.vercel.app/)

## Features

- Browse properties with photos, descriptions, prices, bedrooms, and bathrooms.
- Search by location, property type, and budget.
- View property details and map locations when coordinates are provided.
- Register and sign in as a buyer; save favorite properties.
- Send general or property enquiries using a name, email address, and message without logging in for general enquiries. Property enquiries require login. General enquiries go only to the administrator; property enquiries go only to the listing agent.
- Register as an agent with contact details and a license ID; administrator approval is required before agent login.
- Create, edit, and delete listings through the agent dashboard.
- View enquiries associated with an agent's properties.
- Approve or reject agents and manage listings and enquiries through the admin dashboard.
- Store uploaded property images in Vercel Blob and their public URLs in MongoDB.

## Technology

| Component | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose; MongoDB Atlas for deployment |
| Authentication | JSON Web Tokens, bcryptjs |
| Image uploads | Multer, Vercel Blob |
| Hosting | Vercel |
| Tests | Node.js built-in test runner |

## Project structure

```text
.
├── README.md
├── package.json                     # npm workspace and root commands
├── package-lock.json
├── server.js                        # Vercel entry point
├── vercel.json
├── VERCEL-BLOB-SETUP.md
└── Real Estate website(FULLSTACK PROJECT)/
    ├── config/                      # Environment and database configuration
    ├── middleware/                  # Authentication, validation, uploads
    ├── models/                      # MongoDB models
    ├── routes/                      # API endpoints
    ├── services/                    # Image storage integration
    ├── public/                      # Pages, styles, scripts, local images
    ├── scripts/                     # Local setup
    ├── test/
    ├── .env.example
    ├── package.json
    └── server.js                    # Express application
```

## Run locally

Install **Node.js 22 or newer** and provide a running MongoDB instance, either locally or through Atlas.

```bash
git clone https://github.com/vishu123-cyber/Real-estate-website.git
cd Real-estate-website
npm ci
npm run setup
npm start
```

Open **http://localhost:3000**. On Windows PowerShell, use `npm.cmd` instead of `npm` if the execution policy blocks `npm.ps1`.

Setup creates a private `.env` inside the application folder with a random JWT secret and administrator password. The default admin username is `admin`. Read your generated credentials from that local file. Existing `.env` files are preserved, and `npm start` runs setup automatically.

Local MongoDB defaults to `mongodb://127.0.0.1:27017/realestate`. To use Atlas locally, update `MONGODB_URI` in the application folder's `.env` file.

Never commit `.env`, database credentials, JWT secrets, or storage tokens.

## Environment variables

Set these in the application folder's `.env` for local development or in **Vercel → Environment Variables → Production** for deployment.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string; use Atlas or another reachable database on Vercel |
| `JWT_SECRET` | Random secret of at least 32 characters |
| `JWT_EXPIRES_IN` | Token lifetime; defaults to `1d` |
| `ADMIN_USERNAME` | Website administrator username |
| `ADMIN_PASSWORD` | Website administrator password; at least 8 characters |
| `NODE_ENV` | `development` locally; `production` for deployment |
| `PORT` | Local HTTP port; defaults to `3000` |
| `BLOB_STORE_ID` | Connected Vercel Blob store; used with Vercel's managed OIDC credentials |
| `BLOB_READ_WRITE_TOKEN` | Alternative Blob authentication, including local development with Blob |

Atlas URI format, using placeholders rather than real credentials:

```text
mongodb+srv://DATABASE_USERNAME:ENCODED_PASSWORD@CLUSTER.mongodb.net/realestate
```

Use the credentials of an **Atlas database user**. URL encode reserved characters in the password. Environment variables supplied by the host take precedence over the local `.env` file.

## Deploy to Vercel

1. Import this GitHub repository into Vercel. Keep the project root at the repository root; its `server.js` provides a function entry point without spaces in the name.
2. Create a MongoDB Atlas cluster and database user. Configure Atlas network access to allow the deployment to connect.
3. Add `MONGODB_URI`, `JWT_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` for Production. Do not use a localhost MongoDB address in Vercel.
4. In the project's **Storage** page, create a **Public Blob** store and connect it to the project for Production. Keep the default `BLOB` environment variable prefix. A connection using `BLOB_STORE_ID` supports managed authentication; a read-write token is also supported.
5. Deploy the latest commit. After changing environment variables or connecting storage, redeploy the latest Production deployment.
6. Open the website and verify login, listings, and a property image upload.

See [Vercel Blob setup](./VERCEL-BLOB-SETUP.md) for more image storage details.

## Accounts and property listings

| Role | Pages and workflow |
| --- | --- |
| Buyer | `/signup.html`, `/login.html`; browse properties, save favorites, and send enquiries |
| Agent | `/agent-signup.html`, `/agent-login.html`, `/agent-dashboard.html`; register, receive admin approval, and manage listings |
| Admin | `/admin-login.html`, `/admin-dashboard.html`; log in with the configured `ADMIN_USERNAME` and `ADMIN_PASSWORD` |

Use your own agent registration/license ID when registering a real agent. The administrator reviews and approves agent registrations; the application does not automatically verify licenses with a government registry.

A new Atlas database initially contains no application listings. Add properties through an approved agent account. Your existing local data and Atlas's sample datasets are not automatically converted into website listings.

## Image storage

On Vercel, uploads are received in memory and stored in **public Vercel Blob storage**. MongoDB stores the image URLs. Local development without Blob credentials stores uploaded files in `public/uploads`.

- Supported formats: JPEG, PNG, WebP, and GIF.
- Maximum: **10 images totaling 4 MB per property save**.
- Resize or compress larger selections before uploading.
- New images replace the existing image set when editing a listing.
- Failed saves clean up newly stored images. Replaced or deleted images managed by the app are removed from storage.
- Public listing photos are accessible to anyone with their image URL.

## Development and verification

```bash
npm run dev
npm test
```

Integration tests require MongoDB and use an isolated `realestate_test_*` database that is removed afterward. They cover authentication, agent approval, access permissions, properties, favorites, enquiries, and uploads.

Run the focused Blob upload tests without MongoDB:

```bash
node --test "Real Estate website(FULLSTACK PROJECT)/test/blob-upload.test.js"
```

`GET /api/health` reports current database readiness. Listing requests establish the database connection on Vercel, so an initial health check can report disconnected before a database-backed request has run.

## Troubleshooting

| Issue | What to check |
| --- | --- |
| Database unavailable | Atlas database credentials, the Production `MONGODB_URI`, and the Atlas IP access list |
| MongoDB authentication error | Confirm the database username and password in the URI match the Atlas database user |
| Missing JWT or admin configuration | Add the required Production variables and redeploy |
| No homes found | Clear search filters and confirm the `realestate` database contains property listings |
| Image storage is not configured | Connect a Public Blob store to Production and redeploy |
| Upload is too large | Keep the combined selected image size at or below 4 MB |
| Forgot admin credentials | Set new `ADMIN_USERNAME` and `ADMIN_PASSWORD` values in Vercel, then redeploy |

Use **Vercel → latest deployment → Logs** to inspect runtime failures. Do not post passwords, JWT secrets, Blob tokens, or full database connection strings in issues or screenshots.
