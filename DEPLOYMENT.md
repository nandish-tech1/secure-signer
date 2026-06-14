**Vercel Deployment Guide**

This document explains how to deploy the `secure-signer` project to Vercel and which environment variables are required.

Required environment variables
- `VITE_SUPABASE_URL` — public Supabase URL (used at build-time and client-side)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — public Supabase anon key (used at build-time and client-side)
- `SUPABASE_URL` — Supabase URL (server runtime)
- `SUPABASE_PUBLISHABLE_KEY` — Supabase anon key (server runtime fallback)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, required for admin ops)

Notes about secrets
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Add it to Vercel **Project -> Settings -> Environment Variables** as a secret and mark it for `Preview` and `Production` environments. Use the Vercel UI or the `vercel` / `gh` CLI to add secrets.

Steps to deploy
1. Commit and push your repository to GitHub (already done).
2. Go to https://vercel.com and create a new project. Choose "Import from Git" and pick `nandish-tech1/secure-signer`.
3. In the import screen set:
   - Framework Preset: `Vite` (Vercel should auto-detect).
   - Build command: `npm run build` (default from `package.json`).
   - Output directory: `dist`.
4. Add the environment variables listed above in **Project Settings → Environment Variables**. For public values add them as normal env vars and for `SUPABASE_SERVICE_ROLE_KEY` mark it as a secret.
5. Start the first deployment. Vercel will run `npm install` and `npm run build` and deploy the `dist` output.

If your app requires server-side functions (Edge or Serverless)
- This project includes server-side entry files (e.g. `src/server.ts`) and may expect SSR. The configuration in `vercel.json` currently treats the site as a static Vite build. If you require SSR on Vercel you will need to adapt the build pipeline to produce serverless functions (for example using Nitro or a compatible SSR adapter) and update `vercel.json` to include function routes.

Troubleshooting
- Build fails with missing Supabase env variables: Add both `VITE_` prefixed keys in Vercel's *Build* environment values (these are used at build-time) and also add the server keys for runtime.
- 500 errors related to Supabase admin operations: Ensure `SUPABASE_SERVICE_ROLE_KEY` is correctly set as a secret and available at runtime (not only at build time).

Want me to finish configuring this project for SSR on Vercel?
- If you want full SSR support on Vercel I can: (a) add a minimal server adapter config, (b) add `vercel.json` function mappings, and (c) test a local build to ensure `vercel` output matches Vercel's expected layout. Tell me and I will proceed.
