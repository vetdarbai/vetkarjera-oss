interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progress = Math.round((currentStep / totalSteps) * 100);
  return (
    <div className="progress-card" aria-label={`Žingsnis ${currentStep} iš ${totalSteps}`}>
      <div className="progress-copy">
        <span>Žingsnis {currentStep} iš {totalSteps}</span>
        <strong>{progress}%</strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
