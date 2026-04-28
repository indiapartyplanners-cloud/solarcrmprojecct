-- Insert default checklist templates for solar project workflows

-- 1. Pre-Installation Site Survey
INSERT INTO public.checklist_templates (name, description, items)
VALUES (
  'Pre-Installation Site Survey',
  'Comprehensive site assessment checklist to be completed before beginning any solar installation project',
  '[
    {"id": "item-1", "text": "Verify site address and customer contact information", "required": true},
    {"id": "item-2", "text": "Confirm property ownership and authorization", "required": true},
    {"id": "item-3", "text": "Assess roof condition and structural integrity", "required": true},
    {"id": "item-4", "text": "Check roof age and material type", "required": true},
    {"id": "item-5", "text": "Measure roof dimensions and available space", "required": true},
    {"id": "item-6", "text": "Identify optimal panel placement areas", "required": true},
    {"id": "item-7", "text": "Check for shading from trees, buildings, or other obstructions", "required": true},
    {"id": "item-8", "text": "Evaluate roof access and safety requirements", "required": true},
    {"id": "item-9", "text": "Document existing electrical panel capacity and condition", "required": true},
    {"id": "item-10", "text": "Measure distance from electrical panel to planned inverter location", "required": true},
    {"id": "item-11", "text": "Identify suitable location for inverter installation", "required": true},
    {"id": "item-12", "text": "Check for utility meter location and accessibility", "required": true},
    {"id": "item-13", "text": "Document HOA restrictions or local ordinances", "required": false},
    {"id": "item-14", "text": "Take photos of roof, electrical panel, and installation areas", "required": true},
    {"id": "item-15", "text": "Complete site survey form with customer signature", "required": true}
  ]'::jsonb
);

-- 2. System Design Review
INSERT INTO public.checklist_templates (name, description, items)
VALUES (
  'System Design Review',
  'Checklist for reviewing and validating solar system design specifications before installation',
  '[
    {"id": "item-1", "text": "Verify system size matches customer agreement (kW)", "required": true},
    {"id": "item-2", "text": "Confirm panel specifications and model numbers", "required": true},
    {"id": "item-3", "text": "Verify inverter specifications and model number", "required": true},
    {"id": "item-4", "text": "Review panel layout and configuration", "required": true},
    {"id": "item-5", "text": "Confirm string sizing and configuration is optimal", "required": true},
    {"id": "item-6", "text": "Verify electrical calculations (voltage, current, power)", "required": true},
    {"id": "item-7", "text": "Review conduit and wiring plan", "required": true},
    {"id": "item-8", "text": "Confirm mounting system is appropriate for roof type", "required": true},
    {"id": "item-9", "text": "Check AC disconnect and safety equipment specifications", "required": true},
    {"id": "item-10", "text": "Verify system meets local electrical codes", "required": true},
    {"id": "item-11", "text": "Confirm design includes required fire setbacks", "required": true},
    {"id": "item-12", "text": "Review interconnection application requirements", "required": true},
    {"id": "item-13", "text": "Verify all equipment is on approved models list", "required": true},
    {"id": "item-14", "text": "Check warranty requirements are met", "required": false},
    {"id": "item-15", "text": "Obtain design approval from lead engineer", "required": true}
  ]'::jsonb
);

-- 3. Installation Quality Control
INSERT INTO public.checklist_templates (name, description, items)
VALUES (
  'Installation Quality Control',
  'Quality control checklist to be completed during solar system installation to ensure proper workmanship',
  '[
    {"id": "item-1", "text": "Verify all required permits are on-site", "required": true},
    {"id": "item-2", "text": "Confirm fall protection equipment is in place", "required": true},
    {"id": "item-3", "text": "Check all mounting hardware is correctly installed", "required": true},
    {"id": "item-4", "text": "Verify flashing is properly installed at all roof penetrations", "required": true},
    {"id": "item-5", "text": "Confirm panels are securely attached to mounting system", "required": true},
    {"id": "item-6", "text": "Verify panel orientation and tilt angle per design", "required": true},
    {"id": "item-7", "text": "Check all panel serial numbers match shipping documentation", "required": true},
    {"id": "item-8", "text": "Verify string wiring is correct per design", "required": true},
    {"id": "item-9", "text": "Check all DC connections are properly torqued", "required": true},
    {"id": "item-10", "text": "Confirm conduit is properly secured and waterproofed", "required": true},
    {"id": "item-11", "text": "Verify inverter is mounted per manufacturer specifications", "required": true},
    {"id": "item-12", "text": "Check AC disconnect is properly installed and labeled", "required": true},
    {"id": "item-13", "text": "Verify grounding and bonding per NEC requirements", "required": true},
    {"id": "item-14", "text": "Confirm all labels are installed per code requirements", "required": true},
    {"id": "item-15", "text": "Complete installation photos documentation", "required": true},
    {"id": "item-16", "text": "Clean up site and remove all debris", "required": true}
  ]'::jsonb
);

