# campusHub Backend (backend2)

A TypeScript Node.js backend for the campusHub application. This project provides authentication, user management, file uploads, AI-assisted PDF upload processing, search utilities, and admin/lecturer resources.

**Core Tech**: Node.js, TypeScript, Express, MongoDB (assumed)

**Quick Start**
- Install dependencies:

```bash
npm install
```

- Development (watch + restart):

```bash
npm run dev
```

- Build and run (production):

```bash
npm run build
npm start
```

(Adjust scripts to match `package.json` in the `backend2` folder if needed.)

**Environment**
Create a `.env` file with the necessary variables. Typical values used by this backend:

- `PORT` — server port (e.g. `4000`)
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret
- `REFRESH_TOKEN_SECRET` — refresh token secret
- Any email/SMTP credentials if `email.send.ts` is used

**Project Structure (key files & folders)**
- `backend2/src/` — application source
  - `Auth/` — authentication helpers (tokens, OTP, rate limiting, email)
  - `AuthRoutes/` — login, signup, logout, admin auth routes
  - `Admin_Resources/` — admin-only endpoints (get users, notifications, recover users)
  - `DatabaseRoutes/` — DB connection (`connect.ts`)
  - `Resources/` — upload handlers, AI PDF processing, search utilities
  - `lecturer_resources/` — lecturer account creation & login
  - `models/` — Mongoose/ORM models (`user.model.ts`, `token.model.ts`, `notifications.model.ts`, `user.upload.model.ts`)
  - `types/` — custom TypeScript types and express augmentation
  - `server.ts` — application entrypoint
- `backend2/users_uploads/` — stored uploaded files
- `backend2/campusHub_AI_uploads/` — AI-processed uploads

**Important Endpoints (overview)**
- Authentication:
  - `/auth/sign_up` — create account
  - `/auth/login` — user login
  - `/auth/logout` — logout
  - `/auth/logoutAll` — revoke sessions
  - `/auth/refresh-token` — refresh JWT access
  - Admin routes: `/auth/adminLogin`, `/auth/logoutAdmin`, `/auth/Is_admin_logged`

- Admin resources:
  - `/admin/getUsers` — list users
  - `/admin/public_notifications` — create/send notifications
  - `/admin/recover_users` — recover user accounts

- Uploads & Resources:
  - `/resources/upload` — user uploads
  - `/resources/uploadAIpdf` — AI PDF processing flow
  - `/resources/getPDF` — fetch stored PDFs
  - Search endpoints (deep and simple search)

(Exact route paths may vary; check `backend2/src/AuthRoutes` and `backend2/src/Resources` for exact names.)

**Models**
- Users, tokens, file-upload metadata, notifications — see `backend2/src/models` for schema details.

**Notes & Next Steps**
- Verify scripts in `backend2/package.json` and update the Quick Start commands accordingly.
- Add example `.env` file and a Postman collection or OpenAPI spec for easier onboarding.

**Contributing**
- Fork, create a feature branch, and open a PR with tests where applicable.

**License**
- Add a LICENSE file or include licensing details here.

---

This `README.md` is a concise overview to get a developer started working with the `backend2` codebase. For detailed API docs, run the server locally and inspect routes or add an OpenAPI/Swagger specification.
