'use client';

import Link from 'next/link';
import { useEffect } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'candidate' | 'employer';
}

export default function AuthModal({ isOpen, onClose, type }: AuthModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const candidate = type === 'candidate';

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button className="modal-close" onClick={onClose} aria-label="Uždaryti">×</button>
        <div className="modal-icon">{candidate ? '🩺' : '🏥'}</div>
        <h2 id="auth-modal-title">{candidate ? 'Ieškau darbo' : 'Ieškau specialistų'}</h2>
        <p>
          {candidate
            ? 'Prisijunkite arba susikurkite specialisto profilį, kad galėtumėte kandidatuoti ir ateityje gauti jums tinkančius pasiūlymus.'
            : 'Prisijunkite arba užregistruokite organizaciją, kad galėtumėte skelbti darbo pasiūlymus ir valdyti atranką.'}
        </p>
        <div className="modal-actions">
          <Link href="/prisijungti" className="btn btn-primary">🔐 Prisijungti</Link>
          <Link href={candidate ? '/registracija/kandidatas' : '/registracija/darbdavys'} className="btn btn-secondary">
            ✨ {candidate ? 'Registruotis kaip specialistui' : 'Registruotis kaip darbdaviui'}
          </Link>
        </div>
        <span className="modal-note">Registracija trunka kelias minutes. Tikras duomenų išsaugojimas bus prijungtas backend etape.</span>
      </div>
    </div>
  );
}
