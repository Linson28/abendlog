import React, { useEffect } from 'react';
import { XIcon } from './icons';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose, duration]);

  return (
    <div 
        className="fixed top-5 right-5 bg-gray-800 text-white py-3 px-5 rounded-lg shadow-lg flex items-center space-x-4 z-50"
        style={{ animation: 'slideInFromRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
    >
      <span>{message}</span>
      <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors">
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Toast;
