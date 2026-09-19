
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Smile, Meh, Frown, Zap, Coffee, Flame } from 'lucide-react';
import { useOnboardingData } from '@/hooks/useOnboardingData';
import { useCulturalVibes } from '@/hooks/useCulturalVibes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logError } from '@/lib/errorLogger';
import LoadingState from '@/components/LoadingState';
import MoodStep from '@/components/onboarding/MoodStep';
import { MOODS } from '@/components/onboarding/moods';
import VibesStep from '@/components/onboarding/VibesStep';
import PerfectSundayStep from '@/components/onboarding/PerfectSundayStep';

interface OnboardingCompletionData {
  mood: string;
  memes: string[];
  promptAnswer: string;
  createdAt: Date;
}

const OnboardingScreen = ({ onComplete }: { onComplete: (data: OnboardingCompletionData) => void }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState('');
  const [selectedMemes, setSelectedMemes] = useState<string[]>([]);
  const [promptAnswer, setPromptAnswer] = useState('');
  const [showExistingData, setShowExistingData] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [userCountry, setUserCountry] = useState<string | null>(null);

  const { onboardingData, loading, shouldShowOnboarding, saveOnboardingData } = useOnboardingData();
  const { vibes: memes, loading: vibesLoading } = useCulturalVibes(userCountry);

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

  // Load existing data when component mounts (only once)
  useEffect(() => {
    if (!loading && onboardingData && shouldShowOnboarding && !dataLoaded) {
      // Check if we have valid existing data (not placeholder values)
      const hasValidMood = onboardingData.mood && 
        onboardingData.mood !== 'pending_daily_update' && 
        onboardingData.mood.trim() !== '';
      
      const hasValidMemes = onboardingData.selectedMemes && 
        onboardingData.selectedMemes.length > 0 && 
        !onboardingData.selectedMemes.includes('pending') &&
        !(onboardingData.selectedMemes.length === 1 && onboardingData.selectedMemes[0] === 'pending');
      
      const hasValidSunday = onboardingData.perfectSunday && 
        onboardingData.perfectSunday !== 'pending_daily_update' && 
        onboardingData.perfectSunday.trim() !== '';

      if (hasValidMood && hasValidMemes && hasValidSunday) {
        // Pre-populate with existing data
        setMood(onboardingData.mood);
        setSelectedMemes(onboardingData.selectedMemes);
        setPromptAnswer(onboardingData.perfectSunday);
        setShowExistingData(true);
      }
      
      setDataLoaded(true);
    }
  }, [loading, onboardingData, shouldShowOnboarding, dataLoaded]);

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
      });

      onComplete(profileData);
    } catch (error) {
      logError("OnboardingScreen:handleComplete", error);
    }
  };

  const handleProceedWithExisting = async () => {
    if (onboardingData) {
      try {
        await saveOnboardingData({
          mood: onboardingData.mood,
          selectedMemes: onboardingData.selectedMemes,
          selectedMemesDisplay: onboardingData.selectedMemesDisplay,
          perfectSunday: onboardingData.perfectSunday,
        });
      } catch (e) {
        logError("OnboardingScreen:handleProceedWithExisting", e);
      }
      const profileData = {
        mood: onboardingData.mood,
        memes: onboardingData.selectedMemes,
        promptAnswer: onboardingData.perfectSunday,
        createdAt: new Date(),
      };
      onComplete(profileData);
    }
  };

  if (loading || vibesLoading) {
    return (
      <div className="px-4 flex flex-col justify-center items-center min-h-[400px]">
        <LoadingState
          variant="spinner"
          label={vibesLoading ? 'Preparing your personalized vibes...' : 'Loading your preferences...'}
        />
      </div>
    );
  }

  // Show existing data confirmation screen
  if (showExistingData && step === 1) {
    const currentMoodData = MOODS.find(m => m.id === mood);
    const currentMemesData = memes.filter(m => selectedMemes.includes(m.id));

    return (
      <div className="px-4 flex flex-col justify-center">
        <div className="space-y-4 animate-fade-in">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold text-gray-800">Welcome back!</h2>
            <p className="text-sm text-gray-600">Here are your current preferences from yesterday:</p>
          </div>

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Current Mood</h3>
              {currentMoodData && (
                <Card className={`p-2 ${currentMoodData.color}`}>
                  <div className="text-center space-y-1">
                    <currentMoodData.icon className="w-5 h-5 mx-auto" />
                    <p className="text-xs font-medium">{currentMoodData.label}</p>
                  </div>
                </Card>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Your Vibes</h3>
              <div className="space-y-1">
                {currentMemesData.map((meme) => (
                  <Card key={meme.id} className="p-2 bg-accent border-primary/20">
                    <div className="flex items-center space-x-2">
                      <div className="text-base">{meme.emoji}</div>
                      <div>
                        <h4 className="text-xs font-medium">{meme.title}</h4>
                        <p className="text-xs text-gray-600">{meme.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Perfect Sunday</h3>
              <Card className="p-3 bg-gray-50">
                <p className="text-sm text-gray-700">{promptAnswer}</p>
              </Card>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleProceedWithExisting}
              className="flex-1 py-2 rounded-xl"
            >
              Continue with these
            </Button>
            <Button 
              onClick={() => {
                setShowExistingData(false);
                // Reset vibes selection to allow fresh picks
                setSelectedMemes([]);
              }}
              variant="outline"
              className="flex-1 py-2 rounded-xl"
            >
              Update preferences
            </Button>
          </div>
        </div>
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
          <PerfectSundayStep
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
