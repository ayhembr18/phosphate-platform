-- =====================================================================
-- Politiques de sécurité (Row Level Security)
-- À exécuter APRÈS schema.sql
-- =====================================================================

alter table profiles enable row level security;
alter table categories enable row level security;
alter table resources enable row level security;
alter table consumption_values enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------
-- Fonction utilitaire : l'utilisateur courant est-il admin ?
-- ---------------------------------------------------------------------
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$ language sql security definer stable;

create or replace function is_active_user()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active = true
  );
$$ language sql security definer stable;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------
create policy "Un utilisateur voit son propre profil, l'admin voit tout"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "Seul l'admin modifie les profils"
  on profiles for update
  using (is_admin());

-- (les insertions se font uniquement via le trigger handle_new_user / service_role)

-- ---------------------------------------------------------------------
-- CATEGORIES — lecture pour tout utilisateur actif, écriture authentifiée,
-- suppression réservée à l'admin
-- ---------------------------------------------------------------------
create policy "Lecture catégories - utilisateurs actifs"
  on categories for select using (is_active_user());

create policy "Création catégories - utilisateurs actifs"
  on categories for insert with check (is_active_user());

create policy "Modification catégories - utilisateurs actifs"
  on categories for update using (is_active_user());

create policy "Suppression catégories - admin uniquement"
  on categories for delete using (is_admin());

-- ---------------------------------------------------------------------
-- RESOURCES
-- ---------------------------------------------------------------------
create policy "Lecture ressources - utilisateurs actifs"
  on resources for select using (is_active_user());

create policy "Création ressources - utilisateurs actifs"
  on resources for insert with check (is_active_user());

create policy "Modification ressources - utilisateurs actifs"
  on resources for update using (is_active_user());

create policy "Suppression ressources - admin uniquement"
  on resources for delete using (is_admin());

-- ---------------------------------------------------------------------
-- CONSUMPTION_VALUES — CRUD complet pour tout utilisateur actif
-- (toute action reste tracée dans audit_log)
-- ---------------------------------------------------------------------
create policy "Lecture consommation - utilisateurs actifs"
  on consumption_values for select using (is_active_user());

create policy "Création consommation - utilisateurs actifs"
  on consumption_values for insert with check (is_active_user());

create policy "Modification consommation - utilisateurs actifs"
  on consumption_values for update using (is_active_user());

create policy "Suppression consommation - utilisateurs actifs"
  on consumption_values for delete using (is_active_user());

-- ---------------------------------------------------------------------
-- AUDIT_LOG — lecture admin uniquement, aucune écriture directe
-- (seul le trigger SECURITY DEFINER peut y insérer)
-- ---------------------------------------------------------------------
create policy "Lecture journal d'audit - admin uniquement"
  on audit_log for select using (is_admin());
