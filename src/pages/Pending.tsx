import React, { useState } from 'react';
import { useSlips } from '../hooks/useSlips';
import SlipStatusSelect from '../components/SlipStatusSelect';
import ActionButtons from '../components/ActionButtons';
import TableHeader from '../components/TableHeader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Pending() {
  const [activeType, setActiveType] = useState<'all' | 'transport' | 'freight'>('all');
  
  const { 
    data: transportSlips, 
    loading: loadingTransport,
    refresh: refreshTransport
  } = useSlips('transport');

  const { 
    data: freightSlips, 
    loading: loadingFreight,
    refresh: refreshFreight
  } = useSlips('freight');

  const pendingTransportSlips = transportSlips.filter(slip => slip.status === 'waiting');
  const pendingFreightSlips = freightSlips.filter(slip => slip.status === 'waiting');

  if (loadingTransport || loadingFreight) {
    return <div className="w-full max-w-[1600px] mx-auto p-8">Chargement...</div>;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Dossiers en attente</h1>

      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setActiveType('all')}
            className={`inline-flex items-center px-4 py-2 rounded-lg ${
              activeType === 'all'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setActiveType('transport')}
            className={`inline-flex items-center px-4 py-2 rounded-lg ${
              activeType === 'transport'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Transport
          </button>
          <button
            onClick={() => setActiveType('freight')}
            className={`inline-flex items-center px-4 py-2 rounded-lg ${
              activeType === 'freight'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Affrètement
          </button>
        </div>
      </div>

      {(activeType === 'all' || activeType === 'transport') && pendingTransportSlips.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Transport</h2>
          <div className="bg-white rounded-lg shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <TableHeader>Statut</TableHeader>
                  <TableHeader>Numéro</TableHeader>
                  <TableHeader>Client</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Véhicule</TableHeader>
                  <TableHeader>Prix HT</TableHeader>
                  <TableHeader align="center">Actions</TableHeader>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingTransportSlips.map((slip) => (
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
                      {slip.order_number ? `${slip.number} / ${slip.order_number}` : slip.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {slip.client?.nom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(slip.delivery_date), 'dd/MM/yyyy', { locale: fr })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {slip.vehicle_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {slip.price} €
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ActionButtons
                        slip={slip}
                        onEdit={() => {}}
                        onEmail={() => {}}
                        onUpload={() => {}}
                        onView={() => {}}
                        onDownload={() => {}}
                        documentCount={Object.keys(slip.documents || {}).length}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeType === 'all' || activeType === 'freight') && pendingFreightSlips.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Affrètement</h2>
          <div className="bg-white rounded-lg shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <TableHeader>Statut</TableHeader>
                  <TableHeader>Numéro</TableHeader>
                  <TableHeader>Client</TableHeader>
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
                {pendingFreightSlips.map((slip) => (
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
                      {slip.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {slip.client?.nom}
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
                        onEdit={() => {}}
                        onEmail={() => {}}
                        onUpload={() => {}}
                        onView={() => {}}
                        onDownload={() => {}}
                        documentCount={Object.keys(slip.documents || {}).length}
                        showBPA={true}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pendingTransportSlips.length === 0 && pendingFreightSlips.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">Aucun dossier en attente</p>
        </div>
      )}
    </div>
  );
}