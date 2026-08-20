import { Navigate, useOutletContext } from 'react-router-dom';
import type { AppLayoutContext } from '@/components/AppLayout';

const HomeRedirect = () => {
  const { shouldShowOnboarding, onboardingLoading } = useOutletContext<AppLayoutContext>();

  if (onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return <Navigate to={shouldShowOnboarding ? '/onboarding' : '/matches'} replace />;
};

export default HomeRedirect;
