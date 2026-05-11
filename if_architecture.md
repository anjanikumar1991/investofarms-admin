# InvestoFarms — Architecture Reference

> One-stop reference for all three repos. Read this before touching any file to minimise context usage.
> Last updated: 2026-05-10

---

## Repos & Local Paths

| Repo | Local path | Purpose |
|---|---|---|
| Mobile app | `/Users/anjanikumar/investo-mobile-app` | React Native investor app |
| Admin dashboard | `/Users/anjanikumar/investofarms-admin-dashboard` | React/Vite admin web app |
| Backend | `/Users/anjanikumar/investofarms-backend` | FastAPI + SQLite REST API |

---

## Backend (`investofarms-backend`)

### Stack
- **FastAPI** + **SQLAlchemy** (ORM) + **SQLite** (`investofarms.db` at repo root)
- **Pydantic v2** schemas (`model_dump`, `from_attributes = True`)
- **python-jose** for JWT; **OTP-based auth** (no passwords for mobile users)
- No Alembic — migrations are hand-written scripts in `scripts/`
- DB session: `app/db/session.py` — `DATABASE_URL` from `.env`, falls back to `sqlite:///./investofarms.db`
- JWT: `app/core/jwt.py` — `HS256`, 24-hour expiry, secret from `app/core/config.py`

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
| `auth.py` | `/v1/auth` | OTP send/verify → JWT |
| `user.py` | `/v1/user` | Get/update current user profile |
| `kyc.py` | `/v1/kyc` | KYC submission |
| `projects.py` | `/v1/projects` | Public project list (investors) |
| `project_crop_cycles.py` | `/v1/projects/{id}/crop-cycles`, `/v1/admin/projects/{id}/crop-cycles`, `/v1/project-crop-cycles/{id}/activities`, `/v1/admin/project-crop-cycles/{id}/activities`, `/v1/admin/project-crop-activities/{id}` | Full crop cycle + activity CRUD with date validation |
| `investments.py` | `/v1/investments` | Create interest, initiate payment session, submit UPI ref, poll status |
| `portfolio.py` | `/v1/portfolio` | Investor portfolio |
| `monitor.py` | `/v1/monitor` | Farm monitoring data |
| `documents.py` | `/v1/documents` | User documents |
| `admin_documents.py` | `/v1/admin/documents` | Admin document management |
| `router.py` | — | Registers all v1 sub-routers |

### Models — `app/models/`

#### `users` table — `User`
```
id, phone (unique), email (unique), hashed_password, role (default "investor"),
full_name, date_of_birth, gender, is_profile_completed, tnc_accepted,
is_kyc_verified, kyc_status ("not_submitted"|"pending"|"verified"|"rejected")
```
Roles: `investor`, `admin`, `supervisor`

#### `farm_projects` table — `FarmProject`
```
id, project_name, description, image_url, crop_name,
roi_percentage, risk_level, harvest_date (DateTime),
total_plots, available_plots, acre_per_plot, price_per_acre,
status ("open"|"upcoming"|"closed"|"completed"),
project_start_date (Date), project_end_date (Date),
documentation_fee_per_acre, farm_manage_fee_per_acre, lease_fee_per_acre,
payout_tenure ("Monthly"|"Quarterly"|"Half Yearly"|"Annually"),
created_at
```
⚠️ The 6 new fields (`project_start_date` → `payout_tenure`) were added via `scripts/migrate_add_project_fields.py` — must be run manually.

#### `user_projects` table — `UserProject`
```
id, user_id (FK→users), project_id (FK→farm_projects),
plot_size (int — number of plots), total_acres (float),
cost (float — total investment), documentation_fee (float),
status ("interested"|"payment_pending"|"active"|"payment_failed"|"cancelled"),
created_at, updated_at
```
Represents an investor's stake in a project. One-to-many with transactions.

#### `transactions` table — `Transaction`
```
id, user_project_id (FK→user_projects), user_id (FK), project_id (FK),
amount (float — documentation fee), transaction_type (default "documentation_fee"),
status ("pending"|"approved"|"rejected"|"expired"),
upi_reference (str, nullable — user-provided UTR),
session_expires_at (DateTime — now + 180s),
approved_by_admin_id (FK→users, nullable), approved_at (DateTime, nullable),
created_at, updated_at
```
Payment sessions expire after 180 seconds. Admin approves/rejects via dashboard.

