# BOLTES 5

Brown-themed role management website.

Run with:

```powershell
python -m http.server 8080
```

Demo accounts:
- `super@boltes.com` / `admin123`
- `admin@boltes.com` / `admin123`
- `user@boltes.com` / `user123`

This is a frontend demo; authentication and permissions are stored in browser localStorage.
# Hope, Inc. ERP - Database Setup Guide

This is the official guide for setting up, configuring, and running the PostgreSQL database using **Supabase** for the Hope, Inc. ERP project[cite: 1].

---

## 🛠️ Prerequisites
1. Access to the team's Supabase project[cite: 1].
2. **Node.js** installed on your computer to run the migration runner script.

---

## ⚙️ Step 1: Environment Variables Configuration (.env)
1. Copy the `.env.example` file in the root folder and rename it to `.env.local`.
2. Fill in your Supabase credentials (retrieved from your Supabase Dashboard):

   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key


---

## 🚀 Step 2: Database Migrations

The SQL files for setting up the database infrastructure are located inside the `db/migrations/` folder. Follow this strict execution order:

1. **Base Tables (`01_base_tables.sql`):** Creates core operational tables (`CUSTOMER`, `PRODUCT`, `PRICEHIST`, `EMPLOYEE`, `JOB`, `DEPARTMENT`, `JOBHISTORY`, `SALES`, `SALESDETAIL`, `PAYMENT`) with mandatory `status` and `stamp` audit columns.


2. **User Management (`02_user_management.sql`):** Creates `app_user`, roles, modules, and `user_permission` tables supporting the 36 per-action rights.


3. **Password Reset Tokens (`03_reset_tokens.sql`):** Creates tables required for secure password recovery workflows.


4. **Seed Data (`04_seed_data.sql`):** Populates default system modules, the 36 rights catalog, and initial superadmin accounts.


5. **Audit Log Function (`05_audit_log.sql`):** Activates the `audit_user()` trigger for automated activity tracking.



### Running the Migration Script:

Execute the migration runner via your terminal to automatically apply these SQL scripts to Supabase:

bash
npm install
node scripts/migrate.js



---

## 🔍 Database Design Rules

* **Soft Delete Pattern:** Records are never physically deleted; instead, their `status` is set to `'Inactive'` to maintain historical data integrity and preserve foreign keys.
* **Audit Stamp:** Every table includes a `stamp` column recording the last modification action (`CREATED`, `EDITED`, `DELETED`), the executing user, and the timestamp.
