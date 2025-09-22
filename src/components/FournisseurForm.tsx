import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useCountries } from '../hooks/useCountries';
import CountrySelector from './CountrySelector';
import CreateCountryModal from './CreateCountryModal';
import type { Fournisseur, CreateFournisseurPayload } from '../types';

// Liste des taux de TVA européens courants
const VAT_RATES = [
  { value: 20, label: 'France - 20%' },
  { value: 19, label: 'Allemagne - 19%' },
  { value: 21, label: 'Belgique - 21%' },
  { value: 21, label: 'Espagne - 21%' },
  { value: 22, label: 'Italie - 22%' },
  { value: 21, label: 'Pays-Bas - 21%' },
  { value: 23, label: 'Portugal - 23%' },
  { value: 25, label: 'Suède - 25%' },
  { value: 24, label: 'Finlande - 24%' },
  { value: 25, label: 'Danemark - 25%' },
  { value: 24, label: 'Grèce - 24%' },
  { value: 27, label: 'Hongrie - 27%' },
  { value: 23, label: 'Irlande - 23%' },
  { value: 23, label: 'Pologne - 23%' },
  { value: 19, label: 'Roumanie - 19%' },
  { value: 0, label: 'Exonéré - 0%' }
];

interface FournisseurFormProps {
  onSubmit: (data: CreateFournisseurPayload) => void;
  onCancel: () => void;
  initialData?: Fournisseur | null;
  submitLabel?: string;
  loading?: boolean;
}

const FournisseurForm: React.FC<FournisseurFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialData = null, 
  submitLabel = 'Créer',
  loading = false 
}) => {
  const [showCreateCountry, setShowCreateCountry] = useState(false);
  const { data: countries, create: createCountry } = useCountries();
  const [selectedCountryId, setSelectedCountryId] = useState(initialData?.country_id || '');
  const [emails, setEmails] = useState<string[]>(initialData?.emails || []);
  const [customVatRate, setCustomVatRate] = useState<string>('');
  const [selectedVatRate, setSelectedVatRate] = useState<string>(
    initialData?.tva_rate ? initialData.tva_rate.toString() : '20'
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Determine the final VAT rate
    let finalVatRate: number;
    if (selectedVatRate === 'custom') {
      finalVatRate = parseFloat(customVatRate) || 0;
    } else {
      finalVatRate = parseFloat(selectedVatRate) || 20;
    }
    
    const fournisseurData: CreateFournisseurPayload = {
      nom: formData.get('nom') as string,
      contact_nom: formData.get('contact_nom') as string,
      email: formData.get('email') as string,
      emails: emails,
      telephone: formData.get('telephone') as string,
      services_offerts: (formData.get('services_offerts') as string).split(',').map(s => s.trim()),
      zones_couvertes: (formData.get('zones_couvertes') as string).split(',').map(z => z.trim()),
      conditions_paiement: formData.get('conditions_paiement') as string,
      siret: formData.get('siret') as string,
      numero_tva: formData.get('numero_tva') as string,
      country_id: selectedCountryId || undefined,
      tva_rate: finalVatRate
    };

    onSubmit(fournisseurData);
  };

  const handleCreateCountry = async (name: string, code: string) => {
    try {
      const newCountry = await createCountry(name, code);
      setSelectedCountryId(newCountry.id);
      setShowCreateCountry(false);
    } catch (error) {
      console.error('Error creating country:', error);
    }
  };

  const addEmail = () => {
    setEmails([...emails, '']);
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleVatRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedVatRate(value);
    
    // If a predefined rate is selected, clear the custom rate
    if (value !== 'custom') {
      setCustomVatRate('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{initialData ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
              <CountrySelector
                countries={countries}
                selectedCountryId={selectedCountryId}
                onSelect={setSelectedCountryId}
                onCreateCountry={() => setShowCreateCountry(true)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nom</label>
              <input
                type="text"
                name="nom"
                required
                defaultValue={initialData?.nom}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contact</label>
              <input
                type="text"
                name="contact_nom"
                defaultValue={initialData?.contact_nom}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email principal</label>
              <input
                type="email"
                name="email"
                defaultValue={initialData?.email}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Emails supplémentaires</label>
                <button
                  type="button"
                  onClick={addEmail}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Ajouter un email
                </button>
              </div>
              <div className="space-y-2">
                {emails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Email supplémentaire"
                    />
                    <button
                      type="button"
                      onClick={() => removeEmail(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                type="tel"
                name="telephone"
                defaultValue={initialData?.telephone}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Taux de TVA à appliquer à la facturation</label>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={selectedVatRate}
                  onChange={handleVatRateChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {VAT_RATES.map((rate, idx) => (
                    <option key={rate.value + '-' + idx} value={rate.value.toString()}>
                      {rate.label}
                    </option>
                  ))}
                  <option value="custom">Taux personnalisé</option>
                </select>
                
                {selectedVatRate === 'custom' && (
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={customVatRate}
                      onChange={(e) => setCustomVatRate(e.target.value)}
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="Taux personnalisé"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required={selectedVatRate === 'custom'}
                    />
                    <span className="ml-2">%</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">SIRET</label>
              <input
                type="text"
                name="siret"
                defaultValue={initialData?.siret}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="123 456 789 00012"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">N° TVA intracommunautaire</label>
              <input
                type="text"
                name="numero_tva"
                defaultValue={initialData?.numero_tva}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="FR12345678900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Services offerts (séparés par des virgules)</label>
              <textarea
                name="services_offerts"
                rows={3}
                defaultValue={initialData?.services_offerts?.join(', ')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Transport routier, Transport frigorifique, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Zones couvertes (séparées par des virgules)</label>
              <textarea
                name="zones_couvertes"
                rows={3}
                defaultValue={initialData?.zones_couvertes?.join(', ')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Île-de-France, Normandie, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Conditions de paiement</label>
              <input
                type="text"
                name="conditions_paiement"
                defaultValue={initialData?.conditions_paiement}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="30 jours fin de mois"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Chargement...' : submitLabel}
            </button>
          </div>
        </form>
      </div>

      {showCreateCountry && (
        <CreateCountryModal
          onClose={() => setShowCreateCountry(false)}
          onSubmit={handleCreateCountry}
        />
      )}
    </div>
  );
};

export default FournisseurForm;