#### `project_crop_cycles` table — `ProjectCropCycle`
```
id, project_id (FK→farm_projects), crop_name,
crop_type (enum: "main"|"intercrop"), start_date, end_date,
season_name, cycle_year, expected_yield, expected_yield_unit,
notes, status ("planned"|"active"|"completed"|"failed"),
created_at, updated_at
```
Cascade: deleting a cycle deletes all its activities.

#### `project_crop_activities` table — `ProjectCropActivity`
```
id, project_crop_cycle_id (FK→project_crop_cycles),
activity_name, activity_type,
planned_start_date, planned_end_date, actual_start_date, actual_end_date,
priority ("low"|"medium"|"high"|"critical"),
status ("scheduled"|"in_progress"|"completed"|"delayed"|"cancelled"),
assigned_to, estimated_cost, actual_cost, remarks,
created_at, updated_at
```
List endpoint: ordered by `planned_start_date ASC, id ASC`.

#### `land_leases` — `LandLease`
```
id, lease_doc_id, land_khasra_numbers (JSON), land_subkhasra_numbers (JSON),
total_area_acres, lease_start_date, lease_tenure_years,
lease_cost_per_year, appreciation_percentage, advance_payment, status
```

#### `land_parcels` — `LandParcel`
```
id, land_lease_id (FK), soil_type, irrigation_type,
location_state, location_district, location_village, usable_area_acres
```

#### `blocks` — `Block`
```
id, land_parcel_id (FK), block_name, area_acres
```

#### `block_beds` — `BlockBed`
```
id, block_id (FK), bed_type_id (FK), area_acres
```

#### `bed_types` — `BedType`
```
id, name, description
```

#### `crops` — `Crop`
```
id, name (unique), category, risk_level, typical_season
```

#### `bed_crop_plans` — `BedCropPlan`
```
id, block_bed_id (FK), season, start_date, expected_end_date, status
```

#### `bed_crops` — `BedCrop`
```
id, bed_crop_plan_id (FK), crop_id (FK), planting_date,
expected_harvest_date, actual_harvest_date, recurring_harvest,
harvest_interval_days, expected_yield, actual_yield, notes
```

#### `kyc_profiles` — `KYCProfile`
```
id, user_id (FK), full_name, dob, address, kyc_status
```

#### `payout_accounts` — `PayoutAccount`
```
id, user_id (FK), type (enum: BANK|UPI), account_holder_name,
account_number, ifsc_code, upi_id, is_verified, is_active, created_at
```

#### `bank_accounts` — `BankAccount`
```
id, user_id (FK, unique), account_holder_name, account_number (encrypted),
ifsc_code, bank_name, is_verified, created_at, updated_at
```

#### `documents` — `Document`
```
id, document_name, document_type, document_location,
uploaded_by (FK→users), document_badge (enum: "public"|"sensitive"), created_at
```
Has related `DocumentDistribution` table linking documents to users.

#### `otp` table — `OTP`
```
session_id (UUID), phone, otp_code, expires_at, attempts, is_verified
```
OTP valid 5 min, max 5 attempts. OTP printed to console in dev.

### Date validation rules (crop cycles & activities)
- Crop `start_date` ≥ `project_start_date` AND < `project_end_date`
- Crop `end_date` ≤ `project_end_date`
- Activity `planned_start_date` ≥ `project_start_date`
- Activity `planned_end_date` ≤ `project_end_date`
- Implemented in `app/api/v1/project_crop_cycles.py`: `validate_crop_dates_against_project()` and `validate_activity_dates_against_project()`
- Only one **main** crop cycle per date range per project (overlap check). Intercrops are unrestricted.

### Schemas — `app/schemas/`
All use Pydantic v2. Pattern: `*Base` → `*Create` → `*Update` (all Optional) → `*Out` (adds `id`, `created_at`, `class Config: from_attributes = True`).

Key files: `farm_project.py`, `project_crop.py`, `auth.py`, `user.py`, `profile.py`, `user_project.py` (includes `UserProjectWithDetails`, `TransactionWithDetails`, `TransactionApprove`).

