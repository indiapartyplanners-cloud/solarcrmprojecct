# Deployment Checklist - Phase 1 Implementation

Use this checklist to deploy all Phase 1 features to production.

---

## ⚠️ PRE-DEPLOYMENT

### 1. Backup Current Database
- [ ] Export current database schema
- [ ] Backup all table data
- [ ] Export storage bucket contents
- [ ] Save current RLS policies
- [ ] Document current trigger state

### 2. Test in Development
- [ ] Verify all migrations run without errors
- [ ] Test checklist execution flow
- [ ] Test notification generation
- [ ] Test RLS policies for all roles
- [ ] Test edge function locally
- [ ] Review audit log entries

### 3. Code Review
- [ ] Review all new component code
- [ ] Check TypeScript compilation
- [ ] Verify no console errors
- [ ] Test responsive design
- [ ] Review security implications

---

## 📦 DATABASE DEPLOYMENT

### Step 1: Apply SQL Migration
**File:** `supabase/migrations/20260305140000_phase1_implementation.sql`

```bash
# Option A: Via Supabase Dashboard
1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy entire migration file
4. Paste into editor
5. Click "Run"
6. Verify "Success" message
```

```bash
# Option B: Via Supabase CLI
supabase db push
```

**Verify:**
- [ ] All triggers created successfully
- [ ] All functions created successfully
- [ ] All policies created successfully
- [ ] All indexes created successfully
- [ ] No error messages in logs

### Step 2: Verify Triggers
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**Expected Triggers:**
- [ ] `audit_projects` on projects table
- [ ] `audit_tasks` on tasks table
- [ ] `audit_documents` on documents table
- [ ] `audit_milestones` on milestones table
- [ ] `audit_clients` on clients table
- [ ] `audit_sites` on sites table
- [ ] `trigger_notify_task_assigned` on tasks table
- [ ] `trigger_notify_document_approved` on documents table
- [ ] `trigger_notify_project_stage_updated` on projects table
- [ ] `trigger_auto_complete_checklist` on checklist_runs table

### Step 3: Verify RLS Policies
```sql
SELECT 
  tablename, 
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected Policies for Each Table:**
- [ ] Projects: viewable by team, admins can manage
- [ ] Tasks: viewable by team, admins can manage, engineers can update
- [ ] Documents: viewable by team (AFC restriction), admins can manage
- [ ] Milestones: viewable by team, admins can manage
- [ ] Photos: viewable by team, engineers can upload, admins can manage
- [ ] Daily logs: viewable by team, engineers can create/update own
- [ ] Audit events: immutable, admins can view

### Step 4: Verify Storage Buckets
- [ ] `closeout-packages` bucket exists
- [ ] Bucket has correct RLS policies
- [ ] Authenticated users can view
- [ ] Admins can upload

---

## 🚀 EDGE FUNCTION DEPLOYMENT

### Step 1: Deploy Function
```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy function
supabase functions deploy generate-closeout-package
```

**Verify:**
- [ ] Function deployed successfully
- [ ] No deployment errors
- [ ] Function appears in Supabase Dashboard → Edge Functions

### Step 2: Set Environment Secrets
```bash
# Set Supabase URL
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co

# Set Service Role Key (from Supabase Dashboard → Settings → API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Verify:**
- [ ] Secrets set successfully
- [ ] No warning messages
- [ ] List secrets: `supabase secrets list`

### Step 3: Test Edge Function
```javascript
// Test in browser console or Postman
const { data, error } = await supabase.functions.invoke(
  'generate-closeout-package',
  {
    body: { projectId: 'test-project-id' }
  }
)
console.log('Result:', data, error)
```

**Verify:**
- [ ] Function executes without errors
- [ ] Returns success response
- [ ] File uploaded to storage
- [ ] Document record created
- [ ] Notifications sent

---

## 🎨 FRONTEND DEPLOYMENT

### Step 1: Build Application
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test build locally
npm run preview
```

**Verify:**
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No build warnings
- [ ] dist/ folder created

### Step 2: Deploy to Hosting
```bash
# Option A: Vercel
vercel deploy --prod

# Option B: Netlify
netlify deploy --prod

