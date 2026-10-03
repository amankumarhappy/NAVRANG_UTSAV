-- Additive functions for NAVRANG 26. Existing tables and registration RPC are preserved.
-- See README.md to confirm the existing schema and create_registration argument names first.

revoke all on table public.registrations, public.checkins, public.audit_logs
  from public, anon, authenticated;
grant select on table public.registrations, public.checkins to service_role;

do $$
begin
  update storage.buckets
     set public = false,
         file_size_limit = 5242880,
         allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
   where id = 'payment-screenshots';
  if not found then
    raise exception 'The existing payment-screenshots storage bucket was not found';
  end if;
end;
$$;

create or replace function public.get_active_event(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  event_row jsonb;
  active_value text;
  fee_value numeric;
  date_value text;
begin
  select to_jsonb(e)
    into event_row
    from public.events as e
   where to_jsonb(e) ->> 'id' = p_event_id::text;

  if event_row is null then
    return null;
  end if;

  active_value := lower(coalesce(
    event_row ->> 'is_active',
    event_row ->> 'active',
    event_row ->> 'registration_open',
    event_row ->> 'status',
    'false'
  ));

  begin
    fee_value := nullif(coalesce(
      event_row ->> 'registration_fee',
      event_row ->> 'fee',
      event_row ->> 'amount'
    ), '')::numeric;
  exception when invalid_text_representation then
    fee_value := null;
  end;

  date_value := coalesce(event_row ->> 'event_date', event_row ->> 'date', event_row ->> 'starts_at');

  return jsonb_build_object(
    'id', event_row ->> 'id',
    'name', coalesce(event_row ->> 'name', event_row ->> 'event_name', event_row ->> 'title'),
    'description', event_row ->> 'description',
    'event_date', date_value,
    'venue', coalesce(event_row ->> 'venue', event_row ->> 'location'),
    'event_time', coalesce(event_row ->> 'event_time', event_row ->> 'time'),
    'registration_fee', fee_value,
    'is_active', active_value in ('true', 't', '1', 'active', 'open', 'published')
  );
end;
$$;

revoke all on function public.get_active_event(uuid) from public;
grant execute on function public.get_active_event(uuid) to anon, authenticated, service_role;

create or replace function public._navrang_write_audit(
  p_registration_id uuid,
  p_public_registration_id text,
  p_admin_id uuid,
  p_action text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  audit_payload jsonb;
  insert_columns text;
  select_values text;
  has_registration boolean;
  has_actor boolean;
  has_action boolean;
  has_timestamp boolean;
begin
  audit_payload := jsonb_build_object(
    'registration_id', p_registration_id,
    'admin_id', p_admin_id,
    'user_id', p_admin_id,
    'performed_by', p_admin_id,
    'action', p_action,
    'event', p_action,
    'event_type', p_action,
    'reason', p_reason,
    'details', jsonb_build_object(
      'registration_id', p_public_registration_id,
      'reason', p_reason,
      'metadata', p_metadata
    )::text,
    'metadata', jsonb_build_object(
      'public_registration_id', p_public_registration_id,
      'reason', p_reason,
      'metadata', p_metadata
    ),
    'created_at', now(),
    'timestamp', now()
  );

  select
    string_agg(format('%I', a.attname), ', '),
    string_agg(format('(jsonb_populate_record(null::public.audit_logs, $1)).%I', a.attname), ', '),
    bool_or(a.attname = 'registration_id'),
    bool_or(a.attname = any(array['admin_id', 'user_id', 'performed_by'])),
    bool_or(a.attname = any(array['action', 'event', 'event_type'])),
    bool_or(a.attname = any(array['created_at', 'timestamp']))
    into insert_columns, select_values, has_registration, has_actor, has_action, has_timestamp
    from pg_attribute as a
   where a.attrelid = 'public.audit_logs'::regclass
     and a.attnum > 0
     and not a.attisdropped
     and a.attname = any(array[
       'registration_id', 'admin_id', 'user_id', 'performed_by',
       'action', 'event', 'event_type', 'reason', 'details', 'metadata',
       'created_at', 'timestamp'
     ]);

  if insert_columns is null or not coalesce(has_registration, false)
     or not coalesce(has_actor, false) or not coalesce(has_action, false)
     or not coalesce(has_timestamp, false) then
    raise exception 'The existing audit_logs table must support registration, actor, action and timestamp audit fields';
  end if;

  execute format('insert into public.audit_logs (%s) select %s', insert_columns, select_values)
    using audit_payload;
end;
$$;

revoke all on function public._navrang_write_audit(uuid, text, uuid, text, text, jsonb) from public, anon, authenticated;

create or replace function public.admin_registration_action(
  p_event_id uuid,
  p_registration_id text,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  registration_row public.registrations%rowtype;
  audit_action text;
  pass_was_enabled boolean;
begin
  if auth.uid() is null or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Not authorized';
  end if;
  if p_event_id is null then
    raise exception 'Event scope is required';
  end if;

  select * into registration_row
    from public.registrations
   where registration_id = p_registration_id
     and event_id = p_event_id
   for update;

  if not found then
    raise exception 'Registration not found';
  end if;

  if p_action in ('APPROVE', 'MANUAL_APPROVE') then
    if registration_row.status <> 'PENDING' then
      raise exception 'Only pending registrations can be approved';
    end if;
    if p_action = 'MANUAL_APPROVE' and nullif(trim(p_reason), '') is null then
      raise exception 'A manual approval reason is required';
    end if;
    pass_was_enabled := registration_row.pass_generated;
    update public.registrations
       set status = 'APPROVED',
           qr_token = coalesce(
             qr_token,
             replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
           ),
           pass_generated = true,
           updated_at = now()
     where id = registration_row.id
     returning * into registration_row;
    audit_action := case when p_action = 'MANUAL_APPROVE' then 'MANUAL_APPROVED' else 'APPROVED' end;
    perform public._navrang_write_audit(
      registration_row.id, registration_row.registration_id, auth.uid(), audit_action,
      nullif(trim(p_reason), ''), '{}'::jsonb
    );
    if not pass_was_enabled then
      perform public._navrang_write_audit(
        registration_row.id, registration_row.registration_id, auth.uid(), 'PASS_GENERATED',
        null, '{}'::jsonb
      );
    end if;
  elsif p_action = 'REJECT' then
    if registration_row.status <> 'PENDING' then
      raise exception 'Only pending registrations can be rejected';
    end if;
    update public.registrations
       set status = 'REJECTED',
           pass_generated = false,
           qr_token = null,
           updated_at = now()
     where id = registration_row.id
     returning * into registration_row;
    perform public._navrang_write_audit(
      registration_row.id, registration_row.registration_id, auth.uid(), 'REJECTED',
      nullif(trim(p_reason), ''), '{}'::jsonb
    );
  elsif p_action = 'REISSUE' then
    if registration_row.status <> 'APPROVED' then
      raise exception 'Only approved registrations can have a pass reissued';
    end if;
    update public.registrations
       set qr_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
           pass_generated = true,
           updated_at = now()
     where id = registration_row.id
     returning * into registration_row;
    perform public._navrang_write_audit(
      registration_row.id, registration_row.registration_id, auth.uid(), 'PASS_REISSUED',
      nullif(trim(p_reason), ''), '{}'::jsonb
    );
  else
    raise exception 'Unsupported registration action';
  end if;

  return jsonb_build_object(
    'registration_id', registration_row.registration_id,
    'status', registration_row.status,
    'pass_generated', registration_row.pass_generated
  );
end;
$$;

revoke all on function public.admin_registration_action(uuid, text, text, text) from public, anon;
grant execute on function public.admin_registration_action(uuid, text, text, text) to authenticated;

create or replace function public.make_registration_action(
  p_event_id uuid,
  p_registration_id text,
  p_action text,
  p_reason text,
  p_admin_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  admin_metadata jsonb;
  result jsonb;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Not authorized';
  end if;

  select raw_app_meta_data into admin_metadata
    from auth.users
   where id = p_admin_id;
  if admin_metadata ->> 'role' is distinct from 'admin' then
    raise exception 'The Telegram actor is not an event admin';
  end if;

  perform set_config('request.jwt.claim.sub', p_admin_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', p_admin_id,
      'role', 'authenticated',
      'app_metadata', jsonb_build_object('role', 'admin')
    )::text,
    true
  );

  result := public.admin_registration_action(p_event_id, p_registration_id, p_action, p_reason);
  return result;
end;
$$;

revoke all on function public.make_registration_action(uuid, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.make_registration_action(uuid, text, text, text, uuid) to service_role;

create or replace function public.admin_checkin_registration(
  p_event_id uuid,
  p_qr_token text default null,
  p_registration_id text default null,
  p_manual boolean default false,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  registration_row public.registrations%rowtype;
  first_checkin timestamptz;
  inserted_checkin timestamptz;
  audit_action text;
begin
  if auth.uid() is null or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Not authorized';
  end if;
  if p_event_id is null then
    raise exception 'Event scope is required';
  end if;
  if p_manual and nullif(trim(p_reason), '') is null then
    raise exception 'A manual check-in reason is required';
  end if;

  if p_manual then
    select * into registration_row
      from public.registrations
     where registration_id = p_registration_id
       and event_id = p_event_id
     for update;
  else
    select * into registration_row
      from public.registrations
     where qr_token = p_qr_token
       and event_id = p_event_id
     for update;
  end if;

  if not found then
    return jsonb_build_object('status', 'INVALID', 'message', 'This entry pass could not be verified.');
  end if;

  if registration_row.status <> 'APPROVED' or not registration_row.pass_generated then
    return jsonb_build_object('status', 'NOT_APPROVED', 'message', 'This registration does not have an approved entry pass.');
  end if;

  select checked_in_at into first_checkin
    from public.checkins
   where registration_id = registration_row.id;

  if first_checkin is not null then
    return jsonb_build_object(
      'status', 'ALREADY_CHECKED_IN',
      'full_name', registration_row.full_name,
      'registration_id', registration_row.registration_id,
      'branch', registration_row.branch,
      'batch', registration_row.batch,
      'checked_in_at', first_checkin
    );
  end if;

  insert into public.checkins (registration_id, checked_in_at, checked_in_by)
  values (registration_row.id, now(), auth.uid())
  on conflict (registration_id) do nothing
  returning checked_in_at into inserted_checkin;

  if inserted_checkin is null then
    select checked_in_at into first_checkin
      from public.checkins
     where registration_id = registration_row.id;
    return jsonb_build_object(
      'status', 'ALREADY_CHECKED_IN',
      'full_name', registration_row.full_name,
      'registration_id', registration_row.registration_id,
      'branch', registration_row.branch,
      'batch', registration_row.batch,
      'checked_in_at', first_checkin
    );
  end if;

  audit_action := case when p_manual then 'MANUAL_CHECKED_IN' else 'CHECKED_IN' end;
  perform public._navrang_write_audit(
    registration_row.id,
    registration_row.registration_id,
    auth.uid(),
    audit_action,
    nullif(trim(p_reason), ''),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'status', 'ALLOWED',
    'full_name', registration_row.full_name,
    'registration_id', registration_row.registration_id,
    'branch', registration_row.branch,
    'batch', registration_row.batch,
    'checked_in_at', inserted_checkin
  );
end;
$$;

revoke all on function public.admin_checkin_registration(uuid, text, text, boolean, text) from public, anon;
grant execute on function public.admin_checkin_registration(uuid, text, text, boolean, text) to authenticated;
