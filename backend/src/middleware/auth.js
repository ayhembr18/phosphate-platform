import { supabaseAuthCheck, supabaseAdmin } from '../services/supabaseAdmin.js';

/**
 * Vérifie le token JWT envoyé par le frontend (header Authorization: Bearer ...).
 * Exige également que la session ait atteint le niveau AAL2 (= MFA validée),
 * sinon une session simple mot de passe ne suffit pas pour accéder à l'API.
 */
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

    // Vérifie le niveau d'authentification (AAL2 = MFA complétée)
    const { data: aalData } = await supabaseAuthCheck.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel !== 'aal2') {
      return res.status(403).json({ error: 'Double authentification requise pour cette action.' });
    }

    // Récupère le profil (rôle, statut actif) avec le client admin
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

/** À utiliser après requireAuth — restreint l'accès aux administrateurs. */
export function requireAdmin(req, res, next) {
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs.' });
  }
  next();
}
