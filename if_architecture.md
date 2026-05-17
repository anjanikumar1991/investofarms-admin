# InvestoFarms — Architecture Reference

> One-stop reference for all three repos. Read this before touching any file to minimise context usage.
> Last updated: 2026-05-17

---

## Repos & Local Paths

| Repo | Local path | GitHub | Purpose |
|---|---|---|---|
| Mobile app | `/Users/anjanikumar/investo-mobile-app` | `anjanikumar1991/investo-mobile-app-v2` | React Native investor app |
| Admin dashboard | `/Users/anjanikumar/investofarms-admin-dashboard` | `anjanikumar1991/investofarms-admin-dashboard` | React/Vite admin web app |
| Backend | `/Users/anjanikumar/investofarms-backend` | `anjanikumar1991/investofarms_v02` | FastAPI + PostgreSQL REST API |

---

## Infrastructure & Hosting

| Service | Provider | URL / Connection |
|---|---|---|
| **Backend API** | Railway | `https://investofarms-api-production.up.railway.app` |
| **Admin Dashboard** | Railway (pending setup) | TBD |
| **Database** | Supabase (PostgreSQL) | `DATABASE_URL` set in Railway service variables |
| **Email OTP** | Brevo HTTP API | `https://api.brevo.com/v3/smtp/email` (HTTPS, not SMTP) |
| **SMS OTP** | InstaAlerts (Fonetool) | `https://japi.instaalerts.zone/httpapi/JsonReceiver` — **NOT YET CONFIGURED** |
| **File storage** | Cloudflare R2 | Private bucket, presigned PUT URLs — `app/services/r2_storage.py` |
| **Domain** | investofarms.com | Hosted on MyTrueHost / cPanel |

### Railway Environment Variables — `investofarms-api` service

| Variable | Value / Notes |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL URI |
| `SECRET_KEY` | JWT signing secret |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) |
| `BREVO_API_KEY` | Brevo transactional API key — used for email OTP |
| `EMAIL_FROM` | `InvestoFarms <investofarms-support@investofarms.com>` |
| `EXPOSE_OTP_IN_RESPONSE` | `False` (set `True` for dev testing) |
| `SMS_SENDER_ID` | `INVFMS` |
| `SMS_API_KEY` | **Not set yet** — SMS OTP falls back to console log |
| `CF_ACCOUNT_ID` | Cloudflare account ID for R2 |
| `CF_R2_ACCESS_KEY_ID` | R2 API access key |
| `CF_R2_SECRET_ACCESS_KEY` | R2 API secret key |
| `CF_R2_BUCKET_NAME` | R2 bucket name (private) |
| `SMTP_HOST/USER/PASSWORD/PORT` | Set but unused — Brevo API takes priority |

> ⚠️ Railway shared variables are NOT auto-inherited by services. Add vars directly to the service Variables tab.

---

## Backend (`investofarms-backend`)

### Stack
- **FastAPI** + **SQLAlchemy** (ORM) + **PostgreSQL** (Supabase)
- **Pydantic v2** schemas (`model_dump`, `from_attributes = True`)
- **python-jose** for JWT; **OTP-based auth** (no passwords for mobile users)
- No Alembic — migrations are hand-written scripts in `scripts/`
- DB session: `app/db/session.py` — `DATABASE_URL` env var required (raises RuntimeError if missing)
- JWT: `app/core/jwt.py` — `HS256`, expiry from `ACCESS_TOKEN_EXPIRE_MINUTES`
- Email: `app/core/email_service.py` — uses **Brevo HTTP API** if `BREVO_API_KEY` set, falls back to SMTP. OTP email uses **HTML text logo** (not SVG — Gmail strips SVG); "investo" in `#28947F`, "fa₹ms." in `#EBB912`, stacked, Arial Black bold.
- SMS: `app/core/sms.py` — InstaAlerts JSON API; prints OTP to console if `SMS_API_KEY` not set
- File storage: `app/services/r2_storage.py` — Cloudflare R2 private bucket; `generate_presigned_put_url()` for upload, `generate_presigned_get_url()` for download. Admin doc upload uses backend-proxy flow (avoid browser CORS).

### Entry point
`app/main.py` — registers all routers, adds CORS (`allow_origins=["*"]`), calls `init_db()` on startup.

### Router layout

```
/                     → health check
/v1/...               → api_v1_router  (mobile-facing)
/admin/...            → admin routers  (dashboard-facing, no auth guard currently)
/operator/...         → operator routers
```

