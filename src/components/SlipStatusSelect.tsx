import React, { useState, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { updateSlipStatus } from '../services/slips';
import { checkInvoiceExists } from '../services/invoices';
import type { SlipStatus } from '../types';
import SlipStatusModal from './SlipStatusModal';

interface SlipStatusSelectProps {
  id: string;
  status: SlipStatus;
  type: 'transport' | 'freight';
  onUpdate: () => void;
  invoiceRefreshTrigger?: number; // New prop to trigger refresh
}

const SlipStatusSelect: React.FC<SlipStatusSelectProps> = ({
  id,
  status,
  type,
  onUpdate,
  invoiceRefreshTrigger
}) => {
  const [showModal, setShowModal] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);

  useEffect(() => {
    const checkInvoice = async () => {
      if (status === 'delivered') {
        try {
          const exists = await checkInvoiceExists(id, type);
          setHasInvoice(exists);
        } catch (error) {
          console.error('Error checking invoice:', error);
        }
      }
    };

    checkInvoice();
  }, [id, status, type, invoiceRefreshTrigger]);

  const handleStatusChange = async (newStatus: SlipStatus) => {
    try {
      await updateSlipStatus(id, newStatus, type);
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusStyle = () => {
    switch (status) {
      case 'waiting':
        return 'bg-blue-100 text-blue-800';
      case 'loaded':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'dispute':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'waiting':
        return 'En attente';
      case 'loaded':
        return 'Chargé';
      case 'delivered':
        return 'Livré';
      case 'dispute':
        return 'Litige';
      default:
        return status;
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <div className={`px-3 py-1 rounded-full text-sm font-medium w-24 text-center ${getStatusStyle()}`}>
          {getStatusLabel()}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="text-gray-500 hover:text-blue-600 transition-colors"
          title="Modifier le statut"
        >
          <Pencil size={16} />
        </button>
      </div>
      
      {status === 'delivered' && hasInvoice && (
        <div className="px-3 py-1 rounded-full text-sm font-medium w-24 text-center bg-black text-white">
          Facturé
        </div>
      )}
      
      {showModal && (
        <SlipStatusModal
          currentStatus={status}
          onClose={() => setShowModal(false)}
          onSelect={handleStatusChange}
        />
      )}
    </div>
  );
};

export default SlipStatusSelect;