### Scripts — `scripts/`
| File | Purpose |
|---|---|
| `migrate_add_project_fields.py` | Adds 6 new columns to `farm_projects` — run once |
| `seed_crop_cycles.py` | Seeds sample crop cycles |
| `set_user_role.py` | CLI to change a user's role by phone |

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
// Response unwrap helper: response?.data?.data ?? response?.data
```

### Auth — `src/auth/AuthContext.tsx`
JWT token in `localStorage('admin_token')`. `useAuth()` provides `token`, `user`, `login()`, `logout()`. `ProtectedRoute` wraps all routes except `/login`.

### Routes — `src/App.tsx`
```
/login                          → LoginPage
/ (protected, Layout)
  /                             → DashboardPage (overview stats)
  /users                        → UsersPage
  /projects                     → ProjectsPage
  /projects/:projectId/planner  → ProjectPlannerPage (legacy)
  /cycles/:cycleId/activities   → ActivityRosterPage (legacy)
  /crop-planner                 → CropPlannerPage (main planner)
  /master-data                  → MasterDataPage
  /payments                     → PaymentsPage ← NEW
```

### Sidebar nav — `src/components/Layout.tsx`
Icons from lucide-react: Overview, Users, Projects, Crop Planner, Master Data, Payments.

### Pages — `src/pages/`

| File | Route | What it does |
|---|---|---|
| `DashboardPage.tsx` | `/` | Overview stats cards |
| `LoginPage.tsx` | `/login` | Admin login form |
| `UsersPage.tsx` | `/users` | User table, search, stat cards, inline role dropdown |
| `ProjectsPage.tsx` | `/projects` | Project list + collapsible new-project form + edit modal |
| `ProjectPlannerPage.tsx` | `/projects/:id/planner` | Per-project crop planner (legacy) |
| `CropPlannerPage.tsx` | `/crop-planner` | Main planner: project selector → timeline → cycles → activities |
| `ActivityRosterPage.tsx` | `/cycles/:id/activities` | Standalone activity list (legacy) |
| `MasterDataPage.tsx` | `/master-data` | Schema view + table editor with FK dropdowns |
| `PaymentsPage.tsx` | `/payments` | **NEW** — Two tabs: Transactions (approve/reject UPI payments) + Interests (UserProject records) |

### PaymentsPage detail
- **Transactions tab**: lists all `Transaction` records from `GET /admin/investments/transactions`. Shows user, project, amount, UPI ref, status, expiry. Admin can approve (`POST /admin/investments/transactions/{id}/approve`) or reject (`POST /admin/investments/transactions/{id}/reject`).
- **Interests tab**: lists all `UserProject` records from `GET /admin/investments/interests`. Shows investor, project, plots, acres, cost, status.
- Status badges: `pending`=gold, `approved`=green, `rejected`=red, `expired`=gray, `active`=green, `interested`=gold, `payment_pending`=gold, `payment_failed`=red.

### Shared components — `src/components/`
- `Layout.tsx` — sidebar shell with `<Outlet>`
- `DataTable.tsx` — generic typed table: `rows`, `getKey`, `columns[]` with `header` + `render`

### Types — `src/types.ts`
Key interfaces: `AdminUser`, `AdminUserFull`, `FarmProject`, `CropCycle`, `CropActivity`, `InvestmentTransaction`, `UserProject`.
Constant: `PAYOUT_TENURES = ['Monthly', 'Quarterly', 'Half Yearly', 'Annually']`.

### CSS patterns — `src/styles.css`
- `.panel` — white card with border-radius and padding
- `.page-header` — breadcrumb + h1 + p
- `.form-grid` — 2-column grid for form fields
- `.two-column` — side-by-side layout
- `.badge .green / .gold / .gray / .red` — status pills
- `.danger-button`, `.link-button`, `.timeline-list`

---

## Mobile App (`investo-mobile-app`)

### Stack
- **React Native 0.81.4** + **TypeScript** (bare workflow, no Expo)
- **React Navigation v6**: Stack + Bottom Tabs + Drawer
- **Formik + Yup** for form validation
- **react-native-linear-gradient** for hero cards and overlays
- **react-native-svg** for donut charts and illustrations
- **react-native-vector-icons** (MaterialIcons)
- **axios** with request/response interceptors
- **AsyncStorage** for token persistence (`src/utils/storage.ts`)

### API base URL — `src/config/api.ts`
```
Android emulator: http://10.0.2.2:8000/v1
iOS simulator:    http://127.0.0.1:8000/v1
Override via:     process.env.API_BASE_URL
```
`src/services/api/client.ts` imports from `@/config/api` and injects `Bearer` token from AsyncStorage key `@auth_token`.

⚠️ Token stored via `StorageService.setItem` (JSON-stringifies). Interceptor must `JSON.parse` the raw value — already done in `client.ts`.

### Auth flow
1. `LoginScreen` → enter phone → `POST /v1/auth/otp/send` → get `session_id`
2. `OtpVerifyScreen` → enter OTP → `POST /v1/auth/otp/verify` → get `access_token`
3. Token stored at `@auth_token` via `StorageService`
4. `GET /v1/auth/me` → get user → stored at `@user_data`
5. If `is_profile_completed = false` → `CompleteProfileScreen`
6. Otherwise → Main app (DrawerNavigator)

### Navigation tree
```
RootNavigator (Stack)
├── Auth (not authenticated) → AuthNavigator (Stack)
│   ├── OnboardingScreen
│   ├── LoginScreen
│   ├── OtpVerifyScreen
│   ├── RegisterScreen
│   ├── ForgotPasswordScreen
│   └── CompleteProfileScreen  (post-OTP, profile incomplete)
└── Main (authenticated + profile complete) → DrawerNavigator
    ├── MainTabs → TabNavigator (5 Bottom Tabs)
    │   ├── Dashboard → DashboardStackNavigator (Stack)
    │   │   ├── DashboardScreen       (hero + stat tiles + land viz)
    │   │   ├── PortfolioScreen       (donut chart + project cards)
    │   │   └── FinancialSummaryScreen (payout timeline + ROI + appreciation CTA)
    │   ├── Projects → ProjectsStackNavigator (Stack)
    │   │   ├── ProjectsScreen
    │   │   ├── ProjectDetailsScreen
    │   │   ├── InvestmentTermsScreen
    │   │   ├── PaymentScreen
    │   │   └── PaymentResultScreen
    │   ├── Home → HomeScreen         (centre elevated tab button)
    │   ├── Monitor → MonitorScreen
    │   └── Chat → ChatScreen
    ├── Profile (drawer) → ProfileStackNavigator
    │   ├── ProfileScreen
    │   ├── EditProfileScreen
    │   ├── KYCScreen
    │   ├── BankAccountsScreen
    │   └── DocumentsScreen
    ├── Settings → SettingsScreen
    └── Notifications → NotificationsScreen