### API files — `app/api/` (admin/operator)

| File | Prefix | Purpose |
|---|---|---|
| `admin_farm_projects.py` | `/admin/farm-projects` | CRUD for FarmProject |
| `admin_users.py` | `/admin/users` | List users + PATCH role |
| `admin_investments.py` | `/admin/investments` | Transactions list + approve/reject; UserProject interests list |
| `admin_master.py` | `/admin/crop-cycles`, `/admin/crop-activities` | Global lists with enriched names |
| `admin_land_leases.py` | `/admin/land-leases` | Land lease CRUD |
| `admin_land_parcels.py` | `/admin/land-parcels` | Land parcel CRUD |
| `admin_blocks.py` | `/admin/blocks` | Block CRUD |
| `admin_block_beds.py` | `/admin/block-beds` | Block bed CRUD |
| `admin_bed_types.py` | `/admin/bed-types` | Bed type CRUD |
| `admin_bed_crop_plans.py` | `/admin/bed-crop-plans` | Bed crop plan CRUD |
| `admin_bed_crops.py` | `/admin/bed-crops` | Bed crop CRUD |
| `admin_crops.py` | `/admin/crops` | Crop master list CRUD |
| `admin_project_areas.py` | `/admin/project-areas` | Project area CRUD |
| `admin_project_land_parcels.py` | `/admin/project-land-parcels` | Project ↔ land parcel links |
| `admin_schema.py` | `/admin/schema` | DB schema introspection endpoint |
| `operator_farm_activity.py` | `/operator/...` | Farm activity logging |
| `operator_expense.py` | `/operator/...` | Expense logging |
| `health.py` | `/health` | Health check |
| `users.py` | `/users` | Public user endpoints |

### API files — `app/api/v1/` (mobile-facing, prefix `/v1`)

| File | Prefix | Purpose |
|---|---|---|
| `auth.py` | `/v1/auth` | Phone OTP + Email OTP send/verify → JWT |
| `user.py` | `/v1/user` | Get/update current user profile |
| `kyc.py` | `/v1/kyc` | KYC submission |
| `projects.py` | `/v1/projects` | Public project list (investors) |
| `project_crop_cycles.py` | `/v1/projects/{id}/crop-cycles` etc. | Full crop cycle + activity CRUD with date validation |
| `investments.py` | `/v1/investments` | Create interest, initiate payment session, submit UPI ref, poll status |
| `portfolio.py` | `/v1/portfolio` | Investor portfolio |
| `monitor.py` | `/v1/monitor` | Farm monitoring data |
| `documents.py` | `/v1/documents` | User documents |
| `admin_documents.py` | `/v1/admin/documents` | Admin document management |
| `router.py` | — | Registers all v1 sub-routers |

### Auth endpoints (both phone and email)

```
POST /v1/auth/otp/send          { phone }                        → { session_id }
POST /v1/auth/otp/verify        { phone, session_id, otp }       → { access_token }
POST /v1/auth/email/otp/send    { email }                        → { session_id }
POST /v1/auth/email/otp/verify  { email, session_id, otp }       → { access_token }
GET  /v1/auth/me                                                  → User
POST /v1/auth/complete-profile  { full_name, dob, gender, tnc }  → User
```

### Models — `app/models/`

#### `users` table — `User`
```
id, phone (unique, nullable), email (unique, nullable), hashed_password,
role (default "INVESTOR"), full_name, date_of_birth, gender,
is_profile_completed, tnc_accepted,
is_kyc_verified, kyc_status ("not_submitted"|"pending"|"verified"|"rejected")
```
Roles: `INVESTOR`, `admin`, `supervisor`

#### `otp` table — `OTP`
```
session_id (UUID), phone, otp_code, expires_at (5 min), attempts (max 5), is_verified
```

#### `email_otps` table — `EmailOTP`
```
session_id (UUID), email, otp_code, expires_at (10 min), attempts (max 5), is_verified, created_at
```

#### `distribution_groups` table — `DistributionGroup`
```
id, name, description, is_system_group
```
`Investofarmers` system group — all new users auto-added on registration.

#### `user_group_associations` table — `UserGroupAssociation`
```
user_id (FK), group_id (FK), auto_added (bool)
```

