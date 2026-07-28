import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Boxes, ClipboardList, FileBarChart, Users, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Sidebar() {
  const { profile, signOut } = useAuth();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-slate-100">
        <div className="text-xs uppercase tracking-wide text-slate-400">Compagnie de Phosphate</div>
        <div className="font-semibold text-brand-900">de Gafsa</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink to="/tableau-de-bord" className={linkClass}>
          <LayoutDashboard size={18} /> Tableau de bord
        </NavLink>
        <NavLink to="/categories" className={linkClass}>
          <FolderKanban size={18} /> Catégories
        </NavLink>
        <NavLink to="/ressources" className={linkClass}>
          <Boxes size={18} /> Ressources
        </NavLink>
        <NavLink to="/consommation" className={linkClass}>
          <ClipboardList size={18} /> Consommation
        </NavLink>
        <NavLink to="/rapports" className={linkClass}>
          <FileBarChart size={18} /> Rapports
        </NavLink>
        {profile?.role === 'admin' && (
          <NavLink to="/administration" className={linkClass}>
            <Users size={18} /> Utilisateurs
          </NavLink>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-slate-100">
        <div className="text-sm font-medium text-slate-700 truncate">{profile?.full_name}</div>
        <div className="text-xs text-slate-400 mb-3 capitalize">{profile?.role}</div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          <LogOut size={16} /> Déconnexion
        </button>
      </div>
    </aside>
  );
}
