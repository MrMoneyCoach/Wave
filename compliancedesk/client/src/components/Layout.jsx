import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/generate', label: 'New Letter' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
];

export default function Layout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-navy-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded bg-gold" />
            <span className="font-semibold tracking-tight text-lg">ComplianceDesk</span>
          </NavLink>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition ${
                    isActive ? 'bg-navy-700 text-white' : 'text-slate-200 hover:bg-navy-700'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-slate-300">{user?.email}</span>
            <button onClick={handleSignOut} className="btn-ghost text-slate-200 hover:text-white hover:bg-navy-700">
              Sign out
            </button>
          </div>
        </div>
        <nav className="md:hidden border-t border-navy-700">
          <div className="max-w-6xl mx-auto px-4 flex overflow-x-auto gap-1 py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition ${
                    isActive ? 'bg-navy-700 text-white' : 'text-slate-200'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet context={{ profile }} />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-slate-500 flex justify-between">
          <span>© {new Date().getFullYear()} ComplianceDesk</span>
          <span>Outputs are drafts — always review before sending.</span>
        </div>
      </footer>
    </div>
  );
}
