'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'candidate' | 'employer';
}

export default function AuthModal({ isOpen, onClose, type }: AuthModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
      <div className={`modal-content ${isVisible ? 'visible' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>✕</button>
        
        <div className="modal-header">
          <div className="modal-icon">
            {type === 'candidate' ? '👨‍⚕️' : '🏥'}
          </div>
          <h2 className="modal-title">
            {type === 'candidate' ? 'Ieškau darbo' : 'Ieškau darbuotojų'}
          </h2>
          <p className="modal-description">
            Prisijunkite arba susikurkite paskyrą, kad galėtumėte{' '}
            {type === 'candidate' 
              ? 'ieškoti darbo ir išsaugoti skelbimus' 
              : 'skelbti darbo pasiūlymus ir valdyti aplikacijas'}
          </p>
        </div>

        <div className="modal-actions">
          <Link href="/prisijungti" className="modal-btn modal-btn-primary">
            <span>🔐</span>
            <span>Prisijungti</span>
          </Link>
          
          <Link 
            href={type === 'candidate' ? '/registracija/kandidatas' : '/registracija/darbdavys'} 
            className="modal-btn modal-btn-secondary"
          >
            <span>✨</span>
            <span>
              {type === 'candidate' ? 'Registruotis kaip kandidatui' : 'Registruotis kaip darbdaviui'}
            </span>
          </Link>
        </div>

        <p className="modal-footer">
          Registracija trunka tik kelias minutes
        </p>
      </div>
    </div>
  );
}
