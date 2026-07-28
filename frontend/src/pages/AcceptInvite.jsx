import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Le client Supabase traite automatiquement le jeton présent dans le lien
    // d'invitation (detectSessionInUrl: true) avant même que ce composant ne
    // se monte. On vérifie ici qu'une session a bien été établie.
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Mot de passe défini. Configuration de la double authentification…');
      navigate('/tableau-de-bord');
    } catch (err) {
      toast.error(err.message || 'Échec de la définition du mot de passe.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Vérification du lien…</div>;
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-lg font-bold text-slate-800 mb-2">Lien invalide ou expiré</h1>
          <p className="text-sm text-slate-500">
            Ce lien d'invitation n'est plus valide. Demandez à votre administrateur de vous renvoyer une invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-700 flex items-center justify-center mb-3">
            <KeyRound className="text-white" size={24} />
          </div>
          <h1 className="text-lg font-bold text-slate-800 text-center">Bienvenue — définissez votre mot de passe</h1>
          <p className="text-sm text-slate-500 mt-2 text-center">
            Vous configurerez ensuite la double authentification à l'étape suivante.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="8 caractères minimum"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Enregistrement…' : 'Continuer'}
          </button>
        </form>
      </div>
    </div>
  );
}