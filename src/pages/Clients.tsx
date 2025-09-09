import React, { useState, useRef } from 'react';
import { Plus, Search, FileDown, Upload, Phone, Mail, Pencil, UserPlus, X } from 'lucide-react';
import ContactsModal from '../components/ContactsModal';
import ClientForm from '../components/ClientForm';
import { useClients, useCreateClient, useUpdateClient } from '../hooks/useClients';
import { parseClientsExcel } from '../utils/excel-import';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import type { Client, CreateClientPayload } from '../types';
import toast from 'react-hot-toast';

const Clients = () => {
  const [showContactsModal, setShowContactsModal] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const { data: clients, loading, error, refresh } = useClients();
  const { create, loading: creating } = useCreateClient();
  const { update, loading: updating } = useUpdateClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Client | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<{id: string, name: string, role: string}[]>([]);
  const { user } = useUser();

  const filteredClients = clients.filter(client =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch all users for the assign modal
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .order('name');
      
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  const handleCreate = async (clientData: CreateClientPayload) => {
    try {
      await create(clientData);
      setShowForm(false);
      refresh();
      toast.success('Client créé avec succès');
    } catch (err) {
      console.error('Error creating client:', err);
      toast.error('Erreur lors de la création du client');
    }
  };

  const handleUpdate = async (clientData: CreateClientPayload) => {
    if (!editingClient) return;
    
    try {
      await update(editingClient.id, clientData);
      setEditingClient(null);
      refresh();
      toast.success('Client mis à jour avec succès');
    } catch (err) {
      console.error('Error updating client:', err);
      toast.error('Erreur lors de la mise à jour du client');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      // Parse the file
      const clients = await parseClientsExcel(file);
      
      if (clients.length === 0) {
        toast.error('Le fichier ne contient aucun client valide');
        return;
      }

      // Create each client
      let successCount = 0;
      let errorCount = 0;
      
      for (const client of clients) {
        try {
          await create(client);
          successCount++;
        } catch (err) {
          console.error('Error importing client:', err);
          errorCount++;
        }
      }
      
      // Show success/error message
      if (successCount > 0 && errorCount === 0) {
        toast.success(`${successCount} client(s) importé(s) avec succès`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.success(`${successCount} client(s) importé(s) avec succès, ${errorCount} échec(s)`);
      } else {
        toast.error(`Échec de l'import: aucun client n'a pu être importé`);
      }
      
      // Refresh the client list
      refresh();
    } catch (err) {
      console.error('Error parsing import file:', err);
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
    link.href = format === 'csv' ? '/sample_clients.csv' : '/sample_clients.xlsx';
    link.download = format === 'csv' ? 'sample_clients.csv' : 'sample_clients.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenAssignModal = (client: Client) => {
    setShowAssignModal(client);
    setAssignedUsers(client.visible_by || []);
    fetchUsers();
  };

  const handleAssignUsers = async () => {
    if (!showAssignModal) return;
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({ visible_by: assignedUsers })
        .eq('id', showAssignModal.id);
      
      if (error) throw error;
      
      toast.success('Utilisateurs assignés avec succès');
      setShowAssignModal(null);
      refresh();
    } catch (err) {
      console.error('Error assigning users:', err);
      toast.error('Erreur lors de l\'assignation des utilisateurs');
    }
  };

  const toggleUserAssignment = (userId: string) => {
    if (assignedUsers.includes(userId)) {
      setAssignedUsers(assignedUsers.filter(id => id !== userId));
    } else {
      setAssignedUsers([...assignedUsers, userId]);
    }
  };

  if (loading) {
    return <div className="w-full p-8">Chargement...</div>;
  }

  if (error) {
    return <div className="w-full p-8 text-red-600">Erreur: {error.message}</div>;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Clients</h1>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={20} />
            Nouveau client
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
            onChange={handleImportFile}
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
        </div>
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

      {(showForm || editingClient) && (
        <ClientForm
          onSubmit={editingClient ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingClient(null);
          }}
          initialData={editingClient}
          submitLabel={editingClient ? 'Modifier' : 'Créer'}
          loading={creating || updating}
        />
      )}

      {showContactsModal && (
        <ContactsModal
          clientId={showContactsModal}
          onClose={() => setShowContactsModal(null)}
          onUpdate={refresh}
        />
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Assigner des utilisateurs</h2>
              <button
                onClick={() => setShowAssignModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="mb-4 text-sm text-gray-600">
              Sélectionnez les utilisateurs qui peuvent voir le client <strong>{showAssignModal.nom}</strong>
            </p>
            
            <div className="max-h-60 overflow-y-auto mb-4">
              {allUsers
                .filter(u => u.role === 'exploit') // Only show exploit users
                .map(user => (
                  <div key={user.id} className="flex items-center p-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={assignedUsers.includes(user.id)}
                      onChange={() => toggleUserAssignment(user.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label htmlFor={`user-${user.id}`} className="ml-2 text-sm text-gray-700">
                      {user.name} <span className="text-xs text-gray-500">({user.role})</span>
                    </label>
                  </div>
                ))}
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAssignModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAssignUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClients.map((client) => (
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
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingClient(client)}
                      className="text-gray-600 hover:text-blue-600"
                      title="Modifier"
                    >
                      <Pencil size={16} />
                    </button>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleOpenAssignModal(client)}
                        className="text-gray-600 hover:text-green-600"
                        title="Assigner des utilisateurs"
                      >
                        <UserPlus size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clients;