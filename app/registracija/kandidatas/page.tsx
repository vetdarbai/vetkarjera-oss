import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CandidateQuestionnaire from '@/components/CandidateQuestionnaire';

export default function CandidateRegistrationPage() {
  return (
    <>
      <Navigation />
      <main className="candidate-questionnaire-page">
        <CandidateQuestionnaire />
      </main>
      <Footer />
    </>
  );
}
