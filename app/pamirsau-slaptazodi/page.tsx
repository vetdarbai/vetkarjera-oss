import AuthFrame from '@/components/AuthFrame';
import AuthEmailForm from '@/components/AuthEmailForm';
export default function ForgotPasswordPage() {
  return <AuthFrame><h1>Pamiršau slaptažodį</h1><p>Įveskite el. paštą. Jei paskyrai galima atkurti slaptažodį, gausite atkūrimo nuorodą.</p><AuthEmailForm kind="recovery" /></AuthFrame>;
}
