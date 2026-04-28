import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { submitLead } from "@/lib/leads";
import { useToast } from "@/hooks/use-toast";

const services = [
  "Residential solar installation",
  "Commercial solar installation",
  "Solar panel maintenance",
  "Solar battery storage",
  "Solar consultation and inspection",
];

const faqs = [
  {
    q: "How do solar panels work?",
    a: "Solar panels convert sunlight into electricity using photovoltaic cells and feed power to your home or business.",
  },
  {
    q: "How much does installation cost?",
    a: "Cost depends on system size, roof type, and energy needs. We provide custom quotes after site assessment.",
  },
  {
    q: "How long does installation take?",
    a: "Typical projects take 2-6 weeks from design approval to final commissioning.",
  },
  {
    q: "Do systems need regular maintenance?",
    a: "Yes, but it is minimal. We offer routine maintenance and health checks to keep performance high.",
  },
];

const initialFormState = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  serviceInterest: "Residential solar installation",
  message: "",
};

const Landing = () => {
  const [quoteForm, setQuoteForm] = useState(initialFormState);
  const [contactForm, setContactForm] = useState(initialFormState);
  const [submittingType, setSubmittingType] = useState<"quote" | "contact" | null>(
    null,
  );
  const { toast } = useToast();

  const handleSubmit = async (type: "quote" | "contact") => {
    const payload = type === "quote" ? quoteForm : contactForm;

    if (!payload.fullName || !payload.email || !payload.phone) {
      toast({
        title: "Missing details",
        description: "Please provide full name, email, and phone.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingType(type);
    try {
      await submitLead({ ...payload, type });
      toast({
        title: type === "quote" ? "Quote requested" : "Message sent",
        description: "Our team will contact you soon.",
      });
      if (type === "quote") {
        setQuoteForm(initialFormState);
      } else {
        setContactForm(initialFormState);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Please try again in a moment.";
      toast({
        title: "Submission failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmittingType(null);
    }
  };

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Element Solar" className="h-12 w-auto" />
            <p className="font-semibold">Element Solar</p>
          </div>
          <nav className="hidden gap-5 text-sm font-medium md:flex">
            <a href="#home">Home</a>
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#projects">Projects</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
            <Link to="/admin" className="text-solar-dim">
              Admin CRM
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <section id="home" className="grid gap-8 py-12 md:grid-cols-2 md:py-16">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
              Clean, Modern Solar Solutions for Home and Business
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              We design and install efficient solar systems that reduce your
              electricity bills, improve sustainability, and increase property
              value.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#quote">
                <Button>Get a Free Quote</Button>
              </a>
              <a href="#contact">
                <Button variant="outline">Contact Us</Button>
              </a>
            </div>
            <div className="mt-6 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              Trusted by residential and commercial customers. Licensed,
              insured, and focused on long-term support.
            </div>
          </div>
          <img
            src="/image.png"
            alt="Solar team at installation site"
            className="h-full min-h-72 w-full rounded-2xl object-cover"
          />
        </section>

        <section id="about" className="py-10">
          <h2 className="text-3xl font-bold">About Us</h2>
          <p className="mt-3 text-muted-foreground">
            Our mission is to help communities transition to clean energy with
            reliable and affordable solar installations. Our team brings years of
            field experience, certified workmanship, and customer-first service.
          </p>
        </section>

        <section id="services" className="py-10">
          <h2 className="text-3xl font-bold">Services</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <article key={service} className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">{service}</h3>
              </article>
            ))}
          </div>
        </section>

        <section id="projects" className="py-10">
          <h2 className="text-3xl font-bold">Projects / Gallery</h2>
          <p className="mt-3 text-muted-foreground">
            Explore completed installations, before-and-after transformations,
            and project highlights from different locations.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <img
                key={item}
                src="/image.png"
                alt={`Solar project ${item}`}
                className="h-56 w-full rounded-xl object-cover"
              />
            ))}
          </div>
        </section>

        <section id="faq" className="py-10">
          <h2 className="text-3xl font-bold">FAQ</h2>
          <div className="mt-4 space-y-3">
            {faqs.map((item) => (
              <article key={item.q} className="rounded-xl border bg-card p-5">
                <h3 className="font-semibold">{item.q}</h3>
                <p className="mt-2 text-muted-foreground">{item.a}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="quote" className="py-10">
          <h2 className="text-3xl font-bold">Request a Free Quote</h2>
          <div className="mt-4 grid gap-3 rounded-xl border bg-card p-5 md:grid-cols-2">
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Full name"
              value={quoteForm.fullName}
              onChange={(e) =>
                setQuoteForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
            />
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Email"
              value={quoteForm.email}
              onChange={(e) =>
                setQuoteForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Phone"
              value={quoteForm.phone}
              onChange={(e) =>
                setQuoteForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Location"
              value={quoteForm.location}
              onChange={(e) =>
                setQuoteForm((prev) => ({ ...prev, location: e.target.value }))
              }
            />
            <select
              className="rounded-md border bg-background px-3 py-2 md:col-span-2"
              value={quoteForm.serviceInterest}
              onChange={(e) =>
                setQuoteForm((prev) => ({
                  ...prev,
                  serviceInterest: e.target.value,
                }))
              }
            >
              {services.map((service) => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
            <textarea
              className="rounded-md border bg-background px-3 py-2 md:col-span-2"
              placeholder="Tell us about your requirement"
              rows={4}
              value={quoteForm.message}
              onChange={(e) =>
                setQuoteForm((prev) => ({ ...prev, message: e.target.value }))
              }
            />
            <div className="md:col-span-2">
              <Button
                onClick={() => void handleSubmit("quote")}
                disabled={submittingType === "quote"}
              >
                {submittingType === "quote" ? "Submitting..." : "Submit Quote"}
              </Button>
            </div>
          </div>
        </section>

        <section id="contact" className="py-10">
          <h2 className="text-3xl font-bold">Contact Us</h2>
          <p className="mt-2 text-muted-foreground">
            Phone: +1 (555) 123-4567 | Email: hello@elementsolar.com | Mon-Sat:
            9:00 AM - 6:00 PM
          </p>
          <div className="mt-4 grid gap-3 rounded-xl border bg-card p-5 md:grid-cols-2">
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Full name"
              value={contactForm.fullName}
              onChange={(e) =>
                setContactForm((prev) => ({ ...prev, fullName: e.target.value }))
              }
            />
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Email"
              value={contactForm.email}
              onChange={(e) =>
                setContactForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Phone"
              value={contactForm.phone}
              onChange={(e) =>
                setContactForm((prev) => ({ ...prev, phone: e.target.value }))
              }
            />
            <input
              className="rounded-md border bg-background px-3 py-2"
              placeholder="Location"
              value={contactForm.location}
              onChange={(e) =>
                setContactForm((prev) => ({ ...prev, location: e.target.value }))
              }
            />
            <textarea
              className="rounded-md border bg-background px-3 py-2 md:col-span-2"
              placeholder="How can we help you?"
              rows={4}
              value={contactForm.message}
              onChange={(e) =>
                setContactForm((prev) => ({ ...prev, message: e.target.value }))
              }
            />
            <div className="md:col-span-2">
              <Button
                onClick={() => void handleSubmit("contact")}
                disabled={submittingType === "contact"}
              >
                {submittingType === "contact" ? "Submitting..." : "Send Message"}
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
