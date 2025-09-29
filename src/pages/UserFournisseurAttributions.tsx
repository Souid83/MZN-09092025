import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Search, Trash2, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserFournisseurs, addUserFournisseur, removeUserFournisseur } from '../services/userFournisseurs';
import type { User } from '../types';
import type { UserFournisseursData, UserFournisseurAttribution } from '../services/userFournisseurs';
import toast from 'react-hot-toast';

export default function UserFournisseurAttributions() {
  const [exploitationUsers, setExploitationUsers] = useState<User[]>([]);
  const [allFournisseurs, setAllFournisseurs] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userFournisseursData, setUserFournisseursData] = useState<UserFournisseursData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUserFournisseurs, setLoadingUserFournisseurs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddFournisseur, setShowAddFournisseur] = useState(false);
  const [selectedFournisseurId, setSelectedFournisseurId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .in('role', ['exploit', 'exploitation'])
          .order('name');
        if (usersError) throw usersError;
        setExploitationUsers(users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Erreur lors du chargement des employés');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserFournisseurs();
    } else {
      setUserFournisseursData(null);
    }
  }, [selectedUserId]);

  useEffect(() => {
    const fetchAllFournisseurs = async () => {
      try {
        const { data: fournisseurs, error: fournisseursError } = await supabase
          .from('fournisseurs')
          .select('id, nom, email, telephone')
          .order('nom');
        if (fournisseursError) throw fournisseursError;
        setAllFournisseurs(fournisseurs || []);
      } catch (error) {
        console.error('Error fetching all fournisseurs:', error);
        toast.error('Erreur lors du chargement des fournisseurs');
      }
    };
    fetchAllFournisseurs();
  }, []);

  const fetchUserFournisseurs = async () => {
    if (!selectedUserId) return;

    setLoadingUserFournisseurs(true);
    try {
      const data = await getUserFournisseurs(selectedUserId);
      setUserFournisseursData(data);
    } catch (error) {
      console.error('Error fetching user fournisseurs:', error);
      toast.error('Erreur lors du chargement des fournisseurs de l\'utilisateur');
    } finally {
      setLoadingUserFournisseurs(false);
    }
  };

  const handleAddFournisseur = async () => {
    if (!selectedUserId || !selectedFournisseurId) {
      toast.error('Veuillez sélectionner un fournisseur');
      return;
    }

    setAdding(true);
    try {
      await addUserFournisseur(selectedUserId, selectedFournisseurId);
      toast.success('Fournisseur attribué avec succès');
      setShowAddFournisseur(false);
      setSelectedFournisseurId('');
      setSearchTerm('');
      await fetchUserFournisseurs();
    } catch (error) {
      console.error('Error adding fournisseur attribution:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'attribution du fournisseur');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveAttribution = async (attributionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette attribution ?')) return;

    try {
      await removeUserFournisseur(attributionId);
      toast.success('Attribution supprimée avec succès');
      await fetchUserFournisseurs();
    } catch (error) {
      console.error('Error removing fournisseur attribution:', error);
      toast.error('Erreur lors de la suppression de l\'attribution');
    }
  };

  const getAvailableFournisseurs = () => {
    if (!userFournisseursData) return allFournisseurs;
    const attributedFournisseurIds = new Set([
      ...userFournisseursData.attributions.map(attr => attr.fournisseur_id),
      ...userFournisseursData.createdFournisseurs.map(f => f.id)
    ]);
    return allFournisseurs.filter(f => !attributedFournisseurIds.has(f.id));
  };

  const filteredAvailableFournisseurs = getAvailableFournisseurs().filter(f =>
    f.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = exploitationUsers.find(user => user.id === selectedUserId);

  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Building2 className="w-8 h-8" />
          Attribution fournisseurs par employé
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste des employés */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Users size={20} />
            Employés exploitation
          </h2>

          <div className="space-y-2">
            {exploitationUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setSelectedUserId(user.id);
                  setUserFournisseursData(null);
                }}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedUserId === user.id
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'hover:bg-gray-50 border border-transparent'
                }`}
              >
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </button>
            ))}
          </div>

          {exploitationUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucun employé exploitation trouvé
            </div>
          )}
        </div>

        {/* Détails de l'employé sélectionné */}
        <div className="lg:col-span-2">
          {selectedUserId ? (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">
                  Fournisseurs attribués à {selectedUser?.name}
                </h2>
                <button
                  onClick={() => setShowAddFournisseur(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Attribuer un fournisseur
                </button>
              </div>

              {loadingUserFournisseurs ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-600">Chargement...</div>
                </div>
              ) : userFournisseursData ? (
                <div className="space-y-6">
                  {/* Fournisseurs créés par l'employé */}
                  {userFournisseursData.createdFournisseurs.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4 text-green-700">
                        Fournisseurs créés par {selectedUser?.name} ({userFournisseursData.createdFournisseurs.length})
                      </h3>
                      <div className="space-y-2">
                        {userFournisseursData.createdFournisseurs.map((fournisseur) => (
                          <div
                            key={fournisseur.id}
                            className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                          >
                            <div>
                              <div className="font-medium text-green-800">{fournisseur.nom}</div>
                              <div className="text-sm text-green-600">
                                {fournisseur.email && `${fournisseur.email} • `}
                                {fournisseur.telephone}
                              </div>
                              <div className="text-xs text-green-500">
                                Créé le {new Date(fournisseur.created_at).toLocaleDateString('fr-FR')}
                              </div>
                              <div className="text-xs text-green-700 font-semibold">
                                Créé par {selectedUser?.name}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fournisseurs attribués par l'admin */}
                  {userFournisseursData.attributions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-4 text-blue-700">
                        Fournisseurs attribués par l'admin ({userFournisseursData.attributions.length})
                      </h3>
                      <div className="space-y-2">
                        {userFournisseursData.attributions.map((attribution) => (
                          <div
                            key={attribution.id}
                            className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <div>
                              <div className="font-medium text-blue-800">{attribution.fournisseurs.nom}</div>
                              <div className="text-sm text-blue-600">
                                {attribution.fournisseurs.email && `${attribution.fournisseurs.email} • `}
                                {attribution.fournisseurs.telephone}
                              </div>
                              <div className="text-xs text-blue-500">
                                Attribué le {new Date(attribution.created_at).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveAttribution(attribution.id)}
                              className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                              title="Retirer l'attribution"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aucun fournisseur */}
                  {userFournisseursData.attributions.length === 0 && userFournisseursData.createdFournisseurs.length === 0 && (
                    <div className="text-center py-12">
                      <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        Aucun fournisseur attribué
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Cet employé n'a accès à aucun fournisseur pour le moment.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Sélectionnez un employé
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choisissez un employé dans la liste pour voir et gérer ses attributions fournisseurs.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'ajout de fournisseur */}
      {showAddFournisseur && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Attribuer un fournisseur</h2>
              <button
                onClick={() => {
                  setShowAddFournisseur(false);
                  setSearchTerm('');
                  setSelectedFournisseurId('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employé sélectionné
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium">{selectedUser?.name}</div>
                  <div className="text-sm text-gray-500">{selectedUser?.email}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rechercher un fournisseur
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Rechercher par nom de fournisseur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fournisseur à attribuer
                </label>
                <select
                  value={selectedFournisseurId}
                  onChange={(e) => setSelectedFournisseurId(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {filteredAvailableFournisseurs.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nom}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {filteredAvailableFournisseurs.length} fournisseur(s) disponible(s)
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowAddFournisseur(false);
                  setSearchTerm('');
                  setSelectedFournisseurId('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAddFournisseur}
                disabled={!selectedFournisseurId || adding}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? 'Attribution...' : 'Attribuer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