#### `farm_projects` table — `FarmProject`
```
id, project_name, description, image_url, crop_name,
roi_percentage, risk_level, harvest_date,
total_plots, available_plots, acre_per_plot, price_per_acre,
status ("open"|"upcoming"|"closed"|"completed"),
project_start_date, project_end_date,
documentation_fee_per_acre, farm_manage_fee_per_acre, lease_fee_per_acre,
payout_tenure ("Monthly"|"Quarterly"|"Half Yearly"|"Annually"),
is_visible (bool, default true),           ← admin visibility toggle
project_sales_start_date (date, nullable), ← "Sales open on [date]" banner in mobile
created_at
```

#### `user_projects` table — `UserProject`
```
id, user_id (FK→users), project_id (FK→farm_projects),
plot_size, total_acres, cost, documentation_fee,
status ("interested"|"payment_pending"|"active"|"payment_failed"|"cancelled"),
created_at, updated_at
```

#### `transactions` table — `Transaction`
```
id, user_project_id (FK), user_id (FK), project_id (FK),
amount, transaction_type (default "documentation_fee"),
status ("pending"|"approved"|"rejected"|"expired"),
upi_reference, session_expires_at (now + 180s),
approved_by_admin_id, approved_at, created_at, updated_at
```

#### `project_crop_cycles` / `project_crop_activities` — see previous version (unchanged)

#### Other tables (unchanged): `land_leases`, `land_parcels`, `blocks`, `block_beds`, `bed_types`, `crops`, `bed_crop_plans`, `bed_crops`, `kyc_profiles`, `payout_accounts`, `bank_accounts`, `documents`

### Email service — `app/core/email_service.py`
- **Primary**: Brevo HTTP API (`POST https://api.brevo.com/v3/smtp/email`) — requires `BREVO_API_KEY`
- **Fallback**: SMTP (port 587 STARTTLS or 465 SSL) — blocked on Railway/Render, do not rely on
- Never raises — failed email does not break OTP flow
- Email OTP sent via `BackgroundTasks` (async, non-blocking)

### SMS service — `app/core/sms.py`
- InstaAlerts JSON API: `POST https://japi.instaalerts.zone/httpapi/JsonReceiver`
- Requires `SMS_API_KEY` env var; falls back to `print("[DEV] OTP for {phone}: {otp}")` if not set
- **Status: NOT configured on Railway yet** — OTP visible in Railway logs only

### Config — `app/core/config.py`
All settings via `pydantic_settings.BaseSettings`, reads from env vars and `.env` file.

---

## Admin Dashboard (`investofarms-admin-dashboard`)

### Stack
- **React 18** + **TypeScript** + **Vite**
- **react-router-dom v6** (nested routes via `<Outlet>`)
- **axios** for API calls (`src/api/client.ts`)
- **lucide-react** icons
- No component library — custom CSS in `src/styles.css`

### API client — `src/api/client.ts`
```ts
API_BASE_URL = VITE_API_BASE_URL || 'http://127.0.0.1:8000'
// Auth token stored in localStorage as 'admin_token'
```
> ⚠️ `VITE_API_BASE_URL` must be set to `https://investofarms-api-production.up.railway.app` on Railway deployment

### Auth — `src/auth/AuthContext.tsx`
JWT in `localStorage('admin_token')`. Supports both **phone OTP** and **email OTP** login.
- Phone: `POST /v1/auth/otp/send` → `POST /v1/auth/otp/verify`
- Email: `POST /v1/auth/email/otp/send` → `POST /v1/auth/email/otp/verify`

### Routes — `src/App.tsx`
```
/login                          → LoginPage (phone/email toggle)
/ (protected, Layout)
  /                             → DashboardPage
  /users                        → UsersPage
  /projects                     → ProjectsPage
  /crop-planner                 → CropPlannerPage
  /master-data                  → MasterDataPage
  /payments                     → PaymentsPage
```

### Pages — `src/pages/`
| File | Route | Purpose |
|---|---|---|
| `LoginPage.tsx` | `/login` | Phone/email toggle OTP login |
| `DashboardPage.tsx` | `/` | Overview stats |
| `UsersPage.tsx` | `/users` | User table + role management |
| `ProjectsPage.tsx` | `/projects` | Project CRUD |
| `CropPlannerPage.tsx` | `/crop-planner` | Crop cycle + activity planner |
| `MasterDataPage.tsx` | `/master-data` | Schema + table editor |
| `PaymentsPage.tsx` | `/payments` | Transactions approve/reject + Interests |

### Hosting status
- **Not yet deployed to Railway** — pending setup
- Local dev: `npm run dev` in `/Users/anjanikumar/investofarms-admin-dashboard`

