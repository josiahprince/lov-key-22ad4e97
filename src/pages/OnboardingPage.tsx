import { useNavigate } from 'react-router-dom';
import HeroHeader from '@/components/HeroHeader';
import OnboardingScreen from '@/components/OnboardingScreen';

const OnboardingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <HeroHeader />
      <OnboardingScreen onComplete={() => navigate('/matches', { replace: true })} />
    </div>
  );
};

export default OnboardingPage;
