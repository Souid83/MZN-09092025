import React from 'react';
import { X } from 'lucide-react';
import type { SlipStatus } from '../types';

interface StatusConfirmationModalProps {
  currentStatus: string;
  newStatus: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const StatusConfirmationModal: React.FC<StatusConfirmationModalProps> = ({
  currentStatus,
  newStatus,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Confirmation</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Souhaitez-vous changer le statut <span className="font-medium">{currentStatus}</span> vers{' '}
          <span className="font-medium">{newStatus}</span> ?
          <br /><br />
          Êtes-vous sûr de vouloir effectuer ce changement ?
        </p>

        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            ❌ Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            ✅ Oui, changer
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusConfirmationModal;