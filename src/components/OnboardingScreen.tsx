
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Smile, Meh, Frown, Zap, Coffee } from 'lucide-react';
import { useOnboardingData } from '@/hooks/useOnboardingData';

const OnboardingScreen = ({ onComplete }: { onComplete: (profile: any) => void }) => {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState('');
  const [selectedMemes, setSelectedMemes] = useState<string[]>([]);
  const [promptAnswer, setPromptAnswer] = useState('');
  const [showExistingData, setShowExistingData] = useState(false);

  const { onboardingData, loading, saveOnboardingData } = useOnboardingData();

  const moods = [
    { id: 'happy', label: 'Happy', icon: Smile, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { id: 'chill', label: 'Chill', icon: Heart, color: 'bg-green-100 text-green-700 border-green-200' },
    { id: 'anxious', label: 'Anxious', icon: Meh, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'deep', label: 'Deep', icon: Frown, color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'energetic', label: 'Energetic', icon: Zap, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    { id: 'sleepy', label: 'Sleepy', icon: Coffee, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  ];

  const memes = [
    { id: 'meme1', title: 'Coffee Lover', description: 'When you need coffee to function', emoji: '☕' },
    { id: 'meme2', title: 'Book Worm', description: 'One more chapter...', emoji: '📚' },
    { id: 'meme3', title: 'Plant Parent', description: 'Talking to my plants daily', emoji: '🌱' },
    { id: 'meme4', title: 'Night Owl', description: '3 AM thoughts hit different', emoji: '🦉' },
    { id: 'meme5', title: 'Foodie', description: 'Photos of food > photos of myself', emoji: '🍜' },
    { id: 'meme6', title: 'Cricket Fanatic', description: 'Checking scores every 5 minutes', emoji: '🏏' },
    { id: 'meme7', title: 'Monsoon Mood', description: 'Chai and rain = perfect combo', emoji: '🌧️' },
    { id: 'meme8', title: 'Metro Survivor', description: 'Peak hour travel is an adventure', emoji: '🚇' },
    { id: 'meme9', title: 'Street Food Explorer', description: 'Gol gappa over fine dining', emoji: '🥟' },
    { id: 'meme10', title: 'Bollywood Buff', description: 'Can quote any SRK dialogue', emoji: '🎬' },
    { id: 'meme11', title: 'Traffic Philosopher', description: 'Deep thoughts during Silk Board jams', emoji: '🚗' },
    { id: 'meme12', title: 'Festival Enthusiast', description: 'Already planning next celebration', emoji: '🎉' },
    { id: 'meme13', title: 'IPL Loyalist', description: 'Team loyalty > everything else', emoji: '🏆' },
    { id: 'meme14', title: 'Startup Dreamer', description: 'Next unicorn idea loading...', emoji: '🦄' },
    { id: 'meme15', title: 'Meme Connoisseur', description: 'Instagram reels are my news source', emoji: '📱' },
  ];

  // Load existing data when component mounts
  useEffect(() => {
    if (!loading && onboardingData) {
      setMood(onboardingData.mood);
      setSelectedMemes(onboardingData.selectedMemes);
      setPromptAnswer(onboardingData.perfectSunday);
      setShowExistingData(true);
    }
  }, [loading, onboardingData]);

  const handleMemeToggle = (memeId: string) => {
    setSelectedMemes(prev => {
      if (prev.includes(memeId)) {
        return prev.filter(id => id !== memeId);
      } else if (prev.length < 3) {
        return [...prev, memeId];
      }
      return prev;
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

      // Save to database
      await saveOnboardingData({
        mood,
        selectedMemes,
        perfectSunday: promptAnswer,
      });

      onComplete(profileData);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const handleProceedWithExisting = () => {
    if (onboardingData) {
      const profileData = {
        mood: onboardingData.mood,
        memes: onboardingData.selectedMemes,
        promptAnswer: onboardingData.perfectSunday,
        createdAt: new Date(),
      };
      onComplete(profileData);
    }
  };

  if (loading) {
    return (
      <div className="px-4 flex flex-col justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        <p className="mt-4 text-gray-600">Loading your preferences...</p>
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
            <p className="text-sm text-gray-600">Here are your current preferences:</p>
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
              onClick={() => setShowExistingData(false)}
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
