import { useNavigate, useOutletContext } from 'react-router-dom';
import HeroHeader from '@/components/HeroHeader';
import OnboardingScreen from '@/components/OnboardingScreen';
import type { AppLayoutContext } from '@/components/AppLayout';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { onboarding } = useOutletContext<AppLayoutContext>();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <HeroHeader />
      <OnboardingScreen
        onboarding={onboarding}
        onComplete={() => navigate('/matches', { replace: true })}
      />
    </div>
  );
};

export default OnboardingPage;
