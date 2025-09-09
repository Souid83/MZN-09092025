import React, { useState } from 'react';
import { Truck, Euro, Calendar, Phone, Mail, Pencil } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import SlipForm from '../components/SlipForm';
import SlipStatusSelect from '../components/SlipStatusSelect';
import EmailModal from '../components/EmailModal';
import DocumentUploaderModal from '../components/DocumentUploaderModal';
import DocumentViewerModal from '../components/DocumentViewerModal';
import ActionButtons from '../components/ActionButtons';
import TableHeader from '../components/TableHeader';
import ContactsModal from '../components/ContactsModal';
import FournisseurDetailsModal from '../components/FournisseurDetailsModal';
import { useSlips } from '../hooks/useSlips';
import { useClients } from '../hooks/useClients';
import { useFournisseurs } from '../hooks/useFournisseurs';
import { generatePDF } from '../services/slips';
import type { Client, Fournisseur, TransportSlip, FreightSlip } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const Pilotage = () => {
  const [activeTab, setActiveTab] = useState<'deliveries' | 'freight' | null>(null);
  const [activeFilter, setActiveFilter] = useState<'day' | 'week'>('day');
  const [dateRange, setDateRange] = useState<{ start: string; end?: string }>({
    start: new Date().toISOString().split('T')[0],
  });
  const [showContactsModal, setShowContactsModal] = useState<Client | null>(null);
  const [showFournisseurModal, setShowFournisseurModal] = useState<Fournisseur | null>(null);
  const [editingSlip, setEditingSlip] = useState<TransportSlip | FreightSlip | null>(null);
  const [emailSlip, setEmailSlip] = useState<TransportSlip | FreightSlip | null>(null);
  const [uploadingSlip, setUploadingSlip] = useState<TransportSlip | FreightSlip | null>(null);
  const [viewingDocuments, setViewingDocuments] = useState<TransportSlip | FreightSlip | null>(null);
  
  const { data: clients } = useClients();
  const { data: fournisseurs } = useFournisseurs();

  const { 
    data: transportSlips, 
    loading: loadingTransport,
    refresh: refreshTransport
  } = useSlips('transport', dateRange.start, dateRange.end);

  const { 
    data: freightSlips, 
    loading: loadingFreight,
    refresh: refreshFreight
  } = useSlips('freight', dateRange.start, dateRange.end);

  const totalLivraisons = transportSlips.length;
  const totalAffretements = freightSlips.length;
  const margeDuJour = Math.floor(freightSlips
    .reduce((sum, a) => sum + (a.margin || 0), 0));
  const caDuJour = Math.floor(freightSlips
    .reduce((sum, a) => sum + (a.selling_price || 0), 0));

  const handleClientClick = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setShowContactsModal(client);
    }
  };

  const handleFournisseurClick = (fournisseurId: string) => {
    const fournisseur = fournisseurs.find(f => f.id === fournisseurId);
    if (fournisseur) {
      setShowFournisseurModal(fournisseur);
    }
  };

  const handleDownload = async (slip: TransportSlip | FreightSlip, type: 'transport' | 'freight' = 'transport'): Promise<void> => {
    try {
      const pdfBlob = await generatePDF(slip, type);
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      const clientName = slip.client?.nom || 'Client';
      const slipNumber = slip.number;
      const currentDate = format(new Date(), 'dd-MM-yyyy', { locale: fr });
      const filename = `${clientName} - ${slipNumber} - ${currentDate}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Bordereau téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading slip:', error);
      toast.error('Erreur lors du téléchargement du bordereau');
    }
  };

  const getDocumentCount = (slip: TransportSlip | FreightSlip) => {
    return slip.documents ? Object.keys(slip.documents).length : 0;
  };

  if (loadingTransport || loadingFreight) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Pilotage</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          icon={<Truck size={32} className="mx-auto mb-4" />}
          value={totalLivraisons.toString()}
          title="Livraisons"
          className="text-center"
        />
        <DashboardCard
          icon={<Truck size={32} className="mx-auto mb-4" />}
          value={totalAffretements.toString()}
          title="Affrètement"
          color="text-green-600"
          className="text-center"
        />
        <DashboardCard
          icon={<Euro size={32} className="mx-auto mb-4" />}
          value={`${margeDuJour} €`}
          title="Marge du jour"
          color="text-blue-600"
          className="text-center"
        />
        <DashboardCard
          icon={<Euro size={32} className="mx-auto mb-4" />}
          value={`${caDuJour} €`}
          title="CA du jour"
          color="text-purple-600"
          className="text-center"
        />
      </div>

      <div className="mb-6 flex flex-col items-center space-y-4">
        <div className="space-x-4">
          <button
            className={`w-40 py-3 rounded-lg border border-gray-300 font-medium ${
              activeTab === 'deliveries'
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('deliveries')}
          >
            Livraison
          </button>
          <button
            className={`w-40 py-3 rounded-lg border border-gray-300 font-medium ${
              activeTab === 'freight'
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('freight')}
          >
            Affrètement
          </button>
        </div>

        <div className="space-x-2">
          <button
            className={`px-4 py-1 rounded-md text-sm ${
              activeFilter === 'day'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100'
            }`}
            onClick={() => {
              setActiveFilter('day');
              setDateRange({ 
                start: new Date().toISOString().split('T')[0]
              });
            }}
          >
            Jour
          </button>
          <button
            className={`px-4 py-1 rounded-md text-sm ${
              activeFilter === 'week'
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-50 text-gray-600 border border-gray-300 hover:bg-gray-100'
            }`}
            onClick={() => {
              setActiveFilter('week');
              const today = new Date();
              const weekAgo = new Date();
              weekAgo.setDate(today.getDate() - 7);
              setDateRange({
                start: weekAgo.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0]
              });
            }}
          >
            Semaine
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Calendar size={20} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {activeFilter === 'week' && (
            <>
              <span className="text-gray-500">à</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
        </div>
      </div>

      {showContactsModal && (
        <ContactsModal
          clientId={showContactsModal.id}
          onClose={() => setShowContactsModal(null)}
          onUpdate={() => {}}
        />
      )}

      {showFournisseurModal && (
        <FournisseurDetailsModal
          fournisseur={showFournisseurModal}
          onClose={() => setShowFournisseurModal(null)}
        />
      )}

      {editingSlip && (
        <SlipForm
          type={activeTab === 'freight' ? 'freight' : 'transport'}
          onSubmit={() => {
            setEditingSlip(null);
            if (activeTab === 'freight') {
              refreshFreight();
            } else {
              refreshTransport();
            }
          }}
          onCancel={() => setEditingSlip(null)}
          initialData={editingSlip}
        />
      )}

      {emailSlip && (
        <EmailModal
          slip={emailSlip}
          type={activeTab === 'freight' ? 'freight' : 'transport'}
          onClose={() => setEmailSlip(null)}
          clientEmail={emailSlip.client?.email}
        />
      )}

      {uploadingSlip && (
        <DocumentUploaderModal
          slipId={uploadingSlip.id}
          slipType={activeTab === 'freight' ? 'freight' : 'transport'}
          onClose={() => setUploadingSlip(null)}
          onUploadComplete={() => {
            if (activeTab === 'freight') {
              refreshFreight();
            } else {
              refreshTransport();
            }
          }}
        />
      )}

      {viewingDocuments && (
        <DocumentViewerModal
          slipId={viewingDocuments.id}
          slipType={activeTab === 'freight' ? 'freight' : 'transport'}
          onClose={() => setViewingDocuments(null)}
          onDocumentDeleted={() => {
            if (activeTab === 'freight') {
              refreshFreight();
            } else {
              refreshTransport();
            }
          }}
        />
      )}

      {activeTab && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                {activeTab === 'deliveries' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chauffeur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Véhicule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix HT</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix/km</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Affréteur</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix HT</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vente HT</th>
                  </>
                )}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeTab === 'freight'
                ? freightSlips.map((slip) => (
                    <tr key={slip.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SlipStatusSelect
                          id={slip.id}
                          status={slip.status}
                          type="freight"
                          onUpdate={refreshFreight}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="cursor-pointer hover:text-blue-600"
                            onClick={() => handleClientClick(slip.client_id || '')}
                          >
                            {slip.client?.nom}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{slip.loading_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => handleFournisseurClick(slip.fournisseur_id || '')}
                        >
                          {slip.fournisseur?.nom}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{Math.floor(slip.purchase_price || 0)} €</td>
                      <td className="px-6 py-4 whitespace-nowrap">{Math.floor(slip.selling_price || 0)} €</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ActionButtons
                          slip={slip}
                          onEdit={() => setEditingSlip(slip)}
                          onEmail={() => setEmailSlip(slip)}
                          onUpload={() => setUploadingSlip(slip)}
                          onView={() => setViewingDocuments(slip)}
                          onDownload={() => handleDownload(slip, 'freight')}
                          documentCount={getDocumentCount(slip)}
                          showBPA={true}
                        />
                      </td>
                    </tr>
                  ))
                : transportSlips.map((slip) => (
                    <tr key={slip.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <SlipStatusSelect
                          id={slip.id}
                          status={slip.status}
                          type="transport"
                          onUpdate={refreshTransport}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className="cursor-pointer hover:text-blue-600"
                            onClick={() => handleClientClick(slip.client_id || '')}
                          >
                            {slip.client?.nom}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{slip.loading_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">John Doe</td>
                      <td className="px-6 py-4 whitespace-nowrap">{slip.vehicle_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{Math.floor(slip.price)} €</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {slip.kilometers && slip.kilometers > 0 
                          ? `${(slip.price / slip.kilometers).toFixed(2)} €` 
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ActionButtons
                          slip={slip}
                          onEdit={() => setEditingSlip(slip)}
                          onEmail={() => setEmailSlip(slip)}
                          onUpload={() => setUploadingSlip(slip)}
                          onView={() => setViewingDocuments(slip)}
                          onDownload={() => handleDownload(slip, 'transport')}
                          documentCount={getDocumentCount(slip)}
                        />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Pilotage;