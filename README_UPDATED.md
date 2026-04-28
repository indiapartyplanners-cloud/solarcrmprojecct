# Element - Solar Project Management System

A comprehensive CRM and project management platform for solar installation companies.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

## ✨ Features

### Core Modules
- **Admin Panel** - Complete project management, user administration, reporting
- **Engineer Portal** - Task management, daily logs, photo uploads, checklist execution
- **Customer Dashboard** - Project tracking, milestone viewing, document access

### Phase 1 Features (✅ Complete)
1. **Checklist Execution System** - Interactive checklists with progress tracking
2. **Automatic Audit Logging** - Immutable activity tracking for compliance
3. **Row Level Security** - Complete data isolation by role and project assignment
4. **Closeout Package Automation** - Auto-generated project closeout documentation
5. **Notification System** - Real-time alerts for task assignments, approvals, and updates
6. **Advanced UI Components** - ChecklistRunner, ChecklistProgress, ChecklistItem

See [PHASE1_IMPLEMENTATION.md](PHASE1_IMPLEMENTATION.md) for complete documentation.

## 📋 Database Schema

**17 Tables:**
- User management (profiles, user_roles)
- Organization structure (organizations, clients, sites)
- Projects and tasks
- Documents and versions
- Checklists and executions
- Photos and daily logs
- Audit events and notifications

## 🔐 Role-Based Access

### Admin
- Full system access
- User and role management
- Project oversight
- Reports and analytics

### Engineer
- Assigned tasks and projects
- Daily log creation
- Photo uploads
- Checklist execution
- AFC document access only

### Customer
- View own organization's projects
- Track milestones and progress
- Access AFC documents
- Download reports

## 🏗️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **State:** React Query (TanStack Query)
- **Routing:** React Router v6

## 📦 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── ChecklistRunner.tsx
│   ├── NotificationBell.tsx
│   └── ...
├── pages/              # Route components
│   ├── admin/         # Admin panel pages
│   ├── engineer/      # Engineer portal pages
│   └── customer/      # Customer dashboard
├── contexts/          # React contexts (Auth)
├── hooks/             # Custom hooks
├── lib/               # Utilities
└── integrations/      # Supabase client

supabase/
├── migrations/        # Database migrations
└── functions/         # Edge functions
```

## 🔧 Environment Variables

Required variables in `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📚 Documentation

- **[PHASE1_IMPLEMENTATION.md](PHASE1_IMPLEMENTATION.md)** - Complete Phase 1 feature documentation
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[supabase/functions/generate-closeout-package/README.md](supabase/functions/generate-closeout-package/README.md)** - Edge function documentation

## 🚢 Deployment

### Database Setup

1. Create Supabase project
2. Run migrations in order:
   ```
   20260305071502_c4e3c15f-a649-4f6d-ab72-35f459d0ec77.sql
   20260305071521_f590ff16-75f4-4f67-bd0e-681a5e882841.sql
   20260305130000_allow_self_role_assignment.sql
   20260305140000_phase1_implementation.sql  ← Phase 1 features
   ```

### Edge Functions

```bash
# Deploy closeout package generator
supabase functions deploy generate-closeout-package

# Set secrets
supabase secrets set SUPABASE_URL=your_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Frontend

```bash
# Build for production
npm run build

# Deploy to Vercel/Netlify
# Configure environment variables in deployment platform
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🧪 Testing

Run the testing checklist in [PHASE1_IMPLEMENTATION.md](PHASE1_IMPLEMENTATION.md#-testing-checklist) to verify all features.

## 🎯 Key Features by Role

### Admin Capabilities
- ✅ Project CRUD with stage management
- ✅ Task assignment and tracking
- ✅ Team member management
- ✅ Document version control
- ✅ Checklist template creation
- ✅ Role request approvals
- ✅ Audit log viewing
- ✅ Reports and analytics

### Engineer Capabilities
- ✅ View assigned tasks
- ✅ Execute checklists on tasks
- ✅ Update task status
- ✅ Create daily logs
- ✅ Upload site photos
- ✅ Access AFC documents
- ✅ Receive notifications

### Customer Capabilities
- ✅ View project progress
- ✅ Track milestones
- ✅ Access approved documents
- ✅ Download closeout packages
- ✅ Monitor project timeline

## 🔒 Security Features

- ✅ Row Level Security (RLS) on all tables
- ✅ Role-based access control (RBAC)
- ✅ Immutable audit logging
- ✅ AFC document restrictions for non-admins
- ✅ Project-based data isolation
- ✅ Secure file storage with signed URLs

## 📊 Database Features

### Triggers & Automation
- Audit logging on all major tables
- Notification generation on key events
- Auto-completion of checklists
- Closeout package generation trigger

### Indexes & Performance
- Optimized queries with strategic indexes
- Efficient RLS policies
- Query caching via React Query
- Pagination ready

## 🤝 Contributing

1. Follow existing code patterns
2. Use TypeScript strict mode
3. Add RLS policies for new tables
4. Document new features
5. Test all role access levels

## 📝 License

Proprietary - All rights reserved

---

**Status:** Production Ready ✅  
**Version:** 2.0 (Phase 1 Complete)  
**Last Updated:** March 5, 2026
