import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProjectData {
  name: string;
  description?: string;
  project_type: string;
  capacity_kw?: number;
  estimated_cost?: number;
  start_date?: string;
  target_completion?: string;
  stage: string;
}

interface ClientData {
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface SiteData {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

interface DocumentData {
  name: string;
  state: string;
  current_version: number;
  document_type?: string;
  category?: string;
}

interface MilestoneData {
  name: string;
  description?: string;
  due_date?: string;
  completed_at?: string;
}

interface PhotoEvidenceData {
  caption?: string | null;
  created_at?: string;
  file_path?: string;
}

interface CloseoutPackageData {
  project: ProjectData;
  client?: ClientData;
  site?: SiteData;
  documents?: DocumentData[];
  milestones?: MilestoneData[];
  photoEvidence?: PhotoEvidenceData[];
}

export const generateCloseoutPackagePDF = async (data: CloseoutPackageData): Promise<Blob> => {
  const doc = new jsPDF();
  let yPos = 20;

  const ensurePageSpace = (requiredHeight: number) => {
    if (yPos + requiredHeight > 270) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Header
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('PROJECT CLOSEOUT PACKAGE', 105, yPos, { align: 'center' });

  yPos += 15;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, yPos, { align: 'center' });

  yPos += 15;

  // Project Summary
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Project Summary', 20, yPos);
  yPos += 5;

  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  yPos += 10;

  doc.setFontSize(10);
  const projectInfo = [
    ['Project Name:', data.project.name],
    ['Type:', data.project.project_type.replace('_', ' ').toUpperCase()],
    ['Capacity:', data.project.capacity_kw ? `${data.project.capacity_kw} kW` : 'N/A'],
    ['Status:', 'PV MONITOR & CLOSEOUT DELIVERED'],
    ['Start Date:', data.project.start_date ? new Date(data.project.start_date).toLocaleDateString() : 'N/A'],
    ['Completion Date:', data.project.target_completion ? new Date(data.project.target_completion).toLocaleDateString() : 'N/A'],
  ];

  projectInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 70, yPos);
    yPos += 7;
  });

  if (data.project.description) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Description:', 20, yPos);
    yPos += 7;
    doc.setFont('helvetica', 'normal');
    const splitDescription = doc.splitTextToSize(data.project.description, 170);
    doc.text(splitDescription, 20, yPos);
    yPos += splitDescription.length * 7;
  }

  yPos += 10;

  // Client Information
  if (data.client) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Client Information', 20, yPos);
    yPos += 5;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const clientInfo = [
      ['Client Name:', data.client.full_name || 'N/A'],
      ['Email:', data.client.email || 'N/A'],
      ['Phone:', data.client.phone || 'N/A'],
      ['Address:', data.client.address || 'N/A'],
    ];

    clientInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, yPos);
      yPos += 7;
    });

    yPos += 10;
  }

  // Site Information
  if (data.site) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(16);
    doc.text('Site Information', 20, yPos);
    yPos += 5;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const siteInfo = [
      ['Site Name:', data.site.name],
      ['Address:', data.site.address],
      ['Coordinates:', data.site.latitude && data.site.longitude ?
        `${data.site.latitude.toFixed(4)}, ${data.site.longitude.toFixed(4)}` : 'N/A'],
    ];

    siteInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, yPos);
      yPos += 7;
    });

    yPos += 10;
  }

  // Milestone Timeline
  if (data.milestones && data.milestones.length > 0) {
    ensurePageSpace(70);

    doc.setFontSize(16);
    doc.text('Milestone Timeline', 20, yPos);
    yPos += 10;

    const milestoneRows = data.milestones.map(m => [
      m.name,
      m.due_date ? new Date(m.due_date).toLocaleDateString() : 'N/A',
      m.completed_at ? new Date(m.completed_at).toLocaleDateString() : 'Pending',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Milestone', 'Due Date', 'Completed']],
      body: milestoneRows,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  const allDocuments = data.documents || [];

  const approvedDrawings = allDocuments.filter(
    d =>
      d.document_type === 'drawing' &&
      (d.state === 'afc' || d.state === 'as_built'),
  );

  const qaReports = allDocuments.filter(
    d =>
      d.document_type === 'report' &&
      (d.state === 'afc' || d.state === 'as_built'),
  );

  const equipmentKeywords = ['module', 'panel', 'inverter', 'battery', 'transformer', 'racking', 'combiner'];
  const equipmentDocuments = allDocuments.filter(d => {
    const combined = `${d.name} ${d.category || ''} ${d.document_type || ''}`.toLowerCase();
    return equipmentKeywords.some(keyword => combined.includes(keyword));
  });

  const approvedDrawingRows = approvedDrawings.length > 0
    ? approvedDrawings.map(d => [
        d.name,
        d.state.toUpperCase().replace('_', ' '),
        `v${d.current_version}`,
      ])
    : [['No approved drawings available', '-', '-']];

  ensurePageSpace(80);
  doc.setFontSize(16);
  doc.text('Approved Drawings', 20, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Drawing', 'Status', 'Version']],
    body: approvedDrawingRows,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  const photoRows = (data.photoEvidence || []).length > 0
    ? (data.photoEvidence || []).slice(0, 20).map((photo, index) => [
        `Photo ${index + 1}`,
        photo.caption || 'Site evidence',
        photo.created_at ? new Date(photo.created_at).toLocaleDateString() : 'N/A',
      ])
    : [['No photo evidence available', '-', '-']];

  ensurePageSpace(80);
  doc.setFontSize(16);
  doc.text('Photo Evidence', 20, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Item', 'Caption', 'Date']],
    body: photoRows,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  const qaReportRows = qaReports.length > 0
    ? qaReports.map(d => [
        d.name,
        d.state.toUpperCase().replace('_', ' '),
        `v${d.current_version}`,
      ])
    : [['No QA reports available', '-', '-']];

  ensurePageSpace(80);
  doc.setFontSize(16);
  doc.text('QA Reports', 20, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Report', 'Status', 'Version']],
    body: qaReportRows,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  const equipmentRows = [
    ['System Type', data.project.project_type.replace('_', ' ').toUpperCase()],
    ['Installed Capacity', data.project.capacity_kw ? `${data.project.capacity_kw} kW DC` : 'N/A'],
    ['Equipment-Related Documents', `${equipmentDocuments.length}`],
    ['Estimated Annual Production', data.project.capacity_kw ? `${(data.project.capacity_kw * 1200).toFixed(0)} kWh/year` : 'N/A'],
  ];

  ensurePageSpace(80);
  doc.setFontSize(16);
  doc.text('Equipment Summary', 20, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: equipmentRows,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // System Specifications (new page)
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.text('System Specifications', 20, yPos);
  yPos += 5;
  doc.line(20, yPos, 190, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.text('This solar photovoltaic system has been installed, validated, and fully documented', 20, yPos);
  yPos += 7;
  doc.text('in accordance with all applicable codes and standards.', 20, yPos);
  yPos += 15;

  const specs = [
    ['System Type:', data.project.project_type.replace('_', ' ').toUpperCase()],
    ['Total Capacity:', data.project.capacity_kw ? `${data.project.capacity_kw} kW DC` : 'N/A'],
    ['Estimated Annual Production:', data.project.capacity_kw ? `${(data.project.capacity_kw * 1200).toFixed(0)} kWh/year` : 'N/A'],
  ];

  specs.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 80, yPos);
    yPos += 10;
  });

  // Client Sign-Off
  ensurePageSpace(80);
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Sign-Off', 105, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const signOffText = [
    'I confirm the project closeout package has been reviewed and accepted.',
    'All required closeout deliverables listed in this package are received.',
    '',
    'Client acceptance and sign-off:',
  ];

  signOffText.forEach(line => {
    doc.text(line, 105, yPos, { align: 'center' });
    yPos += 7;
  });

  yPos += 10;
  doc.line(30, yPos, 95, yPos);
  doc.line(115, yPos, 180, yPos);
  yPos += 6;
  doc.setFontSize(8);
  doc.text('Client Signature', 62, yPos, { align: 'center' });
  doc.text('Date', 147, yPos, { align: 'center' });

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' });
    doc.text('Element - Solar Project Management', 105, 290, { align: 'center' });
  }

  return doc.output('blob');
};
