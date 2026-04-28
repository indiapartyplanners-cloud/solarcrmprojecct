# Generate Closeout Package Edge Function

This Supabase Edge Function automatically generates a comprehensive closeout package when a project reaches the "Closeout Delivered" stage.

## Features

- Fetches complete project data including client, site, milestones, documents, photos, and QA reports
- Generates an HTML-based closeout package
- Uploads the package to Supabase Storage (`closeout-packages` bucket)
- Creates a document record in the database
- Notifies all project team members

## Deployment

```bash
# Deploy the function
supabase functions deploy generate-closeout-package

# Set required secrets
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage

### Automatic Trigger

The function is automatically triggered via PostgreSQL notification when a project's stage is updated to `closeout_delivered`. See the database trigger in migration `20260305140000_phase1_implementation.sql`.

### Manual Invocation

You can also invoke the function manually:

```javascript
const { data, error } = await supabase.functions.invoke('generate-closeout-package', {
  body: { projectId: 'your-project-id' }
})
```

## Package Contents

The generated closeout package includes:

1. **Project Summary** - Name, description, type, capacity, cost, stage
2. **Client Information** - Name, contact details, address
3. **Site Information** - Location and address details
4. **Project Timeline** - All milestones with completion status
5. **Approved Documents** - List of all AFC (Approved For Construction) documents
6. **QA Reports** - Completed checklist runs
7. **Project Photos** - Photo evidence with captions and categories

## Output Format

Currently outputs HTML format. For production use, integrate a PDF generation library:

- **Puppeteer** - For server-side Chrome rendering
- **jsPDF** - For client-side PDF generation
- **PDFKit** - For Node.js PDF generation

## Storage

Generated packages are stored in the `closeout-packages` bucket with the following structure:

```
closeout-packages/
  {project-id}/
    Closeout_Package_{project-name}_{date}.html
```

## Notifications

After generation, all team members assigned to the project receive a notification linking to the documents page where they can download the package.

## Error Handling

The function includes comprehensive error handling for:
- Missing project data
- Storage upload failures
- Database insertion errors
- Notification delivery issues

Errors are returned as JSON with appropriate HTTP status codes.
