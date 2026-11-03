import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { StaffProvider, useStaff } from './useStaff';
import AdminLayout from './components/AdminLayout';
import SignInPage from './pages/SignInPage';
import MfaPage from './pages/MfaPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import ReportPage from './pages/ReportPage';
import UsersPage from './pages/UsersPage';
import UserPage from './pages/UserPage';
import AuditPage from './pages/AuditPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const Screens = () => {
  const { state } = useStaff();

  if (state.status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (state.status === 'signed_out') return <SignInPage />;
  if (state.status === 'needs_mfa') return <MfaPage hasFactor={state.hasFactor} />;

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:reportId" element={<ReportPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:userId" element={<UserPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <BrowserRouter>
      <StaffProvider>
        <Screens />
      </StaffProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
