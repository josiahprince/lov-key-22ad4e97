
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Smile, Meh, Frown, Zap, Coffee, Flame } from 'lucide-react';
import type { useOnboardingData } from '@/hooks/useOnboardingData';
import { useCulturalVibes } from '@/hooks/useCulturalVibes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logError } from '@/lib/errorLogger';
import LoadingState from '@/components/LoadingState';
import MoodStep from '@/components/onboarding/MoodStep';
import VibesStep from '@/components/onboarding/VibesStep';
import PromptStep from '@/components/onboarding/PromptStep';
import { useWeeklyPrompt } from '@/hooks/useWeeklyPrompt';

interface OnboardingCompletionData {
  mood: string;
  memes: string[];
  promptAnswer: string;
  createdAt: Date;
}

interface OnboardingScreenProps {
  // Owned by AppLayout so saving here also clears its daily onboarding gate.
  onboarding: ReturnType<typeof useOnboardingData>;
  onComplete: (data: OnboardingCompletionData) => void;
}

const OnboardingScreen = ({ onboarding, onComplete }: OnboardingScreenProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState('');
  const [selectedMemes, setSelectedMemes] = useState<string[]>([]);
  const [promptAnswer, setPromptAnswer] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);

  const { onboardingData, loading, saveOnboardingData } = onboarding;
  const { vibes: memes, loading: vibesLoading } = useCulturalVibes(userCountry);
  const { prompt, loading: promptLoading } = useWeeklyPrompt();

  // Fetch user's country on component mount
  useEffect(() => {
    if (!user) return;

    const fetchUserCountry = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('country')
        .eq('id', user.id)
        .single();

      if (profile?.country) {
        setUserCountry(profile.country);
      }
    };

    fetchUserCountry();
  }, [user]);

  // Mood and vibes are picked fresh every day, since they decide today's
  // matches. The written answer is only carried over while it's still the
  // same question of the week, so the user writes it once a week and just
  // confirms it on the other days.
  useEffect(() => {
    if (loading || promptLoading || dataLoaded) return;
    const previousAnswer = onboardingData?.perfectSunday;
    if (
      onboardingData?.promptId === prompt.id &&
      previousAnswer &&
      previousAnswer !== 'pending_daily_update' &&
      previousAnswer.trim() !== ''
    ) {
      setPromptAnswer(previousAnswer);
    }
    setDataLoaded(true);
  }, [loading, promptLoading, onboardingData, prompt.id, dataLoaded]);

  const handleMemeToggle = (memeId: string) => {
    setSelectedMemes(prev => {
      if (prev.includes(memeId)) {
        // Remove the meme if already selected
        return prev.filter(id => id !== memeId);
      } else if (prev.length < 3) {
        // Add the meme if under limit
        return [...prev, memeId];
      } else {
        // At limit (3), don't allow adding more
        return prev;
      }
    });
  };

  const handleComplete = async () => {
    try {
      const profileData = {
        mood,
        memes: selectedMemes,
        promptAnswer,
        createdAt: new Date(),
      };

      // Persist the exact vibe text/emoji the user saw, since it's
      // AI-generated per country and can't be recovered from the id later.
      const selectedMemesDisplay = memes
        .filter((m) => selectedMemes.includes(m.id))
        .map((m) => ({ id: m.id, title: m.title, emoji: m.emoji }));

      // Save to database - this persists the data until tomorrow
      await saveOnboardingData({
        mood,
        selectedMemes,
        selectedMemesDisplay,
        perfectSunday: promptAnswer,
        promptId: prompt.id,
        promptQuestion: prompt.question,
      });

      onComplete(profileData);
    } catch (error) {
      logError("OnboardingScreen:handleComplete", error);
    }
  };

  if (loading || vibesLoading || promptLoading) {
    return (
      <div className="px-4 flex flex-col justify-center items-center min-h-[400px]">
        <LoadingState
          variant="spinner"
          label={vibesLoading ? 'Preparing your personalized vibes...' : 'Loading your preferences...'}
        />
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return <MoodStep mood={mood} onSelectMood={setMood} onNext={() => setStep(2)} />;

      case 2:
        return (
          <VibesStep
            vibes={memes}
            selectedMemes={selectedMemes}
            onToggleMeme={handleMemeToggle}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        );

      case 3:
        return (
          <PromptStep
            question={prompt.question}
            placeholder={prompt.placeholder}
            promptAnswer={promptAnswer}
            onChangePromptAnswer={setPromptAnswer}
            onBack={() => setStep(2)}
            onComplete={handleComplete}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="px-4 flex flex-col justify-center">
      <div className="mb-3">
        <div className="flex space-x-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
      
      {renderStep()}
    </div>
  );
};

export default OnboardingScreen;
