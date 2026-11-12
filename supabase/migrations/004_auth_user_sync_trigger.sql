-- SmartBridge InternFlow - Automatic User Profile Sync Trigger & Invite-Verified Mentor Registration
-- Migration 004: Automatically inserts public.profiles (and interns/mentors) when a user registers in Supabase Auth

CREATE TABLE IF NOT EXISTS public.mentor_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL DEFAULT 'Engineering',
  designation TEXT NOT NULL DEFAULT 'Mentor',
  max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses >= 1),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mentor_invite_codes ENABLE ROW LEVEL SECURITY;

-- Only ADMIN can view or manage mentor invite codes; never exposed to clients
CREATE POLICY mentor_invite_codes_admin_only ON public.mentor_invite_codes
  FOR ALL USING (public.current_user_role() = 'ADMIN');

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  requested_account_type TEXT;
  supplied_invite_code TEXT;
  invite_row RECORD;
  user_full_name TEXT;
BEGIN
  user_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- 1. Trusted server/admin metadata takes precedence
  IF NEW.raw_app_meta_data ? 'role' THEN
    assigned_role := UPPER(NEW.raw_app_meta_data->>'role');
  ELSE
    requested_account_type := UPPER(COALESCE(NEW.raw_user_meta_data->>'account_type', 'INTERN'));
    IF requested_account_type = 'MENTOR' THEN
      supplied_invite_code := NULLIF(TRIM(NEW.raw_user_meta_data->>'invite_code'), '');
      IF supplied_invite_code IS NULL THEN
        RAISE EXCEPTION 'A valid Mentor Invite Code from an Administrator is required to register as a Mentor.';
      END IF;

      SELECT * INTO invite_row
      FROM public.mentor_invite_codes
      WHERE code = supplied_invite_code
        AND is_active = TRUE
        AND used_count < max_uses
        AND (expires_at IS NULL OR expires_at > NOW())
      FOR UPDATE
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid, expired, or already-used Mentor Invite Code.';
      END IF;

      UPDATE public.mentor_invite_codes
      SET used_count = used_count + 1,
          is_active = CASE WHEN used_count + 1 >= max_uses THEN FALSE ELSE TRUE END
      WHERE id = invite_row.id;

      assigned_role := 'MENTOR';
    ELSE
      -- Public registration without a verified mentor invite code always defaults safely to INTERN
      assigned_role := 'INTERN';
    END IF;
  END IF;

  IF assigned_role NOT IN ('ADMIN', 'MENTOR', 'INTERN') THEN
    assigned_role := 'INTERN';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, phone, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    assigned_role,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;

  IF assigned_role = 'INTERN' THEN
    INSERT INTO public.interns (profile_id, intern_code, assigned_domain, current_stage, program_progress, joining_date)
    VALUES (
      NEW.id,
      'INT-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8)),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'domain'), ''), 'Unassigned'),
      0,
      0,
      CURRENT_DATE
    )
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF assigned_role = 'MENTOR' THEN
    INSERT INTO public.mentors (profile_id, employee_id, department, designation, technical_domain, joining_date)
    VALUES (
      NEW.id,
      'EMP-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8)),
      COALESCE(invite_row.department, NULLIF(TRIM(NEW.raw_user_meta_data->>'department'), ''), 'Engineering'),
      COALESCE(invite_row.designation, NULLIF(TRIM(NEW.raw_user_meta_data->>'designation'), ''), 'Mentor'),
      COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'domain'), ''), 'General'),
      CURRENT_DATE
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs (actor_profile_id, actor_role, action, entity_type, entity_id, new_values)
  VALUES (
    NEW.id,
    assigned_role,
    'USER_REGISTERED',
    'profile',
    NEW.id,
    jsonb_build_object('email', NEW.email, 'role', assigned_role)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