---

## Mobile App (`investo-mobile-app`)

### Stack
- **React Native 0.81.4** + **TypeScript** (bare workflow, no Expo)
- **React Navigation v6**: Stack + Bottom Tabs + Drawer
- **Formik + Yup** for form validation
- **axios** with request/response interceptors
- **AsyncStorage** for token persistence

### API base URL — `src/config/api.ts`
```
DEFAULT_API_BASE_URL = 'https://investofarms-api-production.up.railway.app/v1'
```
Also set in `.env.local`.

### Auth flow
1. `LoginScreen` → toggle Phone/Email mode
2. **Phone**: `POST /v1/auth/otp/send` → `OtpVerifyScreen` → `POST /v1/auth/otp/verify`
3. **Email**: `POST /v1/auth/email/otp/send` → `OtpVerifyScreen` → `POST /v1/auth/email/otp/verify`
4. Token stored at `@auth_token` via `StorageService`
5. `GET /v1/auth/me` → user stored at `@user_data`
6. If `is_profile_completed = false` → `CompleteProfileScreen`
7. Otherwise → Main app

### Navigation tree
```
RootNavigator (Stack)
├── Auth → AuthNavigator (Stack)
│   ├── OnboardingScreen
│   ├── LoginScreen          ← phone/email toggle; NO create account link (removed)
│   ├── OtpVerifyScreen      ← mode: 'phone' | 'email'
│   ├── RegisterScreen       ← exists but not linked from LoginScreen
│   ├── ForgotPasswordScreen
│   └── CompleteProfileScreen
└── Main → DrawerNavigator
    ├── MainTabs → TabNavigator (4 Bottom Tabs)
    │   ├── Dashboard → DashboardStackNavigator
    │   │   ├── DashboardScreen
    │   │   ├── PortfolioScreen
    │   │   └── FinancialSummaryScreen
    │   ├── Projects → ProjectsStackNavigator
    │   │   ├── ProjectsScreen
    │   │   ├── ProjectDetailsScreen
    │   │   ├── InvestmentTermsScreen
    │   │   ├── PaymentScreen
    │   │   └── PaymentResultScreen
    │   ├── Monitor → MonitorScreen
    │   └── Chat → ChatScreen
    ├── Profile → ProfileStackNavigator
    ├── Settings → SettingsScreen
    └── Notifications → NotificationsScreen
```

### Key services — `src/services/`
- `api/auth.ts` — `AuthService`: `sendOtp()`, `verifyOtp()`, `sendEmailOtp()`, `verifyEmailOtp()`, `getCurrentUser()`, `updateProfile()`, `logout()`
- `api/client.ts` — axios instance with Bearer token injection
- `portfolioService.ts` — `USE_MOCK=false`
- `updatesService.ts` — `USE_MOCK=false`

### Context — `src/context/AuthContext.tsx`
Provides: `sendOtp`, `verifyOtp`, `sendEmailOtp`, `verifyEmailOtp`, `login`, `logout`, `refreshUser`, `updateProfile`

### Theme & brand colours
```
G900 = #0D3320   G800 = #174A2A   G600 = #2A7D52
GOLD = #F5B800   CREAM = #FAF8F1
```

---

## Current Status (as of 2026-05-17)

### ✅ Done
- Full UI redesign — all screens (Dashboard, Portfolio, Projects, Profile, Monitor, etc.)
- Backend migrated from SQLite to PostgreSQL (Supabase)
- Backend deployed on Railway — live at `investofarms-api-production.up.railway.app`
- Phone OTP auth — working end-to-end (SMS falls back to Railway logs; SMS_API_KEY not set)
- Email OTP auth — backend + mobile + admin dashboard implemented, tested working
- Email delivery via Brevo HTTP API (bypasses SMTP port blocking on cloud hosts)
- OTP email template — HTML text logo (SVG stripped by Gmail), branded colours (`#28947F` / `#EBB912`)
- Mobile app API URL updated to Railway
- Admin dashboard: phone/email toggle login implemented
- `Investofarmers` system distribution group — all new users auto-added
- Cloudflare R2 file storage — private bucket, presigned URLs, backend-proxy upload for admin docs
- `FarmProject` — `is_visible` + `project_sales_start_date` fields; admin toggle + mobile sales banner
- Mobile logo (SVG in InvestoLoader): transparent background, fixed C-path crash, top wheat leaf visible
- `HeaderTitle` — tapping brand logo navigates to HomeScreen from anywhere
- `ProjectDetailsScreen` — floating `<` back button over hero image (top-left, semi-transparent circle)
- `OnboardingScreen` — all slide buttons consistent `#174A2A`
- `LoginScreen` — greeting "Welcome to InvestoFarms 🌾"; create account link removed
- `OtpVerifyScreen` — privacy text: "Your contact information will not be shared with any third parties."
- Android back button: `backBehavior="initialRoute"` on Tab.Navigator
- Safe area / overflow fixes: Notifications, Profile, ProjectDetails headers
- LegalDocumentsScreen created and wired to HomeScreen trust row
- ProfileScreen redesigned — single scrollable page, collapsible sections

