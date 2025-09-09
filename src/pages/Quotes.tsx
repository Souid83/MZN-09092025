import React, { useState, useEffect } from 'react';
import { FileCheck, Plus, X, Search, Mail, Receipt, Download, Check, Clock, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateQuoteNumber, getAllQuotes, updateQuoteStatus, generateQuotePDF, downloadQuotePDF, convertQuoteToInvoice } from '../services/quotes';
import { useClients } from '../hooks/useClients';
import { supabase } from '../lib/supabase';
import type { ClientQuote, Client } from '../types';
import toast from 'react-hot-toast';
import EmailModal from '../components/EmailModal';

interface QuoteFormData {
  client_id: string;
  date_emission: string;
  description: string;
  montant_ht: number;
  tva_rate: number;
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<ClientQuote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<ClientQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [emailQuote, setEmailQuote] = useState<ClientQuote | null>(null);
  const { data: clients } = useClients();

  const [formData, setFormData] = useState<QuoteFormData>({
    client_id: '',
    date_emission: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    montant_ht: 0,
    tva_rate: 20
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
    fetchQuotes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [quotes, searchTerm, selectedClientId, selectedStatus, dateFilter]);

  const fetchQuotes = async () => {
    try {
      const data = await getAllQuotes();
      setQuotes(data);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...quotes];

    // Filter by search term (quote number)
    if (searchTerm) {
      filtered = filtered.filter(quote =>
        quote.numero.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by client
    if (selectedClientId) {
      filtered = filtered.filter(quote => quote.client_id === selectedClientId);
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(quote => quote.statut === selectedStatus);
    }

    // Filter by date range
    if (dateFilter.start) {
      filtered = filtered.filter(quote => 
        new Date(quote.date_emission) >= new Date(dateFilter.start)
      );
    }
    if (dateFilter.end) {
      filtered = filtered.filter(quote => 
        new Date(quote.date_emission) <= new Date(dateFilter.end)
      );
    }

    setFilteredQuotes(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedClientId('');
    setSelectedStatus('');
    setDateFilter({ start: '', end: '' });
  };

  const handleStatusChange = async (quoteId: string, newStatus: 'en_attente' | 'accepte' | 'refuse') => {
    try {
      await updateQuoteStatus(quoteId, newStatus);
      setQuotes(quotes.map(quote => 
        quote.id === quoteId 
          ? { ...quote, statut: newStatus }
          : quote
      ));
      toast.success('Statut mis à jour');
    } catch (error) {
      console.error('Error updating quote status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleDownloadPDF = async (quote: ClientQuote) => {
    try {
      await downloadQuotePDF(quote);
      toast.success('Devis téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      if (error.message?.includes('Aucun PDF disponible')) {
        toast.error('Le fichier PDF n\'est pas encore disponible. Veuillez réessayer dans quelques instants.');
      } else {
        toast.error('Erreur lors du téléchargement du devis');
      }
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

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.description || formData.montant_ht <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setCreatingQuote(true);

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

      // Generate quote number
      const numero = await generateQuoteNumber();
      
      // Calculate amounts
      const montant_ht = formData.montant_ht;
      const tva_rate = formData.tva_rate;
      const tva = montant_ht * (tva_rate / 100);
      const montant_ttc = montant_ht + tva;

      // Generate PDF
      const pdfBlob = await generateQuotePDF(
        {
          numero,
          description: formData.description,
          montant_ht,
          tva,
          montant_ttc,
          date_emission: formData.date_emission
        },
        clientData
      );
      
      // Upload PDF to storage
      const pdfFileName = `quote-${numero.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      const pdfPath = `quotes/${pdfFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(pdfPath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Erreur lors de l'upload du PDF: ${uploadError.message}`);
      }

      // Create quote record
      const quoteData = {
        numero,
        client_id: formData.client_id,
        description: formData.description,
        date_emission: formData.date_emission,
        montant_ht,
        tva,
        montant_ttc,
        lien_pdf: pdfPath,
        statut: 'en_attente' as const
      };

      const { data: newQuote, error } = await supabase
        .from('client_quotes')
        .insert([quoteData])
        .select(`
          *,
          client:client_id(nom, email, adresse_facturation, telephone)
        `)
        .single();

      if (error) {
        throw new Error(`Erreur lors de l'enregistrement: ${error.message}`);
      }

      // Ajouter immédiatement le nouveau devis à la liste
      setQuotes(prevQuotes => [newQuote, ...prevQuotes]);

      toast.success('Devis créé avec succès');
      setShowForm(false);
      setFormData({
        client_id: '',
        date_emission: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        montant_ht: 0,
        tva_rate: 20
      });
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Erreur lors de la création du devis');
    } finally {
      setCreatingQuote(false);
    }
  };

  const handleConvertToInvoice = async (quote: ClientQuote) => {
    try {
      await convertQuoteToInvoice(quote);
      
      // Mettre à jour le statut du devis localement
      setQuotes(prevQuotes => prevQuotes.map(q => 
        q.id === quote.id ? { ...q, statut: 'facture' } : q
      ));
      
      toast.success('Devis converti en facture avec succès');
    } catch (error) {
      console.error('Error converting quote to invoice:', error);
      toast.error('Erreur lors de la conversion du devis en facture');
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'accepte':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check size={12} className="mr-1" />
            Accepté
          </span>
        );
      case 'refuse':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Ban size={12} className="mr-1" />
            Refusé
          </span>
        );
      case 'facture':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Receipt size={12} className="mr-1" />
            Facturé
          </span>
        );
      case 'en_attente':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            En attente
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
          <FileCheck className="w-8 h-8" />
          Devis client
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          Créer un devis
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search by quote number */}
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
              <option value="accepte">Accepté</option>
              <option value="refuse">Refusé</option>
              <option value="facture">Facturé</option>
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
          {filteredQuotes.length} devis trouvé(s) sur {quotes.length} au total
        </div>
      </div>

      {/* Quote Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Créer un devis</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-6">
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
                    Taux de TVA (%)
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
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingQuote}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingQuote ? 'Création...' : 'Créer le devis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {emailQuote && (
        <EmailModal
          type="invoice"
          onClose={() => setEmailQuote(null)}
          clientEmail={emailQuote.client?.email}
          invoice={{
            ...emailQuote,
            numero: emailQuote.numero,
            montant_ht: emailQuote.montant_ht,
            montant_ttc: emailQuote.montant_ttc,
            lien_pdf: emailQuote.lien_pdf || '',
            client: emailQuote.client
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
            {filteredQuotes.map((quote) => (
              <tr key={quote.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {quote.numero}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {quote.client?.nom}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(quote.date_emission), 'dd/MM/yyyy', { locale: fr })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {quote.montant_ht.toFixed(2)} €
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {quote.montant_ttc.toFixed(2)} €
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(quote.statut)}
                    {quote.statut !== 'facture' && (
                      <select
                        value={quote.statut}
                        onChange={(e) => handleStatusChange(quote.id, e.target.value as 'en_attente' | 'accepte' | 'refuse')}
                        className="text-xs border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="en_attente">En attente</option>
                        <option value="accepte">Accepté</option>
                        <option value="refuse">Refusé</option>
                      </select>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center space-x-2">
                    {quote.lien_pdf && (
                      <button
                        onClick={() => handleDownloadPDF(quote)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Télécharger le devis"
                      >
                        <Download size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => setEmailQuote(quote)}
                      className="text-green-600 hover:text-green-800"
                      title="Envoyer par email"
                    >
                      <Mail size={18} />
                    </button>
                    {(quote.statut === 'accepte' || quote.statut === 'en_attente') && !quote.invoice_id && (
                      <button
                        onClick={() => handleConvertToInvoice(quote)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Convertir en facture"
                      >
                        <Receipt size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredQuotes.length === 0 && (
          <div className="text-center py-12">
            <FileCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {quotes.length === 0 ? 'Aucun devis' : 'Aucun devis trouvé'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {quotes.length === 0 
                ? 'Les devis créés apparaîtront ici.'
                : 'Essayez de modifier vos critères de recherche.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}