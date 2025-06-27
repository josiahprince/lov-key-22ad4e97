
import MatchingSystem from '@/components/MatchingSystem';

const MatchingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-orange-50 to-pink-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
            Matching System
          </h1>
          <p className="text-gray-600 mt-2">
            Generate and manage daily matches for your dating app
          </p>
        </div>
        
        <MatchingSystem />
      </div>
    </div>
  );
};

export default MatchingPage;
