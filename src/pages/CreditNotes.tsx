import React, { useState, useEffect } from 'react';
import { Receipt, Plus, X, Search, Mail, Download, Clock, Check, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAllCreditNotes, updateCreditNoteStatus, downloadCreditNotePDF, createCreditNote, getInvoiceByNumber } from '../services/creditNotes';
import { getAllInvoices } from '../services/invoices';
import { useClients } from '../hooks/useClients';
import type { CreditNote, ClientInvoice } from '../types';
import toast from 'react-hot-toast';
import EmailModal from '../components/EmailModal';
import { useLocation } from 'react-router-dom';

export default function CreditNotes() {
  const location = useLocation();
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [filteredCreditNotes, setFilteredCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creatingCreditNote, setCreatingCreditNote] = useState(false);
  const [emailCreditNote, setEmailCreditNote] = useState<CreditNote | null>(null);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const { data: clients } = useClients();

  const [formData, setFormData] = useState({
    invoice_number: '',
    invoice_id: '',
    client_id: '',
    motif: '',
    montant_ht: 0,
    isPartial: false
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFilter, setDateFilter] = useState({
    start: '',
    end: ''
  });

  useEffect(() => {
    fetchCreditNotes();
    fetchInvoices();
    
    // Check if we have an invoice ID in the URL params
    const params = new URLSearchParams(location.search);
    const invoiceId = params.get('invoice');
    if (invoiceId) {
      handlePreselectedInvoice(invoiceId);
    }
  }, [location]);

  useEffect(() => {
    applyFilters();
  }, [creditNotes, searchTerm, selectedClientId, selectedStatus, dateFilter]);

  const handlePreselectedInvoice = async (invoiceId: string) => {
    try {
      // Fetch invoices if not already loaded
      if (invoices.length === 0) {
        const data = await getAllInvoices();
        setInvoices(data);
        
        const selectedInvoice = data.find(invoice => invoice.id === invoiceId);
        if (selectedInvoice) {
          setFormData(prev => ({
            ...prev,
            invoice_number: selectedInvoice.numero,
            invoice_id: selectedInvoice.id,
            client_id: selectedInvoice.client_id,
            montant_ht: selectedInvoice.montant_ht
          }));
          setShowForm(true);
        }
      } else {
        const selectedInvoice = invoices.find(invoice => invoice.id === invoiceId);
        if (selectedInvoice) {
          setFormData(prev => ({
            ...prev,
            invoice_number: selectedInvoice.numero,
            invoice_id: selectedInvoice.id,
            client_id: selectedInvoice.client_id,
            montant_ht: selectedInvoice.montant_ht
          }));
          setShowForm(true);
        }
      }
    } catch (error) {
      console.error('Error handling preselected invoice:', error);
    }
  };

  const fetchCreditNotes = async () => {
    try {
      const data = await getAllCreditNotes();
      setCreditNotes(data);
    } catch (error) {
      console.error('Error fetching credit notes:', error);
      toast.error('Erreur lors du chargement des avoirs');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await getAllInvoices();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Erreur lors du chargement des factures');
    }
  };

  const applyFilters = () => {
    let filtered = [...creditNotes];

    // Filter by search term (credit note number)
    if (searchTerm) {
      filtered = filtered.filter(creditNote =>
        creditNote.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creditNote.invoice?.numero.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by client
    if (selectedClientId) {
      filtered = filtered.filter(creditNote => creditNote.client_id === selectedClientId);
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(creditNote => creditNote.statut === selectedStatus);
    }

    // Filter by date range
    if (dateFilter.start) {
      filtered = filtered.filter(creditNote => 
        new Date(creditNote.date_emission) >= new Date(dateFilter.start)
      );
    }
    if (dateFilter.end) {
      filtered = filtered.filter(creditNote => 
        new Date(creditNote.date_emission) <= new Date(dateFilter.end)
      );
    }

    setFilteredCreditNotes(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClientId('');
    setSelectedStatus('');
    setDateFilter({ start: '', end: '' });
  };

  const handleStatusChange = async (creditNoteId: string, newStatus: 'emis' | 'comptabilise') => {
    try {
      await updateCreditNoteStatus(creditNoteId, newStatus);
      setCreditNotes(creditNotes.map(creditNote => 
        creditNote.id === creditNoteId 
          ? { ...creditNote, statut: newStatus }
          : creditNote
      ));
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating credit note status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDownloadPDF = async (creditNote: CreditNote) => {
    try {
      await downloadCreditNotePDF(creditNote);
      toast.success('Avoir téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      if (error.message?.includes('Aucun PDF disponible')) {
        toast.error('Le fichier PDF n\'est pas encore disponible. Veuillez réessayer dans quelques instants.');
      } else {
        toast.error('Erreur lors du téléchargement de l\'avoir');
      }
    }
  };

  const handleInvoiceNumberChange = async (invoiceNumber: string) => {
    setFormData(prev => ({
      ...prev,
      invoice_number: invoiceNumber,
      // Don't reset client_id yet until we check if the invoice exists
    }));

    if (!invoiceNumber) {
      setFormData(prev => ({
        ...prev,
        invoice_id: '',
        client_id: '',
        montant_ht: 0
      }));
      return;
    }

    try {
      // First try to find the invoice in the already loaded invoices
      let selectedInvoice = invoices.find(invoice => invoice.numero === invoiceNumber);
      
      // If not found, try to fetch it from the database
      if (!selectedInvoice) {
        selectedInvoice = await getInvoiceByNumber(invoiceNumber);
      }
      
      if (selectedInvoice) {
        setFormData(prev => ({
          ...prev,
          invoice_id: selectedInvoice!.id,
          client_id: selectedInvoice!.client_id,
          montant_ht: selectedInvoice!.montant_ht
        }));
      } else {
        // If invoice not found, reset related fields
        setFormData(prev => ({
          ...prev,
          invoice_id: '',
          client_id: '',
          montant_ht: 0
        }));
      }
    } catch (error) {
      console.error('Error fetching invoice by number:', error);
      // Don't show error toast here to avoid disrupting the user experience
      // Just silently fail and let the user continue typing
    }
  };

  const handleClientChange = (clientId: string) => {
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      // Reset invoice fields if client is selected directly
      invoice_number: '',
      invoice_id: ''
    }));
  };

  const handleCreateCreditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.motif || formData.montant_ht <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!formData.client_id && !formData.invoice_id) {
      toast.error('Veuillez sélectionner un client ou saisir un numéro de facture');
      return;
    }

    setCreatingCreditNote(true);

    try {
      // Create the credit note
      const newCreditNote = await createCreditNote(
        formData.invoice_id,
        formData.motif,
        formData.montant_ht,
        formData.isPartial,
        formData.client_id
      );
      
      // Add the new credit note to the list
      setCreditNotes(prevCreditNotes => [newCreditNote, ...prevCreditNotes]);
      
      toast.success('Avoir créé avec succès');
      setShowForm(false);
      setFormData({
        invoice_number: '',
        invoice_id: '',
        client_id: '',
        motif: '',
        montant_ht: 0,
        isPartial: false
      });
    } catch (error) {
      console.error('Error creating credit note:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'avoir');
    } finally {
      setCreatingCreditNote(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'comptabilise':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check size={12} className="mr-1" />
            Comptabilisé
          </span>
        );
      case 'emis':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            Émis
          </span>
        );
    }
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
          <ArrowLeft className="w-8 h-8" />
          Avoirs clients
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          Créer un avoir
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search by credit note or invoice number */}
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
              <option value="emis">Émis</option>
              <option value="comptabilise">Comptabilisé</option>
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
          {filteredCreditNotes.length} avoir(s) trouvé(s) sur {creditNotes.length} au total
        </div>
      </div>

      {/* Credit Note Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Créer un avoir</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateCreditNote} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de facture (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => handleInvoiceNumberChange(e.target.value)}
                    placeholder="Ex: F2406-01"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Si un numéro valide est saisi, l'avoir sera lié à cette facture.
                  </p>
                </div>

                {formData.invoice_number && formData.invoice_id && (
                  <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800 mb-2">Détails de la facture</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Client:</span> {invoices.find(invoice => invoice.id === formData.invoice_id)?.client?.nom}
                      </div>
                      <div>
                        <span className="font-medium">Numéro:</span> {formData.invoice_number}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {invoices.find(invoice => invoice.id === formData.invoice_id)?.date_emission && 
                          format(new Date(invoices.find(invoice => invoice.id === formData.invoice_id)!.date_emission), 'dd/MM/yyyy', { locale: fr })}
                      </div>
                      <div>
                        <span className="font-medium">Montant TTC:</span> {invoices.find(invoice => invoice.id === formData.invoice_id)?.montant_ttc.toFixed(2)}€
                      </div>
                    </div>
                  </div>
                )}

                {!formData.invoice_id && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client *
                    </label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => handleClientChange(e.target.value)}
                      required={!formData.invoice_id}
                      disabled={!!formData.invoice_id}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Sélectionner un client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motif de l'avoir *
                  </label>
                  <textarea
                    value={formData.motif}
                    onChange={(e) => setFormData(prev => ({ ...prev, motif: e.target.value }))}
                    required
                    rows={3}
                    placeholder="Ex: Erreur de facturation, Remboursement partiel..."
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {formData.invoice_id && (
                  <div className="md:col-span-2">
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="isPartial"
                        checked={formData.isPartial}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPartial: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <label htmlFor="isPartial" className="ml-2 text-sm text-gray-700">
                        Avoir partiel (montant personnalisé)
                      </label>
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant HT (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={formData.isPartial ? undefined : (
                      formData.invoice_id
                        ? invoices.find(invoice => invoice.id === formData.invoice_id)?.montant_ht
                        : undefined
                    )}
                    value={formData.montant_ht}
                    onChange={(e) => setFormData(prev => ({ ...prev, montant_ht: parseFloat(e.target.value) || 0 }))}
                    disabled={!formData.isPartial && !!formData.invoice_id}
                    required
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {formData.invoice_id && !formData.isPartial && (
                    <p className="mt-1 text-xs text-gray-500">
                      Pour un avoir partiel, cochez la case ci-dessus.
                    </p>
                  )}
                </div>

                {(formData.invoice_id || formData.client_id) && (
                  <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Montant HT de l'avoir:</span>
                      <span>{formData.montant_ht.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">TVA ({
                        formData.invoice_id
                          ? invoices.find(invoice => invoice.id === formData.invoice_id)?.client?.tva_rate || 20
                          : clients.find(client => client.id === formData.client_id)?.tva_rate || 20
                      }%):</span>
                      <span>{(formData.montant_ht * ((
                        formData.invoice_id
                          ? invoices.find(invoice => invoice.id === formData.invoice_id)?.client?.tva_rate || 20
                          : clients.find(client => client.id === formData.client_id)?.tva_rate || 20
                      ) / 100)).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
                      <span>Total TTC de l'avoir:</span>
                      <span>{(formData.montant_ht * (1 + (
                        formData.invoice_id
                          ? invoices.find(invoice => invoice.id === formData.invoice_id)?.client?.tva_rate || 20
                          : clients.find(client => client.id === formData.client_id)?.tva_rate || 20
                      ) / 100)).toFixed(2)} €</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingCreditNote || (!formData.invoice_id && !formData.client_id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingCreditNote ? 'Création...' : 'Créer l\'avoir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {emailCreditNote && (
        <EmailModal
          type="invoice"
          onClose={() => setEmailCreditNote(null)}
          clientEmail={emailCreditNote.client?.email}
          invoice={{
            ...emailCreditNote,
            numero: emailCreditNote.numero,
            montant_ht: emailCreditNote.montant_ht,
            montant_ttc: emailCreditNote.montant_ttc,
            lien_pdf: emailCreditNote.lien_pdf || '',
            client: emailCreditNote.client
          }}
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
                Facture d'origine
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
            {filteredCreditNotes.map((creditNote) => (
              <tr key={creditNote.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {creditNote.numero}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {creditNote.invoice?.numero || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {creditNote.client?.nom}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(creditNote.date_emission), 'dd/MM/yyyy', { locale: fr })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {creditNote.montant_ht.toFixed(2)} €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {creditNote.montant_ttc.toFixed(2)} €
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(creditNote.statut)}
                    <select
                      value={creditNote.statut}
                      onChange={(e) => handleStatusChange(creditNote.id, e.target.value as 'emis' | 'comptabilise')}
                      className="text-xs border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="emis">Émis</option>
                      <option value="comptabilise">Comptabilisé</option>
                    </select>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {creditNote.lien_pdf && (
                      <button
                        onClick={() => handleDownloadPDF(creditNote)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Télécharger l'avoir"
                      >
                        <Download size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => setEmailCreditNote(creditNote)}
                      className="text-green-600 hover:text-green-800"
                      title="Envoyer par email"
                    >
                      <Mail size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCreditNotes.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {creditNotes.length === 0 ? 'Aucun avoir' : 'Aucun avoir trouvé'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {creditNotes.length === 0 
                ? 'Les avoirs créés apparaîtront ici.'
                : 'Essayez de modifier vos critères de recherche.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}