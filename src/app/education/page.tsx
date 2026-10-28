import Link from "next/link";
import { GraduationCap, CalendarDays, UsersRound, BookOpenCheck, ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Programme = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  languages: string[];
  delivery_mode: string;
  eligibility: string;
  capacity: number;
  application_opens_at: string | null;
  application_closes_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function isAccepting(program: Programme, now: number) {
  const opens = program.application_opens_at ? Date.parse(program.application_opens_at) : Number.NaN;
  const closes = program.application_closes_at ? Date.parse(program.application_closes_at) : Number.NaN;
  return Number.isFinite(opens) && Number.isFinite(closes) && opens <= now && closes > now;
}

export default async function EducationCataloguePage() {
  let programmes: Programme[] = [];
  let unavailable = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("education_programs")
      .select("id,slug,title,summary,languages,delivery_mode,eligibility,capacity,application_opens_at,application_closes_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) unavailable = true;
    else programmes = (data ?? []) as Programme[];
  } catch {
    unavailable = true;
  }

  const now = Date.now();

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "clamp(20px, 4vw, 48px)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 13 }}>← TIVA home</Link>
        <header style={{ marginTop: 28, marginBottom: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 14, background: "var(--gradient-brand)" }}>
              <GraduationCap size={25} color="white" />
            </div>
            <p style={{ color: "var(--brand-secondary)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".14em", fontSize: 11 }}>TIVA World Foundation</p>
          </div>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 46px)", letterSpacing: "-.04em", fontWeight: 850, lineHeight: 1.12 }}>Education & skills programmes</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 12, maxWidth: 740, lineHeight: 1.75 }}>
            Explore published education opportunities, internship cohorts and supervised learning programmes. Applications open only after the programme owner records the required launch-readiness checks.
          </p>
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "7px 11px", color: "var(--text-secondary)", fontSize: 12 }}><BookOpenCheck size={14} /> English · Kannada · Hindi</span>
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "7px 11px", color: "var(--text-secondary)", fontSize: 12 }}><ShieldCheck size={14} /> Privacy-gated applications</span>
          </div>
        </header>

        {unavailable ? (
          <section style={{ border: "1px solid rgba(212,167,44,.35)", borderRadius: 16, padding: 22, background: "rgba(212,167,44,.06)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Programme catalogue temporarily unavailable</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>The published programme list could not be loaded. No sample programmes are shown as real opportunities. Please return later or contact the Foundation through its verified contact channel.</p>
          </section>
        ) : programmes.length === 0 ? (
          <section style={{ border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 26, background: "var(--bg-card)" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>No programmes open for public listing yet</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 8, fontSize: 14, lineHeight: 1.7 }}>The Foundation has not published an education programme. Check again after the programme owner completes the readiness review.</p>
          </section>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 310px), 1fr))", gap: 16 }}>
            {programmes.map((program) => {
              const accepting = isAccepting(program, now);
              return (
                <article key={program.id} style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border-subtle)", borderRadius: 18, background: "var(--bg-card)", padding: 22, minHeight: 300 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 12, background: "rgba(108,92,231,.14)", color: "#9A8CFF" }}><GraduationCap size={21} /></span>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: accepting ? "#00C987" : "#D4A72C", border: `1px solid ${accepting ? "rgba(0,201,135,.35)" : "rgba(212,167,44,.35)"}`, borderRadius: 999, padding: "5px 8px" }}>{accepting ? "Applications open" : "Not accepting now"}</span>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 17, lineHeight: 1.3 }}>{program.title}</h2>
                  {program.summary && <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 9 }}>{program.summary}</p>}
                  {program.eligibility && <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.6, marginTop: 12 }}><strong>Eligibility:</strong> {program.eligibility}</p>}
                  <div style={{ display: "grid", gap: 8, marginTop: 15, fontSize: 12, color: "var(--text-secondary)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><UsersRound size={14} /> Capacity: {program.capacity}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><BookOpenCheck size={14} /> {(program.languages ?? []).join(", ").toUpperCase()} · {program.delivery_mode.replace("_", " ")}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><CalendarDays size={14} /> Closes: {formatDate(program.application_closes_at)}</span>
                  </div>
                  <div style={{ marginTop: "auto", paddingTop: 18 }}>
                    {accepting ? (
                      <Link href={`/education/apply/${program.slug}`} className="btn-primary" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, textDecoration: "none" }}>View programme & apply <ArrowRight size={16} /></Link>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>The application window is closed, has not opened yet, or has not been configured.</p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.7, marginTop: 28 }}>Only programme metadata is shown publicly. Applicant details, attendance, assessments and safeguarding records are not displayed on this catalogue.</p>
      </div>
    </main>
  );
}
