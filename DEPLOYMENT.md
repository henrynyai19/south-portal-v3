# GitHub and Vercel deployment

## Upload to GitHub

1. Create an empty GitHub repository.
2. Upload everything in this project folder.
3. Do not upload `.env`, `node_modules`, `dist`, `.vercel`, or `work`.

## Deploy with Vercel

1. In Vercel, choose **Add New → Project** and import the GitHub repository.
2. Keep the project root as the repository root.
3. Use the default install command and `npm run build` as the build command.
4. Add the following environment variables for Production, Preview, and Development:

```text
SUPABASE_PROJECT_ID
SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

Use the values from the local `.env` file. The `.env` file is intentionally excluded from GitHub.

5. Deploy the project.

The Supabase database migrations have already been applied to the configured hosted project. The migration files remain in `supabase/migrations` for version history and future environments.