-- 4. Final System Inspection and Testing
INSERT INTO public.checklist_templates (name, description, items)
VALUES (
  'Final System Inspection and Testing',
  'Comprehensive inspection and testing checklist to be completed before system commissioning',
  '[
    {"id": "item-1", "text": "Verify all installation work is complete", "required": true},
    {"id": "item-2", "text": "Check all DC voltage readings are within specification", "required": true},
    {"id": "item-3", "text": "Verify open circuit voltage (Voc) for each string", "required": true},
    {"id": "item-4", "text": "Measure short circuit current (Isc) for each string", "required": true},
    {"id": "item-5", "text": "Test ground continuity on all equipment", "required": true},
    {"id": "item-6", "text": "Verify insulation resistance (megohm reading)", "required": true},
    {"id": "item-7", "text": "Check inverter startup and initialization", "required": true},
    {"id": "item-8", "text": "Verify inverter displays no error codes", "required": true},
    {"id": "item-9", "text": "Confirm AC output voltage and frequency are correct", "required": true},
    {"id": "item-10", "text": "Test rapid shutdown system functionality", "required": true},
    {"id": "item-11", "text": "Verify system monitoring is operational", "required": true},
    {"id": "item-12", "text": "Test AC disconnect operation", "required": true},
    {"id": "item-13", "text": "Confirm main breaker and panel connections", "required": true},
    {"id": "item-14", "text": "Verify system production matches expected output", "required": true},
    {"id": "item-15", "text": "Document all test results and measurements", "required": true},
    {"id": "item-16", "text": "Complete final inspection photos", "required": true}
  ]'::jsonb
);

-- 5. Customer Handoff and Training
INSERT INTO public.checklist_templates (name, description, items)
VALUES (
  'Customer Handoff and Training',
  'Checklist for training customer and completing project handoff',
  '[
    {"id": "item-1", "text": "Walk customer through system operation", "required": true},
    {"id": "item-2", "text": "Demonstrate how to read inverter display", "required": true},
    {"id": "item-3", "text": "Show customer how to access monitoring portal", "required": true},
    {"id": "item-4", "text": "Set up customer monitoring account credentials", "required": true},
    {"id": "item-5", "text": "Explain expected system production and seasonal variations", "required": true},
    {"id": "item-6", "text": "Review system warranties and coverage", "required": true},
    {"id": "item-7", "text": "Explain maintenance requirements and recommendations", "required": true},
    {"id": "item-8", "text": "Demonstrate AC disconnect operation", "required": true},
    {"id": "item-9", "text": "Provide emergency shutdown procedures", "required": true},
    {"id": "item-10", "text": "Review what to do if system stops producing", "required": true},
    {"id": "item-11", "text": "Provide contact information for support", "required": true},
    {"id": "item-12", "text": "Give customer all system documentation and manuals", "required": true},
    {"id": "item-13", "text": "Provide copies of permits and inspection approvals", "required": true},
    {"id": "item-14", "text": "Explain interconnection agreement and net metering", "required": true},
    {"id": "item-15", "text": "Answer all customer questions", "required": true},
    {"id": "item-16", "text": "Obtain customer signature on completion certificate", "required": true}
  ]'::jsonb
);

