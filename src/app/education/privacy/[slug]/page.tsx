import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export default async function EducationPrivacyPage({ params }: Props) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();

  const supabase = await createClient();
  const { data: program, error } = await supabase
    .from("education_programs")
    .select("slug,title,privacy_notice_version,privacy_contact_email,retention_statement,privacy_notice_attested_at,status")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !program || !program.privacy_notice_version
      || !program.privacy_contact_email || !program.retention_statement
      || !program.privacy_notice_attested_at) notFound();

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "clamp(18px, 4vw, 44px)" }}>
      <article style={{ maxWidth: 860, margin: "0 auto", border: "1px solid var(--border-subtle)", borderRadius: 18, padding: "clamp(20px, 4vw, 38px)", background: "var(--bg-card)" }}>
        <Link href={`/education/apply/${program.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--text-secondary)", textDecoration: "none", fontSize: 13 }}><ArrowLeft size={15} /> Return to programme</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 26 }}>
          <div style={{ width: 44, height: 44, display: "grid", placeItems: "center", borderRadius: 13, background: "var(--gradient-brand)" }}><ShieldCheck size={22} color="white" /></div>
          <div>
            <p style={{ color: "var(--brand-secondary)", fontSize: 10, letterSpacing: ".13em", textTransform: "uppercase", fontWeight: 800 }}>TIVA World Foundation</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 3 }}>Privacy notice · {program.privacy_notice_version}</p>
          </div>
        </div>
        <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 850, letterSpacing: "-.035em", lineHeight: 1.2, marginTop: 20 }}>Applicant privacy notice</h1>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 20 }}>{program.title}</h2>

        <div style={{ display: "grid", gap: 18, marginTop: 24, color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.8 }}>
          <section>
            <h3 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Who is responsible</h3>
            <p>TIVA World Foundation is responsible for managing this programme application. The programme owner should keep the Foundation&apos;s approved privacy notice and contact details current before the application window opens.</p>
          </section>
          <section>
            <h3 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Information collected</h3>
            <p>This form collects your name, contact email, institution name if provided, account identifier, consent version and timestamp, and application status. Do not submit identity documents, financial credentials, medical information or unrelated sensitive details through this form.</p>
          </section>
          <section>
            <h3 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, marginBottom: 6 }}>How information is used</h3>
            <p>The Foundation uses application details to review eligibility, contact applicants about programme administration, manage enrolment if selected, administer learning and attendance, assess submitted work, and record completion decisions. Aggregated programme-impact reporting should not identify individual learners.</p>
          </section>
          <section>
            <h3 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Access, service providers and security</h3>
            <p>Individual application records are intended for authorised Foundation personnel with an operational need. Approved infrastructure or course providers may process the minimum information necessary to deliver the programme. Access controls, audit records and backup practices should be reviewed before the programme starts. Do not place learner files in public links or general AI/vector indexes.</p>
          </section>
          <section>
            <h3 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Retention</h3>
            <p>{program.retention_statement}</p>
            <p style={{ marginTop: 8 }}>The programme owner should ensure this statement is consistent with the Foundation&apos;s approved retention schedule and any legal or funding obligations before applications open.</p>
          </section>
          <section>
            <h3 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Your choices and privacy contact</h3>
            <p>You may contact the Foundation to request access to or correction of your application details, ask a question about this notice, or request withdrawal where applicable. A withdrawal request does not erase records the Foundation must retain under an applicable obligation; the programme owner should assess each request using the approved procedure.</p>
            <p style={{ marginTop: 8 }}>Privacy contact: <a href={`mailto:${program.privacy_contact_email}`} style={{ color: "var(--brand-secondary)" }}>{program.privacy_contact_email}</a></p>
          </section>
          <section>
            <h3 style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Notice version</h3>
            <p>Version <strong>{program.privacy_notice_version}</strong>. The application system records the version and consent timestamp alongside the application so that changes can be traced.</p>
          </section>
        </div>

        <div style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 28, paddingTop: 20 }}>
          <Link href={`/education/apply/${program.slug}`} className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>Continue to application</Link>
        </div>
      </article>
    </main>
  );
}