```

⚠️ Portfolio is **not** a tab — accessed via Dashboard → "Portfolio" CTA only (inside DashboardStackNavigator).

### Key screens

| Screen | Location | Purpose |
|---|---|---|
| `OnboardingScreen` | `Auth/` | Intro slides |
| `LoginScreen` | `Auth/` | Phone number entry → OTP send |
| `OtpVerifyScreen` | `Auth/` | 6-digit OTP + session_id verify → JWT |
| `CompleteProfileScreen` | `Auth/` | Name, DOB, gender (first login) |
| `HomeScreen` | `Dashboard/` | Main landing after login |
| `DashboardScreen` | `Dashboard/` | Cinematic farm hero (ImageBackground + gradient), land ownership stat, tiles, quick actions |
| `PortfolioScreen` | `Dashboard/` | SVG donut chart (ROI/XIRR), project cards, filter tabs (All/Active/Completed) |
| `FinancialSummaryScreen` | `Dashboard/` | Dark header (Invested/Expected/Total Payout), gold banner, payout timeline with status icons, summary table, "Applaud Our Farmers" animated CTA |
| `ProjectsScreen` | `Dashboard/` | Investment project listings |
| `ProjectDetailsScreen` | `Projects/` | Single project detail + invest CTA |
| `InvestmentTermsScreen` | `Projects/` | T&C before payment |
| `PaymentScreen` | `Projects/` | UPI payment with 180s countdown session |
| `PaymentResultScreen` | `Projects/` | Approved / failed / expired result |
| `MonitorScreen` | `Dashboard/` | Farm monitoring feed |
| `MoreScreen` | `Dashboard/` | Links to Monitor, Chat, Settings |
| `ProfileScreen` | `Main/` | User profile view |
| `EditProfileScreen` | `Main/` | Edit name, DOB, gender |
| `KYCScreen` | `Main/` | KYC document submission |
| `BankAccountsScreen` | `Main/` | Payout bank/UPI accounts |
| `DocumentsScreen` | `Main/` | User documents + download/share |
| `SettingsScreen` | `Dashboard/` | App settings, theme toggle |
| `ChatScreen` | `Dashboard/` | Support chat placeholder |

### Mobile screen data sources & hardcoded values

| Screen | Main purpose | API/data source | Hardcoded/mock values |
|---|---|---|---|
| `OnboardingScreen` | Intro/onboarding | None | Onboarding marketing content/images |
| `LoginScreen` | Start OTP login | `POST /v1/auth/otp/send` | UI copy |
| `OtpVerifyScreen` | Verify OTP + store token | `POST /v1/auth/otp/verify`, then `GET /v1/auth/me` through auth context | OTP UI copy |
| `RegisterScreen` | Registration | `POST /v1/auth/register` | Form copy |
| `ForgotPasswordScreen` | Password recovery | `POST /v1/auth/forgot-password` | Form copy |
| `CompleteProfileScreen` | First-login profile completion | `PATCH /v1/user/profile`, `GET /v1/auth/me` | Form copy/options |
| `HomeScreen` | Marketing/landing after login | None | Hero Unsplash URL, “How It Works” slides, `18–25% Returns`, “Start With Just ₹10,000”, feature tiles |
| `DashboardScreen` | Investor dashboard, land hero, stats, actions | Currently uses `MOCK_PORTFOLIO_STATS`; no live dashboard API for tile values | Hardcoded stat tile amounts (`₹1,24,500`, `₹38,560`), recent activity, hero image URL |
| `PortfolioScreen` | Portfolio summary + invested project cards | `GET /v1/portfolio/summary`, `GET /v1/portfolio/projects` via `usePortfolioSummary()`/`usePortfolioProjects()` | UI labels; ROI/progress derived client-side |
| `PortfolioProjectDetailsScreen` | Portfolio project detail | Route param `project`; currently uses `MOCK_PAYOUT_HISTORY` | Payout history mock, “2 days ago” update dates, share message |
| `FinancialSummaryScreen` | Project financial summary | Intended: `GET /v1/portfolio/projects/{id}/financial`, plus payout schedule/history endpoints where wired | Some UI copy/status labels |
| `ProjectsScreen` | Browse investment projects | `GET /v1/projects/` | Filter pills, crop gradients/emojis, region fallback `India` |
| `ProjectDetailsScreen` | Project detail + crop timeline | Route param `project`; `GET /v1/projects/{project.id}/crop-cycles` | Status colour maps, “Premium Farm Asset”, risk colour logic |
| `InvestmentTermsScreen` | Accept investment terms | Investment flow routes; likely `POST /v1/investments/interested` | Terms/risk acknowledgement copy |
| `PaymentScreen` | Payment initiation/status | `POST /v1/investments/{user_project_id}/initiate-payment`, `GET /v1/investments/{user_project_id}/payment-status` | Payment UI copy/countdown display |
| `PaymentResultScreen` | Payment result | Route params and/or payment status | Result UI copy |
| `ProfileScreen` | Profile dashboard + tabs | `GET /v1/auth/me`; phone change: `POST /v1/user/phone-change/otp/send`, `POST /v1/user/phone-change/otp/verify`; documents tab: `GET /v1/distribution-groups/my-documents` | Header stats: `5` Farms, `12.1%` Avg Yield, `100%/60%` profile; legacy `documentGroups` sample data exists |
| `EditProfileScreen` | Edit profile | `PATCH /v1/user/profile`, refresh via `GET /v1/auth/me` | Form copy |
| `KYCScreen` | KYC submission/status | Backend route exists under `/v1/kyc`; verify exact calls before editing | Form labels/options |
| `BankAccountsScreen` | Payout/bank details | Backend models exist; verify exact screen calls before editing | May contain static/profile-driven fields |
| `DocumentsScreen` | User distributed documents | List: `GET /v1/distribution-groups/my-documents`; download/share: `GET /v1/distribution-groups/my-documents/{document_id}/download?token=<token>` | Category labels: All/Agreements/Reports/Tax/Certificates |
| `NotificationsScreen` | Updates/notifications | `GET /v1/updates`, `GET /v1/updates/unread-count`, `POST /v1/updates/{id}/read`, `POST /v1/updates/read-all` | Header/empty-state copy |
| `MonitorScreen` | Farm monitoring | Backend route exists under `/v1/monitor`; verify exact screen calls before editing | Likely placeholder/static sections |
| `ChatScreen` | Support chat | No confirmed API | Likely placeholder/static chat UI |

### Services — `src/services/`
- `api/client.ts` — axios instance; reads `@auth_token` (JSON.parse); imports base URL from `@/config/api`
- `api/auth.ts` — `AuthService`: `sendOtp()`, `verifyOtp()`, `getCurrentUser()`, `updateProfile()`, `logout()`
- `api/endpoints.ts` — `ENDPOINTS` constant object (PORTFOLIO, UPDATES, USER namespaces)
- `api/investments.ts` — investment API calls
- `portfolioService.ts` — `USE_MOCK=false`; `getPortfolioSummary()`, `getProjects()`, `getProjectById()`, `getPayoutSchedule()`, `getFinancialDetails()`
- `updatesService.ts` — `USE_MOCK=false`; `getUpdates()`, `markAsRead()`, `markAllRead()`, `getUnreadCount()`, `sendAppreciation()`

### Hooks — `src/hooks/`
- `useFormField.ts` — single field state helper
- `useFormik.ts` — Formik wrapper with Yup schema binding
- `usePortfolio.ts` — `usePortfolioSummary()`, `usePortfolioProjects()`, `useProjectFinancials(projectId)`
- `useStakeholderUpdates.ts` — updates with `markRead`, `markAllRead`, `appreciate`

### Data layer — `src/data/`
- `portfolioMockData.ts` — `MOCK_PORTFOLIO_PROJECTS`, `MOCK_PORTFOLIO_STATS`, `MOCK_PAYOUT_SCHEDULES` (6-entry timelines), `MOCK_PROJECT_FINANCIAL_DETAILS`, land viz helpers
- `stakeholderUpdatesMockData.ts` — `MOCK_STAKEHOLDER_UPDATES` (9 entries: project updates, investor updates, broadcasts)

### Context — `src/context/`
- `AuthContext.tsx` — `user`, `token`, `isAuthenticated`, `isLoading`, `sendOtp()`, `verifyOtp()`, `login()`, `logout()`, `refreshUser()`, `updateProfile()`
- `AppContext.tsx` — `theme`, `toggleTheme()`, `isLoading`, `hasSeenOnboarding`

### Theme & brand colours
```
G900 = #0D3320   G800 = #174A2A   G600 = #2A7D52   (dark greens)
GOLD = #F5B800   GOLD_600 = #C8963E                  (gold accents)
CREAM = #FAF8F1  TEXT = #1A1A1A   TEXT_3 = #9A9088
```
`src/theme/colors.ts` → `src/theme/theme.ts` → `AppTheme`. Light/dark mode supported.

### Common components — `src/components/`
- `ui/Button.tsx`, `ui/FormInput.tsx`, `ui/CountryPicker.tsx`, `ui/LoadingSpinner.tsx`
- `common/Screen.tsx` — safe-area scroll container
- `common/Card.tsx` — surface card
- `common/HeaderTitle.tsx` — nav header logo
- `portfolio/LandVisualizationSheet.tsx` — animated bottom sheet: land size comparisons + crop production table + impact card + Share

### Types — `src/types/index.ts`
Key: `User`, `AuthState`, navigation param lists (`RootStackParamList`, `AuthStackParamList`, `MainTabsParamList`, `DashboardStackParamList`, `ProjectsStackParamList`, `MainDrawerParamList`), `PortfolioProject`, `PortfolioStats`, `PayoutScheduleEntry`, `ProjectFinancialDetails`, `StakeholderUpdate`, `PaginatedResponse<T>`, `ServiceResult<T>`.

---

## Data flow summary

```
Mobile — Auth
  POST /v1/auth/otp/send   { phone }              → { session_id }
  POST /v1/auth/otp/verify { phone, session_id, otp } → { access_token }
  GET  /v1/auth/me                                 → User (requires Bearer token)

