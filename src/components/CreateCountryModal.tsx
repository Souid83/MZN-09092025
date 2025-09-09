import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Country } from '../types';

interface CreateCountryModalProps {
  onClose: () => void;
  onSubmit: (name: string, code: string) => void;
  loading?: boolean;
  editingCountry?: Country;
}

const CreateCountryModal: React.FC<CreateCountryModalProps> = ({
  onClose,
  onSubmit,
  loading = false,
  editingCountry
}) => {
  const [name, setName] = useState(editingCountry?.name || '');
  const [code, setCode] = useState(editingCountry?.code || '');

  useEffect(() => {
    if (editingCountry) {
      setName(editingCountry.name);
      setCode(editingCountry.code);
    }
  }, [editingCountry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(name, code.toUpperCase());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {editingCountry ? 'Modifier le pays' : 'Ajouter un pays'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nom du pays
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Code pays (2 lettres)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 2))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              maxLength={2}
              pattern="[A-Za-z]{2}"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Ex: FR pour France, ES pour Espagne
            </p>
          </div>

          {editingCountry && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Drapeau actuel
              </label>
              <div className="mt-2">
                <img
                  src={editingCountry.flag_url}
                  alt={`Drapeau ${editingCountry.name}`}
                  className="h-8 rounded"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (editingCountry ? 'Modification...' : 'Création...') : (editingCountry ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCountryModal;