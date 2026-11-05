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
# AccessHub

A responsive role-based access management website built with HTML, CSS, and vanilla JavaScript.

## Run locally

Open `index.html` directly in a browser, or serve the folder with:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Demo roles

- **Superadmin:** Alex Morgan (`alex@accesshub.com`)
- **Admin:** Sarah Chen (`sarah@accesshub.com`)
- **User:** James Wilson (`james@accesshub.com`)

Accounts use demo authentication stored in browser storage; any password is accepted on sign in. User status, roles, and registration data persist in local storage.
# Hope, Inc. ERP - Database Setup Guide

This is the official guide for setting up, configuring, and running the PostgreSQL database using **Supabase** for the Hope, Inc. ERP project[cite: 1].



## 🛠️ Prerequisites
1. Access to the team's Supabase project[cite: 1].
2. **Node.js** installed on your computer to run the migration runner script.



## ⚙️ Step 1: Environment Variables Configuration (.env)
1. Copy the `.env.example` file in the root folder and rename it to `.env.local`.
2. Fill in your Supabase credentials (retrieved from your Supabase Dashboard):

   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
main