Mobile — Investing
  GET  /v1/projects                                → project list
  POST /v1/investments/interest  { project_id, plot_size } → UserProject (status: interested)
  POST /v1/investments/{up_id}/initiate            → Transaction (session 180s)
  POST /v1/investments/{up_id}/submit-upi  { upi_reference } → updated Transaction
  GET  /v1/investments/{up_id}/status              → poll payment status

Admin — Payments
  GET  /admin/investments/transactions             → list all Transactions
  POST /admin/investments/transactions/{id}/approve → approve + activate UserProject
  POST /admin/investments/transactions/{id}/reject  → reject Transaction
  GET  /admin/investments/interests                → list all UserProjects

Admin — Projects & Planning
  GET/POST/PATCH/DELETE /admin/farm-projects/
  GET  /v1/projects/{id}/crop-cycles
  POST /v1/admin/projects/{id}/crop-cycles
  PATCH/DELETE /v1/admin/project-crop-cycles/{id}
  GET  /v1/project-crop-cycles/{id}/activities
  POST /v1/admin/project-crop-cycles/{id}/activities
  PATCH/DELETE /v1/admin/project-crop-activities/{id}

Admin — Users
  GET  /admin/users/
  PATCH /admin/users/{id}/role
```

---

## Common patterns & conventions

### Backend
- All list responses: `{"data": [...]}` — use `jsonable_encoder` for ORM objects.
- All single-object responses: `{"data": {...}}`.
- Admin endpoints have **no auth guard** (open — rely on deployment security).
- v1 endpoints use `get_current_user` dep from `app/core/deps.py` for protected routes.
- New DB columns: write a migration script in `scripts/`, never use Alembic.
- FK cascade: crop cycle → activities uses `cascade="all, delete"`. UserProject → transactions uses same.
- Payment session TTL: 180 seconds (`PAYMENT_SESSION_SECONDS = 180` in `v1/investments.py`).

### Admin dashboard
- API response unwrap: `response?.data?.data ?? response?.data`.
- Inline editing: `editingXxxId: number | null` state per row.
- Date validation: client-side first, server-side enforces same rules.
- All forms use `Field`/`FL` wrapper: `label` prop + child input/select.
- `PATCH` payloads send only changed fields (`exclude_unset=True` on backend).

### Mobile
- Navigation type safety via param lists in `src/types/index.ts`.
- Token stored via `StorageService` (JSON-stringified). Interceptor reads with `JSON.parse`.
- Storage key for auth token: `@auth_token`. Storage key for user: `@user_data`.
- Portfolio/Updates services currently have `USE_MOCK=false`, but some screens still import or use mock data directly (`DashboardScreen`, `PortfolioProjectDetailsScreen`).
- Theme: use brand colours from constants at top of each screen file, not from `useApp()` hook (screens use inline StyleSheet).
- API errors surface as `ApiError` type with `message` + optional `errors` record.

---

## Quick file lookup

| I want to… | Touch this file |
|---|---|
| Add a new DB column | Model in `app/models/`, schema in `app/schemas/`, new migration in `scripts/` |
| Add a new admin API endpoint | New file in `app/api/`, register in `app/main.py` |
| Add a new v1 (mobile) endpoint | File in `app/api/v1/`, register in `app/api/v1/router.py` |
| Add a dashboard page | `src/pages/`, add route in `src/App.tsx`, add nav link in `src/components/Layout.tsx` |
| Add a dashboard type | `src/types.ts` |
| Add a mobile screen | `src/screens/`, wire into relevant navigator in `src/navigation/` |
| Add a mobile API service | `src/services/api/` |
| Change mobile mock data | `src/data/portfolioMockData.ts` or `src/data/stakeholderUpdatesMockData.ts` |
| Go live with portfolio API | Set `USE_MOCK=false` in `src/services/portfolioService.ts` + `src/services/updatesService.ts` |
| Change app brand colours | Inline constants at top of screen files + `src/theme/colors.ts` |
| Change dashboard styles | `src/styles.css` |
| Approve/reject a payment | Admin dashboard → `/payments` → Transactions tab |
