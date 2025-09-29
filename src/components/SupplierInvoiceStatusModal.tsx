import React, { useState } from 'react';
import { X } from 'lucide-react';

interface SupplierInvoiceStatusModalProps {
  onClose: () => void;
  onConfirm: (received: boolean, paid: boolean) => void;
  initialReceived?: boolean;
  initialPaid?: boolean;
}

const SupplierInvoiceStatusModal: React.FC<SupplierInvoiceStatusModalProps> = ({
  onClose,
  onConfirm,
  initialReceived = false,
  initialPaid = false
}) => {
  const [received, setReceived] = useState(initialReceived);
  const [paid, setPaid] = useState(initialPaid);

  const handleValidate = () => {
    onConfirm(received, paid);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Modifier le statut de la Facturation Sous Traitant</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Reçu section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Reçu
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setReceived(true);
                  // Keep paid status if already set
                }}
                className={`px-4 py-2 rounded-lg border-2 font-medium ${
                  received
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                Reçu
              </button>
              <button
                type="button"
                onClick={() => {
                  setReceived(false);
                  setPaid(false); // Reset paid status when not received
                }}
                className={`px-4 py-2 rounded-lg border-2 font-medium ${
                  !received
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                Non Reçu
              </button>
            </div>
          </div>

          {/* Payé section - only enabled if received */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payé
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPaid(true)}
                disabled={!received}
                className={`px-4 py-2 rounded-lg border-2 font-medium ${
                  !received
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : paid
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                Payé
              </button>
              <button
                type="button"
                onClick={() => setPaid(false)}
                disabled={!received}
                className={`px-4 py-2 rounded-lg border-2 font-medium ${
                  !received
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : !paid
                   ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                    : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                Non Payé
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleValidate}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierInvoiceStatusModal;