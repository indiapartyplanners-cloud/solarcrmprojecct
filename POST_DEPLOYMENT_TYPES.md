# Post-Deployment Steps

## Important: TypeScript Types Regeneration Required

After running the database migration `20260311000000_document_control_enhancements.sql`, you **MUST** regenerate the Supabase TypeScript types to avoid type errors.

### Step 1: Run the Migration

```bash
# In Supabase SQL Editor
# Run: supabase/migrations/20260311000000_document_control_enhancements.sql
```

### Step 2: Regenerate Types

```bash
# Method 1: Using Supabase CLI (Recommended)
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase gen types typescript --linked > src/integrations/supabase/types.ts

# Method 2: Using npx
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### Step 3: Verify New Types

The regenerated types file should include:

**New Tables:**
- `document_downloads` - Download history tracking

**New Columns on `documents`:**
- `document_type` - TEXT
- `category` - TEXT
- `file_format` - TEXT  
- `tags` - TEXT[]
- `approved_by` - UUID
- `approved_at` - TIMESTAMPTZ
- `reviewed_by` - UUID
- `reviewed_at` - TIMESTAMPTZ

**New Columns on `document_versions`:**
- `checksum` - TEXT
- `mime_type` - TEXT

**New RPC Functions:**
- `log_document_download(doc_id, version_num, ip_addr, agent)`
- `transition_document_state(doc_id, new_state, reviewer_id)`

### Step 4: Rebuild Application

```bash
npm run build
```

---

## Current Type Errors (Will be Fixed After Regeneration)

The following errors exist because the TypeScript types are not yet updated:

1. `document_downloads` table not in types
2. `log_document_download` RPC not in types
3. `transition_document_state` RPC not in types
4. New columns (`document_type`, `category`, `mime_type`) not in types

**These will be automatically resolved once types are regenerated.**

---

## Temporary Workaround (If You Can't Regenerate Types Immediately)

If you need to deploy before regenerating types, add these type overrides:

```typescript
// src/integrations/supabase/types-override.ts
export interface DocumentDownload {
  id: string;
  document_id: string;
  version_number: number;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  downloaded_at: string;
}

// Extend existing types
declare module './types' {
  interface Database {
    public: {
      Tables: {
        document_downloads: {
          Row: DocumentDownload;
          Insert: Omit<DocumentDownload, 'id' | 'downloaded_at'>;
          Update: Partial<Omit<DocumentDownload, 'id' | 'downloaded_at'>>;
        };
      };
      Functions: {
        log_document_download: {
          Args: {
            doc_id: string;
            version_num: number;
            ip_addr?: string;
            agent?: string;
          };
          Returns: string;
        };
        transition_document_state: {
          Args: {
            doc_id: string;
            new_state: 'draft' | 'in_review' | 'afc' | 'as_built';
            reviewer_id?: string;
          };
          Returns: void;
        };
      };
    };
  }
}
```

---

## Verification Checklist

After regenerating types and rebuilding:

- [ ] No TypeScript compilation errors
- [ ] `document_downloads` table accessible
- [ ] RPC functions callable without type errors
- [ ] New document columns available
- [ ] Application builds successfully
- [ ] All features working in production

---

## If You Encounter Issues

1. **Check migration ran successfully:**
   ```sql
   SELECT * FROM document_downloads LIMIT 1;
   SELECT * FROM pg_proc WHERE proname = 'log_document_download';
   ```

2. **Verify Supabase CLI version:**
   ```bash
   supabase --version
   # Should be v1.0.0 or higher
   ```

3. **Check project connection:**
   ```bash
   supabase projects list
   ```

4. **Manual type generation:**
   - Go to Supabase Dashboard
   - Settings → API
   - Copy TypeScript types to `src/integrations/supabase/types.ts`
