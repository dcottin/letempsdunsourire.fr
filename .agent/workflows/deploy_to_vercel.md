---
description: How to deploy the Next.js application to Vercel
---

# Deploy to Vercel

This workflow describes how to deploy the application to Vercel, the recommended hosting platform for Next.js.

## Prerequisites

- A GitHub account with the project repository pushed.
- A Vercel account (free tier is sufficient).

## Steps

1.  **Push to GitHub**
    Ensure your latest code is committed and pushed to your GitHub repository.
    ```bash
    git add .
    git commit -m "Ready for deployment"
    git push origin main
    ```

2.  **Import Project in Vercel**
    - Go to [Vercel Dashboard](https://vercel.com/dashboard).
    - Click **"Add New..."** > **"Project"**.
    - Select your GitHub repository (`next-app` or similar).

3.  **Configure Project**
    - **Framework Preset**: Vercel should automatically detect **Next.js**.
    - **Root Directory**: Ensure it points to `next-app` (or `./` if the repo is the root).

4.  **Environment Variables**
    Expand the **"Environment Variables"** section and add the following keys from your `.env.local`:

    | Key | Value |
    | :--- | :--- |
    | `NEXT_PUBLIC_SUPABASE_URL` | `https://upuudypjiqohtvfqdyee.supabase.co` |
    | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...` (Your key) |
    | `RESEND_API_KEY` | `re_...` (Your key) |

5.  **Deploy**
    - Click **"Deploy"**.
    - Wait for the build to complete (usually 1-2 minutes).

6.  **Verify**
    - Once deployed, Vercel will provide a public URL (e.g., `https://your-project.vercel.app`).
    - Visit the URL to check the application.
    - Test the `/reservation` page and contract generation.

## Troubleshooting

- **Build Errors**: Check the "Logs" tab in Vercel. Common issues include missing environment variables or type errors.
- **Database Connection**: Ensure your Supabase instance allows connections from anywhere (usually true by default).
