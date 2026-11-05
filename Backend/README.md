# Backend

## Run locally

1. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the project-root `.env.local` or `.env` file. `SUPABASE_URL` must be the project root (for example `https://your-project.supabase.co`), not a URL ending in `/rest/v1`.
2. From this directory, install dependencies and start the backend:

   ```sh
   npm install
   npm start
   ```

3. Open `http://localhost:3000`. The backend serves the frontend and API from the same origin. Check that the backend is responding at `http://localhost:3000/api/health`.

If you use VS Code Live Server instead, keep the backend running on port 3000 while using the preview.
