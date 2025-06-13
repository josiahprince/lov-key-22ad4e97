
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NavigationButtonsProps {
  step: number;
  totalSteps: number;
  canProceed: boolean;
  loading: boolean;
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
}

const NavigationButtons = ({
  step,
  totalSteps,
  canProceed,
  loading,
  onBack,
  onNext,
  onComplete,
}: NavigationButtonsProps) => {
  return (
    <div className="flex space-x-3 mt-8">
      {step > 1 && (
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1 h-12 rounded-2xl border-gray-200 hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      )}
      
      <Button
        onClick={step === totalSteps ? onComplete : onNext}
        disabled={!canProceed || loading}
        className="flex-1 h-12 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Saving...</span>
          </div>
        ) : (
          <>
            {step === totalSteps ? 'Complete Profile' : 'Next'}
            {step < totalSteps && <ChevronRight className="w-4 h-4 ml-2" />}
          </>
        )}
      </Button>
    </div>
  );
};

export default NavigationButtons;
