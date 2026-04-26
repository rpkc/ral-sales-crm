# MERN Stack Backend Architecture Blueprint

## 1. Frontend Data Mapping
Based on an analysis of `src/lib/types.ts`, `src/lib/alliance-types.ts`, `src/lib/finance-types.ts`, `src/lib/vertical-types.ts`, `src/lib/finance-store.ts`, `src/lib/collection-store.ts` and other frontend state files, the application manages the following primary data entities:

- **Users**: Admin, marketing managers, telecallers, counselors, owners, alliance managers/executives, accounts managers/executives.
- **Leads**: Prospective students with detailed attributes (quality, temperature, intent, source, preferred start time, etc.). Includes interactions (`LeadActivity`, `CallLog`, `FollowUp`), objection tracking, transfers, and qualification checklists.
- **Campaigns**: Marketing campaigns with platforms, objectives, budgets, audiences (`AdSet`, `AdCreative`), and UTM tracking.
- **Admissions**: Students who have successfully enrolled, tracking program/course, batch details, document status, fee commitments, and payment status.
- **Finances (Invoices & Payments)**:
  - **Invoices**: PIs (Proforma Invoices), TIs (Tax Invoices) for students, B2B associations, events. Tracks GST, subtotal, discounts, amount paid, and status (Draft, Sent, Paid, Overdue).
  - **Payments & Collections**: Collections made by counselors, awaiting verification by admin/accounts, and actual payment records linked to invoices.
  - **Expenses & Vendor Bills**: Tracking outgoing payments, categories (Marketing, Salaries, Rent, etc.), and approvals.
- **Alliances (B2B)**: Institutions, contacts, proposals, visits, events, and tasks for B2B relationship management.
- **Verticals**: Specialized programs including Internships, College Programs, and School Programs.

Currently, these entities are simulated using local mock data and `localStorage` stores (`collection-store.ts`, `finance-store.ts`, etc.). The goal is to replace this with a persistent MongoDB layer.

## 2. Database Schema Design (MongoDB/Mongoose)

Schemas will be created mapping directly to the frontend types.

### `User` Schema
*   `name`: String, required
*   `email`: String, required, unique
*   `password`: String, required (hashed)
*   `role`: String, enum (`"admin" | "marketing_manager" | "telecaller" | "counselor" | "owner" | ...`)
*   `createdAt`, `updatedAt`: Timestamps

### `Lead` Schema
*   `name`: String, required
*   `email`: String, unique
*   `phone`: String, required
*   `source`: String
*   `status`: String, enum (`"New" | "Contacted" | "Qualified" | "Lost" | ...`)
*   `quality`, `temperature`, `intentCategory`: String enums
*   `assignedTo`: ObjectId (ref: 'User')
*   `courseInterest`: String
*   `activities`: Array of Subdocuments (`LeadActivity`)
*   `createdAt`, `updatedAt`: Timestamps

### `Campaign` Schema
*   `name`: String, required
*   `platform`: String
*   `objective`: String
*   `status`: String
*   `budget`, `spend`, `impressions`, `clicks`, `leadsGenerated`: Numbers
*   `startDate`, `endDate`: Dates
*   `createdAt`, `updatedAt`: Timestamps

### `Invoice` Schema
*   `invoiceNo`: String, unique
*   `type`: String, enum (`"PI" | "TI"`)
*   `customerId`: String
*   `customerName`: String
*   `customerType`: String
*   `subtotal`, `discount`, `gstRate`, `cgst`, `sgst`, `igst`, `total`: Numbers
*   `amountPaid`: Number
*   `status`: String, enum (`"Draft" | "Sent" | "Partial" | "Paid" | "Overdue" | ...`)
*   `issueDate`, `dueDate`: Dates
*   `createdBy`: ObjectId (ref: 'User')

### `Collection` Schema
*   `receiptRef`: String
*   `studentName`: String
*   `amount`: Number
*   `mode`: String, enum (`"Cash" | "Bank" | "UPI" | ...`)
*   `status`: String, enum (`"Collected" | "Awaiting Verification" | "Verified" | "Mismatch" | ...`)
*   `collectedById`: ObjectId (ref: 'User')
*   `collectedAt`: Date

## 3. API Endpoint Architecture

### Auth Domain (`/api/auth`)
*   `POST /register`: Register a new user.
*   `POST /login`: Authenticate and return JWT token.
*   `GET /me`: Get current authenticated user details.

### Users Domain (`/api/users`)
*   `GET /`: List all users (admin only, useful for assignments).

### Leads Domain (`/api/leads`)
*   `GET /`: List all leads (with pagination, filtering by status, assignedTo).
*   `GET /:id`: Get lead details (including activities).
*   `POST /`: Create a new lead.
*   `PUT /:id`: Update lead details.
*   `DELETE /:id`: Delete a lead.
*   `POST /:id/activities`: Add an activity/log to a lead.

### Campaigns Domain (`/api/campaigns`)
*   `GET /`: List all campaigns.
*   `GET /:id`: Get campaign details.
*   `POST /`: Create campaign.
*   `PUT /:id`: Update campaign.
*   `DELETE /:id`: Delete campaign.

### Finance Domain (`/api/finance`)
*   `GET /invoices`: List all invoices.
*   `POST /invoices`: Create an invoice (PI or TI).
*   `PUT /invoices/:id`: Update invoice details.
*   `GET /collections`: List collections.
*   `POST /collections`: Register a new collection.
*   `PUT /collections/:id/verify`: Admin/Accounts verify a collection.

## 4. Core Backend Functions

*   **Controllers**: Map to the endpoints above, handling request validation, interacting with Mongoose models, and sending JSON responses.
    *   E.g., `leadController.getLeads` fetching based on user role (counselors see own leads, admins see all).
    *   E.g., `financeController.createInvoice` calculating totals and GST based on provided subtotal/discount.
*   **Routers**: Express Router instances to mount controller functions to specific paths.
*   **Middleware**: Auth middleware to verify JWT tokens and attach the user to the request object. Role-based access control (RBAC) middleware.

## 5. Implementation Blueprint

### Recommended Directory Structure
```
backend/
├── src/
│   ├── models/           # Mongoose schemas (User.js, Lead.js, etc.)
│   ├── controllers/      # Route handlers (authController.js, leadController.js, etc.)
│   ├── routes/           # Express routers (authRoutes.js, leadRoutes.js, etc.)
│   ├── middleware/       # Express middlewares (auth.js, error.js)
│   ├── config/           # DB connection, env config
│   └── server.js         # Express app setup and server entry point
├── package.json
└── .env
```

### Essential NPM Packages
*   `express`: Web framework.
*   `mongoose`: MongoDB object modeling.
*   `cors`: Cross-Origin Resource Sharing.
*   `dotenv`: Environment variable management.
*   `jsonwebtoken`: Authentication.
*   `bcryptjs`: Password hashing.
*   `express-validator` (optional but recommended): Request payload validation.
