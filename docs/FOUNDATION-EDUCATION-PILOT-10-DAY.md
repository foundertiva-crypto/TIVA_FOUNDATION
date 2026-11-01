# TIVA Campus Internship Cohort 001 — Pilot Runbook

**State:** proposed operating plan, not a live cohort roster.
**Target:** up to 50 final-year MBA students; 10 days; hybrid; Kannada, English, Hindi.
**Programme owner:** to be assigned by TIVA World Foundation.

## Before registration opens

- [ ] Name the programme owner, safeguarding contact, education lead, cohort coordinator, instructors, mentors and backup approver.
- [ ] Approve dates/timezone, eligibility, cohort capacity, attendance rule, grading rubric, certificate criteria and appeal process.
- [ ] Publish learner privacy notice and consent version; specify what information is necessary and why.
- [ ] Prepare application form, privacy-safe reference number, rejection/waitlist wording and support contact.
- [ ] Confirm whether college coordinators can see identifiable records; default to minimum access.
- [ ] Verify email/SMS provider, sender identity, rate limits, opt-out and failure handling before enabling messages.
- [ ] Create a separate staging environment with synthetic records and test learner/mentor/admin accounts.
- [ ] Test access boundaries: unauthenticated, learner A, learner B, mentor A, coordinator, education lead, admin.
- [ ] Complete backup and restore rehearsal.
- [ ] Create the Moodle course only after the LMS host and owner are approved.
- [ ] Prepare low-bandwidth and downloadable alternatives to each core lesson.

## Daily operating cadence

Each day has one planned hour of theory and a supervised practical evidence block. The education lead sets the actual timetable.

| Day | Class/learning objective | Evidence to record | Review owner |
|---|---|---|---|
| 1 | Orientation, expectations, safe collaboration | Consent, baseline check, team membership | Coordinator |
| 2 | Problem discovery and stakeholder needs | Problem statement and stakeholder map | Mentor |
| 3 | Planning, scope and risk | Milestones, tasks and risk register | Mentor |
| 4 | Digital tools and evidence management | Evidence register with source links | Instructor |
| 5 | Data literacy and responsible AI | Source checks and AI-use note | Instructor |
| 6 | Service operations | Workflow map and failure analysis | Mentor |
| 7 | Accessible communications and consent | Reviewed communication artifact | Coordinator |
| 8 | Impact measurement | Metric definition and evidence plan | Education lead |
| 9 | Build, test and peer review | Working artifact plus test report | Mentor |
| 10 | Presentation and reflection | Portfolio, rubric, feedback and close-out | Education lead |

## Data and status model

Recommended application statuses: draft, submitted, under_review, needs_information, accepted, waitlisted, rejected, withdrawn.

Recommended enrolment statuses: invited, enrolled, active, completed, incomplete, withdrawn.

Every status transition needs actor, timestamp, reason where relevant, and a traceable event. A draft status is not a real registration; a dashboard count is not proof of a learner record until the database-backed page has been wired and tested.

## Attendance and assessment

- Set an attendance rule before the cohort begins (for example, minimum session participation, with an approved accommodation path).
- Attendance changes require a correction reason and retain the original event in the audit trail.
- Score against a published rubric: relevance, evidence quality, execution, collaboration, communication/accessibility and reflection.
- A missing score is not a zero. Record not_submitted, pending_review, resubmission_requested or other explicit state.
- Mentors only access assigned learners and projects.
- An AI evaluator may suggest feedback against the rubric but cannot make the final completion/certification decision.

## Certificate control

Issue a certificate only after the authorised reviewer records the completion decision. Generate a non-sequential verification identifier. Public verification should return only the minimum needed (for example, certificate valid/revoked and award title); never expose phone, email, identity documents, scores, or attendance detail. Revocation must leave a traceable event and a reason.

## Learner support and safeguarding

- Publish a named point of contact and escalation path.
- Restrict complaints/case notes to authorised handlers; do not put these in the general learner table or analytics view.
- Keep communication respectful, consent-based, accessible and available in supported languages.
- Use a separate policy for minors if any programme later admits children; this pilot assumes final-year MBA adults but eligibility must still be verified.
- Provide an accessible correction and withdrawal process.

## Close-out pack

- Attendance reconciliation, assessment review and certificate approval register.
- Learner feedback with a stated response rate and denominator.
- Programme summary of applications, enrolments, attendance, completion, learning improvement and project outputs.
- Mentor/instructor debrief and improvement actions with owners/dates.
- Data retention and deletion queue.
- Evidence index with source IDs, reviewer, timestamp and access classification.
- Incident log and follow-up items.
- Finance reconciliation handled by the chosen finance system; do not store payment credentials or create a second ledger in the education portal.

## Go/no-go meeting

The education lead and platform owner confirm each item, record evidence, and record exceptions. The cohort does not launch merely because the website or course page loads.
