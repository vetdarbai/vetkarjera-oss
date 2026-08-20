import { OrgType } from '@/types/registration';
import { orgTypeOptions } from '@/data/orgTypes';

interface Step1Props {
  selectedType: OrgType | '';
  onSelect: (type: OrgType) => void;
  onNext: () => void;
}

export default function Step1OrgType({ selectedType, onSelect, onNext }: Step1Props) {
  return (
    <div className="step-container">
      <div className="step-header">
        <h1 className="step-title">Kokia jūsų organizacija?</h1>
        <p className="step-description">
          Pasirinkite organizacijos tipą, kad galėtume pritaikyti registracijos formą
        </p>
      </div>

      <div className="org-type-grid">
        {orgTypeOptions.map((option) => (
          <button
            key={option.id}
            className={`org-type-card ${selectedType === option.id ? 'selected' : ''}`}
            onClick={() => onSelect(option.id)}
          >
            <span className="org-type-icon">{option.icon}</span>
            <h3 className="org-type-label">{option.label}</h3>
            <p className="org-type-description">{option.description}</p>
          </button>
        ))}
      </div>

      <div className="step-actions">
        <button 
          className="btn btn-primary btn-large"
          onClick={onNext}
          disabled={!selectedType}
        >
          Tęsti →
        </button>
      </div>
    </div>
  );
}