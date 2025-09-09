import React, { useState, useEffect } from 'react';
import { Receipt, Download, Eye, Check, Clock, Plus, X, Search, Mail, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAllInvoices, updateInvoiceStatus, generateInvoiceNumber, generateInvoicePDF, downloadInvoicePDF } from '../services/invoices';
import { downloadCreditNotePDF } from '../services/creditNotes';
import { useClients } from '../hooks/useClients';
import { supabase } from '../lib/supabase';
import type { ClientInvoice, Client, CreditNote } from '../types';
import toast from 'react-hot-toast';
import EmailModal from '../components/EmailModal';

interface ManualInvoiceForm {
  client_id: string;
  date_emission: string;
  description: string;
  montant_ht: number;
  tva_rate: number;
  bordereau_reference: string; // Changed from bordereau_id to bordereau_reference
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManualForm, setShowManualForm] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [emailInvoice, setEmailInvoice] = useState<ClientInvoice | null>(null);
  const [creditNotes, setCreditNotes] = useState<Record<string, CreditNote[]>>({});
  const { data: clients } = useClients();

  const [formData, setFormData] = useState<ManualInvoiceForm>({
    client_id: '',
    date_emission: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    montant_ht: 0,
    tva_rate: 20,
    bordereau_reference: '' // Changed from bordereau_id to bordereau_reference
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedWithCreditNote, setSelectedWithCreditNote] = useState('');
  const [dateFilter, setDateFilter] = useState({
    start: '',
    end: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchCreditNotes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchTerm, selectedClientId, selectedStatus, selectedWithCreditNote, dateFilter, creditNotes]);

  const fetchInvoices = async () => {
    try {
      const data = await getAllInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreditNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group credit notes by invoice_id
      const groupedNotes: Record<string, CreditNote[]> = {};
      data?.forEach(note => {
        if (note.invoice_id) {
          if (!groupedNotes[note.invoice_id]) {
            groupedNotes[note.invoice_id] = [];
          }
          groupedNotes[note.invoice_id].push(note);
        }
      });

      setCreditNotes(groupedNotes);
    } catch (error) {
      console.error('Error fetching credit notes:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Filter by search term (invoice number)
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.numero.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by client
    if (selectedClientId) {
      filtered = filtered.filter(invoice => invoice.client_id === selectedClientId);
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(invoice => invoice.statut === selectedStatus);
    }

    // Filter by credit note status
    if (selectedWithCreditNote) {
      if (selectedWithCreditNote === 'with_credit_note') {
        filtered = filtered.filter(invoice => 
          creditNotes[invoice.id] && creditNotes[invoice.id].length > 0
        );
      } else if (selectedWithCreditNote === 'without_credit_note') {
        filtered = filtered.filter(invoice => 
          !creditNotes[invoice.id] || creditNotes[invoice.id].length === 0
        );
      }
    }

    // Filter by date range
    if (dateFilter.start) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.date_emission) >= new Date(dateFilter.start)
      );
    }
    if (dateFilter.end) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.date_emission) <= new Date(dateFilter.end)
      );
    }

    setFilteredInvoices(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClientId('');
    setSelectedStatus('');
    setSelectedWithCreditNote('');
    setDateFilter({ start: '', end: '' });
  };

  const handleStatusChange = async (invoiceId: string, newStatus: 'en_attente' | 'paye'): Promise<void> => {
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
      setInvoices(invoices.map(invoice => 
        invoice.id === invoiceId 
          ? { ...invoice, statut: newStatus }
          : invoice
      ));
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDownloadPDF = async (invoice: ClientInvoice) => {
    try {
      await downloadInvoicePDF(invoice);
      toast.success('Facture téléchargée avec succès');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      if (error.message?.includes('Aucun PDF disponible')) {
        toast.error('Le fichier PDF n\'est pas encore disponible. Veuillez réessayer dans quelques instants.');
      } else {
        toast.error('Erreur lors du téléchargement de la facture');
      }
    }
  };

  const handleViewCMR = (invoice: ClientInvoice) => {
    if (invoice.lien_cmr) {
      window.open(invoice.lien_cmr, '_blank');
    } else {
      toast.error('Aucun CMR disponible pour cette facture');
    }
  };

  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      tva_rate: selectedClient?.tva_rate || 20
    }));
  };

  const calculateTTC = () => {
    return formData.montant_ht * (1 + formData.tva_rate / 100);
  };

  const handleCreateManualInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.description || formData.montant_ht <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setCreatingInvoice(true);

    try {
      // Get complete client information
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          nom,
          email,
          telephone,
          adresse_facturation,
          siret,
          numero_tva,
          tva_rate
        `)
        .eq('id', formData.client_id)
        .single();

      if (clientError) {
        throw new Error(`Error fetching client data: ${clientError.message}`);
      }

      // Generate invoice number
      const numero = await generateInvoiceNumber();
      
      // Calculate amounts
      const montant_ht = formData.montant_ht;
      const tva = montant_ht * (formData.tva_rate / 100);
      const montant_ttc = montant_ht + tva;

      // Create mock slip object for PDF generation
      const mockSlip = {
        id: 'manual-invoice-id', // Fixed string instead of user input
        number: formData.bordereau_reference || 'FACTURE MANUELLE',
        client_id: formData.client_id,
        client: clientData,
        loading_date: formData.date_emission,
        delivery_date: formData.date_emission,
        loading_address: clientData.adresse_facturation || 'Non spécifié',
        delivery_address: clientData.adresse_facturation || 'Non spécifié',
        goods_description: formData.description,
        price: montant_ht,
        selling_price: montant_ht
      };

      // Generate PDF with custom description
      const pdfBlob = await generateInvoicePDF(
        mockSlip, 
        'transport', 
        numero, 
        montant_ht, 
        tva, 
        montant_ttc, 
        clientData
      );
      
      // Upload PDF to storage
      const pdfFileName = `invoice-${numero.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      const pdfPath = `invoices/${pdfFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(pdfPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload du PDF: ${uploadError.message}`);
      }

      // Create invoice record - FIXED: Always set bordereau_id to null for manual invoices
      const invoiceData = {
        numero,
        client_id: formData.client_id,
        bordereau_id: null, // Always null for manual invoices to avoid UUID errors
        bordereau_type: 'transport',
        type: 'facture',
        date_emission: formData.date_emission,
        montant_ht,
        tva,
        montant_ttc,
        lien_pdf: pdfPath,
        lien_cmr: null,
        statut: 'en_attente' as const
      };

      const { data: invoice, error } = await supabase
        .from('client_invoices')
        .insert([invoiceData])
        .select(`
          *,
          client:client_id(nom, email, adresse_facturation, telephone)
        `)
        .single();

      if (error) {
        throw new Error(`Erreur lors de l'enregistrement: ${error.message}`);
      }

      // Add the new invoice to the list
      setInvoices(prevInvoices => [invoice, ...prevInvoices]);

      toast.success('Facture créée avec succès');
      setShowManualForm(false);
      setFormData({
        client_id: '',
        date_emission: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        montant_ht: 0,
        tva_rate: 20,
        bordereau_reference: '' // Reset the reference field
      });
    } catch (error) {
      console.error('Error creating manual invoice:', error);
      toast.error('Erreur lors de la création de la facture');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleCreateCreditNote = (invoice: ClientInvoice) => {
    // Navigate to credit notes page with invoice pre-selected
    window.location.href = `/credit-notes?invoice=${invoice.id}`;
  };

  const handleDownloadCreditNote = async (invoiceId: string) => {
    try {
      if (!creditNotes[invoiceId] || creditNotes[invoiceId].length === 0) {
        toast.error('Aucun avoir disponible pour cette facture');
        return;
      }
      
      // If there's only one credit note, download it directly
      if (creditNotes[invoiceId].length === 1) {
        await downloadCreditNotePDF(creditNotes[invoiceId][0]);
        return;
      }
      
      // If there are multiple credit notes, download the most recent one
      const sortedNotes = [...creditNotes[invoiceId]].sort(
        (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      );
      
      await downloadCreditNotePDF(sortedNotes[0]);
      toast.success('Avoir téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading credit note PDF:', error);
      toast.error('Erreur lors du téléchargement de l\'avoir');
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'paye':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check size={12} className="mr-1" />
            Payé
          </span>
        );
      case 'en_attente':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            En attente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {statut}
          </span>
        );
    }
  };

  const hasCreditNotes = (invoiceId: string) => {
    return creditNotes[invoiceId] && creditNotes[invoiceId].length > 0;
  };

  const getCreditNoteInfo = (invoiceId: string) => {
    if (!hasCreditNotes(invoiceId)) return null;
    
    const notes = creditNotes[invoiceId];
    const totalAmount = notes.reduce((sum, note) => sum + note.montant_ttc, 0);
    
    return {
      count: notes.length,
      totalAmount,
      numbers: notes.map(note => note.numero)
    };
  };

  if (loading) {
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
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Receipt className="w-8 h-8" />
          Factures client
        </h1>
        <button
          onClick={() => setShowManualForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          Créer une facture
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search by invoice number */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par numéro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter by client */}
          <div>
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
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="paye">Payé</option>
            </select>
          </div>

          {/* Filter by credit note status */}
          <div>
            <select
              value={selectedWithCreditNote}
              onChange={(e) => setSelectedWithCreditNote(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous</option>
              <option value="with_credit_note">Avec avoir</option>
              <option value="without_credit_note">Sans avoir</option>
            </select>
          </div>

          {/* Clear filters button */}
          <div className="flex items-center">
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
          {filteredInvoices.length} facture(s) trouvée(s) sur {invoices.length} au total
        </div>
      </div>

      {/* Manual Invoice Form Modal */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Créer une facture manuelle</h2>
              <button
                onClick={() => setShowManualForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateManualInvoice} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client *
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => handleClientChange(e.target.value)}
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner un client</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date d'émission *
                  </label>
                  <input
                    type="date"
                    value={formData.date_emission}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_emission: e.target.value }))}
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence Bordereau (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.bordereau_reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, bordereau_reference: e.target.value }))}
                    placeholder="Ex: BT-2024-001, référence interne..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cette référence apparaîtra sur la facture mais ne sera pas liée à un bordereau existant
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description du service *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    required
                    rows={3}
                    placeholder="Ex: Transport de marchandises, Prestation de service..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant HT (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.montant_ht}
                    onChange={(e) => setFormData(prev => ({ ...prev, montant_ht: parseFloat(e.target.value) || 0 }))}
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taux TVA (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tva_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, tva_rate: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Montant HT:</span>
                    <span>{formData.montant_ht.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">TVA ({formData.tva_rate}%):</span>
                    <span>{(formData.montant_ht * formData.tva_rate / 100).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
                    <span>Total TTC:</span>
                    <span>{calculateTTC().toFixed(2)} €</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingInvoice}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingInvoice ? 'Création...' : 'Créer la facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {emailInvoice && (
        <EmailModal
          invoice={emailInvoice}
          type="invoice"
          onClose={() => setEmailInvoice(null)}
          clientEmail={emailInvoice.client?.email}
        />
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Numéro
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date d'émission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant HT
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Montant TTC
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {invoice.numero}
                  </div>
                  <div className="text-sm text-gray-500">
                    {invoice.bordereau_id ? `Bordereau: ${invoice.bordereau_type === 'transport' ? 'T' : 'F'}` : 'Facture manuelle'}
                  </div>
                  {hasCreditNotes(invoice.id) && (
                    <div className="mt-1">
                      <button
                        onClick={() => handleDownloadCreditNote(invoice.id)}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200"
                        title="Télécharger l'avoir"
                      >
                        <ArrowDownLeft size={10} className="mr-1" />
                        Avoir{getCreditNoteInfo(invoice.id)?.count! > 1 ? 's' : ''}: {getCreditNoteInfo(invoice.id)?.numbers.join(', ')}
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {invoice.client?.nom}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(invoice.date_emission), 'dd/MM/yyyy', { locale: fr })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.montant_ht.toFixed(2)} €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {invoice.montant_ttc.toFixed(2)} €
                  {hasCreditNotes(invoice.id) && (
                    <div className="text-xs text-red-600 mt-1">
                      Avoirs: -{getCreditNoteInfo(invoice.id)?.totalAmount.toFixed(2)} €
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invoice.statut)}
                    <select
                      value={invoice.statut}
                      onChange={(e) => handleStatusChange(invoice.id, e.target.value as 'en_attente' | 'paye')}
                      className="text-xs border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="en_attente">En attente</option>
                      <option value="paye">Payé</option>
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {invoice.lien_pdf && (
                      <button
                        onClick={() => handleDownloadPDF(invoice)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Télécharger la facture"
                      >
                        <Download size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => setEmailInvoice(invoice)}
                      className="text-green-600 hover:text-green-800"
                      title="Envoyer par email"
                    >
                      <Mail size={18} />
                    </button>
                    {invoice.lien_cmr && (
                      <button
                        onClick={() => handleViewCMR(invoice)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Voir le CMR"
                      >
                        <Eye size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleCreateCreditNote(invoice)}
                      className="text-red-600 hover:text-red-800"
                      title="Créer un avoir"
                    >
                      <ArrowDownLeft size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {invoices.length === 0 ? 'Aucune facture' : 'Aucune facture trouvée'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {invoices.length === 0 
                ? 'Les factures générées apparaîtront ici.'
                : 'Essayez de modifier vos critères de recherche.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}