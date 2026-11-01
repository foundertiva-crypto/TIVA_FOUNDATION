# TIVA World Foundation — Education Stack Register

Reviewed 2026-10-29. Select a small stack and verify the current release, deployment requirements, licence, security advisories, and operator burden before production installation.

## Recommended pilot stack

| Need | Candidate | Official source | Decision |
|---|---|---|---|
| Foundation programme portal and applications | Existing TIVA Foundation Next.js + Supabase | [TIVA_FOUNDATION](https://github.com/foundertiva-crypto/TIVA_FOUNDATION) | Keep; extend deliberately rather than replacing it |
| LMS: course pages, quizzes, assignment submissions, completion | Moodle | [moodle/moodle](https://github.com/moodle/moodle) · [Docs](https://docs.moodle.org/) | Recommended for the first pilot; host separately |
| Workflow notifications and approved orchestration | n8n | [n8n-io/n8n](https://github.com/n8n-io/n8n) · [Docs](https://docs.n8n.io/) | Optional; review licence and credentials model before use |
| Restricted documents | Existing approved document service | [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) · [Nextcloud](https://github.com/nextcloud/server) | Reuse only after storage permissions and backup are verified |
| Aggregate operations reporting | Metabase | [metabase/metabase](https://github.com/metabase/metabase) | Optional; connect only approved aggregate views |
| Offline-first learning (only if needed) | Kolibri | [learningequality/kolibri](https://github.com/learningequality/kolibri) · [Docs](https://kolibri.readthedocs.io/) | Add only for actual offline/low-connectivity delivery |
| Live virtual classroom (only if needed) | BigBlueButton | [bigbluebutton/bigbluebutton](https://github.com/bigbluebutton/bigbluebutton) · [Docs](https://docs.bigbluebutton.org/) | Separate supported host; not part of the first desktop compose |
| Academic administration (later decision) | Frappe Education | [frappe/education](https://github.com/frappe/education) · [Docs](https://docs.frappe.io/erpnext/education-module-in-erpnext) | Consider only if Frappe/ERPNext is selected as the academic/ERP system of record |
| Large online course / MOOC platform (later alternative) | Open edX and Tutor | [openedx/openedx-platform](https://github.com/openedx/openedx-platform) · [overhangio/tutor](https://github.com/overhangio/tutor) · [Docs](https://docs.openedx.org/) | Not the pilot default; higher operational complexity |

## Avoid these failure patterns

1. **Two LMSs for one pilot.** Do not deploy Moodle and Open edX together just because both are powerful.
2. **Two academic ERPs.** Do not deploy OpenEduCat and Frappe Education in parallel. Pick one after the academic source-of-truth decision.
3. **A database per dashboard.** Keep authoritative learner/application records in the chosen system; BI and RAG indexes are derived views, not record systems.
4. **Open ports for convenience.** Keep admin tools private behind the approved access layer. Do not expose a database, model API, document service, or workflow editor directly to the public internet.
5. **Unreviewed automation.** An automation or AI agent can prepare a draft or proposal; it must not independently decide admissions, grades, safeguarding cases, grants, payments, or certificate revocation.
6. **Unbounded agent/repository sprawl.** Start with named responsibilities and acceptance tests. Add new agents only when a workflow has a measurable need and a human owner.
7. **License assumptions.** Verify the current licence and enterprise feature boundaries for each chosen release, especially for workflow automation, analytics, plugins, and commercial extensions.

## The minimum system map

- TIVA Foundation portal: programme catalogue, application status, staff queue, consent version, and audit references.
- Moodle: content, learning activities, quizzes, assignments, and course completion.
- Approved document store: private evidence and policies.
- n8n: notifications and workflow handoffs, not a system of record.
- Metabase: aggregated reporting on approved data.
- Finance/ERP system selected by TIVA: donation, grant budget, accounting, tax/settlement and reconciliation records.
- Tailscale or another approved private access layer: operator access, with access controls and device verification.

## Official repositories and purpose

- [Moodle](https://github.com/moodle/moodle) — learning management system.
- [Frappe Education](https://github.com/frappe/education) — education management within the Frappe/ERPNext ecosystem.
- [Open edX Platform](https://github.com/openedx/openedx-platform) — LMS and course-authoring platform; see the project documentation before self-hosting.
- [Tutor](https://github.com/overhangio/tutor) — community-supported installation/development tool for Open edX.
- [Kolibri](https://github.com/learningequality/kolibri) — offline-first learning platform.
- [BigBlueButton](https://github.com/bigbluebutton/bigbluebutton) — virtual classrooms and recordings.
- [n8n](https://github.com/n8n-io/n8n) — workflow automation; treat as source-available until licence review confirms your intended use.
- [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) — document intake, indexing and records workflow.
- [Nextcloud Server](https://github.com/nextcloud/server) — file and collaboration services.
- [Metabase](https://github.com/metabase/metabase) — business intelligence and analytics.
- [Qdrant](https://github.com/qdrant/qdrant) — optional vector search for approved, access-controlled content.

## Selection record

| Decision | Pilot value |
|---|---|
| Primary portal | Existing TIVA Foundation Next.js + Supabase |
| Pilot LMS | Moodle |
| Academic ERP | Not selected for the first cohort |
| Live classroom | Existing approved conferencing tool until server plan is accepted |
| Offline learning | Not in scope until an offline-centre use case is confirmed |
| Analytics | Aggregate-only views after data definitions are approved |
| Agent permissions | Read/draft by default; approvals required for consequential actions |
