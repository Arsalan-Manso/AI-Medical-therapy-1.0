import { Link } from "react-router-dom";
import { useState } from "react";
import heroImage from "../assets/hero.png";

const stats = [
  { value: "10,000+", label: "Patients Served" },
  { value: "500+", label: "Doctors Onboarded" },
  { value: "200+", label: "Pharmacies Linked" },
  { value: "99.9%", label: "Uptime Guaranteed" },
];

const steps = [
  {
    num: "01",
    title: "Choose Your Portal",
    desc: "Select your role — Admin, Doctor, Patient, or Pharmacy — and navigate to your dedicated access portal.",
  },
  {
    num: "02",
    title: "Sign Up or Log In",
    desc: "Create a secure account or log in with existing credentials. Your role is locked to your portal URL.",
  },
  {
    num: "03",
    title: "Start Working Smarter",
    desc: "Access your personalized dashboard, manage tasks, coordinate care and track progress in real time.",
  },
];

const portals = [
  {
    role: "Admin",
    route: "/admin_login",
    icon: "⚙️",
    color: "#4f46e5",
    bg: "#eef2ff",
    desc: "Manage users, monitor operations, and control system-wide settings from a central dashboard.",
    features: ["User Management", "System Analytics", "Full Access Control"],
  },
  {
    role: "Doctor",
    route: "/doctor_login",
    icon: "🩺",
    color: "#0891b2",
    bg: "#ecfeff",
    desc: "Access patient records, write prescriptions, manage appointments and treatment notes efficiently.",
    features: ["Appointments", "Prescriptions", "Patient Records"],
  },
  {
    role: "Patient",
    route: "/patient_login",
    icon: "💊",
    color: "#059669",
    bg: "#ecfdf5",
    desc: "Book appointments, view medical history, track your treatment plans and billing summaries.",
    features: ["Book Appointments", "Medical History", "Billing & Reports"],
  },
  {
    role: "Pharmacy",
    route: "/pharmacy_login",
    icon: "🏥",
    color: "#7c3aed",
    bg: "#f5f3ff",
    desc: "Process prescriptions, manage inventory and handle order fulfillment from one streamlined view.",
    features: ["Prescriptions", "Inventory", "Order Tracking"],
  },
];

const benefits = [
  { icon: "🔒", title: "Secure Role-Based Auth", desc: "JWT-protected login per role. No cross-access." },
  { icon: "⚡", title: "Fast MERN Stack", desc: "Built on MongoDB, Express, React, and Node.js." },
  { icon: "📱", title: "Fully Responsive", desc: "Works seamlessly on desktop, tablet, and mobile." },
  { icon: "📊", title: "Real-Time Dashboards", desc: "Live metrics and role-specific analytics panels." },
  { icon: "🔄", title: "End-to-End Coordination", desc: "Connects every actor in the medical workflow." },
  { icon: "🛠️", title: "Easy to Extend", desc: "Modular codebase ready for custom feature additions." },
];

