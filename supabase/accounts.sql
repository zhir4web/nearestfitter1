-- Run after schema.sql on existing Supabase installations, before deploying this release.
-- Additive and repeatable. No historical job or financial entry is deleted.
create table if not exists public.account_settlements (
 id text primary key,
 fitter_id text not null references public.fitters(id) on delete restrict,
 amount_iqd bigint not null check(amount_iqd >= 0),
 job_count integer not null check(job_count > 0),
 note text not null default '', created_at text not null
);
create table if not exists public.account_charges (
 id text primary key,
 dispatch_id text not null unique references public.dispatch_requests(id) on delete restrict,
 fitter_id text not null references public.fitters(id) on delete restrict,
 amount_iqd integer not null check(amount_iqd >= 0),
 created_at text not null,
 settlement_id text references public.account_settlements(id) on delete restrict
);
create index if not exists account_charge_fitter on public.account_charges(fitter_id,settlement_id);
create index if not exists account_settlement_fitter on public.account_settlements(fitter_id,created_at);
alter table public.account_charges enable row level security;
alter table public.account_settlements enable row level security;
revoke all on public.account_charges, public.account_settlements from anon, authenticated;
grant all on public.account_charges, public.account_settlements to service_role;
update public.platform_settings set commission_percent = 0;
alter table public.platform_settings alter column commission_percent set default 0;

create or replace function public.import_legacy_account_charges() returns void
language sql security definer set search_path=public as $$
 insert into account_charges(id,dispatch_id,fitter_id,amount_iqd,created_at)
 select id,id,fitter_id,commission_iqd,accepted_at from dispatch_requests
 where accepted_at is not null and commission_iqd is not null and commission_status='due'
 on conflict(dispatch_id) do nothing;
$$;
select public.import_legacy_account_charges();

create or replace function public.accept_dispatch_with_charge(p_token text,p_fitter_id text) returns boolean
language plpgsql security definer set search_path=public as $$
declare v_job dispatch_requests%rowtype; v_fee integer; v_now text;
begin
 -- Serialize acceptance with settlement for the same fitter.
 perform id from fitters where id=p_fitter_id and status='approved' for update;
 if not found then return false; end if;
 select commission_fixed_iqd into v_fee from platform_settings where id='platform';
 v_fee := coalesce(v_fee,0);
 v_now := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 update dispatch_requests set status='accepted', accepted_at=v_now,
 commission_percent=0,commission_fixed_iqd=v_fee,commission_iqd=v_fee,commission_status='due'
 where fitter_token=p_token and fitter_id=p_fitter_id and status='pending' and expires_at>v_now
 returning * into v_job;
 if not found then return false; end if;
 insert into account_charges(id,dispatch_id,fitter_id,amount_iqd,created_at)
 values(v_job.id,v_job.id,p_fitter_id,v_fee,v_now);
 return true;
end;
$$;
create or replace function public.settle_fitter_account(p_fitter_id text,p_id text,p_note text,p_expected_amount bigint,p_expected_count integer) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_receipt account_settlements%rowtype; v_count integer; v_amount bigint; v_ids text[]; v_now text;
begin
 perform id from fitters where id=p_fitter_id for update;
 if not found then raise exception 'Fitter not found'; end if;
 select * into v_receipt from account_settlements where id=p_id;
 if found then
   if v_receipt.fitter_id<>p_fitter_id then raise exception 'Invalid receipt'; end if;
   return to_jsonb(v_receipt);
 end if;
 select count(*)::integer,coalesce(sum(amount_iqd),0),array_agg(id) into v_count,v_amount,v_ids
 from account_charges where fitter_id=p_fitter_id and settlement_id is null;
 if v_count=0 then raise exception 'There is no unsettled account'; end if;
 if v_count<>p_expected_count or v_amount<>p_expected_amount then raise exception 'The account changed. Refresh before settling.'; end if;
 v_now := to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 insert into account_settlements(id,fitter_id,amount_iqd,job_count,note,created_at)
 values(p_id,p_fitter_id,v_amount,v_count,p_note,v_now) returning * into v_receipt;
 update account_charges set settlement_id=p_id where id=any(v_ids);
 update dispatch_requests set commission_status='settled' where id in (select dispatch_id from account_charges where settlement_id=p_id);
 return to_jsonb(v_receipt);
end;
$$;
revoke all on function public.import_legacy_account_charges() from public,anon,authenticated;
revoke all on function public.accept_dispatch_with_charge(text,text) from public,anon,authenticated;
revoke all on function public.settle_fitter_account(text,text,text,bigint,integer) from public,anon,authenticated;
grant execute on function public.import_legacy_account_charges() to service_role;
grant execute on function public.accept_dispatch_with_charge(text,text) to service_role;
grant execute on function public.settle_fitter_account(text,text,text,bigint,integer) to service_role;
