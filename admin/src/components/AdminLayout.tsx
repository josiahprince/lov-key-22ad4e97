import { NavLink, Outlet } from 'react-router-dom';
import { Flag, LayoutDashboard, LogOut, ScrollText, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, useStaff, type AppPermission } from '../useStaff';

const NAV: { to: string; label: string; icon: typeof Flag; permission: AppPermission | null }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'reports.view' },
  { to: '/reports', label: 'Reports', icon: Flag, permission: 'reports.view' },
  { to: '/users', label: 'Users', icon: Users, permission: 'users.view' },
  { to: '/audit', label: 'Audit log', icon: ScrollText, permission: 'audit.view' },
];

const AdminLayout = () => {
  const { state, can, signOut } = useStaff();
  if (state.status !== 'ready') return null;

  return (
    <div className="min-h-screen bg-muted/40 md:flex">
      <aside className="md:w-56 md:min-h-screen bg-card border-b md:border-b-0 md:border-r flex md:flex-col">
        <div className="hidden md:flex items-center gap-2 px-4 h-14 border-b font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          LovKey Admin
        </div>
        <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto flex-1">
          {NAV.filter((item) => !item.permission || can(item.permission)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap',
                isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 md:border-t text-xs space-y-2 shrink-0">
          <div className="hidden md:block">
            <p className="font-medium truncate">{state.email}</p>
            <p className="text-muted-foreground">{ROLE_LABELS[state.role]}</p>
          </div>
          <Button variant="outline" size="sm" className="md:w-full" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4 mr-1" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
