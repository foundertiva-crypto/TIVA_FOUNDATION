# TIVA World Foundation — Education Platform Architecture

**Status:** implementation blueprint and admin-console shell; not a claim that the education services or database modules are live.
**Owner:** TIVA World Foundation
**Repository:** foundertiva-crypto/TIVA_FOUNDATION
**Last reviewed:** 2026-10-29

## 1. Mission

Build one accessible, multilingual education and impact platform for TIVA World Foundation. It should cover programme discovery, applications, cohorts, attendance, assessments, internships, mentoring, completion certificates, volunteers, grants, safeguarding, and outcome reporting without turning the existing Foundation app into a second ERP or a pile of disconnected services.

Design for English, Kannada, and Hindi; mobile-first use; low-bandwidth access; accessible forms; clear consent; and auditable staff decisions.

## 2. First pilot: TIVA Campus Internship Cohort 001

The initial delivery target is a **planned pilot** for up to 50 final-year MBA students:

- 10 days; one hour of structured theory per day plus supervised practical assignments.
- Hybrid delivery; remote sessions and offline work must have equivalent evidence of participation.
- Student registration, college/placement-office contacts, eligibility review, consent, team allocation, mentor assignment, daily attendance, LMS materials, assessments, project evidence, and certificate review.
- Every learner record must have a named owner and a retention/deletion rule before personal data is collected.
- Certificate issuance requires a recorded completion decision and unique verification code. The pilot console itself must never imply that a certificate is issued when none exists.

### Suggested 10-day learning sequence

| Day | Theory block | Supervised practical evidence |
|---|---|---|
| 1 | Orientation, digital safety, ethics, teamwork | Consent, baseline check, team allocation |
| 2 | Problem discovery and community needs | Write a problem statement and stakeholder map |
| 3 | Project planning and measurable outcomes | Scope, tasks, risks, success metric |
| 4 | Digital tools and information quality | Build a structured evidence register |
| 5 | Data literacy and responsible AI | Verify sources; document AI use and limitations |
| 6 | Operations and service design | Draw a process map and identify failure points |
| 7 | Communications and outreach ethics | Draft an accessible, consent-based outreach asset |
| 8 | Measurement and impact | Define output, outcome, denominator, and evidence |
| 9 | Team project build and review | Demonstrate a working artifact with test evidence |
| 10 | Presentation, reflection, evaluation | Submit portfolio; mentor and learner close-out |

This is a draft curriculum. The Foundation's education lead must approve the final syllabus, facilitators, dates, and assessment rubric.

## 3. Architecture decision

### Recommended first slice

1. **Foundation portal:** continue the existing Next.js application and Supabase Auth/Postgres. Use this repo for public information, programme discovery, applications, staff administration, consent records, and operational status.
2. **Learning delivery:** add Moodle as the single pilot Learning Management System (LMS) for course materials, quizzes, assignment submissions, and course completion. Keep the LMS deployment separate from this Next.js app.
3. **Documents:** use the existing approved document repository (currently listed in the operations notes as Paperless/Nextcloud where actually configured). Keep learner documents in a restricted storage space; never add signed URLs or private IDs to public reports.
4. **Automation:** n8n may move approved workflow events (e.g. application received, mentor assigned, attendance missing); use a least-privilege service identity and idempotent workflows.
5. **Reporting:** Metabase or the existing reporting environment may consume aggregate, approved views. Do not expose raw student PII to general dashboards.
6. **Live classes:** use the institution's approved conferencing tool first. Self-host BigBlueButton only after a dedicated supported host, network, recording-retention policy, and operations owner are confirmed.
7. **Offline learning:** evaluate Kolibri only if an offline/low-connectivity campus use case is confirmed.

### Avoid duplicate systems

- Do not deploy Moodle and Open edX for the same pilot.
- Do not deploy OpenEduCat and Frappe Education side by side.
- Do not make a second accounting ledger in the education portal. Donations, grants, invoices, tax evidence, and settlements must remain in the approved finance source of truth.
- Frappe Education is a later option only if TIVA chooses the Frappe/ERPNext path for official academic administration. Open edX is a later option for a larger MOOC/online-course operation, not the default pilot.

## 4. Functional modules and acceptance criteria

| Module | Minimum acceptance criterion |
|---|---|
| Programme catalogue | Public programme page has owner, dates, eligibility, language, delivery mode, capacity, and accessible application path |
| Applications | Application has a reference number, timestamps, consent version, status history, and role-restricted review |
| Learner registry | Unique internal identifier; minimum necessary fields; corrections and retention policy documented |
| Colleges/partners | Institution contact, verification status, relationship owner, and approval history |
| Cohorts & calendar | Capacity limits, session schedule, timezone, facilitator, delivery mode, and change history |
| Attendance | Per-session learner status, recorded by authorised staff, with correction reason and audit trail |
| Learning materials | Versioned material, language, accessibility notes, source/licence, and LMS mapping |
| Assessments | Published rubric, due date, reviewer, score/feedback visibility, and reassessment policy |
| Internships/projects | Team, mentor, scope, tasks, evidence links, review points, risks, and close-out |
| Certificates | Eligibility rules, issuer, unique verification code, issue/revoke log; public verification reveals minimal information |
| Volunteers/mentors | Role, skills, consent, conflict declaration, background-check status only where appropriate and lawfully required |
| Grants & donors | Grant restrictions, approved budget, programme linkage, milestone evidence, and finance reconciliation; separate donor data from learners |
| Impact reports | Published metric definitions, denominator, time window, evidence source, reviewer, and revision log |
| Safeguarding & complaints | Restricted intake, triage owner, escalation path, confidentiality, and case retention policy |
| Compliance records | Owner, due date, status, evidence location, reviewer, and renewal reminder; status must never be inferred from file presence |
| Audit & access | Privileged actions are attributable; least privilege; backup and restore evidence; no secret values in logs |