-- 6. Project Documentation Closeout
INSERT INTO public.checklist_templates (name, description, items)
VALUES (
  'Project Documentation Closeout',
  'Checklist for ensuring all project documentation is complete before final closeout',
  '[
    {"id": "item-1", "text": "Signed customer contract on file", "required": true},
    {"id": "item-2", "text": "Completed site survey documentation", "required": true},
    {"id": "item-3", "text": "Final system design drawings", "required": true},
    {"id": "item-4", "text": "Building permit and approval", "required": true},
    {"id": "item-5", "text": "Electrical permit and approval", "required": true},
    {"id": "item-6", "text": "Final inspection sign-off documentation", "required": true},
    {"id": "item-7", "text": "Utility interconnection agreement", "required": true},
    {"id": "item-8", "text": "Permission to operate (PTO) from utility", "required": true},
    {"id": "item-9", "text": "Equipment specification sheets and manuals", "required": true},
    {"id": "item-10", "text": "Panel serial numbers documented", "required": true},
    {"id": "item-11", "text": "Inverter serial number documented", "required": true},
    {"id": "item-12", "text": "Warranty registration completed", "required": true},
    {"id": "item-13", "text": "System test results and commissioning report", "required": true},
    {"id": "item-14", "text": "As-built photos uploaded to system", "required": true},
    {"id": "item-15", "text": "Customer training completion certificate", "required": true},
    {"id": "item-16", "text": "Final invoice and payment confirmation", "required": true},
    {"id": "item-17", "text": "Project closeout package sent to customer", "required": true}
  ]'::jsonb
);

-- 7. Electrical Safety Inspection
INSERT INTO public.checklist_templates (name, description, items)
VALUES (
  'Electrical Safety Inspection',
  'Detailed electrical safety checklist for code compliance verification',
  '[
    {"id": "item-1", "text": "Verify all wiring meets NEC requirements", "required": true},
    {"id": "item-2", "text": "Check proper wire gauge for all circuits", "required": true},
    {"id": "item-3", "text": "Verify conduit type is appropriate for installation", "required": true},
    {"id": "item-4", "text": "Check all junction boxes are properly sealed", "required": true},
    {"id": "item-5", "text": "Verify equipment grounding conductors are present", "required": true},
    {"id": "item-6", "text": "Check bonding jumpers are properly installed", "required": true},
    {"id": "item-7", "text": "Verify grounding electrode system is adequate", "required": true},
    {"id": "item-8", "text": "Check DC disconnects are properly rated", "required": true},
    {"id": "item-9", "text": "Verify AC disconnect meets code requirements", "required": true},
    {"id": "item-10", "text": "Check overcurrent protection devices are properly sized", "required": true},
    {"id": "item-11", "text": "Verify all labels are code-compliant", "required": true},
    {"id": "item-12", "text": "Check arc-fault protection if required", "required": true},
    {"id": "item-13", "text": "Verify rapid shutdown compliance", "required": true},
    {"id": "item-14", "text": "Check clearances meet code requirements", "required": true},
    {"id": "item-15", "text": "Verify working space around equipment is adequate", "required": true}
  ]'::jsonb
);

-- 8. Maintenance Service Checklist
INSERT INTO public.checklist_templates (name, description, items)
VALUES (
  'Maintenance Service Checklist',
  'Regular maintenance and service checklist for existing solar installations',
  '[
    {"id": "item-1", "text": "Visual inspection of all solar panels", "required": true},
    {"id": "item-2", "text": "Check for panel damage, cracks, or discoloration", "required": true},
    {"id": "item-3", "text": "Inspect panel mounting hardware for corrosion or looseness", "required": true},
    {"id": "item-4", "text": "Check for debris accumulation on panels", "required": false},
    {"id": "item-5", "text": "Inspect all roof penetrations and flashing", "required": true},
    {"id": "item-6", "text": "Check conduit and wire connections", "required": true},
    {"id": "item-7", "text": "Verify inverter is displaying normal operation", "required": true},
    {"id": "item-8", "text": "Review inverter error logs", "required": true},
    {"id": "item-9", "text": "Check inverter ventilation and cooling", "required": true},
    {"id": "item-10", "text": "Test system production vs. expected output", "required": true},
    {"id": "item-11", "text": "Verify monitoring system is operational", "required": true},
    {"id": "item-12", "text": "Check AC disconnect operation", "required": true},
    {"id": "item-13", "text": "Inspect electrical panel connections", "required": true},
    {"id": "item-14", "text": "Test rapid shutdown functionality", "required": true},
    {"id": "item-15", "text": "Document any issues or recommendations", "required": true},
    {"id": "item-16", "text": "Update maintenance log", "required": true}
  ]'::jsonb
);

-- Add comment
COMMENT ON TABLE public.checklist_templates IS 'Pre-defined checklist templates for common solar installation workflows. Includes default templates for site surveys, inspections, testing, and project closeout.';
