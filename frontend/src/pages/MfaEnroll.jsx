import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function MfaEnroll() {
  const navigate = useNavigate();
  const { refreshMfaStatus } = useAuth();
  const [factorId, setFactorId] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function enroll() {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) {
        toast.error("Erreur lors de l'initialisation de la double authentification.");
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    }
    enroll();
  }, []);

  async function handleVerify(e) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeErr) throw challengeErr;

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyErr) throw verifyErr;

      toast.success('Double authentification activée avec succès.');
      await refreshMfaStatus();
      navigate('/tableau-de-bord');
    } catch (err) {
      toast.error('Code invalide. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-700 flex items-center justify-center mb-3">
            <ShieldCheck className="text-white" size={26} />
          </div>
          <h1 className="text-lg font-bold text-slate-800 text-center">
            Configuration de la double authentification
          </h1>
          <p className="text-sm text-slate-500 mt-2 text-center">
            Obligatoire avant le premier accès. Scannez ce QR code avec Google Authenticator ou Microsoft
            Authenticator.
          </p>
        </div>

        {qrCode ? (
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="p-3 border border-slate-200 rounded-xl">
              <img src={qrCode} alt="QR Code TOTP" width={180} height={180} />
            </div>
            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer">Impossible de scanner ? Saisir manuellement</summary>
              <code className="block mt-1 break-all bg-slate-100 p-2 rounded">{secret}</code>
            </details>
          </div>
        ) : (
          <div className="text-center text-sm text-slate-400 mb-6">Génération du QR code…</div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Code à 6 chiffres de l'application
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Vérification…' : 'Activer la double authentification'}
          </button>
        </form>
      </div>
    </div>
  );
}
