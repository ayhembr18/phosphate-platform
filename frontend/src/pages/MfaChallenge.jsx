import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function MfaChallenge() {
  const navigate = useNavigate();
  const { refreshMfaStatus, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: factors, error: factorsErr } = await supabase.auth.mfa.listFactors();
      if (factorsErr) throw factorsErr;
      const totpFactor = factors.totp.find((f) => f.status === 'verified');
      if (!totpFactor) throw new Error('Aucun facteur MFA trouvé.');

      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) throw verifyErr;

      await refreshMfaStatus();
      navigate('/tableau-de-bord');
    } catch (err) {
      toast.error('Code incorrect ou expiré. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-700 flex items-center justify-center mb-3">
            <KeyRound className="text-white" size={24} />
          </div>
          <h1 className="text-lg font-bold text-slate-800 text-center">Vérification en deux étapes</h1>
          <p className="text-sm text-slate-500 mt-2 text-center">
            Entrez le code généré par votre application d'authentification.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-brand-600"
            placeholder="000000"
          />
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Vérification…' : 'Valider'}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="w-full text-xs text-slate-400 hover:text-slate-600"
          >
            Annuler et se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
