import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Client "admin" — utilise la clé service_role.
// NE JAMAIS exposer ce client ou cette clé au frontend.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Client "anon" — sert uniquement à vérifier les tokens JWT reçus du frontend.
export const supabaseAuthCheck = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