## 5. Permission model

Use least privilege. Proposed roles are logical roles; they are not yet implemented in the existing profiles.role column.

- **Foundation administrator:** manage platform configuration and grant staff access.
- **Education lead:** approve programmes, cohorts, curriculum, completion decisions, and reports.
- **Programme coordinator:** review applications, manage cohort logistics, and contact enrolled learners.
- **Educator/mentor:** see assigned cohorts and assigned work only; mark attendance and assessments within scope.
- **Learner/intern:** see and update only permitted own-profile fields, assigned materials, own attendance, assessment feedback, and certificate status.
- **Finance/grants officer:** grant budgets, approved expenses/reconciliation, and reporting; no routine access to sensitive learner case notes.
- **Auditor/board reviewer:** read approved evidence and aggregate reports; no routine mutation of records.
- **Safeguarding case handler:** separately approved, tightly scoped access to complaint/case records.

Never use a UI-only check as the security boundary. Enforce access in PostgreSQL Row Level Security (RLS), server-side actions, and storage policies. Every role transition needs an authorised server-side workflow and an audit event.

## 6. Data boundaries

    Public website
      -> programme enquiry/application
      -> restricted review queue
      -> approved learner record
      -> cohort and sessions
      -> attendance + assessment evidence
      -> completion review
      -> certificate register
      -> aggregate impact view

    Moodle <-> integration service <-> approved course/enrolment IDs
    Document storage -> restricted evidence links (never public raw document URLs)
    Finance/ERP -> restricted grant and reconciliation references
    Automation -> approved events only; retries are idempotent and audited

- Do not move existing user, KYC, donor, payment, or document data into education tables in bulk.
- Use synthetic test records first.
- Keep education records and donations separate even when the same person is both a learner and a donor.
- Keep a clear source-of-truth map for every field and each system's owner.
- Back up before migrations and rehearse restoration before production use.
- Review privacy notices, consent text, retention, children's data/safeguarding requirements, accessibility, and applicable Indian legal obligations with qualified advisers before public launch.

## 7. Delivery phases

### Phase 0 — Baseline and safety
- Review existing Supabase schema, RLS, auth callbacks, middleware, service-role usage, and storage policies.
- Apply the role self-escalation guard in a staging project; run negative and positive tests.
- Confirm backup/restore and environment separation.
- Confirm official Foundation identity, staff access owners, and the initial programme owner.
- No production migration until backup and rollback are recorded.

### Phase 1 — Internship pilot portal
- Programme page and application form.
- Consent/version records and review queue.
- Cohorts, team assignment, mentor assignment, sessions, attendance, and evidence checklist.
- Status timeline and basic cohort dashboard.
- CSV export restricted to authorised users.
- No payments or donation collection in the education flow.

### Phase 2 — LMS
- Deploy Moodle in a separate environment.
- Create one pilot course; configure role mapping and enrolment flow.
- Test course materials, quiz, assignment, completion and accessibility on mobile.
- Avoid copying passwords across systems; decide whether to use SSO after the pilot has a stable owner.

### Phase 3 — Certificates and impact
- Rubric-based completion decision, certificate number and verification flow.
- Aggregate programme reach, attendance, completion, learning gains and feedback.
- Metric definitions and evidence provenance published internally.
- Export reviewed reports, not raw learner data.

### Phase 4 — Scale only with evidence
- Evaluate Frappe Education only if academic administration needs outgrow the portal.
- Evaluate BigBlueButton only with a dedicated operations plan.
- Evaluate Kolibri for offline centres.
- Evaluate Open edX if the Foundation is ready to run a larger online-course platform.
- Add agent assistance only for low-risk tasks such as documentation, classification drafts, test generation, and aggregate reporting; human approval for learner decisions, certificates, safeguarding, money, and bulk messaging.

## 8. Launch gate

Do not label the education platform production-ready until all are true:

- [ ] Staging and production environment values are separate and secrets are not committed.
- [ ] The profile role-escalation negative test fails safely for a non-admin; legitimate admin role management still works.
- [ ] RLS tests cover learner A vs learner B, mentor scope, admin scope, and unauthenticated access.
- [ ] Application form validates input server-side, records consent version, protects against spam, and does not expose raw PII in logs.
- [ ] Storage buckets and signed-link expiry are tested.
- [ ] Backups and a restore rehearsal have evidence.
- [ ] The LMS course and enrollment mapping pass an end-to-end test.
- [ ] Attendance, assessment, completion and certificate rules are approved by the education lead.
- [ ] Privacy, safeguarding, incident, correction, and retention procedures are approved.
- [ ] Accessibility and Kannada/English/Hindi content review are completed.
- [ ] The deployment owner, support path, monitoring, RTO/RPO, and rollback are recorded.
- [ ] Public-facing claims and any compliance status are reviewed by the responsible Foundation officer/adviser.

## 9. Current truth

This document and the route /admin/education are a planning foundation. This pull request does **not** provision Moodle, create live education tables, collect applications, issue certificates, deploy cloud services, or assert that the desktop is healthy. Those actions need environment-specific tests and authorised deployment.
