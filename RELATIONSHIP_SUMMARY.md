# Data Entity & Relationship Summary

This document outlines the data structure and relationship architecture extracted from the current React/TypeScript frontend mock data, models, and component hierarchies. It acts as a mapping guide for migrating local `localStorage` state to a scalable relational or Document-based (MongoDB) backend architecture.

## 1. Core Data Entities & Properties

*   **User (`User`)**
    *   `id`, `name`, `email`, `password`, `role` (Admin, Counselor, Telecaller, Alliance Manager, Accounts, etc.)
*   **Lead (`Lead`)**
    *   `id`, `name`, `phone`, `email`, `source`, `campaignId`, `interestedCourse`, `assignedTelecallerId`, `status`
*   **Lead Interactions**
    *   **Activity (`LeadActivity`)**: Logs system actions (created, transferred, updated).
    *   **Call Log (`CallLog`)**: Logs outcomes from telecalling (`outcome`, `notes`, `nextFollowUp`).
    *   **Follow Up (`FollowUp`)**: Scheduled interactions (`date`, `assignedTo`, `completed`).
    *   **Transfer (`LeadTransfer`)**: History of re-assignment between users.
*   **Campaign (`Campaign`)**
    *   `id`, `name`, `platform`, `objective`, `budget`, `startDate`, `endDate`, `leadsGenerated`
    *   **Sub-Entities**: `AdSet`, `AdCreative`, `UTMTracking`, `LandingPage`.
*   **Admission (`Admission`)**
    *   `id`, `leadId`, `studentName`, `courseSelected`, `batch`, `totalFee`, `paymentStatus`
    *   **Payment History (`PaymentHistoryEntry`)**: List of payments made against the admission.
*   **Finance & Accounting**
    *   **Invoice (`Invoice`)**: Tax and Proforma Invoices (`customerId`, `subtotal`, `gstRate`, `status`).
    *   **Collection (`Collection`)**: Pre-invoice raw money collected by counselors (`receiptRef`, `amount`, `status`, `collectedById`).
    *   **EMI Schedule (`EmiSchedule`)**: Broken down payment expectations linked to Invoices.
    *   **Expense & Vendor (`Expense`, `Vendor`, `VendorBill`)**: Company expenditure tracking.
*   **B2B / Alliance & Verticals**
    *   **Institutions (`Institution`, `CollegeAccount`, `SchoolAccount`)**: B2B partner entities.
    *   **Programs (`CollegeProgram`, `SchoolProgram`)**: Specific course arrangements with partner institutions.
    *   **B2B Interactions (`AllianceContact`, `AllianceVisit`, `AllianceProposal`, `AllianceTask`)**: CRM interactions for B2B.

---

## 2. Relational Mapping ("Foreign Keys")

The frontend simulates relational database structures using ID strings.

### One-to-One (1:1) Relationships
*   **Lead ↔ Admission**: A `Lead` converts into exactly one `Admission`. (Represented by `Admission.leadId`).
*   **Lead ↔ Qualification Checklist**: A lead holds one specific qualification object (`Lead.qualification`).
*   **Collection ↔ Invoice (Often 1:1 post-verification)**: A verified `Collection` gets converted into a specific Tax Invoice (`Collection.invoiceId` / `Collection.invoiceNo`).

### One-to-Many (1:N) Relationships
*   **User (Telecaller/Counselor) → Leads**: A user manages multiple leads (`Lead.assignedTelecallerId`, `Lead.assignedCounselorId`).
*   **Campaign → Leads**: A marketing campaign generates multiple leads (`Lead.campaignId`).
*   **Lead → Activities / CallLogs / FollowUps**: A single lead has a history of interactions (`CallLog.leadId`, `FollowUp.leadId`, `LeadActivity.leadId`).
*   **Lead → Transfers**: A lead can be transferred multiple times (`LeadTransfer.leadId`, `fromUserId`, `toUserId`).
*   **Institution/Account → Programs**: A College or School has multiple programs running (`CollegeProgram.collegeAccountId`, `SchoolProgram.schoolAccountId`).
*   **Program → Students**: A B2B program enrolls multiple students (`CollegeStudent.collegeProgramId`, `SchoolStudent.schoolProgramId`).
*   **Invoice → EMI Schedules**: An invoice can be split into multiple EMIs (`EmiSchedule.invoiceId`).
*   **User (Counselor) → Collections**: A counselor logs multiple collections (`Collection.collectedById`).

### Many-to-Many (N:M) Relationships
*   *Currently, strict M:N is rare in this schema.* However, **Campaigns ↔ Audiences** can be viewed as M:N in practice, though currently structured as nested Subdocuments (`AdSet.ads`, `AdSet.campaignId`) indicating a normalized 1:N path.
*   **Users ↔ B2B Events**: `AllianceEvent` supports multiple attendees, though currently tracked minimally.

---

## 3. Component State Sharing & Data Flow

The application utilizes centralized custom hooks and `useSyncExternalStore` implementations to share data across the component tree without excessive prop drilling.

### A. The Mock Data Store (`src/lib/mock-data.ts`)
Acts as the primary "Database" for core CRM features.
*   **Consumers**: `LeadsPage`, `CampaignsPage`, `TelecallingPage`, `CounselingPage`, `Dashboard`, `RoleDashboard`, `AdmissionsPage`.
*   **Data Passed via Props**: Specific `Lead` objects are passed down from `LeadsPage` to `KanbanBoard` to `LeadCard` or `MarketingLeadForm` modal.

### B. The Finance & Accounts Store (`src/lib/finance-store.ts`)
Manages Invoices, Expenses, EMIs, and Cashflow.
*   **Shared via Hook**: `useFinance()`
*   **Consumers**: `AccountsModule` (the core accounting screen), `PiPendingWidget`, `PiToTiConvertDialog`, `InvoiceDispatchDialog`, `AdminBillingTab`.
*   **Flow**: Modals (like `QuickInvoiceDialog`) mutate the state directly via store methods (`createInvoice()`), which triggers a re-render in `AccountsModule` and `AdminBillingTab`.

### C. The Collection Store (`src/lib/collection-store.ts`)
Manages pre-invoice counselor money collections and admin verification pipelines.
*   **Shared via Hook**: `useCol()`
*   **Consumers**: `CollectionsWidget` (Counseling view), `CollectionControlTabs` (Accounts view), `BillingChart`.
*   **Flow**: `CollectionsWidget` calls `logCollection()`. `CollectionControlTabs` consumes this via `getCollections()` and allows admins to call `verifyCollection()`.

### D. The Authentication Context (`src/lib/auth-context.tsx`)
Provides the current `User` session and role-based access variables.
*   **Shared via Context**: `useAuth()`
*   **Consumers**: Almost every page and module (e.g., `AppLayout`, `AccountsModule`, `AllianceModule`).
*   **Flow**: Determines which navigation links render, filters leads (Counselors only see *their* assigned leads), and populates `createdBy` or `collectedById` foreign keys when a user creates a new record.