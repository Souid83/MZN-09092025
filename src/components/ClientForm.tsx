import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useCountries } from '../hooks/useCountries';
import CountrySelector from './CountrySelector';
import CreateCountryModal from './CreateCountryModal';
import OpeningHours, { WeekSchedule } from './OpeningHours';
import type { Client, Contact, AccountingContact, CreateClientPayload } from '../types';

interface ClientFormProps {
  onSubmit: (data: CreateClientPayload) => void;
  onCancel: () => void;
  initialData?: Client | null;
  submitLabel?: string;
  loading?: boolean;
}

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

const DEFAULT_OPENING_HOURS: WeekSchedule = {
  monday: { start: '09:00', end: '18:00', closed: false },
  tuesday: { start: '09:00', end: '18:00', closed: false },
  wednesday: { start: '09:00', end: '18:00', closed: false },
  thursday: { start: '09:00', end: '18:00', closed: false },
  friday: { start: '09:00', end: '18:00', closed: false },
  saturday: { start: '09:00', end: '12:00', closed: false },
  sunday: { start: '09:00', end: '18:00', closed: true }
};

const ClientForm: React.FC<ClientFormProps> = ({
  onSubmit,
  onCancel,
  initialData = null,
  submitLabel = 'Créer',
  loading = false
}) => {
  const [showCreateCountry, setShowCreateCountry] = useState(false);
  const { data: countries, create: createCountry } = useCountries();
  const [selectedCountryId, setSelectedCountryId] = useState(initialData?.country_id || '');
  const [contacts, setContacts] = useState<Contact[]>(initialData?.contacts || []);
  const [accountingContact, setAccountingContact] = useState<AccountingContact>(
    initialData?.accounting_contact || {
      nom: '',
      prenom: '',
      email: '',
      telephone: ''
    }
  );
  const [openingHours, setOpeningHours] = useState<WeekSchedule>(
    initialData?.opening_hours || DEFAULT_OPENING_HOURS
  );
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
    
    const clientData: CreateClientPayload = {
      nom: formData.get('nom') as string,
      email: formData.get('email') as string,
      emails: emails,
      telephone: formData.get('telephone') as string,
      adresse_facturation: formData.get('adresse_facturation') as string,
      preference_facturation: formData.get('preference_facturation') as 'mensuelle' | 'hebdomadaire' | 'par_transport',
      tva_rate: finalVatRate,
      numero_commande_requis: formData.get('numero_commande_requis') === 'on',
      siret: formData.get('siret') as string,
      numero_tva: formData.get('numero_tva') as string,
      country_id: selectedCountryId || undefined,
      contacts,
      accounting_contact: accountingContact,
      opening_hours: openingHours
    };

    onSubmit(clientData);
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

  const addContact = () => {
    setContacts([...contacts, {
      service: '',
      nom: '',
      prenom: '',
      email: '',
      telephone: ''
    }]);
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateAccountingContact = (field: keyof AccountingContact, value: string) => {
    setAccountingContact({ ...accountingContact, [field]: value });
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
        <h2 className="text-2xl font-bold mb-6">{initialData ? 'Modifier le client' : 'Nouveau client'}</h2>
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
              <label className="block text-sm font-medium text-gray-700">Adresse de facturation</label>
              <textarea
                name="adresse_facturation"
                rows={3}
                defaultValue={initialData?.adresse_facturation}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Préférence de facturation</label>
              <select
                name="preference_facturation"
                defaultValue={initialData?.preference_facturation || 'mensuelle'}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="mensuelle">Mensuelle</option>
                <option value="hebdomadaire">Hebdomadaire</option>
                <option value="par_transport">Par transport</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Taux de TVA à appliquer à la facturation</label>
              <div className="grid grid-cols-2 gap-4">
                <select
                  value={selectedVatRate}
                  onChange={handleVatRateChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {VAT_RATES.map(rate => (
                    <option key={rate.value} value={rate.value.toString()}>
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
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="numero_commande_requis"
                  defaultChecked={initialData?.numero_commande_requis}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-600">Numéro de commande requis</span>
              </label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Contacts</h3>
                <button
                  type="button"
                  onClick={addContact}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Ajouter un contact
                </button>
              </div>
              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Contact #{index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Service</label>
                        <input
                          type="text"
                          value={contact.service}
                          onChange={(e) => updateContact(index, 'service', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nom</label>
                        <input
                          type="text"
                          value={contact.nom}
                          onChange={(e) => updateContact(index, 'nom', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Prénom</label>
                        <input
                          type="text"
                          value={contact.prenom}
                          onChange={(e) => updateContact(index, 'prenom', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={contact.email || ''}
                          onChange={(e) => updateContact(index, 'email', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                        <input
                          type="tel"
                          value={contact.telephone || ''}
                          onChange={(e) => updateContact(index, 'telephone', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Contact comptabilité</h3>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nom</label>
                    <input
                      type="text"
                      value={accountingContact.nom}
                      onChange={(e) => updateAccountingContact('nom', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prénom</label>
                    <input
                      type="text"
                      value={accountingContact.prenom}
                      onChange={(e) => updateAccountingContact('prenom', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={accountingContact.email || ''}
                      onChange={(e) => updateAccountingContact('email', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                    <input
                      type="tel"
                      value={accountingContact.telephone || ''}
                      onChange={(e) => updateAccountingContact('telephone', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <OpeningHours value={openingHours} onChange={setOpeningHours} />
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

export default ClientForm;