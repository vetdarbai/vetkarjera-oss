import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function AuthFrame({ children }: { children: React.ReactNode }) {
  return <><Navigation /><main className="auth-page"><div className="auth-card">{children}</div></main><Footer /></>;
}