# Option C: Custom hosting
# Upload dist/ folder contents to your server
```

**Set Environment Variables:**
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

### Step 3: Verify Deployment
- [ ] Site loads correctly
- [ ] No console errors
- [ ] Authentication works
- [ ] API calls successful
- [ ] Assets load properly

---

## ✅ POST-DEPLOYMENT TESTING

### Test Checklist Execution
**As Admin:**
- [ ] Navigate to Admin → Tasks
- [ ] Click "Run Checklist" on a task
- [ ] Select a template
- [ ] Check off some items
- [ ] Add notes to items
- [ ] Click "Save Progress"
- [ ] Close and reopen - verify progress saved
- [ ] Complete all required items
- [ ] Verify auto-completion status

**As Engineer:**
- [ ] Navigate to Engineer → My Tasks
- [ ] Click "Run Checklist" on assigned task
- [ ] Execute checklist steps
- [ ] Verify same functionality as admin

### Test Audit Logging
- [ ] Create a new project (should log to audit_events)
- [ ] Update the project (should log changes)
- [ ] View audit logs:
  ```sql
  SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 10;
  ```
- [ ] Verify old_value and new_value captured
- [ ] Try to update audit event (should fail with RLS)
- [ ] Try to delete audit event (should fail with RLS)

### Test Row Level Security
**As Admin:**
- [ ] Can view all projects
- [ ] Can view all documents (including non-AFC)
- [ ] Can manage all resources

**As Engineer:**
- [ ] Can only see assigned projects
- [ ] Can only see AFC documents
- [ ] Cannot see unassigned projects
- [ ] Cannot see non-AFC documents
- [ ] Can update own tasks
- [ ] Can create daily logs
- [ ] Can upload photos

**As Customer:**
- [ ] Can only see own organization's projects
- [ ] Can only see AFC documents
- [ ] Cannot see other clients' projects
- [ ] Cannot modify anything

### Test Notifications
- [ ] Assign task to engineer
  - [ ] Engineer receives notification
  - [ ] Notification shows in bell icon
  - [ ] Click navigates to tasks page
  - [ ] Mark as read works
- [ ] Approve a document (change to AFC)
  - [ ] Project engineers receive notification
  - [ ] Notification content correct
- [ ] Update project stage
  - [ ] Team members receive notification
  - [ ] Stage update reflected

### Test Closeout Package
- [ ] Create test project with:
  - [ ] Client assigned
  - [ ] Site assigned
  - [ ] Multiple milestones (some completed)
  - [ ] Documents (some AFC)
  - [ ] Photos uploaded
  - [ ] Completed checklist runs
- [ ] Update project stage to 'closeout_delivered'
- [ ] Wait 30-60 seconds for edge function
- [ ] Check Storage → closeout-packages bucket
  - [ ] File exists
  - [ ] File is downloadable
- [ ] Check documents table
  - [ ] Document record created
  - [ ] Reference points to storage file
- [ ] Check notifications
  - [ ] Team members notified
  - [ ] Notification links to documents page
- [ ] Download and review closeout package
  - [ ] All sections present
  - [ ] Data accurate
  - [ ] Formatting correct

---

## 🔍 MONITORING

### After Deployment - First 24 Hours
- [ ] Monitor error logs in Supabase Dashboard
- [ ] Check edge function invocations
- [ ] Review RLS policy performance
- [ ] Monitor API response times
- [ ] Check storage usage
- [ ] Review audit log entries

### Metrics to Track
- [ ] Checklist completion rate
- [ ] Notification delivery success
- [ ] Edge function execution time
- [ ] Storage bucket usage
- [ ] Audit event volume
- [ ] User session activity

---

## 🆘 ROLLBACK PLAN

### If Issues Occur

**Option 1: Disable Features**
```sql
-- Disable notifications
DROP TRIGGER IF EXISTS trigger_notify_task_assigned ON tasks;
DROP TRIGGER IF EXISTS trigger_notify_document_approved ON documents;
DROP TRIGGER IF EXISTS trigger_notify_project_stage_updated ON projects;

-- Disable audit logging (not recommended)
DROP TRIGGER IF EXISTS audit_projects ON projects;
-- etc...
```

**Option 2: Revert Migration**
- Restore database from backup
- Revert to previous code commit
- Redeploy previous version

**Option 3: Hotfix**
- Identify specific problematic policy/trigger
- Create hotfix migration
- Deploy targeted fix

---

## 📞 SUPPORT CONTACTS

**Technical Issues:**
- Database: Check Supabase Dashboard logs
- Frontend: Check browser console
- Edge Functions: Check Supabase Functions logs

**Documentation:**
- [PHASE1_IMPLEMENTATION.md](PHASE1_IMPLEMENTATION.md) - Complete feature docs
- [README.md](README.md) - Project overview
- Edge Function README - Function-specific docs

---

## ✅ DEPLOYMENT COMPLETE

### Final Verification
- [ ] All migrations applied
- [ ] All triggers active
- [ ] RLS policies enforced
- [ ] Edge function deployed
- [ ] Frontend deployed
- [ ] All tests passing
- [ ] No critical errors
- [ ] Team notified
- [ ] Documentation updated
- [ ] Monitoring active

### Communication
- [ ] Notify stakeholders of deployment
- [ ] Share new feature documentation
- [ ] Schedule training session
- [ ] Update status in project management tool

---

**Deployment Date:** __________  
**Deployed By:** __________  
**Sign-off:** __________

---

**Next Steps:**
1. Monitor for 24-48 hours
2. Gather user feedback
3. Create issue tickets for any bugs
4. Plan Phase 2 features
