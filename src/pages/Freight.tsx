import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import SlipForm from '../components/SlipForm';
import SlipStatusSelect from '../components/SlipStatusSelect';
import EmailModal from '../components/EmailModal';
import DocumentUploaderModal from '../components/DocumentUploaderModal';
import DocumentViewerModal from '../components/DocumentViewerModal';
import ActionButtons from '../components/ActionButtons';
import TableHeader from '../components/TableHeader';
import { createFreightSlip, getAllFreightSlips, generatePDF } from '../services/slips';
import { createInvoiceFromSlip, checkInvoiceExists, createGroupedInvoice } from '../services/invoices';
import { useClients } from '../hooks/useClients';
import { useFournisseurs } from '../hooks/useFournisseurs';
import type { FreightSlip } from '../types';
import { supabase } from '../lib/supabase';

const Freight = () => {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slips, setSlips] = useState<FreightSlip[]>([]);
  const [filteredSlips, setFilteredSlips] = useState<FreightSlip[]>([]);
  const [loadingSlips, setLoadingSlips] = useState(true);
  const [editingSlip, setEditingSlip] = useState<FreightSlip | null>(null);
  const [emailSlip, setEmailSlip] = useState<FreightSlip | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState<FreightSlip | null>(null);
  const [viewingDocuments, setViewingDocuments] = useState<FreightSlip | null>(null);
  const [invoiceRefreshTrigger, setInvoiceRefreshTrigger] = useState(0);
  const [invoiceStatuses, setInvoiceStatuses] = useState<Record<string, boolean>>({});

  const { data: clients } = useClients();
  const { data: fournisseurs } = useFournisseurs();
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email');
      if (!error && data) {
        const map: Record<string, string> = {};
        (data as any[]).forEach((u) => {
          map[u.id] = u.name || u.email || u.id;
        });
        setUserNames(map);
      }
    };
    fetchUsers();
  }, []);

  // Filter states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedInvoiceStatus, setSelectedInvoiceStatus] = useState('');
  const [dateFilter, setDateFilter] = useState({
    start: '',
    end: ''
  });

  // Multi-select for invoice generation
  const [selectedSlips, setSelectedSlips] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSlips();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [slips, selectedClientId, selectedStatus, selectedInvoiceStatus, dateFilter]);

  useEffect(() => {
    checkInvoiceStatusesForSlips();
  }, [slips, invoiceRefreshTrigger]);

  const fetchSlips = async () => {
    try {
      const data = await getAllFreightSlips();
      setSlips(data);
    } catch (error) {
      console.error('Error fetching freight slips:', error);
      toast.error('Erreur lors du chargement des bordereaux');
    } finally {
      setLoadingSlips(false);
    }
  };

  const checkInvoiceStatusesForSlips = async () => {
    const statuses: Record<string, boolean> = {};
    for (const slip of slips) {
      if (slip.status === 'delivered') {
        try {
          const hasInvoice = await checkInvoiceExists(slip.id, 'freight');
          statuses[slip.id] = hasInvoice;
        } catch (error) {
          console.error('Error checking invoice status:', error);
        }
      }
    }
    setInvoiceStatuses(statuses);
  };

  const applyFilters = () => {
    let filtered = [...slips];

    // Filter by client
    if (selectedClientId) {
      filtered = filtered.filter(slip => slip.client_id === selectedClientId);
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(slip => slip.status === selectedStatus);
    }

    // Filter by invoice status
    if (selectedInvoiceStatus) {
      if (selectedInvoiceStatus === 'facture') {
        filtered = filtered.filter(slip => 
          slip.status === 'delivered' && invoiceStatuses[slip.id]
        );
      } else if (selectedInvoiceStatus === 'non_facture') {
        filtered = filtered.filter(slip => 
          slip.status === 'delivered' && !invoiceStatuses[slip.id]
        );
      }
    }

    // Filter by date range
    if (dateFilter.start) {
      filtered = filtered.filter(slip => 
        new Date(slip.loading_date) >= new Date(dateFilter.start)
      );
    }
    if (dateFilter.end) {
      filtered = filtered.filter(slip => 
        new Date(slip.loading_date) <= new Date(dateFilter.end)
      );
    }

    setFilteredSlips(filtered);
    // Clear selection when filters change
    setSelectedSlips(new Set());
  };

  const clearFilters = () => {
    setSelectedClientId('');
    setSelectedStatus('');
    setSelectedInvoiceStatus('');
    setDateFilter({ start: '', end: '' });
    setSelectedSlips(new Set());
  };

  const handleSlipSelection = (slipId: string, checked: boolean) => {
    const newSelection = new Set(selectedSlips);
    if (checked) {
      newSelection.add(slipId);
    } else {
      newSelection.delete(slipId);
    }
    setSelectedSlips(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const deliveredSlips = filteredSlips
        .filter(slip => slip.status === 'delivered' && !invoiceStatuses[slip.id])
        .map(slip => slip.id);
      setSelectedSlips(new Set(deliveredSlips));
    } else {
      setSelectedSlips(new Set());
    }
  };

  const handleGenerateMultipleInvoices = async () => {
    if (selectedSlips.size === 0) {
      toast.error('Veuillez sélectionner au moins un bordereau');
      return;
    }

    try {
      const slipsToInvoice = filteredSlips.filter(slip => selectedSlips.has(slip.id));
      
      // Generate a single grouped invoice instead of multiple individual invoices
      await createGroupedInvoice(slipsToInvoice, 'freight');
      
      toast.success('Facture groupée générée avec succès');
      setSelectedSlips(new Set());
      fetchSlips();
      setInvoiceRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error generating grouped invoice:', error);
      toast.error('Erreur lors de la génération de la facture groupée');
    }
  };

  const handleCreate = async (data: any) => {
    setLoading(true);
    try {
      await createFreightSlip(data);
      setShowForm(false);
      fetchSlips();
      toast.success('Bordereau créé avec succès');
    } catch (error) {
      console.error('Error creating freight slip:', error);
      toast.error('Erreur lors de la création du bordereau');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingSlip) return;
    
    try {
      const { error } = await supabase
        .from('freight_slips')
        .update(data)
        .eq('id', editingSlip.id);

      if (error) throw error;

      setEditingSlip(null);
      fetchSlips();
      toast.success('Bordereau mis à jour avec succès');
    } catch (error) {
      console.error('Error updating slip:', error);
      toast.error('Erreur lors de la mise à jour du bordereau');
    }
  };

  const handleDownload = async (slip: FreightSlip) => {
    try {
      const pdfBlob = await generatePDF(slip, 'freight');
      
      // Create a URL for the blob
      const url = URL.createObjectURL(pdfBlob);
      
      // Create a link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename
      const clientName = slip.client?.nom || 'Client';
      const slipNumber = slip.number;
      const currentDate = format(new Date(), 'dd-MM-yyyy', { locale: fr });
      const filename = `${clientName} - ${slipNumber} - ${currentDate}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Bordereau téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading slip:', error);
      toast.error('Erreur lors du téléchargement du bordereau');
    }
  };

  const handleGenerateInvoice = async (slip: FreightSlip) => {
    try {
      await createInvoiceFromSlip(slip, 'freight');
      toast.success('Facture générée avec succès');
      fetchSlips(); // Refresh to update invoice status
      setInvoiceRefreshTrigger(prev => prev + 1); // Trigger invoice status refresh
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Erreur lors de la génération de la facture');
    }
  };

  const getDocumentCount = (slip: FreightSlip) => {
    return slip.documents ? Object.keys(slip.documents).length : 0;
  };

  const getSelectedClient = () => {
    return clients.find(client => client.id === selectedClientId);
  };

  const availableSlipsForInvoice = filteredSlips.filter(slip => 
    slip.status === 'delivered' && !invoiceStatuses[slip.id]
  );

  if (loadingSlips) {
    return (
      <div className="w-full p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Affrètement</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          Créer un bordereau
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Filter by client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les statuts</option>
              <option value="waiting">En attente</option>
              <option value="loaded">Chargé</option>
              <option value="delivered">Livré</option>
              <option value="dispute">Litige</option>
            </select>
          </div>

          {/* Filter by invoice status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Facturation
            </label>
            <select
              value={selectedInvoiceStatus}
              onChange={(e) => setSelectedInvoiceStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous</option>
              <option value="facture">Facturé</option>
              <option value="non_facture">Non facturé</option>
            </select>
          </div>

          {/* Clear filters button */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2"
            >
              <X size={16} />
              Effacer les filtres
            </button>
          </div>
        </div>

        {/* Date range filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          {filteredSlips.length} bordereau(x) trouvé(s) sur {slips.length} au total
        </div>
      </div>

      {/* Multi-select for invoice generation - only show when client is selected */}
      {selectedClientId && availableSlipsForInvoice.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              Génération de facture groupée pour {getSelectedClient()?.nom}
            </h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center text-sm text-blue-700">
                <input
                  type="checkbox"
                  checked={selectedSlips.size === availableSlipsForInvoice.length && availableSlipsForInvoice.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="mr-2 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                Sélectionner tout
              </label>
              <button
                onClick={handleGenerateMultipleInvoices}
                disabled={selectedSlips.size === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Générer une facture groupée ({selectedSlips.size} bordereau{selectedSlips.size > 1 ? 'x' : ''})
              </button>
            </div>
          </div>
          <div className="text-sm text-blue-700">
            {availableSlipsForInvoice.length} bordereau(x) livré(s) non facturé(s) disponible(s)
          </div>
        </div>
      )}

      {showForm && (
        <SlipForm
          type="freight"
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          loading={loading}
        />
      )}

      {editingSlip && (
        <SlipForm
          type="freight"
          onSubmit={handleUpdate}
          onCancel={() => setEditingSlip(null)}
          initialData={editingSlip}
        />
      )}

      {emailSlip && (
        <EmailModal
          slip={emailSlip}
          type="freight"
          onClose={() => setEmailSlip(null)}
        />
      )}

      {uploadingSlip && (
        <DocumentUploaderModal
          slipId={uploadingSlip.id}
          slipType="freight"
          onClose={() => setUploadingSlip(null)}
          onUploadComplete={fetchSlips}
        />
      )}

      {viewingDocuments && (
        <DocumentViewerModal
          slipId={viewingDocuments.id}
          slipType="freight"
          onClose={() => setViewingDocuments(null)}
          onDocumentDeleted={fetchSlips}
        />
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {/* Checkbox column - only show when client is selected */}
              {selectedClientId && (
                <TableHeader>
                  <input
                    type="checkbox"
                    checked={selectedSlips.size === availableSlipsForInvoice.length && availableSlipsForInvoice.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </TableHeader>
              )}
              <TableHeader>Statut</TableHeader>
              <TableHeader>Numéro</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>Saisi par</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Affréteur</TableHeader>
              <TableHeader>ACHAT HT</TableHeader>
              <TableHeader>Vente HT</TableHeader>
              <TableHeader>MARGE €</TableHeader>
              <TableHeader>MARGE %</TableHeader>
              <TableHeader align="center">Actions</TableHeader>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSlips.map((slip) => {
              const canBeSelected = slip.status === 'delivered' && !invoiceStatuses[slip.id];
              
              return (
                <tr key={slip.id}>
                  {/* Checkbox column - only show when client is selected */}
                  {selectedClientId && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canBeSelected ? (
                        <input
                          type="checkbox"
                          checked={selectedSlips.has(slip.id)}
                          onChange={(e) => handleSlipSelection(slip.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <SlipStatusSelect
                      id={slip.id}
                      status={slip.status}
                      type="freight"
                      onUpdate={fetchSlips}
                      invoiceRefreshTrigger={invoiceRefreshTrigger}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {slip.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {slip.client?.nom}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {slip.created_by ? (userNames[slip.created_by] || '-') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(slip.loading_date), 'dd/MM/yyyy', { locale: fr })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {slip.fournisseur?.nom}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {slip.purchase_price} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {slip.selling_price} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {slip.margin} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {slip.margin_rate?.toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ActionButtons
                      slip={slip}
                      onEdit={() => setEditingSlip(slip)}
                      onEmail={() => setEmailSlip(slip)}
                      onUpload={() => setUploadingSlip(slip)}
                      onView={() => setViewingDocuments(slip)}
                      onDownload={() => handleDownload(slip)}
                      onGenerateInvoice={() => handleGenerateInvoice(slip)}
                      documentCount={getDocumentCount(slip)}
                      showBPA={true}
                      slipType="freight"
                      onInvoiceGenerated={() => setInvoiceRefreshTrigger(prev => prev + 1)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredSlips.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {slips.length === 0 ? 'Aucun bordereau' : 'Aucun bordereau trouvé'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {slips.length === 0 
                ? 'Les bordereaux créés apparaîtront ici.'
                : 'Essayez de modifier vos critères de recherche.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Freight;
