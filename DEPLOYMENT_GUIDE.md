# Deployment Guide

## Quick Deploy to Vercel

### Option 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   # For production deployment
   vercel --prod
   
   # Or use the deployment script
   ./deploy.sh
   ```

### Option 2: Deploy via Git Push

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Connect your repository to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables**:
   In Vercel project settings, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Deploy**: Vercel will automatically deploy on every push to main/master

## Pre-Deployment Checklist

- [ ] Environment variables are set in Vercel project settings
- [ ] Database schema has been run in Supabase (`supabase-schema.sql`)
- [ ] Storage bucket `timeline-photos` exists and is public
- [ ] Room `SIP2025` exists in the database
- [ ] Build passes locally: `npm run build`

## Environment Variables Required

Set these in your Vercel project settings (Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Post-Deployment

1. Verify the deployment URL works
2. Test the main pages:
   - `/` - Home page
   - `/host` - Host controls
   - `/present` - Presentation view
   - `/join` - Join page
3. Test photo loading from Supabase Storage
4. Test quiz/reflection question submission

## Troubleshooting

- **Build fails**: Check TypeScript errors with `npx tsc --noEmit`
- **Environment variables not working**: Ensure they're set in Vercel and prefixed with `NEXT_PUBLIC_`
- **Database connection issues**: Verify Supabase URL and anon key are correct
- **Images not loading**: Check that the `timeline-photos` bucket is public

