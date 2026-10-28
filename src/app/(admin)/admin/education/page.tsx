"use client";

import {
  GraduationCap,
  ClipboardList,
  BookOpenCheck,
  CalendarCheck,
  UsersRound,
  Award,
  ShieldCheck,
  BarChart3,
  FileCheck2,
  Workflow,
  ExternalLink,
  CircleDot,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const modules = [
  { icon: ClipboardList, name: "Programme & applications", state: "PLANNED", description: "Programme catalogue, applicant reference, consent version, review queue and status history." },
  { icon: UsersRound, name: "Learners, colleges & mentors", state: "PLANNED", description: "Restricted learner registry, partner contacts, mentor assignments and cohort teams." },
  { icon: CalendarCheck, name: "Cohorts & attendance", state: "PLANNED", description: "Cohort capacity, session calendar, attendance evidence and correction history." },
  { icon: BookOpenCheck, name: "Learning delivery", state: "DECISION", description: "Moodle is the proposed pilot LMS; host and course are not provisioned by this page." },
  { icon: FileCheck2, name: "Assignments & assessments", state: "PLANNED", description: "Rubrics, submissions, reviewer feedback, reassessment and evidence links." },
  { icon: Award, name: "Certificates", state: "GATED", description: "Certificate issuance follows an approved completion decision and a verification register." },
  { icon: ShieldCheck, name: "Safeguarding & privacy", state: "GATED", description: "Restricted case handling, retention rules, consent, incident process and least privilege." },
  { icon: BarChart3, name: "Impact reporting", state: "PLANNED", description: "Aggregate programme outcomes with metric definitions, source evidence and review." },
  { icon: Workflow, name: "Workflow automation", state: "OPTIONAL", description: "Notifications and approved hand-offs through a least-privilege service identity." },
];

const statusColor: Record<string, string> = {
  PLANNED: "#9CA3AF",
  DECISION: "#D4A72C",
  GATED: "#F97373",
  OPTIONAL: "#60A5FA",
};

const docs = [
  { label: "Education platform architecture", href: "https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/docs/TIVA-WORLD-FOUNDATION-EDUCATION-PLATFORM.md" },
  { label: "10-day internship cohort runbook", href: "https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/docs/FOUNDATION-EDUCATION-PILOT-10-DAY.md" },
  { label: "Open-source stack register", href: "https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/docs/OPEN-SOURCE-EDUCATION-STACK.md" },
  { label: "Security gates and tests", href: "https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/docs/EDUCATION-SECURITY-GATES.md" },
];

function Pill({ state }: { state: string }) {
  const color = statusColor[state] ?? "#9CA3AF";
  return <span style={{ border: `1px solid ${color}66`, color, background: `${color}12`, borderRadius: 999, padding: "4px 9px", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", whiteSpace: "nowrap" }}>{state}</span>;
}

export default function EducationAdminPage() {
  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, justifyContent: "space-between", flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: "var(--gradient-brand)" }}>
            <GraduationCap size={27} color="white" />
          </div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>TIVA World Foundation</div>
            <h1 style={{ fontSize: "clamp(24px, 4vw, 34px)", fontWeight: 850, letterSpacing: "-.035em", marginTop: 4 }}>Education Operations</h1>
            <p style={{ color: "var(--text-secondary)", marginTop: 5, fontSize: 14 }}>Programme delivery · internships · learning outcomes · certificates</p>
          </div>
        </div>
        <span style={{ display: "inline-flex", gap: 7, alignItems: "center", borderRadius: 999, padding: "8px 12px", border: "1px solid rgba(212,167,44,.35)", color: "#D4A72C", fontSize: 12, fontWeight: 750 }}>
          <CircleDot size={14} /> FOUNDATION PILOT PLANNING
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: 16, borderRadius: 14, border: "1px solid rgba(212,167,44,.28)", background: "rgba(212,167,44,.06)", marginBottom: 24 }}>
        <AlertTriangle size={20} color="#D4A72C" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong style={{ display: "block", marginBottom: 4 }}>Not yet a live learner registry</strong>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.65 }}>This console is an implementation cockpit. It does not create student records, collect applications, run a course, or issue certificates. Those actions remain disabled until staging access controls, the approved LMS, data retention, and the launch checklist pass.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 205px), 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Pilot cohort target", value: "Up to 50", sub: "Final-year MBA students", icon: UsersRound },
          { label: "Programme duration", value: "10 days", sub: "1 hour theory per day", icon: CalendarCheck },
          { label: "Delivery model", value: "Hybrid", sub: "Remote + supervised practical", icon: Workflow },
          { label: "Languages", value: "3", sub: "English · Kannada · Hindi", icon: BookOpenCheck },
        ].map((item) => {
          const Icon = item.icon;
          return <div key={item.label} style={{ border: "1px solid var(--border-subtle)", borderRadius: 14, padding: 18, background: "var(--bg-card)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 650 }}>{item.label}</span>
              <Icon size={17} color="#8B7CF6" />
            </div>
            <div style={{ fontSize: 28, fontWeight: 850, marginTop: 12, letterSpacing: "-.04em" }}>{item.value}</div>
            <div style={{ color: "var(--text-secondary)", marginTop: 5, fontSize: 12 }}>{item.sub}</div>
          </div>;
        })}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Module readiness</h2>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Status describes implementation state, not live service health</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
        {modules.map((item) => {
          const Icon = item.icon;
          return <article key={item.name} style={{ padding: 19, border: "1px solid var(--border-subtle)", borderRadius: 16, background: "var(--bg-card)", minHeight: 150 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 11, background: "rgba(108,92,231,.13)", color: "#9A8CFF" }}><Icon size={19} /></div>
              <Pill state={item.state} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 750, marginTop: 15, marginBottom: 7 }}>{item.name}</h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>{item.description}</p>
          </article>;
        })}
      </div>

      <section style={{ marginTop: 28, border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20, background: "var(--bg-secondary)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}><CheckCircle2 size={19} color="#00D2A0" /> Readiness gates before registration opens</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 10 }}>
          {[
            "Staging database backup and restore tested",
            "Learner A / learner B access-boundary tests pass",
            "Role self-escalation blocked in database",
            "Privacy notice, consent and retention approved",
            "Moodle host and first course verified",
            "Safeguarding escalation owner assigned",
            "Attendance and certificate rules approved",
            "Rollback owner and production deployment gate recorded",
          ].map((text) => <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.025)", fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)" }}><span style={{ width: 16, height: 16, border: "1px solid var(--text-muted)", borderRadius: 4, flexShrink: 0, marginTop: 1 }} />{text}</div>)}
        </div>
      </section>

      <section style={{ marginTop: 26 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 13 }}>Programme documents</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 10 }}>
          {docs.map((doc) => <a key={doc.label} href={doc.href} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 13, textDecoration: "none", color: "var(--text-primary)", fontSize: 13, fontWeight: 650 }}>
            {doc.label} <ExternalLink size={15} color="var(--text-secondary)" />
          </a>)}
        </div>
      </section>

      <p style={{ fontSize: 11, lineHeight: 1.7, color: "var(--text-muted)", marginTop: 24 }}>No learner information is shown on this page. Actual enrolment, attendance, assessment, certificates and safeguarding records must be backed by authorised database tables and tested row-level policies before activation.</p>
    </div>
  );
}
