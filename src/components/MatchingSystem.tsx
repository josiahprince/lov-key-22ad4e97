
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, Heart } from 'lucide-react';

const MatchingSystem = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Daily Matching System
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Our intelligent matching system automatically creates 3 new matches for you every day at 5 AM, 
          based on your mood, location, and shared interests.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="text-center">
            <Clock className="h-12 w-12 text-rose-500 mx-auto mb-2" />
            <CardTitle className="text-xl">Daily at 5 AM</CardTitle>
            <CardDescription>
              Matches are automatically generated every morning
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Start your day with fresh connections tailored just for you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Users className="h-12 w-12 text-orange-500 mx-auto mb-2" />
            <CardTitle className="text-xl">3 Matches Daily</CardTitle>
            <CardDescription>
              Quality over quantity approach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Carefully selected matches based on compatibility
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Heart className="h-12 w-12 text-pink-500 mx-auto mb-2" />
            <CardTitle className="text-xl">Smart Algorithm</CardTitle>
            <CardDescription>
              Location, mood & interests based
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Matches are scored on compatibility factors
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-rose-50 to-orange-50">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-gray-900">
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2 text-rose-600">
                Matching Criteria
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• <strong>Location Priority:</strong> Same city (30 pts), region (20 pts), country (10 pts)</li>
                <li>• <strong>Mood Compatibility:</strong> Exact match (25 pts), compatible moods (15 pts)</li>
                <li>• <strong>Shared Interests:</strong> Each common meme/vibe adds 5 points</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2 text-orange-600">
                Daily Process
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• System runs automatically at 5:00 AM daily</li>
                <li>• Processes all users with complete profiles</li>
                <li>• Generates up to 3 high-quality matches per user</li>
                <li>• Avoids duplicate matches from previous days</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchingSystem;
