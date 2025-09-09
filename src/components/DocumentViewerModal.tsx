import React, { useState, useEffect } from 'react';
import { X, Trash2, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Document {
  url: string;
  filename: string;
  uploaded_at: string;
}

interface Documents {
  [key: string]: Document;
}

interface DocumentViewerModalProps {
  slipId: string;
  slipType: 'transport' | 'freight';
  onClose: () => void;
  onDocumentDeleted: () => void;
}

const DOCUMENT_TYPE_LABELS: { [key: string]: string } = {
  cmr: 'CMR',
  client_order: 'Commande client',
  payment_attestation: 'Attestation de paiement'
};

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  slipId,
  slipType,
  onClose,
  onDocumentDeleted
}) => {
  const [documents, setDocuments] = useState<Documents>({});
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [slipId, slipType]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from(slipType === 'transport' ? 'transport_slips' : 'freight_slips')
        .select('documents')
        .eq('id', slipId)
        .single();

      if (error) throw error;
      setDocuments(data.documents || {});
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentType: string) => {
    try {
      // Get the document info
      const doc = documents[documentType];
      if (!doc) return;

      // Delete from storage using the original filename
      const filePath = `${slipType}/${slipId}/${doc.filename}`;
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Remove from slip record
      const updatedDocs = { ...documents };
      delete updatedDocs[documentType];

      const { error: updateError } = await supabase
        .from(slipType === 'transport' ? 'transport_slips' : 'freight_slips')
        .update({ documents: updatedDocs })
        .eq('id', slipId);

      if (updateError) throw updateError;

      setDocuments(updatedDocs);
      onDocumentDeleted();
      toast.success('Document supprimé avec succès');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression du document');
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const handleDownload = async (documentType: string) => {
    try {
      const doc = documents[documentType];
      if (!doc) return;

      // Get a signed URL for the file
      const filePath = `${slipType}/${slipId}/${doc.filename}`;
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60); // URL valid for 60 seconds

      if (error) throw error;

      // Open the signed URL in a new tab
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement du document');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Documents joints</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : Object.keys(documents).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucun document joint à ce bordereau
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(documents).map(([type, doc]) => (
              <div
                key={type}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-blue-600" size={24} />
                  <div>
                    <h3 className="font-medium">{DOCUMENT_TYPE_LABELS[type] || type}</h3>
                    <p className="text-sm text-gray-500">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-gray-400">
                      Ajouté le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(type)}
                    className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                    title="Télécharger"
                  >
                    <Download size={20} />
                  </button>
                  {deleteConfirmation === type ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeleteConfirmation(null)}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => handleDelete(type)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Confirmer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmation(type)}
                      className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                      title="Supprimer"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewerModal;