create extension if not exists pgcrypto;

create type employee_key as enum ('svetlana','richard','anastasia','jean_claude','kevin');
create type transaction_origin as enum ('website','telegram');
create type sync_state as enum ('pending','synced','failed');
create type delivery_state as enum ('not_required','pending','sent','failed');
create type project_code as enum ('A','B');
create type allocation_code as enum ('A','B','COMPANY');

create table employees (
  key employee_key primary key,
  display_name text not null,
  role text not null check (role in ('manager','salesperson','expense_reporter')),
  telegram_user_id bigint unique,
  telegram_chat_id bigint
);

insert into employees (key, display_name, role) values
('svetlana','Svetlana de Monte Carlo','manager'),
('richard','Richard “Call Me Dick” Darling','salesperson'),
('anastasia','Anastasia Ferrari','salesperson'),
('jean_claude','Jean-Claude Bērziņš','salesperson'),
('kevin','Kevin von Whatever','expense_reporter');

create table transaction_references (
  reference text primary key check (reference ~ '^[A-Z0-9_-]+$'),
  kind text not null check (kind in ('sale','expense')),
  created_at timestamptz not null default now()
);

create table sales (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique references transaction_references(reference),
  submitted_at timestamptz not null default now(),
  submitted_by employee_key not null references employees(key),
  origin transaction_origin not null,
  original_chat_id bigint,
  customer text not null check (length(trim(customer)) > 0),
  project project_code not null,
  description text not null check (length(trim(description)) > 0),
  amount_cents bigint not null check (amount_cents > 0),
  proposed_richard smallint not null check (proposed_richard between 0 and 100),
  proposed_anastasia smallint not null check (proposed_anastasia between 0 and 100),
  proposed_jean_claude smallint not null check (proposed_jean_claude between 0 and 100),
  final_richard smallint check (final_richard between 0 and 100),
  final_anastasia smallint check (final_anastasia between 0 and 100),
  final_jean_claude smallint check (final_jean_claude between 0 and 100),
  commission_pool_cents bigint not null default 0,
  commission_richard_cents bigint not null default 0,
  commission_anastasia_cents bigint not null default 0,
  commission_jean_claude_cents bigint not null default 0,
  status text not null default 'pending' check (status in ('pending','approved')),
  approved_at timestamptz,
  approved_by employee_key references employees(key),
  sheet_sync_status sync_state not null default 'pending',
  sheet_sync_error text,
  notification_status delivery_state not null default 'not_required',
  notification_error text,
  constraint proposed_split_100 check (proposed_richard + proposed_anastasia + proposed_jean_claude = 100),
  constraint final_split_complete check (
    (status='pending' and final_richard is null and final_anastasia is null and final_jean_claude is null)
    or (status='approved' and final_richard + final_anastasia + final_jean_claude = 100)
  )
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique references transaction_references(reference),
  submitted_at timestamptz not null default now(),
  submitted_by employee_key not null references employees(key),
  origin transaction_origin not null,
  original_chat_id bigint,
  description text not null check (length(trim(description)) > 0),
  category text not null check (category in ('Materials','Travel','Other')),
  amount_cents bigint not null check (amount_cents > 0),
  proposed_allocation allocation_code not null,
  final_allocation allocation_code,
  status text not null check (status in ('awaiting_allocation','allocated')),
  allocated_at timestamptz,
  allocated_by employee_key references employees(key),
  sheet_sync_status sync_state not null default 'pending',
  sheet_sync_error text,
  notification_status delivery_state not null default 'not_required',
  notification_error text,
  constraint allocation_state check (
    (status='awaiting_allocation' and final_allocation is null)
    or (status='allocated' and final_allocation is not null)
  )
);

alter table employees enable row level security;
alter table transaction_references enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;

-- The browser never receives the service key or accesses these tables directly.
-- All operations go through validated server actions/API routes.

create or replace function create_sale(p jsonb) returns sales language plpgsql security definer set search_path=public as $$
declare v sales;
begin
  insert into transaction_references(reference,kind) values (p->>'reference','sale');
  insert into sales(reference,submitted_by,origin,original_chat_id,customer,project,description,amount_cents,
    proposed_richard,proposed_anastasia,proposed_jean_claude)
  values (p->>'reference',(p->>'submitted_by')::employee_key,(p->>'origin')::transaction_origin,
    nullif(p->>'original_chat_id','')::bigint,p->>'customer',(p->>'project')::project_code,p->>'description',
    (p->>'amount_cents')::bigint,(p->>'proposed_richard')::smallint,(p->>'proposed_anastasia')::smallint,
    (p->>'proposed_jean_claude')::smallint) returning * into v;
  return v;
end $$;

create or replace function create_expense(p jsonb) returns expenses language plpgsql security definer set search_path=public as $$
declare v expenses; v_overhead boolean;
begin
  v_overhead := p->>'proposed_allocation'='COMPANY';
  insert into transaction_references(reference,kind) values (p->>'reference','expense');
  insert into expenses(reference,submitted_by,origin,original_chat_id,description,category,amount_cents,
    proposed_allocation,final_allocation,status)
  values (p->>'reference',(p->>'submitted_by')::employee_key,(p->>'origin')::transaction_origin,
    nullif(p->>'original_chat_id','')::bigint,p->>'description',p->>'category',(p->>'amount_cents')::bigint,
    (p->>'proposed_allocation')::allocation_code,
    case when v_overhead then 'COMPANY'::allocation_code else null end,
    case when v_overhead then 'allocated' else 'awaiting_allocation' end) returning * into v;
  return v;
end $$;

create or replace function approve_sale(p_ref text,p_r smallint,p_a smallint,p_j smallint) returns sales language plpgsql security definer set search_path=public as $$
declare v sales; pool bigint; vals bigint[]; diff bigint; winner int;
begin
  select * into v from sales where reference=p_ref for update;
  if not found then raise exception 'Sale not found'; end if;
  if v.status='approved' then return v; end if;
  if p_r+p_a+p_j<>100 then raise exception 'Final split must total 100'; end if;
  pool := round(v.amount_cents * 0.10);
  vals := array[round(pool*p_r/100.0),round(pool*p_a/100.0),round(pool*p_j/100.0)];
  diff := pool-vals[1]-vals[2]-vals[3];
  winner := case when p_r>=p_a and p_r>=p_j then 1 when p_a>=p_j then 2 else 3 end;
  vals[winner] := vals[winner]+diff;
  update sales set status='approved', final_richard=p_r, final_anastasia=p_a, final_jean_claude=p_j,
    commission_pool_cents=pool, commission_richard_cents=vals[1], commission_anastasia_cents=vals[2],
    commission_jean_claude_cents=vals[3], approved_at=now(), approved_by='svetlana',
    sheet_sync_status='pending', notification_status=case when original_chat_id is null then 'not_required' else 'pending' end
  where id=v.id returning * into v;
  return v;
end $$;

create or replace function allocate_expense(p_ref text,p_allocation allocation_code) returns expenses language plpgsql security definer set search_path=public as $$
declare v expenses;
begin
  select * into v from expenses where reference=p_ref for update;
  if not found then raise exception 'Expense not found'; end if;
  if v.status='allocated' then return v; end if;
  update expenses set status='allocated', final_allocation=p_allocation, allocated_at=now(), allocated_by='svetlana',
    sheet_sync_status='pending', notification_status=case when original_chat_id is null then 'not_required' else 'pending' end
  where id=v.id returning * into v;
  return v;
end $$;
