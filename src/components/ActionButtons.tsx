import React, { useState, useEffect } from 'react';
import { Pencil, Send, FileText, Upload, Folder, Trash2, Download, Receipt } from 'lucide-react';
import { checkInvoiceExists } from '../services/invoices';
import type { TransportSlip, FreightSlip } from '../types';
import { useUser } from '../contexts/UserContext';

interface ActionButtonsProps {
  slip: TransportSlip | FreightSlip;
  onEdit: () => void;
  onEmail: () => void;
  onUpload: () => void;
  onView: () => void;
  onDownload: () => void;
  onDownloadBPA?: () => void;
  onDownloadBonDeCommande?: () => void;
  onDelete?: () => void;
  onGenerateInvoice?: () => void;
  documentCount?: number;
  showBPA?: boolean;
  slipType: 'transport' | 'freight';
  onInvoiceGenerated?: () => void; // New prop to trigger refresh
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  slip,
  onEdit,
  onEmail,
  onUpload,
  onView,
  onDownload,
  onDownloadBPA,
  onDownloadBonDeCommande,
  onDelete,
  onGenerateInvoice,
  documentCount = 0,
  showBPA = false,
  slipType,
  onInvoiceGenerated
}) => {
  const [hasInvoice, setHasInvoice] = useState(false);
  const [checkingInvoice, setCheckingInvoice] = useState(false);
  const { user } = useUser();
  const roleUpper = String(user?.role || '').toUpperCase();
  const isExploit = roleUpper === 'EXPLOIT' || roleUpper === 'EXPLOITATION';
  const canInvoice = !isExploit && slip.status === 'delivered' && Boolean(onGenerateInvoice);

  useEffect(() => {
    const checkInvoice = async () => {
      if (canInvoice) {
        setCheckingInvoice(true);
        try {
          const exists = await checkInvoiceExists(slip.id, slipType);
          setHasInvoice(exists);
        } catch (error) {
          console.error('Error checking invoice:', error);
        } finally {
          setCheckingInvoice(false);
        }
      }
    };

    checkInvoice();
  }, [slip.id, slip.status, slipType, onGenerateInvoice, canInvoice]);

  const handleGenerateInvoice = async () => {
    if (hasInvoice || !onGenerateInvoice) return;
    
    try {
      await onGenerateInvoice();
      setHasInvoice(true);
      // Trigger parent component refresh
      if (onInvoiceGenerated) {
        onInvoiceGenerated();
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  return (
    <div className="flex items-center justify-end space-x-2">
      <div className="group relative">
        <button
          onClick={onEdit}
          className="p-1.5 text-gray-600 hover:text-blue-600 rounded-full hover:bg-blue-50"
          title="Modifier"
        >
          <Pencil size={18} />
        </button>
        <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Modifier le bordereau
        </span>
      </div>

      <div className="group relative">
        <button
          onClick={onEmail}
          className="p-1.5 text-gray-600 hover:text-blue-600 rounded-full hover:bg-blue-50"
          title="Envoyer"
        >
          <Send size={18} />
        </button>
        <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Envoyer par email
        </span>
      </div>

      <div className="group relative">
        <button
          onClick={onUpload}
          className="p-1.5 text-gray-600 hover:text-blue-600 rounded-full hover:bg-blue-50"
          title="Importer"
        >
          <Upload size={18} />
        </button>
        <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Importer un document
        </span>
      </div>

      <div className="group relative">
        <button
          onClick={onView}
          className="p-1.5 text-gray-600 hover:text-blue-600 rounded-full hover:bg-blue-50 flex items-center"
          title="Consulter"
        >
          <Folder size={18} />
          {documentCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-100 text-blue-800 text-xs w-4 h-4 flex items-center justify-center rounded-full">
              {documentCount}
            </span>
          )}
        </button>
        <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          {documentCount > 0 ? `Consulter documents joints (${documentCount})` : 'Aucun document joint'}
        </span>
      </div>

      <div className="group relative">
        <button
          onClick={onDownload}
          className="p-1.5 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
          title="Télécharger"
        >
          <FileText size={18} />
        </button>
        <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          Télécharger le bordereau
        </span>
      </div>

      {showBPA && onDownloadBPA && (
        <div className="group relative">
          <button
            onClick={onDownloadBPA}
            className="p-1.5 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50"
            title="Télécharger BPA"
          >
            <Download size={18} />
          </button>
          <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Télécharger le BPA
          </span>
        </div>
      )}

      {showBPA && onDownloadBonDeCommande && (
        <div className="group relative">
          <button
            onClick={onDownloadBonDeCommande}
            className="p-1.5 text-purple-600 hover:text-purple-800 rounded-full hover:bg-purple-50"
            title="Télécharger Bon de Commande"
          >
            <Download size={18} />
          </button>
          <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Télécharger le Bon de Commande
          </span>
        </div>
      )}

      {canInvoice && (
        <div className="group relative">
          <button
            onClick={handleGenerateInvoice}
            disabled={hasInvoice || checkingInvoice}
            className={`p-1.5 rounded-full ${
              hasInvoice 
                ? 'text-green-600 hover:text-green-800 hover:bg-green-50' 
                : 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
            } ${(hasInvoice || checkingInvoice) ? 'cursor-not-allowed opacity-50' : ''}`}
            title={hasInvoice ? 'Facture déjà générée' : 'Générer la facture'}
          >
            <Receipt size={18} />
          </button>
          <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {hasInvoice ? 'Facture déjà générée' : 'Générer la facture'}
          </span>
        </div>
      )}

      {onDelete && (
        <div className="group relative">
          <button
            onClick={onDelete}
            className="p-1.5 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
            title="Supprimer"
          >
            <Trash2 size={18} />
          </button>
          <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            Supprimer le bordereau
          </span>
        </div>
      )}
    </div>
  );
};

export default ActionButtons;
