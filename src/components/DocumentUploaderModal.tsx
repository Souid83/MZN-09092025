import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface DocumentUploaderModalProps {
  slipId: string;
  slipType: 'transport' | 'freight';
  onClose: () => void;
  onUploadComplete: () => void;
}

type DocumentType = 'cmr' | 'client_order' | 'payment_attestation';

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'cmr', label: 'CMR' },
  { value: 'client_order', label: 'Commande client' },
  { value: 'payment_attestation', label: 'Attestation de paiement' }
];

const DocumentUploaderModal: React.FC<DocumentUploaderModalProps> = ({
  slipId,
  slipType,
  onClose,
  onUploadComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('cmr');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);

    try {
      // Keep original filename
      const originalFilename = file.name;
      const filePath = `${slipType}/${slipId}/${originalFilename}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Get current documents
      const { data: currentData, error: fetchError } = await supabase
        .from(slipType === 'transport' ? 'transport_slips' : 'freight_slips')
        .select('documents')
        .eq('id', slipId)
        .single();

      if (fetchError) throw fetchError;

      // Merge with existing documents
      const currentDocs = currentData?.documents || {};
      const updatedDocs = {
        ...currentDocs,
        [documentType]: {
          url: publicUrl,
          filename: originalFilename,
          uploaded_at: new Date().toISOString()
        }
      };

      // Update slip record with document URL and filename
      const { error: updateError } = await supabase
        .from(slipType === 'transport' ? 'transport_slips' : 'freight_slips')
        .update({ documents: updatedDocs })
        .eq('id', slipId);

      if (updateError) throw updateError;

      toast.success('Document importé avec succès');
      onUploadComplete();
      onClose();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'import du document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Importer un document</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de document
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {DOCUMENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fichier
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload
                  className="mx-auto h-12 w-12 text-gray-400"
                  aria-hidden="true"
                />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Sélectionner un fichier</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                  <p className="pl-1">ou glisser-déposer</p>
                </div>
                <p className="text-xs text-gray-500">
                  PDF, PNG, JPG jusqu'à 10MB
                </p>
              </div>
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Fichier sélectionné : {file.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Upload size={20} />
            {uploading ? 'Import en cours...' : 'Importer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploaderModal;