
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

  const moods = [
    { id: 'happy', label: 'Happy', icon: Smile, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { id: 'angry', label: 'Angry', icon: Flame, color: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'anxious', label: 'Anxious', icon: Meh, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'sad', label: 'Sad', icon: Frown, color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'optimistic', label: 'Optimistic', icon: Heart, color: 'bg-pink-100 text-pink-700 border-pink-200' },
    { id: 'sleepy', label: 'Sleepy', icon: Coffee, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  ];

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

      // Save to database - this persists the data until tomorrow
      await saveOnboardingData({
        mood,
        selectedMemes,
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        <p className="mt-4 text-gray-600">
          {vibesLoading ? 'Preparing your personalized vibes...' : 'Loading your preferences...'}
        </p>
      </div>
    );
  }

  // Show existing data confirmation screen
  if (showExistingData && step === 1) {
    const currentMoodData = moods.find(m => m.id === mood);
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
                  <Card key={meme.id} className="p-2 bg-rose-50 border-rose-200">
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
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl"
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
        return (
          <div className="space-y-3 animate-fade-in">
            <div className="space-y-2">
              <h2 className="text-base font-medium text-gray-700">What's your current mood?</h2>
              <div className="grid grid-cols-3 gap-2">
                {moods.map((m) => {
                  const IconComponent = m.icon;
                  return (
                    <Card
                      key={m.id}
                      className={`p-2 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                        mood === m.id ? m.color : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setMood(m.id)}
                    >
                      <div className="text-center space-y-1">
                        <IconComponent className="w-5 h-5 mx-auto" />
                        <p className="text-xs font-medium">{m.label}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
            
            <Button 
              onClick={() => setStep(2)} 
              disabled={!mood}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl transition-all duration-200"
            >
              Next
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-3 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-gray-800">Pick your vibes</h2>
              <p className="text-xs text-gray-600">Choose up to 3 that represent you today</p>
              <p className="text-xs text-rose-600">{selectedMemes.length}/3 selected</p>
            </div>
            
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {memes.map((meme) => (
                <Card
                  key={meme.id}
                  className={`p-2 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                    selectedMemes.includes(meme.id)
                      ? 'bg-rose-50 border-rose-200 text-rose-700' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => handleMemeToggle(meme.id)}
                >
                  <div className="flex items-center space-x-2">
                    <div className="text-base">{meme.emoji}</div>
                    <div>
                      <h3 className="text-xs font-medium">{meme.title}</h3>
                      <p className="text-xs text-gray-600">{meme.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={() => setStep(1)} 
                variant="outline"
                className="flex-1 py-2 rounded-xl"
              >
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={selectedMemes.length === 0}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-800 text-center bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
                Describe your perfect Sunday
              </h3>
              <Textarea
                placeholder="Maybe sleeping in, reading a book, trying a new recipe, or exploring a local market..."
                value={promptAnswer}
                onChange={(e) => setPromptAnswer(e.target.value)}
                className="min-h-[80px] rounded-xl border-gray-200 focus:border-rose-300 focus:ring-rose-200 text-sm"
              />
              <p className="text-xs text-gray-500 text-center">
                Be yourself! There's no wrong answer here.
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={() => setStep(2)} 
                variant="outline"
                className="flex-1 py-2 rounded-xl"
              >
                Back
              </Button>
              <Button 
                onClick={handleComplete} 
                disabled={!promptAnswer.trim()}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-xl"
              >
                Complete
              </Button>
            </div>
          </div>
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
                i <= step ? 'bg-rose-400' : 'bg-gray-200'
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
