import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 fade-in" 
        aria-modal="true" 
        role="dialog"
        onClick={onCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        style={{ animation: 'zoomIn 0.2s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <div className="mt-2 text-sm text-gray-600">
          {message}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
