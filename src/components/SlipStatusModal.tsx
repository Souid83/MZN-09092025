import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { SlipStatus } from '../types';
import StatusConfirmationModal from './StatusConfirmationModal';

interface SlipStatusModalProps {
  currentStatus: SlipStatus;
  onClose: () => void;
  onSelect: (status: SlipStatus) => void;
}

const SlipStatusModal: React.FC<SlipStatusModalProps> = ({
  currentStatus,
  onClose,
  onSelect
}) => {
  const [confirmStatus, setConfirmStatus] = useState<SlipStatus | null>(null);

  const statuses: { value: SlipStatus; label: string; color: string }[] = [
    { value: 'waiting', label: 'En attente', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
    { value: 'loaded', label: 'Chargé', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
    { value: 'delivered', label: 'Livré', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
    { value: 'dispute', label: 'Litige', color: 'bg-red-100 text-red-800 hover:bg-red-200' }
  ];

  const getStatusLabel = (status: SlipStatus): string => {
    return statuses.find(s => s.value === status)?.label || status;
  };

  const handleStatusClick = (status: SlipStatus) => {
    if (status === currentStatus) {
      onClose();
      return;
    }
    setConfirmStatus(status);
  };

  const handleConfirm = () => {
    if (confirmStatus) {
      onSelect(confirmStatus);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Modifier le statut</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {statuses.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => handleStatusClick(value)}
                className={`py-3 px-4 rounded-lg font-medium transition-colors ${color} ${
                  value === currentStatus ? 'ring-2 ring-gray-400' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {confirmStatus && (
        <StatusConfirmationModal
          currentStatus={getStatusLabel(currentStatus)}
          newStatus={getStatusLabel(confirmStatus)}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmStatus(null)}
        />
      )}
    </>
  );
};

export default SlipStatusModal;