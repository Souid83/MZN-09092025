import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { Users as UsersIcon, Plus, Trash2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserFormData {
  name: string;
  email: string;
  role: 'admin' | 'exploit' | 'compta' | 'direction';
  email_signature?: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'exploit',
    email_signature: ''
  });
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            email: formData.email,
            role: formData.role,
            metadata: { email_signature: formData.email_signature }
          })
          .eq('id', editingUser);

        if (error) throw error;
        toast.success('Utilisateur mis à jour avec succès');
        setEditingUser(null);
      } else {
        // Create new user
        const { error } = await supabase
          .from('users')
          .insert([{
            name: formData.name,
            email: formData.email,
            role: formData.role,
            metadata: { email_signature: formData.email_signature }
          }]);

        if (error) throw error;
        toast.success('Utilisateur créé avec succès');
      }

      setFormData({
        name: '',
        email: '',
        role: 'exploit',
        email_signature: ''
      });
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Erreur lors de l\'enregistrement de l\'utilisateur');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      toast.success('Utilisateur supprimé avec succès');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role as 'admin' | 'exploit' | 'compta' | 'direction',
      email_signature: user.metadata?.email_signature || ''
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      role: 'exploit',
      email_signature: ''
    });
  };

  if (loading) {
    return <div className="w-full max-w-[1600px] mx-auto p-8">Chargement...</div>;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UsersIcon className="w-8 h-8" />
          Gestion des utilisateurs
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Plus size={20} />
            {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rôle</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="exploit">Exploitation</option>
                <option value="admin">Admin</option>
                <option value="compta">Comptabilité</option>
                <option value="direction">Direction</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Signature email
              </label>
              <textarea
                name="email_signature"
                value={formData.email_signature}
                onChange={handleInputChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Votre signature d'email (nom, fonction, téléphone, etc.)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Cette signature sera automatiquement ajoutée à la fin des emails envoyés par cet utilisateur.
              </p>
            </div>

            <div className="flex gap-2">
              {editingUser && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={creating}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Enregistrement...' : (editingUser ? 'Mettre à jour' : 'Créer l\'utilisateur')}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Liste des utilisateurs</h2>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <div className="text-xs text-gray-400">{user.role}</div>
                  {user.metadata?.email_signature && (
                    <div className="flex items-center text-xs text-blue-600 mt-1">
                      <Mail size={12} className="mr-1" />
                      Signature personnalisée
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50"
                    title="Modifier"
                  >
                    <Mail size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}