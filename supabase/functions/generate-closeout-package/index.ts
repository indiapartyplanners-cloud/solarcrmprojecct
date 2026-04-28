// @ts-expect-error: Deno edge function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-expect-error: Deno edge function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Type definitions
interface Milestone {
  name: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  stage: string | null;
}

interface Document {
  name: string;
  document_type: string;
  current_version: number;
  created_at: string;
  document_state: string;
}

interface Photo {
  caption: string | null;
  category: string | null;
  taken_at: string;
  storage_path: string;
}

interface QAReport {
  completed_at: string;
  completed_by: string;
  checklist_templates?: { name: string };
}

interface PackageData {
  project: {
    name: string;
    description: string | null;
    type: string;
    capacity: number | null;
    cost: number | null;
    stage: string;
    completionDate: string;
  };
  client: {
    name: string;
    email: string;
    phone: string;
    address: string;
  } | null;
  site: {
    name: string;
    address: string;
    coordinates: unknown;
  } | null;
  milestones: Array<{
    name: string;
    description: string | null;
    dueDate: string | null;
    completedAt: string | null;
    stage: string | null;
  }>;
  documents: Array<{
    name: string;
    type: string;
    version: number;
    uploadedAt: string;
  }>;
  photos: Array<{
    caption: string | null;
    category: string | null;
    takenAt: string;
    url: string;
  }>;
  qaReports: Array<{
    name: string | undefined;
    completedAt: string;
    completedBy: string;
  }>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectId } = await req.json()

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'Project ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      // @ts-expect-error: Deno runtime global
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-expect-error: Deno runtime global
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch project data
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select(`
        *,
        clients (*),
        sites (*),
        milestones (*),
        documents (*)
      `)
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    // Fetch photos
    const { data: photos } = await supabaseClient
      .from('photos')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    // Fetch QA reports (checklist runs with completed status)
    const { data: qaReports } = await supabaseClient
      .from('checklist_runs')
      .select('*, checklist_templates(name)')
      .eq('project_id', projectId)
      .eq('status', 'completed')

    // Generate PDF content structure
    const packageData = {
      project: {
        name: project.name,
        description: project.description,
        type: project.project_type,
        capacity: project.capacity_kw,
        cost: project.estimated_cost,
        stage: project.stage,
        completionDate: project.updated_at,
      },
      client: project.clients ? {
        name: project.clients.name,
        email: project.clients.email,
        phone: project.clients.phone,
        address: project.clients.address,
      } : null,
      site: project.sites ? {
        name: project.sites.name,
        address: project.sites.address,
        coordinates: project.sites.coordinates,
      } : null,
      milestones: project.milestones.map((m: Milestone) => ({
        name: m.name,
        description: m.description,
        dueDate: m.due_date,
        completedAt: m.completed_at,
        stage: m.stage,
      })),
      documents: project.documents
        .filter((d: Document) => d.document_state === 'afc')
        .map((d: Document) => ({
          name: d.name,
          type: d.document_type,
          version: d.current_version,
          uploadedAt: d.created_at,
        })),
      photos: photos?.map((p: Photo) => ({
        caption: p.caption,
        category: p.category,
        takenAt: p.taken_at,
        url: p.storage_path,
      })) || [],
      qaReports: qaReports?.map((q: QAReport) => ({
        name: q.checklist_templates?.name,
        completedAt: q.completed_at,
        completedBy: q.completed_by,
      })) || [],
    }

    // Generate HTML content for PDF
    const htmlContent = generateCloseoutHTML(packageData)

    // In production, you would use a PDF generation library here
    // For this implementation, we'll create a simple HTML document
    // You can integrate with libraries like Puppeteer or PDF-lib
    
    // Create document record
    const fileName = `Closeout_Package_${project.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`
    const filePath = `${projectId}/${fileName}`

    // Upload to storage
    const { error: uploadError } = await supabaseClient.storage
      .from('closeout-packages')
      .upload(filePath, htmlContent, {
        contentType: 'text/html',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Create document record
    const { data: document, error: docError } = await supabaseClient
      .from('documents')
      .insert({
        project_id: projectId,
        name: `Closeout Package - ${project.name}`,
        document_type: 'closeout_package',
        document_state: 'AFC',
        storage_path: filePath,
        current_version: '1.0',
      })
      .select()
      .single()

    if (docError) throw docError

    // Notify project team
    const { data: teamMembers } = await supabaseClient
      .from('project_assignments')
      .select('user_id')
      .eq('project_id', projectId)

    if (teamMembers) {
      for (const member of teamMembers) {
        await supabaseClient.from('notifications').insert({
          user_id: member.user_id,
          title: 'Closeout Package Generated',
          message: `Closeout package has been generated for project: ${project.name}`,
          type: 'success',
          link: `/admin/documents`,
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        document: document,
        message: 'Closeout package generated successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function generateCloseoutHTML(data: PackageData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Closeout Package - ${data.project.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #3b82f6; margin-top: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
    .section { margin: 30px 0; }
    .info-grid { display: grid; grid-template-columns: 200px 1fr; gap: 10px; margin: 20px 0; }
    .info-label { font-weight: bold; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
    .milestone-completed { color: #10b981; }
    .milestone-pending { color: #6b7280; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Project Closeout Package</h1>
  <p>Generated on: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  
  <div class="section">
    <h2>Project Summary</h2>
    <div class="info-grid">
      <div class="info-label">Project Name:</div>
      <div>${data.project.name}</div>
      <div class="info-label">Description:</div>
      <div>${data.project.description || 'N/A'}</div>
      <div class="info-label">Type:</div>
      <div>${data.project.type}</div>
      <div class="info-label">Capacity:</div>
      <div>${data.project.capacity || 'N/A'} kW</div>
      <div class="info-label">Estimated Cost:</div>
      <div>$${data.project.cost ? Number(data.project.cost).toLocaleString() : 'N/A'}</div>
      <div class="info-label">Current Stage:</div>
      <div>${data.project.stage}</div>
    </div>
  </div>

  ${data.client ? `
  <div class="section">
    <h2>Client Information</h2>
    <div class="info-grid">
      <div class="info-label">Name:</div>
      <div>${data.client.name}</div>
      <div class="info-label">Email:</div>
      <div>${data.client.email}</div>
      <div class="info-label">Phone:</div>
      <div>${data.client.phone}</div>
      <div class="info-label">Address:</div>
      <div>${data.client.address}</div>
    </div>
  </div>
  ` : ''}

  ${data.site ? `
  <div class="section">
    <h2>Site Information</h2>
    <div class="info-grid">
      <div class="info-label">Site Name:</div>
      <div>${data.site.name}</div>
      <div class="info-label">Address:</div>
      <div>${data.site.address}</div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <h2>Project Timeline</h2>
    <table>
      <thead>
        <tr>
          <th>Milestone</th>
          <th>Description</th>
          <th>Due Date</th>
          <th>Completed</th>
          <th>Stage</th>
        </tr>
      </thead>
      <tbody>
        ${data.milestones.map(m => `
          <tr>
            <td>${m.name}</td>
            <td>${m.description || '-'}</td>
            <td>${m.dueDate ? new Date(m.dueDate).toLocaleDateString() : '-'}</td>
            <td class="${m.completedAt ? 'milestone-completed' : 'milestone-pending'}">
              ${m.completedAt ? new Date(m.completedAt).toLocaleDateString() : 'Pending'}
            </td>
            <td>${m.stage || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Approved Documents</h2>
    <table>
      <thead>
        <tr>
          <th>Document Name</th>
          <th>Type</th>
          <th>Version</th>
          <th>Upload Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.documents.map(d => `
          <tr>
            <td>${d.name}</td>
            <td>${d.type}</td>
            <td>${d.version}</td>
            <td>${new Date(d.uploadedAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>QA Reports</h2>
    <table>
      <thead>
        <tr>
          <th>Checklist</th>
          <th>Completed Date</th>
          <th>Completed By</th>
        </tr>
      </thead>
      <tbody>
        ${data.qaReports.map(q => `
          <tr>
            <td>${q.name}</td>
            <td>${new Date(q.completedAt).toLocaleDateString()}</td>
            <td>${q.completedBy}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Project Photos</h2>
    <p>${data.photos.length} photos documented throughout the project lifecycle.</p>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Caption</th>
          <th>Date Taken</th>
        </tr>
      </thead>
      <tbody>
        ${data.photos.map(p => `
          <tr>
            <td>${p.category || 'General'}</td>
            <td>${p.caption || '-'}</td>
            <td>${new Date(p.takenAt).toLocaleDateString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p><strong>Element - Solar Project Management System</strong></p>
    <p>This closeout package has been automatically generated and contains all relevant project information,
    approved documents, QA reports, and photo evidence for project: ${data.project.name}</p>
  </div>
</body>
</html>
  `
}
