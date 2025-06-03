
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Heart, Smile, Meh, Frown } from 'lucide-react';

const OnboardingScreen = ({ onComplete }: { onComplete: (profile: any) => void }) => {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState('');
  const [selectedMeme, setSelectedMeme] = useState('');
  const [promptAnswer, setPromptAnswer] = useState('');

  const moods = [
    { id: 'happy', label: 'Happy', icon: Smile, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { id: 'chill', label: 'Chill', icon: Heart, color: 'bg-green-100 text-green-700 border-green-200' },
    { id: 'anxious', label: 'Anxious', icon: Meh, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'deep', label: 'Deep', icon: Frown, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ];

  const memes = [
    { id: 'meme1', title: 'Coffee Lover', description: 'When you need coffee to function', emoji: '☕' },
    { id: 'meme2', title: 'Book Worm', description: 'One more chapter...', emoji: '📚' },
    { id: 'meme3', title: 'Plant Parent', description: 'Talking to my plants daily', emoji: '🌱' },
    { id: 'meme4', title: 'Night Owl', description: '3 AM thoughts hit different', emoji: '🦉' },
    { id: 'meme5', title: 'Foodie', description: 'Photos of food > photos of myself', emoji: '🍜' },
  ];

  const handleComplete = () => {
    const profile = {
      mood,
      meme: selectedMeme,
      promptAnswer,
      createdAt: new Date(),
    };
    onComplete(profile);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-gray-800">Welcome to Heartconnect</h1>
              <p className="text-gray-600">Let's start by understanding how you're feeling today</p>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-gray-700">What's your current mood?</h2>
              <div className="grid grid-cols-2 gap-3">
                {moods.map((m) => {
                  const IconComponent = m.icon;
                  return (
                    <Card
                      key={m.id}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                        mood === m.id ? m.color : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => setMood(m.id)}
                    >
                      <div className="text-center space-y-2">
                        <IconComponent className="w-8 h-8 mx-auto" />
                        <p className="font-medium">{m.label}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
            
            <Button 
              onClick={() => setStep(2)} 
              disabled={!mood}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl transition-all duration-200"
            >
              Next
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-gray-800">Pick your vibe</h2>
              <p className="text-gray-600">Choose the meme that represents you today</p>
            </div>
            
            <div className="space-y-3">
              {memes.map((meme) => (
                <Card
                  key={meme.id}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:scale-105 border-2 ${
                    selectedMeme === meme.id 
                      ? 'bg-rose-50 border-rose-200 text-rose-700' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedMeme(meme.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{meme.emoji}</div>
                    <div>
                      <h3 className="font-medium">{meme.title}</h3>
                      <p className="text-sm text-gray-600">{meme.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <Button 
                onClick={() => setStep(1)} 
                variant="outline"
                className="flex-1 py-3 rounded-xl"
              >
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedMeme}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl"
              >
                Next
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-gray-800">Tell us about yourself</h2>
              <p className="text-gray-600">This helps us find your perfect matches</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">Describe your perfect Sunday</h3>
              <Textarea
                placeholder="Maybe sleeping in, reading a book, trying a new recipe, or exploring a local market..."
                value={promptAnswer}
                onChange={(e) => setPromptAnswer(e.target.value)}
                className="min-h-[120px] rounded-xl border-gray-200 focus:border-rose-300 focus:ring-rose-200"
              />
              <p className="text-sm text-gray-500">
                Be yourself! There's no wrong answer here.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                onClick={() => setStep(2)} 
                variant="outline"
                className="flex-1 py-3 rounded-xl"
              >
                Back
              </Button>
              <Button 
                onClick={handleComplete} 
                disabled={!promptAnswer.trim()}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl"
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
    <div className="p-6 min-h-screen flex flex-col justify-center">
      <div className="mb-6">
        <div className="flex space-x-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
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