### ❌ Pending / Next Steps

1. **Deploy admin dashboard to Railway** — set `VITE_API_BASE_URL` + build command `npm run build`
2. **Configure SMS (InstaAlerts)** — add `SMS_API_KEY` to Railway service variables
3. **KYC flow** — mobile KYC submission needs testing end-to-end
4. **Live portfolio data** — `DashboardScreen` stat tiles still use mock data; wire to real API
5. **Payment flow testing** — UPI reference submission + admin approve/reject end-to-end
6. **Push notifications** — not started
7. **Delete duplicate Railway service** — `investofarms_v02` service is unused, can be deleted

---

## Data flow summary

```
Mobile — Auth (Phone)
  POST /v1/auth/otp/send         { phone }                     → { session_id }
  POST /v1/auth/otp/verify       { phone, session_id, otp }    → { access_token }

Mobile — Auth (Email)
  POST /v1/auth/email/otp/send   { email }                     → { session_id }
  POST /v1/auth/email/otp/verify { email, session_id, otp }    → { access_token }

Mobile — Profile
  GET  /v1/auth/me                                              → User
  POST /v1/auth/complete-profile { full_name, dob, gender }    → User

Mobile — Investing
  GET  /v1/projects
  POST /v1/investments/interest  { project_id, plot_size }     → UserProject
  POST /v1/investments/{up_id}/initiate                        → Transaction (180s)
  POST /v1/investments/{up_id}/submit-upi { upi_reference }   → Transaction
  GET  /v1/investments/{up_id}/status                          → poll status

Admin — Payments
  GET  /admin/investments/transactions
  POST /admin/investments/transactions/{id}/approve
  POST /admin/investments/transactions/{id}/reject
  GET  /admin/investments/interests

Admin — Projects & Planning
  GET/POST/PATCH/DELETE /admin/farm-projects/
  GET/POST/PATCH/DELETE /v1/admin/projects/{id}/crop-cycles
  GET/POST/PATCH/DELETE /v1/admin/project-crop-cycles/{id}/activities
```

---

## Common patterns & conventions

### Backend
- All responses: `{"data": ...}`
- Admin endpoints: **no auth guard** (open)
- v1 endpoints: `get_current_user` dep for protected routes
- New DB columns: migration script in `scripts/`, never Alembic
- Payment session TTL: 180 seconds

### Mobile
- Token storage key: `@auth_token` (JSON-stringified via StorageService)
- User storage key: `@user_data`
- Brand colours defined as inline constants at top of each screen file
- OtpVerifyScreen supports `mode: 'phone' | 'email'` via route params

### Admin
- API response unwrap: `response?.data?.data ?? response?.data`
- All forms: `PATCH` with only changed fields (`exclude_unset=True` on backend)

---

## Quick file lookup

| I want to… | Touch this file |
|---|---|
| Add a new DB column | `app/models/`, `app/schemas/`, new script in `scripts/` |
| Add a new admin API endpoint | `app/api/`, register in `app/main.py` |
| Add a new v1 (mobile) endpoint | `app/api/v1/`, register in `app/api/v1/router.py` |
| Change email sending logic | `app/core/email_service.py` |
| Change SMS sending logic | `app/core/sms.py` |
| Add/change env vars | `app/core/config.py` + Railway service variables |
| Add a dashboard page | `src/pages/`, `src/App.tsx`, `src/components/Layout.tsx` |
| Add a mobile screen | `src/screens/`, wire into navigator in `src/navigation/` |
| Change mobile API URL | `src/config/api.ts` + `.env.local` |
| Change admin API URL | `VITE_API_BASE_URL` env var |
| Approve/reject a payment | Admin dashboard → `/payments` → Transactions tab |
