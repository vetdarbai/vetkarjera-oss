'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProgressBar from './components/ProgressBar';
import Step1OrgType from './components/Step1OrgType';
import Step2MainForm from './components/Step2MainForm';
import { EmployerRegistration, OrgType, initialFormData } from '@/types/registration';
import './registracija.css';

export default function DarbdavysRegistracija() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<EmployerRegistration>(initialFormData);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleOrgTypeSelect = (type: OrgType) => {
    setFormData({ ...formData, orgType: type });
  };

  const handleNext = () => {
    if (currentStep === 1 && formData.orgType) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...(formData as any)[parent],
          [child]: value
        }
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSubmit = () => {
    // Validacija
    if (formData.password !== formData.confirmPassword) {
      alert('Slaptažodžiai nesutampa!');
      return;
    }

    if (!formData.agreedToTerms) {
      alert('Prašome sutikti su naudojimosi taisyklėmis');
      return;
    }

    // Kol kas tik demonstracinis sėkmės ekranas (be duomenų saugojimo)
    setShowSuccess(true);
  };

  const handleGoHome = () => {
    router.push('/');
  };

  if (showSuccess) {
    return (
      <>
        <Navigation />
        <div className="success-container">
          <div className="success-content">
            <div className="success-icon">✅</div>
            <h1 className="success-title">Registracijos forma užpildyta!</h1>
            <p className="success-description">
              Tai demonstracinė VetKarjera registracijos versija. Duomenys šiuo metu nėra išsaugomi.
            </p>
            <button className="btn btn-primary btn-large" onClick={handleGoHome}>
              Eiti į pagrindinį puslapį
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      
      <div className="registration-container">
        <div className="registration-content">
          <ProgressBar currentStep={currentStep} totalSteps={2} />

          {currentStep === 1 && (
            <Step1OrgType
              selectedType={formData.orgType as OrgType}
              onSelect={handleOrgTypeSelect}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && (
            <Step2MainForm
              formData={formData}
              onChange={handleChange}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}