const HomePage = () => {
  const [showDropdown, setShowDropdown] = useState(false);

  const roleOptions = [
    { label: "Admin", route: "/admin_login" },
    { label: "Doctor", route: "/doctor_login" },
    { label: "Patient", route: "/patient_login" },
    { label: "Pharmacy", route: "/pharmacy_login" },
  ];

  return (
    <div className="lp-root">
      {/* ── Navbar ── */}
      <header className="lp-nav">
        <div className="lp-nav-inner shell">
          <div className="lp-brand">
            <span className="lp-brand-icon">🏥</span>
            <div>
              <div className="lp-brand-name">AI Medical Therapy</div>
              <div className="lp-brand-sub">Care · Clarity · Coordination</div>
            </div>
          </div>

          <nav className="lp-nav-center">
            <a href="#products" className="lp-nav-link">Products</a>
            <a href="#how-it-works" className="lp-nav-link">How It Works</a>
            <a href="#role-portal" className="lp-nav-link">Role of Portal</a>
            <a href="#contact" className="lp-nav-link">Contact</a>
          </nav>

          <nav className="lp-nav-links">
            <div className="lp-nav-dropdown">
              <button
                className="lp-nav-btn lp-nav-btn--cta"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                Get Started ▼
              </button>
              {showDropdown && (
                <div className="lp-dropdown-menu">
                  {roleOptions.map((role) => (
                    <Link
                      key={role.label}
                      to={role.route}
                      className="lp-dropdown-item"
                      onClick={() => setShowDropdown(false)}
                    >
                      {role.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="shell lp-hero-inner">
          <div className="lp-hero-copy">
            <span className="lp-tag">AI Medical Therapy Platform</span>
            <h1 className="lp-hero-h1">
              A Smarter Way to Manage<br />
              <span className="lp-hero-accent">Medical Therapy & Care</span>
            </h1>
            <p className="lp-hero-desc">
              One unified platform for Admin, Doctor, Patient, and Pharmacy teams.
              Secure role-based portals, real-time dashboards, and a cleaner way to
              coordinate care from first consultation to final delivery.
            </p>
            <div className="lp-hero-actions">
              <Link className="lp-btn" to="/admin_login">Enter Admin Portal</Link>
              <Link className="lp-btn lp-btn--outline" to="/auth/patient/signup">Start as New Patient</Link>
            </div>
          </div>
          <div className="lp-hero-visual">
            <img src={heroImage} alt="Platform illustration" />
            <div className="lp-hero-badge"> 24/7 Coordinated Digital Care</div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="lp-stats">
        <div className="shell lp-stats-grid">
          {stats.map((s) => (
            <div className="lp-stat" key={s.label}>
              <span className="lp-stat-value">{s.value}</span>
              <span className="lp-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="lp-section" id="how-it-works">
        <div className="shell">
          <div className="lp-section-head">
            <span className="lp-tag">How It Works</span>
            <h2>Get Started in 3 Simple Steps</h2>
            <p>From landing here to working on your dashboard takes less than two minutes.</p>
          </div>
          <div className="lp-steps">
            {steps.map((s) => (
              <div className="lp-step" key={s.num}>
                <div className="lp-step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role Portals ── */}
      <section className="lp-section lp-section--alt" id="role-portal">
        <div className="shell">
          <div className="lp-section-head">
            <span className="lp-tag">Role Portals</span>
            <h2>Choose Your Access Portal</h2>
            <p>Each role has a dedicated portal with its own login, dashboard, and feature set.</p>
          </div>
          <div className="lp-portals">
            {portals.map((p) => (
              <div className="lp-portal-card" key={p.role} style={{ "--pc": p.color, "--pb": p.bg }}>
                <div className="lp-portal-icon">{p.icon}</div>
                <h3 className="lp-portal-role">{p.role}</h3>
                <p className="lp-portal-desc">{p.desc}</p>
                <ul className="lp-portal-features">
                  {p.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <div className="lp-portal-actions">
                  <Link to={p.route} className="lp-portal-btn">Login</Link>
                  <Link to={`/auth/${p.role.toLowerCase()}/signup`} className="lp-portal-btn lp-portal-btn--ghost">
                    Sign Up
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="lp-section" id="products">
        <div className="shell">
          <div className="lp-section-head">
            <span className="lp-tag">Why Choose Us</span>
            <h2>Built for Real Healthcare Workflows</h2>
            <p>Every feature is designed with medical coordination in mind — no bloat, all purpose.</p>
          </div>
          <div className="lp-benefits">
            {benefits.map((b) => (
              <div className="lp-benefit" key={b.title}>
                <span className="lp-benefit-icon">{b.icon}</span>
                <div>
                  <h4>{b.title}</h4>
                  <p>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="lp-section lp-section--dark" id="contact">
        <div className="shell lp-contact-inner">
          <div className="lp-contact-info">
            <span className="lp-tag lp-tag--light">Contact Us</span>
            <h2>Get In Touch With Our Team</h2>
            <p>
              Have questions about deployment, custom modules, or onboarding your hospital?
              Our team is ready to help you get started.
            </p>
            <div className="lp-contact-details">
              <a href="mailto:support@aimedicaltherapy.com">📧 support@aimedicaltherapy.com</a>
              <a href="tel:+923495023007">📞 +92 349 502 3007</a>
              <span>📍 Islamabad, Pakistan</span>
            </div>
          </div>
          <form className="lp-contact-form" onSubmit={(e) => e.preventDefault()}>
            <h3>Send a Message</h3>
            <input type="text" placeholder="Your full name" />
            <input type="email" placeholder="Email address" />
            <input type="text" placeholder="Subject" />
            <textarea rows={4} placeholder="Your message..." />
            <button type="submit" className="lp-btn" style={{ width: "100%" }}>
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="shell lp-footer-inner">
          <div className="lp-footer-brand">
            <span style={{ fontSize: 28 }}>🏥</span>
            <div>
              <div className="lp-footer-name">AI Medical Therapy</div>
              <div className="lp-footer-tagline">Care · Clarity · Coordination</div>
            </div>
          </div>
          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Portals</div>
              <Link to="/admin_login">Admin Login</Link>
              <Link to="/doctor_login">Doctor Login</Link>
              <Link to="/patient_login">Patient Login</Link>
              <Link to="/pharmacy_login">Pharmacy Login</Link>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Sign Up</div>
              <Link to="/auth/admin/signup">Admin Sign Up</Link>
              <Link to="/auth/doctor/signup">Doctor Sign Up</Link>
              <Link to="/auth/patient/signup">Patient Sign Up</Link>
              <Link to="/auth/pharmacy/signup">Pharmacy Sign Up</Link>
            </div>
            <div className="lp-footer-col">
              <div className="lp-footer-col-title">Company</div>
              <a href="#contact">Contact</a>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Use</a>
              <a href="#">Support</a>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom shell">
          <p>© 2026 AI Medical Therapy. All rights reserved. Built with  for better healthcare.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
