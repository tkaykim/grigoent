-- Preserve two-person approval by default while accepting explicitly signed
-- direct execution commands from deetz's server-side executor allowlist.

alter table public.training_payment_refunds
  add column if not exists execution_mode text not null default 'two_person'
    check (execution_mode in ('two_person', 'direct'));

alter table public.training_payment_refunds
  drop constraint if exists training_payment_refunds_distinct_actors;

alter table public.training_payment_refunds
  add constraint training_payment_refunds_actor_separation
  check (
    (
      execution_mode = 'two_person'
      and (approved_by is null or requested_by is null or requested_by <> approved_by)
    )
    or (
      execution_mode = 'direct'
      and requested_by is not null
      and approved_by is not null
      and requested_by = approved_by
    )
  );

comment on column public.training_payment_refunds.execution_mode is
  'two_person requires separate actors; direct requires the same signed requester and approver.';
