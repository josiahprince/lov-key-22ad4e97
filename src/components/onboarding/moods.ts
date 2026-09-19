import { Heart, Smile, Meh, Frown, Coffee, Flame } from 'lucide-react';

// Fixed set, in display order. Colors are per-mood rather than themed because
// the grid reads as a palette - each mood needs to be distinguishable at a
// glance, not consistent with the surrounding UI.
export const MOODS = [
  { id: 'happy', label: 'Happy', icon: Smile, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'angry', label: 'Angry', icon: Flame, color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'anxious', label: 'Anxious', icon: Meh, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'sad', label: 'Sad', icon: Frown, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'optimistic', label: 'Optimistic', icon: Heart, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'sleepy', label: 'Sleepy', icon: Coffee, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
];
