import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";

type InfoSection = {
  heading: string;
  points: string[];
};

type InfoContent = {
  eyebrow: string;
  title: string;
  description: string;
  sections: InfoSection[];
};

const infoContentBySlug: Record<string, InfoContent> = {
  about: {
    eyebrow: "Company",
    title: "About Solar Tracker",
    description:
      "Solar Tracker helps EPC teams, engineers, and homeowners manage the full lifecycle of solar projects from planning to closeout.",
    sections: [
      {
        heading: "What We Build",
        points: [
          "Project lifecycle tracking from kickoff to handover",
          "Role-based dashboards for admin, sales, engineering, and clients",
          "Centralized document control and audit-ready records",
        ],
      },
      {
        heading: "Why Teams Choose Us",
        points: [
          "Single source of truth for tasks, photos, and approvals",
          "Faster execution with real-time collaboration",
          "Clear accountability across field and office operations",
        ],
      },
    ],
  },
  features: {
    eyebrow: "Product",
    title: "Solar Tracker Features",
    description:
      "A practical feature set designed for delivery speed, quality control, and long-term operations visibility.",
    sections: [
      {
        heading: "Execution Tools",
        points: [
          "Task checklists with status tracking and comments",
          "Photo capture and evidence workflows",
          "Role-based task queues for cross-functional teams",
        ],
      },
      {
        heading: "Control and Reporting",
        points: [
          "Document version history and secure access policies",
          "Project analytics and operational dashboards",
          "Closeout package generation and export support",
        ],
      },
    ],
  },
  changelog: {
    eyebrow: "Release Notes",
    title: "Changelog",
    description:
      "Recent platform updates focused on reliability, governance, and project execution throughput.",
    sections: [
      {
        heading: "Latest Improvements",
        points: [
          "Document control enhancements and safer access rules",
          "Realtime project synchronization improvements",
          "Task photo workflows and checklist defaults",
        ],
      },
      {
        heading: "Operational Enhancements",
        points: [
          "Role request and audit visibility upgrades",
          "Security-focused migration updates",
          "Better closeout and reporting readiness",
        ],
      },
    ],
  },
  faqs: {
    eyebrow: "Help Center",
    title: "Frequently Asked Questions",
    description:
      "Quick answers to common product, onboarding, and access questions.",
    sections: [
      {
        heading: "Getting Started",
        points: [
          "Create your account and request the correct team role",
          "Admins can invite users and configure organization settings",
          "Use checklist templates to standardize project execution",
        ],
      },
      {
        heading: "Access and Support",
        points: [
          "Client users can access project documents and closeout files",
          "Admins handle role approvals and audit monitoring",
          "Support can assist with setup and data access requests",
        ],
      },
    ],
  },
  integrations: {
    eyebrow: "Product",
    title: "Integrations",
    description:
      "Solar Tracker is built to connect with your delivery stack and reporting workflows.",
    sections: [
      {
        heading: "Platform Integrations",
        points: [
          "Secure cloud data services and realtime channels",
          "Document storage and controlled distribution workflows",
          "Structured data exports for downstream analytics",
        ],
      },
      {
        heading: "Operational Integrations",
        points: [
          "Task and checklist handoff across internal teams",
          "Closeout package outputs for customer delivery",
          "Extensible architecture for future ERP/CRM connectors",
        ],
      },
    ],
  },
  blog: {
    eyebrow: "Company",
    title: "Engineering and Operations Blog",
    description:
      "Field lessons, implementation playbooks, and product updates from solar delivery teams.",
    sections: [
      {
        heading: "Popular Topics",
        points: [
          "Reducing project delays with standardized checklists",
          "Improving quality assurance through photo evidence",
          "Building audit-ready closeout packages at scale",
        ],
      },
      {
        heading: "What You Will Learn",
        points: [
          "How to shorten approval cycles",
          "Ways to improve handoffs between teams",
          "Practical governance patterns for growing operations",
        ],
      },
    ],
  },
  careers: {
    eyebrow: "Company",
    title: "Careers at Solar Tracker",
    description:
      "Join a team focused on practical software that accelerates renewable project delivery.",
    sections: [
      {
        heading: "Current Focus Areas",
        points: [
          "Product engineering for workflow-heavy interfaces",
          "Operations and implementation support",
          "Customer success for enterprise rollouts",
        ],
      },
      {
        heading: "What We Value",
        points: [
          "Ownership and execution speed",
          "Clear communication with field-first thinking",
          "Building resilient systems for long-term impact",
        ],
      },
    ],
  },
  contact: {
    eyebrow: "Company",
    title: "Contact Us",
    description:
      "Talk with our team about deployment, onboarding, and ongoing operational support.",
    sections: [
      {
        heading: "Sales and Onboarding",
        points: [
          "Platform walkthroughs for project teams",
          "Implementation planning based on your workflow",
          "Role and environment setup guidance",
        ],
      },
      {
        heading: "Support",
        points: [
          "Issue triage for access and data questions",
          "Operational best-practice recommendations",
          "Escalation paths for priority incidents",
        ],
      },
    ],
  },
  privacy: {
    eyebrow: "Legal",
    title: "Privacy",
    description:
      "How user, project, and operational data is handled within Solar Tracker.",
    sections: [
      {
        heading: "Data Handling",
        points: [
          "Role-based access controls for sensitive records",
          "Controlled document access and retention policies",
          "Audit visibility across key operations",
        ],
      },
      {
        heading: "User Rights",
        points: [
          "Request access and correction for your account data",
          "Defined support channels for privacy-related inquiries",
          "Policy updates communicated through release channels",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    description:
      "The standard terms governing use of the Solar Tracker platform.",
    sections: [
      {
        heading: "Service Scope",
        points: [
          "Access based on assigned user roles",
          "Use of workflow features for legitimate project operations",
          "Platform updates delivered as part of product lifecycle",
        ],
      },
      {
        heading: "Responsibilities",
        points: [
          "Organizations manage user access and approvals",
          "Users maintain secure account practices",
          "Compliance with applicable data and project regulations",
        ],
      },
    ],
  },
  security: {
    eyebrow: "Legal",
    title: "Security",
    description:
      "A summary of platform safeguards used to protect project and account data.",
    sections: [
      {
        heading: "Application Security",
        points: [
          "Authenticated, role-aware route and data access",
          "Secure storage patterns for project assets",
          "Policy-backed controls for document visibility",
        ],
      },
      {
        heading: "Operational Security",
        points: [
          "Audit trails for sensitive actions",
          "Controlled migration and release workflows",
          "Continuous improvement through security-focused updates",
        ],
      },
    ],
  },
  compliance: {
    eyebrow: "Legal",
    title: "Compliance",
    description:
      "Governance capabilities designed to support internal controls and customer requirements.",
    sections: [
      {
        heading: "Governance Capabilities",
        points: [
          "Document versioning and history for traceability",
          "Approval workflows and responsibility tracking",
          "Auditable role and access control events",
        ],
      },
      {
        heading: "Project Assurance",
        points: [
          "Standardized checklist execution evidence",
          "Task and photo records for quality verification",
          "Closeout-ready reporting and packaging",
        ],
      },
    ],
  },
  support: {
    eyebrow: "Help Center",
    title: "Support",
    description:
      "Guidance and troubleshooting for your teams throughout deployment and daily operations.",
    sections: [
      {
        heading: "Support Coverage",
        points: [
          "Account access and role troubleshooting",
          "Document and workflow issue diagnostics",
          "Assistance with onboarding and handoff setup",
        ],
      },
      {
        heading: "Best Response Path",
        points: [
          "Include project context and affected role",
          "Attach screenshots for UI and data mismatches",
          "Flag priority and business impact for faster triage",
        ],
      },
    ],
  },
};

const PublicInfoPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const content = slug ? infoContentBySlug[slug] : undefined;

  if (!content) {
    return (
      <main className="min-h-screen bg-[#edf0f2] px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#cfd6d0] bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6A00]">
            Page Not Found
          </p>
          <h1 className="mt-3 text-3xl font-black text-[#1f2937]">
            This page is not available.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            The requested information page does not exist or has moved.
          </p>
          <Button asChild className="mt-8 bg-[#D4A017] hover:bg-[#B8860B]">
            <Link to="/">Return to home</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#edf0f2] px-6 py-10 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#8A6A00] hover:text-[#5F4800]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to landing
        </Link>

        <section className="mt-8 rounded-3xl border border-[#d8ded9] bg-white p-8 shadow-sm lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6A00]">
            {content.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-[#1f2937] lg:text-5xl">
            {content.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-gray-600 lg:text-lg">
            {content.description}
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {content.sections.map((section) => (
              <article
                key={section.heading}
                className="rounded-2xl border border-[#e6ece7] bg-[#f9fbf9] p-6"
              >
                <h2 className="text-lg font-bold text-[#1f2937]">
                  {section.heading}
                </h2>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-gray-700">
                  {section.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#D4A017]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild className="bg-[#D4A017] hover:bg-[#B8860B]">
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                to="/info/contact"
                className="inline-flex items-center gap-2"
              >
                Contact Team
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default PublicInfoPage;
