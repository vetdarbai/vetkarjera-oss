import AuthFrame from '@/components/AuthFrame';
import AuthEmailForm from '@/components/AuthEmailForm';
export default function VerificationPage() {
  return <AuthFrame><h1>Patvirtinkite el. paštą</h1><p>Patikrinkite savo el. paštą ir paspauskite gautą patvirtinimo nuorodą. Paskyra bus aktyvi tik patvirtinus el. paštą.</p><AuthEmailForm kind="verification" /></AuthFrame>;
}
