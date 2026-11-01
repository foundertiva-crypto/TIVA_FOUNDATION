# Education Platform — Security Gates and Review Notes

This file describes security controls to prove before the Foundation begins storing learner data. It is not a security certification.

## Finding to address

The current supabase/rls_policies.sql defines an update policy that lets a user update their own profiles row. The same row has a role field, and the application checks that field to decide who is an admin. Without an independent column restriction or server-side guard, this can permit a user to attempt self-promotion. The companion migration adds a database trigger that rejects self role changes by non-admins.

**The migration is not applied automatically by a GitHub pull request.** Apply it first in staging, run the negative and positive tests below, back up the production database, then follow the approved release process.

## Required tests

1. Anonymous request cannot read or mutate any protected learner, application, attendance, assessment, or certificate record.
2. Authenticated learner cannot change their own profiles.role to admin; PostgreSQL rejects the statement with insufficient-privilege semantics.
3. An authenticated learner can still update only the profile fields the product intends to expose, after column and application-level restrictions are checked.
4. A non-admin cannot update another user's profile, issue roles, approve an application, mark another learner's attendance, enter another learner's score, issue/revoke a certificate, or access restricted case notes.
5. A mentor can see only assigned cohorts and submissions.
6. A programme coordinator cannot see KYC documents, payment records, donor payment details or safeguarding case notes unless a separate approved duty explicitly grants that access.
7. An education lead can approve a completion decision, but certificate issuance is separately recorded with issuer, timestamp, unique verification code and revocation state.
8. Public certificate verification reveals no learner contact details or identity documents.
9. Storage policy denies direct public reads of application attachments, identity documents and assessment evidence; signed links expire and are not logged.
10. Every privileged change includes actor, time, object, action and reason; secrets and raw personal data are excluded from normal logs.
11. Backup restore produces an isolated test environment and passes row-count/referential-integrity checks.
12. The integration service cannot write to finance/ERP tables except through a specifically approved, audited integration path.

## Release workflow

1. Apply migration to a disposable/staging Supabase project.
2. Execute the two role tests and all access-boundary tests as multiple test identities.
3. Verify existing login, signup, profile update, referrals, donations and admin functions still work.
4. Capture test evidence without including access tokens or learner PII.
5. Take a verified production backup and document the rollback procedure.
6. Schedule the change and apply in the approved window.
7. Repeat a smoke-test suite and verify audit logs.
8. Do not begin importing student data until all launch gates in TIVA-WORLD-FOUNDATION-EDUCATION-PLATFORM.md pass.

## Incident boundaries

If a key, service-role token, private learner file, or KYC document is found in a public repository, rotate/revoke the credential or access path; do not merely delete the visible file. Preserve incident evidence as permitted, assess exposure, and follow the approved incident and notification process.
