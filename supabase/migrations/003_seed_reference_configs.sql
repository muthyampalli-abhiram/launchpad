-- SmartBridge InternFlow - Official LAUNCHPAD Reference Configuration
-- Migration 003: Seed official KPI weights, 24-week stages, and proposed L1/L2/L3 thresholds

INSERT INTO public.launchpad_configs (config_key, config_value, approval_status, description)
VALUES
  (
    'kpi_weights',
    '{"LEARN": 0.25, "BUILD": 0.45, "SHARE": 0.15, "SHOWCASE": 0.15}'::jsonb,
    'APPROVED',
    'Official SmartBridge LAUNCHPAD Monthly KPI Pillar Weights'
  ),
  (
    'launchpad_stages',
    '[
      {"stage": 0, "name": "Baseline Assessment", "weeks": "Week 0", "weekStart": 0, "weekEnd": 0},
      {"stage": 1, "name": "Learner", "weeks": "Weeks 1–6", "weekStart": 1, "weekEnd": 6},
      {"stage": 2, "name": "Practitioner", "weeks": "Weeks 7–12", "weekStart": 7, "weekEnd": 12},
      {"stage": 3, "name": "Developer", "weeks": "Weeks 13–18", "weekStart": 13, "weekEnd": 18},
      {"stage": 4, "name": "Professional", "weeks": "Weeks 19–24", "weekStart": 19, "weekEnd": 24}
    ]'::jsonb,
    'APPROVED',
    'Official 24-week SmartBridge LAUNCHPAD Program Structure'
  ),
  (
    'l1_l2_l3_thresholds',
    '[
      {"label": "Development Required", "min": 0, "max": 59.99},
      {"label": "L1", "min": 60, "max": 69.99},
      {"label": "L2", "min": 70, "max": 84.99},
      {"label": "L3", "min": 85, "max": 100}
    ]'::jsonb,
    'PENDING_APPROVAL',
    'Proposed L1/L2/L3 Performance Classification bands from evaluation workbook (awaiting management confirmation)'
  ),
  (
    'attendance_timesheets_enabled',
    '{"enabled": false}'::jsonb,
    'PENDING_APPROVAL',
    'Feature flag for intern attendance and timesheet mentor review module'
  )
ON CONFLICT (config_key) DO NOTHING;

