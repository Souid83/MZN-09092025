import React, { useState, useRef } from 'react';
import { Plus, Search, FileDown, Upload, Pencil, X, Trash2, Phone, Mail } from 'lucide-react';
import { useFournisseurs, useCreateFournisseur, useUpdateFournisseur } from '../hooks/useFournisseurs';
import { useCountries } from '../hooks/useCountries';
import CountrySelector from '../components/CountrySelector';
import CreateCountryModal from '../components/CreateCountryModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import FournisseurDetailsModal from '../components/FournisseurDetailsModal';
import FournisseurForm from '../components/FournisseurForm';
import type { Fournisseur, CreateFournisseurPayload } from '../types';
import { deleteFournisseurs } from '../services/fournisseurs';
import { parseFournisseursExcel } from '../utils/excel-import';
import toast from 'react-hot-toast';

import { useUser } from '../contexts/UserContext';

const Fournisseurs = () => {
  const { user } = useUser();
  const [showForm, setShowForm] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFournisseurs, setSelectedFournisseurs] = useState<Set<string>>(new Set());
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState<Fournisseur | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const { data: fournisseurs, loading, error, refresh } = useFournisseurs();
  const { create, loading: creating } = useCreateFournisseur();
  const { update, loading: updating } = useUpdateFournisseur();

  const filteredFournisseurs = fournisseurs.filter(fournisseur =>
    fournisseur.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFournisseurs(new Set(filteredFournisseurs.map(f => f.id)));
    } else {
      setSelectedFournisseurs(new Set());
    }
  };

  const handleSelectFournisseur = (fournisseurId: string) => {
    const newSelected = new Set(selectedFournisseurs);
    if (selectedFournisseurs.has(fournisseurId)) {
      newSelected.delete(fournisseurId);
    } else {
      newSelected.add(fournisseurId);
    }
    setSelectedFournisseurs(newSelected);
  };

  const handleDeleteSelected = async () => {
    try {
      await deleteFournisseurs(Array.from(selectedFournisseurs));
      setShowDeleteConfirmation(false);
      setSelectedFournisseurs(new Set());
      refresh();
      toast.success(`${selectedFournisseurs.size} fournisseur(s) supprimé(s) avec succès`);
    } catch (err) {
      console.error('Error deleting suppliers:', err);
      toast.error('Erreur lors de la suppression des fournisseurs');
    }
  };

  const handleCreate = async (fournisseurData: CreateFournisseurPayload) => {
    try {
      await create(fournisseurData);
      setShowForm(false);
      refresh();
      toast.success('Fournisseur créé avec succès');
    } catch (err) {
      console.error('Error creating fournisseur:', err);
      toast.error('Erreur lors de la création du fournisseur');
    }
  };

  const handleUpdate = async (fournisseurData: CreateFournisseurPayload) => {
    if (!editingFournisseur) return;
    try {
      await update(editingFournisseur.id, fournisseurData);
      setEditingFournisseur(null);
      refresh();
      toast.success('Fournisseur mis à jour avec succès');
    } catch (err) {
      console.error('Error updating fournisseur:', err);
      toast.error('Erreur lors de la mise à jour du fournisseur');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    
    try {
      const fournisseurs = await parseFournisseursExcel(file);
      
      if (fournisseurs.length === 0) {
        toast.error('Le fichier ne contient aucun fournisseur valide');
        return;
      }
      
      // Create each fournisseur
      let successCount = 0;
      let errorCount = 0;
      
      for (const fournisseur of fournisseurs) {
        try {
          await create(fournisseur);
          successCount++;
        } catch (err) {
          console.error('Error importing fournisseur:', err);
          errorCount++;
        }
      }
      
      // Show success/error message
      if (successCount > 0 && errorCount === 0) {
        toast.success(`${successCount} fournisseur(s) importé(s) avec succès`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.success(`${successCount} fournisseur(s) importé(s) avec succès, ${errorCount} échec(s)`);
      } else {
        toast.error(`Échec de l'import: aucun fournisseur n'a pu être importé`);
      }
      
      refresh();
    } catch (err) {
      console.error('Error importing Excel:', err);
      setImportError(err instanceof Error ? err.message : 'Une erreur est survenue');
      toast.error(`Erreur lors de l'import: ${err instanceof Error ? err.message : 'Format de fichier invalide'}`);
    } finally {
      setImporting(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadSampleFile = (format: 'csv' | 'xlsx') => {
    const link = document.createElement('a');
    link.href = format === 'csv' ? '/sample_fournisseurs.csv' : '/sample_fournisseurs.xlsx';
    link.download = format === 'csv' ? 'sample_fournisseurs.csv' : 'sample_fournisseurs.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="w-full p-8">Chargement...</div>;
  if (error) return <div className="w-full p-8 text-red-600">Erreur: {error.message}</div>;

  return (
    <div className="w-full p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Fournisseurs</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={20} />
            Nouveau fournisseur
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onMouseEnter={() => setDropdownOpen(true)}
            >
              <FileDown size={20} />
              📄 Télécharger un modèle
            </button>
            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <div className="py-1">
                  <button
                    onClick={() => downloadSampleFile('csv')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Format CSV
                  </button>
                  <button
                    onClick={() => downloadSampleFile('xlsx')}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Format Excel (XLSX)
                  </button>
                </div>
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".csv,.xlsx"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50"
          >
            <Upload size={20} />
            {importing ? 'Import en cours...' : '📥 Importer Excel/CSV'}
          </button>
          <button
            onClick={() => setShowDeleteConfirmation(true)}
            disabled={selectedFournisseurs.size === 0}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              selectedFournisseurs.size > 0
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Trash2 size={20} />
            Supprimer ({selectedFournisseurs.size})
          </button>
        </div>
      </div>

      {importError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <pre className="whitespace-pre-wrap font-mono text-sm">{importError}</pre>
        </div>
      )}

      <div className="mb-6 relative">
        <input
          type="text"
          placeholder="Rechercher un fournisseur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
      </div>

      {(showForm || editingFournisseur) && (
        <FournisseurForm
          onSubmit={editingFournisseur ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingFournisseur(null);
          }}
          initialData={editingFournisseur}
          submitLabel={editingFournisseur ? 'Modifier' : 'Créer'}
          loading={creating || updating}
        />
      )}

      {showDeleteConfirmation && (
        <DeleteConfirmationModal
          onConfirm={handleDeleteSelected}
          onCancel={() => setShowDeleteConfirmation(false)}
        />
      )}

      {showDetailsModal && (
        <FournisseurDetailsModal
          fournisseur={showDetailsModal}
          onClose={() => setShowDetailsModal(null)}
        />
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedFournisseurs.size === filteredFournisseurs.length}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TVA</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFournisseurs.map((fournisseur) => (
              <tr key={fournisseur.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedFournisseurs.has(fournisseur.id)}
                    onChange={() => handleSelectFournisseur(fournisseur.id)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(user?.role?.toLowerCase() === 'admin' || fournisseur.created_by === user?.id) && (
                    <button
                      onClick={() => setEditingFournisseur(fournisseur)}
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const isAdmin = user?.role?.toLowerCase() === 'admin';
                        const isCreatedByOther = fournisseur.created_by && fournisseur.created_by !== user?.id;
                        return (
                          <span
                            className={`cursor-pointer hover:text-blue-600 ${isAdmin && isCreatedByOther ? 'text-green-700 font-bold' : ''}`}
                            onClick={() => setShowDetailsModal(fournisseur)}
                          >
                            {fournisseur.nom}
                          </span>
                        );
                      })()}
                      <button
                        onClick={() => setShowDetailsModal(fournisseur)}
                        className={`${
                          fournisseur.telephone ? 'text-blue-600' : 'text-gray-400'
                        } hover:text-blue-800`}
                      >
                        <Phone size={16} />
                      </button>
                      <button
                        onClick={() => setShowDetailsModal(fournisseur)}
                        className={`${
                          fournisseur.email ? 'text-blue-600' : 'text-gray-400'
                        } hover:text-blue-800`}
                      >
                        <Mail size={16} />
                      </button>
                    </div>
                    {/* Mention "créé par ..." pour admin si fournisseur créé par un employé */}
                    {user?.role?.toLowerCase() === 'admin' && fournisseur.created_by && fournisseur.created_by !== user?.id && (
                      <div className="text-xs text-green-700 font-semibold">
                        {/* Affiche le nom de l'employé si possible */}
                        Créé par <span>{fournisseur.created_by}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{fournisseur.contact_nom}</td>
                <td className="px-6 py-4 whitespace-nowrap">{fournisseur.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">{fournisseur.telephone}</td>
                <td className="px-6 py-4 whitespace-nowrap">{fournisseur.tva_rate || 20}%</td>
                <td className="px-6 py-4 whitespace-nowrap">{fournisseur.services_offerts?.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Fournisseurs;
