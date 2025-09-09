import React, { useState, useEffect } from 'react';
import { Search, Phone, Mail, Pencil } from 'lucide-react';
import ContactsModal from '../components/ContactsModal';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import type { Client } from '../types';
import toast from 'react-hot-toast';

const ClientsVisible = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showContactsModal, setShowContactsModal] = useState<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      fetchVisibleClients();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [clients, searchTerm]);

  const fetchVisibleClients = async () => {
    try {
      setLoading(true);
      
      // Fetch clients that are either:
      // 1. Created by the current user
      // 2. Explicitly shared with the current user via visible_by
      const { data, error } = await supabase
        .from('clients')
        .select('*, client_contacts(*), client_accounting_contacts(*)')
        .or(`visible_by.cs.{${user?.id}}`)
        .order('nom');

      if (error) throw error;
      
      // Also fetch clients where the user has created transport or freight slips
      const { data: transportClients, error: transportError } = await supabase
        .from('transport_slips')
        .select('client_id')
        .eq('created_by', user?.id);
      
      if (transportError) throw transportError;
      
      const { data: freightClients, error: freightError } = await supabase
        .from('freight_slips')
        .select('client_id')
        .eq('created_by', user?.id);
      
      if (freightError) throw freightError;
      
      // Get unique client IDs from transport and freight slips
      const clientIdsFromSlips = new Set([
        ...transportClients.map(ts => ts.client_id),
        ...freightClients.map(fs => fs.client_id)
      ]);
      
      // Fetch these additional clients
      if (clientIdsFromSlips.size > 0) {
        const { data: additionalClients, error: additionalError } = await supabase
          .from('clients')
          .select('*, client_contacts(*), client_accounting_contacts(*)')
          .in('id', Array.from(clientIdsFromSlips))
          .order('nom');
        
        if (additionalError) throw additionalError;
        
        // Merge and deduplicate clients
        const allClients = [...(data || []), ...(additionalClients || [])];
        const uniqueClients = Array.from(
          new Map(allClients.map(client => [client.id, client])).values()
        );
        
        setClients(uniqueClients);
      } else {
        setClients(data || []);
      }
    } catch (error) {
      console.error('Error fetching visible clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (searchTerm) {
      setFilteredClients(
        clients.filter(client => 
          client.nom.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredClients(clients);
    }
  };

  if (loading) {
    return <div className="w-full p-8">Chargement...</div>;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Mes Clients</h1>
      </div>

      <div className="mb-6 relative">
        <input
          type="text"
          placeholder="Rechercher un client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
      </div>

      {showContactsModal && (
        <ContactsModal
          clientId={showContactsModal}
          onClose={() => setShowContactsModal(null)}
          onUpdate={fetchVisibleClients}
        />
      )}

      <div className="bg-white rounded-lg shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[20%]">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Téléphone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[30%]">Adresse</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Facturation</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <tr key={client.id}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => setShowContactsModal(client.id)}
                      >
                        {client.nom}
                      </span>
                      <button
                        onClick={() => setShowContactsModal(client.id)}
                        className={`${
                          client.telephone ? 'text-blue-600' : 'text-gray-400'
                        } hover:text-blue-800 flex-shrink-0`}
                      >
                        <Phone size={16} />
                      </button>
                      <button
                        onClick={() => setShowContactsModal(client.id)}
                        className={`${
                          client.email ? 'text-blue-600' : 'text-gray-400'
                        } hover:text-blue-800 flex-shrink-0`}
                      >
                        <Mail size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 break-words max-w-[300px]">
                    {client.email || 'Non renseigné'}
                  </td>
                  <td className="px-6 py-4">
                    {client.telephone || 'Non renseigné'}
                  </td>
                  <td className="px-6 py-4 break-words max-w-[300px]">
                    {client.adresse_facturation || 'Non renseigné'}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      {client.preference_facturation || 'Non renseigné'}
                    </div>
                    <div className="text-sm text-gray-500">
                      TVA: {client.tva_rate || 20}%
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Aucun client trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsVisible;