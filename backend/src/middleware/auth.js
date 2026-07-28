import { supabaseAuthCheck, supabaseAdmin } from '../services/supabaseAdmin.js';

function decodeJwtPayload(token) {
  try {
    const payloadBase64 = token.split('.')[1];
    const json = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentification requise.' });
    }

    const { data: userData, error } = await supabaseAuthCheck.auth.getUser(token);
    if (error || !userData?.user) {
      return res.status(401).json({ error: 'Session invalide ou expirée.' });
    }

    const payload = decodeJwtPayload(token);
    if (payload?.aal !== 'aal2') {
      return res.status(403).json({ error: 'Double authentification requise pour cette action.' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', userData.user.id)
      .single();

    if (!profile || !profile.is_active) {
      return res.status(403).json({ error: 'Compte désactivé. Contactez un administrateur.' });
    }

    req.user = userData.user;
    req.profile = profile;
    next();
  } catch (err) {
    console.error('Erreur auth middleware:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la vérification de session.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  next();
}