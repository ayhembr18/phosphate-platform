-- =====================================================================
-- Plateforme de Gestion des Ressources — Compagnie de Phosphate de Gafsa
-- Schéma de base de données Supabase (PostgreSQL)
-- =====================================================================
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- =====================================================================

-- Extension nécessaire pour uuid
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILS UTILISATEURS
-- ---------------------------------------------------------------------
-- Les comptes sont créés UNIQUEMENT par un administrateur (backend, clé
-- service_role). Aucune inscription publique n'est possible.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'utilisateur' check (role in ('admin', 'utilisateur')),
  is_active boolean not null default true,
  mfa_enforced boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table profiles is 'Profils des employés — comptes pré-créés par un administrateur uniquement';

-- ---------------------------------------------------------------------
-- 2. CATÉGORIES DE RESSOURCES
-- ---------------------------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text default '#2563eb',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. RESSOURCES (ex: Eau industrielle, Acide sulfurique, Électricité...)
-- ---------------------------------------------------------------------
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  unit text not null default 'unité',
  daily_threshold numeric, -- seuil d'alerte optionnel
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

-- ---------------------------------------------------------------------
-- 4. VALEURS DE CONSOMMATION QUOTIDIENNE
-- ---------------------------------------------------------------------
create table if not exists consumption_values (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references resources(id) on delete cascade,
  consumption_date date not null,
  value numeric not null check (value >= 0),
  note text,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (resource_id, consumption_date)
);

create index if not exists idx_consumption_resource_date on consumption_values (resource_id, consumption_date desc);
create index if not exists idx_resources_category on resources (category_id);

-- ---------------------------------------------------------------------
-- 5. JOURNAL D'AUDIT (traçabilité — important en environnement industriel)
-- ---------------------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,           -- INSERT / UPDATE / DELETE
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_table_record on audit_log (table_name, record_id);
create index if not exists idx_audit_user on audit_log (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- 6. FONCTION + TRIGGERS : updated_at automatique
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_categories_updated_at before update on categories
  for each row execute function set_updated_at();
create trigger trg_resources_updated_at before update on resources
  for each row execute function set_updated_at();
create trigger trg_consumption_updated_at before update on consumption_values
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 7. FONCTION + TRIGGERS : journal d'audit automatique
-- ---------------------------------------------------------------------
create or replace function log_audit()
returns trigger as $$
declare
  actor uuid;
begin
  actor := auth.uid();
  if (tg_op = 'DELETE') then
    insert into audit_log(user_id, action, table_name, record_id, old_data)
    values (actor, tg_op, tg_table_name, old.id, to_jsonb(old));
    return old;
  elsif (tg_op = 'UPDATE') then
    insert into audit_log(user_id, action, table_name, record_id, old_data, new_data)
    values (actor, tg_op, tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'INSERT') then
    insert into audit_log(user_id, action, table_name, record_id, new_data)
    values (actor, tg_op, tg_table_name, new.id, to_jsonb(new));
    return new;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_audit_categories after insert or update or delete on categories
  for each row execute function log_audit();
create trigger trg_audit_resources after insert or update or delete on resources
  for each row execute function log_audit();
create trigger trg_audit_consumption after insert or update or delete on consumption_values
  for each row execute function log_audit();

-- ---------------------------------------------------------------------
-- 8. Création automatique du profil au moment de la création du compte
-- (déclenché par le backend admin via auth.admin.createUser + metadata)
-- ---------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'utilisateur')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
