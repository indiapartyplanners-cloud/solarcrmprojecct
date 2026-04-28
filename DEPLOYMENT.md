# Element - Deployment Guide

## Prerequisites

- Supabase account with project created
- Project repository cloned
- Node.js 18+ installed

## Step 1: Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_PROJECT_ID="your-project-id"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   ```

## Step 2: Database Setup

Run the migrations in your Supabase SQL Editor in this exact order:

### Migration 1: Core Schema
File: `supabase/migrations/20260305071502_*.sql`

This creates:
- User roles and profiles
- Organizations, clients, sites
- Projects and milestones
- Tasks and documents
- Checklist templates
- Photos and daily logs
- All RLS policies

### Migration 2: Second Schema Updates
File: `supabase/migrations/20260305071521_*.sql`

### Migration 3: Security and Enhancements
File: `supabase/migrations/20260305120000_security_and_enhancements.sql`

This adds:
- `role_requests` table (secure role assignment)
- `task_comments` table (task collaboration)
- `notifications` table (user notifications)
- Functions for role approval/rejection
- Notification creation function

## Step 3: Generate TypeScript Types

After running all migrations, regenerate Supabase types:

```bash
npx supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts
```

Or use Supabase CLI:
```bash
supabase login
supabase link --project-ref your-project-id
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Create First Admin User

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:8080/auth`

3. Sign up with your admin email

4. In Supabase SQL Editor, manually insert first admin role:
   ```sql
   -- Get your user ID from auth.users table
   SELECT id, email FROM auth.users;
   
   -- Insert admin role for your user ID
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('your-user-id-here', 'admin');
   ```

5. Refresh the page - you should now see the admin dashboard

6. From now on, use the "Role Requests" page to approve user roles

## Step 6: Storage Buckets

Verify storage buckets exist in Supabase:
- `project-documents` (private)
- `project-photos` (public)

These should be created by the migration, but if not, create them manually.

## Step 7: Production Build

```bash
npm run build
```

The build output will be in the `dist/` folder.

## Common Issues

### TypeScript Errors After Migration

**Problem**: TypeScript doesn't recognize new table names (role_requests, task_comments, notifications)

**Solution**: Regenerate types as shown in Step 3. The current code uses `as any` in some places as a temporary workaround.

### RLS Policy Errors

**Problem**: 403 errors when accessing data

**Solution**: Ensure all migrations ran successfully and RLS policies were created properly. Check Supabase logs for detailed errors.

### Port Already in Use

**Problem**: Port 8080 is occupied

**Solution**: The dev server will automatically try ports 8081 and 8082. Or kill the process using port 8080.

### Storage Upload Failures

**Problem**: Cannot upload documents or photos

**Solution**:
1. Check bucket permissions in Supabase Dashboard
2. Verify RLS policies for storage are correctly created
3. Check browser console for specific error messages

## Security Note

After deployment to production:
- Change all default passwords
- Review and tighten RLS policies if needed
- Enable email verification in Supabase Auth settings
- Set up proper backup procedures
- Monitor audit_events table for suspicious activity

## Post-Deployment Checklist

- [ ] All migrations ran successfully
- [ ] TypeScript types regenerated
- [ ] First admin user created
- [ ] Storage buckets accessible
- [ ] Email notifications configured (optional)
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Backup strategy in place

## Need Help?

If you encounter issues during deployment:

1. Check Supabase logs: Dashboard → Logs
2. Check browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure you're using the correct Supabase project

## Updating After Initial Deployment

When pulling new changes:

```bash
git pull origin main
npm install  # Install new dependencies
npm run build  # Rebuild
```

If new migrations were added:
1. Run new migrations in Supabase SQL Editor
2. Regenerate TypeScript types
3. Restart development server
