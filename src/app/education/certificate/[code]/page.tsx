import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, BadgeCheck, ShieldCheck, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ code: string }> };
type CertificateVerification = {
  verified: boolean;
  award_title: string;
  program_title: string;
  issued_on: string;
  certificate_status: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default async function PublicEducationCertificateVerification({ params }: Props) {
  const { code } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(code)) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_education_certificate", { p_code: code });
  if (error) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "clamp(18px,4vw,44px)" }}>
        <section style={{ maxWidth: 760, margin: "7vh auto 0", border: "1px solid rgba(212,167,44,.35)", borderRadius: 18, padding: 26, background: "var(--bg-card)" }}>
          <p style={{ color: "var(--brand-secondary)", fontSize: 11, fontWeight: 850, letterSpacing: ".14em", textTransform: "uppercase" }}>TIVA World Foundation</p>
          <h1 style={{ fontSize: 27, fontWeight: 850, marginTop: 12 }}>Verification temporarily unavailable</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 9 }}>The verification service could not confirm this certificate. This is not a validity result. Retry later or contact the Foundation through its verified official contact channel.</p>
        </section>
      </main>
    );
  }

  const rows = (data ?? []) as CertificateVerification[];
  const certificate = rows[0];
  if (!certificate) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "clamp(18px,4vw,44px)" }}>
        <section style={{ maxWidth: 760, margin: "7vh auto 0", border: "1px solid var(--border-subtle)", borderRadius: 18, padding: 26, background: "var(--bg-card)" }}>
          <Link href="/education" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--text-secondary)", textDecoration: "none", fontSize: 13 }}><ArrowLeft size={15}/> Education programmes</Link>
          <div style={{ width: 50, height: 50, display: "grid", placeItems: "center", borderRadius: 14, background: "rgba(249,115,115,.12)", marginTop: 24 }}><XCircle size={25} color="#F97373"/></div>
          <h1 style={{ fontSize: 27, fontWeight: 850, marginTop: 15 }}>Certificate not found</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>No certificate record matched this verification code. Check the code supplied by the issuer or contact TIVA World Foundation.</p>
        </section>
      </main>
    );
  }

  const verified = certificate.verified && certificate.certificate_status === "issued";
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "clamp(18px,4vw,44px)" }}>
      <article style={{ maxWidth: 820, margin: "6vh auto 0", border: "1px solid var(--border-subtle)", borderRadius: 20, padding: "clamp(22px,5vw,42px)", background: "var(--bg-card)", boxShadow: "var(--shadow-card)" }}>
        <Link href="/education" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--text-secondary)", textDecoration: "none", fontSize: 13 }}><ArrowLeft size={15}/> Education programmes</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 28 }}>
          <div style={{ width: 50, height: 50, display: "grid", placeItems: "center", borderRadius: 14, background: "var(--gradient-brand)" }}><Award size={26} color="white"/></div>
          <div>
            <p style={{ color: "var(--brand-secondary)", fontSize: 10, fontWeight: 850, letterSpacing: ".14em", textTransform: "uppercase" }}>TIVA World Foundation</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 3 }}>Public certificate verification</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 27, border: `1px solid ${verified ? "rgba(0,201,135,.35)" : "rgba(249,115,115,.35)"}`, borderRadius: 13, padding: 15, background: verified ? "rgba(0,201,135,.06)" : "rgba(249,115,115,.06)" }}>
          {verified ? <BadgeCheck size={23} color="#00C987"/> : <XCircle size={23} color="#F97373"/>}
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 850 }}>{verified ? "Certificate verified" : "Certificate revoked"}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>{verified ? "The live certificate register reports this certificate as issued and valid." : "The live certificate register does not consider this certificate valid."}</p>
          </div>
        </div>

        <div style={{ marginTop: 25, border: "1px solid var(--border-subtle)", borderRadius: 15, overflow: "hidden" }}>
          <div style={{ padding: 19, borderBottom: "1px solid var(--border-subtle)" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800 }}>Award title</p>
            <h2 style={{ fontSize: "clamp(21px,4vw,29px)", fontWeight: 850, lineHeight: 1.25, marginTop: 8 }}>{certificate.award_title}</h2>
          </div>
          <div style={{ padding: 19, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 18 }}>
            <div><p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Programme</p><p style={{ fontSize: 15, fontWeight: 750, marginTop: 7 }}>{certificate.program_title}</p></div>
            <div><p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Issue date</p><p style={{ fontSize: 15, fontWeight: 750, marginTop: 7 }}>{formatDate(certificate.issued_on)}</p></div>
            <div><p style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>Register status</p><p style={{ fontSize: 15, fontWeight: 750, marginTop: 7, textTransform: "uppercase", color: verified ? "#00C987" : "#F97373" }}>{certificate.certificate_status}</p></div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 21, color: "var(--text-muted)", fontSize: 11, lineHeight: 1.7 }}>
          <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2 }}/>
          <p>This page checks the certificate register and intentionally does not disclose learner names, phone numbers, emails, attendance, assessment scores or identity documents. If the result appears inconsistent, verify directly with the Foundation.</p>
        </div>
      </article>
    </main>
  );
}
