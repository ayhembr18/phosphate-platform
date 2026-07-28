import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../services/supabaseAdmin.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2),
  role: z.enum(['admin', 'utilisateur']).default('utilisateur'),
});

/**
 * POST /api/admin/users
 * Crée un compte pré-créé. L'utilisateur reçoit un email d'invitation
 * Supabase pour définir son mot de passe, puis devra activer la 2FA
 * (TOTP) obligatoirement à sa première connexion.
 */
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides.', details: parsed.error.flatten() });
  }
  const { email, full_name, role } = parsed.data;

  try {
const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  data: { full_name, role },
  redirectTo: `${process.env.FRONTEND_ORIGIN}/invitation`,
});
    if (error) throw error;

    res.status(201).json({ user: data.user, message: 'Invitation envoyée par email.' });
  } catch (err) {
    console.error('Erreur création utilisateur:', err);
    res.status(500).json({ error: err.message || 'Échec de la création du compte.' });
  }
});

/** GET /api/admin/users — liste tous les comptes */
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ users: data });
});

/** PATCH /api/admin/users/:id/status — active/désactive un compte */
router.patch('/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active doit être un booléen.' });
  }
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/**
 * POST /api/admin/users/:id/reset-mfa
 * Retire tous les facteurs MFA d'un utilisateur (ex: perte de téléphone).
 * L'utilisateur devra ré-enrôler un nouvel authentificateur à sa prochaine
 * connexion.
 */
router.post('/users/:id/reset-mfa', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: factors, error: listErr } = await supabaseAdmin.auth.admin.mfa.listFactors({
      userId: req.params.id,
    });
    if (listErr) throw listErr;

    for (const factor of factors?.factors || []) {
      await supabaseAdmin.auth.admin.mfa.deleteFactor({ userId: req.params.id, id: factor.id });
    }
    res.json({ success: true, removed: factors?.factors?.length || 0 });
  } catch (err) {
    console.error('Erreur reset MFA:', err);
    res.status(500).json({ error: err.message || 'Échec de la réinitialisation MFA.' });
  }
});

export default router;
