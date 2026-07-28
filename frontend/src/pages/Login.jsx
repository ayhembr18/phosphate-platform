import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      // Le routage vers l'étape MFA appropriée est géré par ProtectedRoute
      navigate('/tableau-de-bord');
    } catch (err) {
      toast.error(err.message === 'Invalid login credentials' ? 'Identifiants incorrects.' : err.message);
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
          <h1 className="text-xl font-bold text-slate-800 text-center">
            Plateforme de Gestion des Ressources
          </h1>
          <p className="text-sm text-slate-400 mt-1 text-center">Compagnie de Phosphate de Gafsa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Adresse email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="nom@phosphate-gafsa.tn"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-700 hover:bg-brand-900 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          Accès réservé aux comptes pré-créés par un administrateur. Aucune inscription publique n'est disponible.
        </p>
      </div>
    </div>
  );
}
