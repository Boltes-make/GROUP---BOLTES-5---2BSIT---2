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
