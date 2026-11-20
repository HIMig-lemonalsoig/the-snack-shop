-- =====================================================================
-- Security hardening
--  1. New sign-ups never become admin automatically.
--  2. The last admin can't be removed (prevents lock-out).
--  3. Tighter function privileges.
--  4. Data constraints on snacks + snack requests (also enforced on UPDATE).
--  5. Abuse protection for the public "request a snack" form.
-- Constraints are added NOT VALID so existing rows are left alone;
-- they are enforced for every new insert/update.
-- =====================================================================

-- 1. Never auto-grant admin ------------------------------------------------
-- Previously the first account to sign up became admin. If public sign-ups
-- were ever enabled while no admin existed, a stranger could claim the shop.
-- Admins are now created only by an existing admin (create-user function)
-- or manually in SQL:
--   insert into public.user_roles (user_id, role) values ('<uuid>', 'admin');
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 2. Protect the last admin --------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'admin' AND (TG_OP = 'DELETE' OR NEW.role <> 'admin') THEN
    IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin' AND id <> OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last admin' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS protect_last_admin ON public.user_roles;
CREATE TRIGGER protect_last_admin
  BEFORE DELETE OR UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

-- 3. Function privileges -------------------------------------------------------
-- has_role is SECURITY DEFINER; anonymous visitors don't need it (no anon
-- policy calls it), so stop them probing who is an admin.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Trigger-only functions should never be callable directly.
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_snack_sale() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_removal() FROM PUBLIC, anon, authenticated;

-- 4a. Snacks: sane values, and WITH CHECK on update ---------------------------
ALTER TABLE public.snacks
  ADD CONSTRAINT snacks_name_len CHECK (char_length(btrim(name)) BETWEEN 1 AND 80) NOT VALID,
  ADD CONSTRAINT snacks_description_len CHECK (description IS NULL OR char_length(description) <= 300) NOT VALID,
  ADD CONSTRAINT snacks_emoji_len CHECK (emoji IS NULL OR char_length(emoji) <= 16) NOT VALID,
  ADD CONSTRAINT snacks_price_max CHECK (price <= 1000) NOT VALID,
  ADD CONSTRAINT snacks_quantity_max CHECK (quantity <= 100000) NOT VALID;

DROP POLICY IF EXISTS "Admins can update snacks" ON public.snacks;
CREATE POLICY "Admins can update snacks"
  ON public.snacks FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4b. Snack requests: constraints that also apply to admin updates ------------
ALTER TABLE public.snack_requests
  ADD CONSTRAINT snack_requests_item_len CHECK (char_length(btrim(item_name)) BETWEEN 1 AND 100) NOT VALID,
  ADD CONSTRAINT snack_requests_name_len CHECK (requester_name IS NULL OR char_length(requester_name) <= 60) NOT VALID,
  ADD CONSTRAINT snack_requests_notes_len CHECK (notes IS NULL OR char_length(notes) <= 500) NOT VALID,
  ADD CONSTRAINT snack_requests_status_valid CHECK (status IN ('new', 'done')) NOT VALID;

-- The public may only create brand-new requests (they could previously set
-- any status, e.g. insert straight into "done").
DROP POLICY IF EXISTS "Anyone can submit requests" ON public.snack_requests;
CREATE POLICY "Anyone can submit requests"
  ON public.snack_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND char_length(btrim(item_name)) BETWEEN 1 AND 100
    AND (requester_name IS NULL OR char_length(requester_name) <= 60)
    AND (notes IS NULL OR char_length(notes) <= 500)
  );

DROP POLICY IF EXISTS "Admins can update requests" ON public.snack_requests;
CREATE POLICY "Admins can update requests"
  ON public.snack_requests
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_snack_requests_created_at ON public.snack_requests (created_at DESC);

-- 5. Rate limiting for the public request form ---------------------------------
-- Anonymous inserts can't be tied to a person, so this uses shop-wide limits
-- that a real shop never hits but that stop a script flooding the table.
CREATE OR REPLACE FUNCTION public.throttle_snack_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_minute int;
  recent_hour int;
BEGIN
  -- Admins (e.g. via the dashboard) are never throttled.
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  NEW.item_name := btrim(NEW.item_name);
  NEW.requester_name := NULLIF(btrim(NEW.requester_name), '');
  NEW.notes := NULLIF(btrim(NEW.notes), '');
  NEW.status := 'new';
  NEW.created_at := now();

  SELECT count(*) INTO recent_minute FROM public.snack_requests WHERE created_at > now() - interval '1 minute';
  SELECT count(*) INTO recent_hour FROM public.snack_requests WHERE created_at > now() - interval '1 hour';
  IF recent_minute >= 10 OR recent_hour >= 120 THEN
    RAISE EXCEPTION 'Too many requests right now, please try again later' USING ERRCODE = 'P0001';
  END IF;

  -- Drop exact duplicates sent within 10 minutes.
  IF EXISTS (
    SELECT 1 FROM public.snack_requests
    WHERE lower(item_name) = lower(NEW.item_name)
      AND created_at > now() - interval '10 minutes'
  ) THEN
    RAISE EXCEPTION 'Too many requests for that snack, it''s already on our list' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.throttle_snack_requests() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS throttle_snack_requests ON public.snack_requests;
CREATE TRIGGER throttle_snack_requests
  BEFORE INSERT ON public.snack_requests
  FOR EACH ROW EXECUTE FUNCTION public.throttle_snack_requests();
