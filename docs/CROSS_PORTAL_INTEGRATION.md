# SmartBridge InternFlow – Cross-Portal Integration Specification

This document defines the shared database schema, status contracts, KPI calculations, and portal dependencies between the **Admin**, **Mentor**, and **Intern** modules inside the unified SmartBridge InternFlow React + Supabase application.

## 1. Shared Foundation Files
- **Database Schema & RLS**:
  - `supabase/migrations/001_initial_schema.sql`
  - `supabase/migrations/002_rls_and_storage.sql`
  - `supabase/migrations/003_seed_reference_configs.sql`
- **Shared Types**: `src/types/database.ts`
- **Shared LAUNCHPAD Constants & Formula**: `src/constants/launchpad.ts`
- **Shared Supabase Client & Storage Helpers**: `src/lib/supabase.ts`
- **Shared Auth & Role Routing**: `src/contexts/AuthContext.tsx` (`ADMIN -> /admin/dashboard`, `MENTOR -> /mentor/dashboard`, `INTERN -> /intern/dashboard`)

## 2. Official Shared KPI & Evaluation Rules
- **Overall Monthly KPI Score** (`calculateOverallKpi` in `src/constants/launchpad.ts` and generated column `overall_score` in `kpi_evaluations`):
  `Overall KPI Score = (LEARN × 0.25) + (BUILD × 0.45) + (SHARE × 0.15) + (SHOWCASE × 0.15)`
- **L1 / L2 / L3 Classification** (`launchpad_configs` key `l1_l2_l3_thresholds`):
  - Marked `PENDING_APPROVAL` until Admin confirms SmartBridge management approval.
  - Thresholds: `<60` Development Required, `60–69` L1, `70–84` L2, `85–100` L3.
- **Stage 1–4 Rubrics**: Exact weights defined in `STAGE_EVALUATION_RUBRICS` (100 points total per stage).

## 3. Cross-Portal Dependencies & Developer Ownership

| Workflow | Shared Tables | Expected Status Values | Admin Developer Responsibility | Intern Developer Responsibility |
|---|---|---|---|---|
| **1. Mentor Assignment** | `profiles`, `mentors`, `interns`, `mentor_assignments` | `is_active: boolean`, `historical_access_allowed: boolean` | Create `profiles`, `mentors`, `interns`, and insert `mentor_assignments` rows + notify mentor. | Read assigned mentor via active `mentor_assignments`. |
| **2. Task Management** | `tasks`, `task_submissions`, `task_reviews` | Task: `Draft`, `Assigned`, `In Progress`, `Submitted`, `Under Review`, `Revision Requested`, `Resubmitted`, `Reviewed`, `Completed`, `Overdue`. Submission: `Submitted`, `Under Review`, `Revision Requested`, `Resubmitted`, `Approved`. | Monitor all tasks/reviews across batches. | View `Assigned` tasks, insert `task_submissions` (incrementing `version_number`), update `tasks.status` to `Submitted`/`Resubmitted`, and view `task_reviews`. |
| **3. Monthly KPI Reports** | `monthly_reports`, `kpi_evaluations` | Report: `Not Submitted`, `Submitted`, `Under Review`, `Revision Requested`, `Resubmitted`, `Reviewed`, `Approved`. | Monitor completion and optional final `Approved` status. | Submit/resubmit `monthly_reports` and view published `kpi_evaluations` where `is_current = true`. |
| **4. Stage Evaluation & Progression** | `stage_evaluations`, `progression_decisions`, `interns` | Eval: `Draft`, `Submitted`, `Admin Reviewed`. Decision: `Pending`, `Approved`, `Deferred`, `Rejected`. | Review submitted `stage_evaluations`, record `progression_decisions.admin_decision`, and update `interns.current_stage` when approved. | View `Submitted`/`Admin Reviewed` evaluations and final `progression_decisions`. |
| **5. Project Review** | `projects`, `project_milestones`, `project_reviews` | Problem Statement: `Draft`, `Submitted`, `Under Review`, `Changes Requested`, `Approved`. Milestone: `Not Started`, `In Progress`, `Submitted`, `Changes Requested`, `Approved`. | Monitor project status and milestones. | Submit `problem_statement` (incrementing `problem_statement_version`), upload milestone evidence to private bucket `internflow-documents`, and address requested changes. |
| **6. Certification Verification** | `certifications`, `certification_evidence` | `Missing`, `Pending Verification`, `Verified`, `Rejected`, `Additional Evidence Requested`. | Monitor verification status and optionally set `admin_approved_by`/`admin_approved_at`. | Create/update `certifications` (`WEEK_12`, `WEEK_24`) and upload `certification_evidence` to `internflow-documents` with status `Pending Verification`. |
| **7. Feedback & Improvement Plans** | `feedback_records`, `mentor_intern_messages`, `improvement_plans` | Plan: `Open`, `In Progress`, `Under Review`, `Completed`, `Escalated`. | Monitor improvement plan progress. | View `feedback_records` (`is_published = true AND is_private_note = false`), update `viewed_by_intern_at`, message assigned mentor, and update `improvement_plans` progress. |

