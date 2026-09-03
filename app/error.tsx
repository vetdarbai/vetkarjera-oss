'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="success-page">
      <div className="success-card">
        <h1>Kažkas nepavyko</h1>
        <p>Įvyko netikėta klaida. Pabandykite dar kartą.</p>
        <button className="btn btn-primary" onClick={reset}>Bandyti dar kartą</button>
      </div>
    </main>
  );
}
