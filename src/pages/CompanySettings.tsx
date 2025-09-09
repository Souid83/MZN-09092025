import React, { useState, useEffect } from 'react';
import { Save, Building, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface CompanyData {
  nom_societe: string;
  adresse: string;
  code_postal: string;
  ville: string;
  pays: string;
  siret: string;
  numero_tva: string;
  telephone: string;
  email: string;
  site_web: string;
  logo_url: string;
  rib_banque: string;
  rib_iban: string;
  rib_bic: string;
  mentions_legales: string;
}

const defaultCompanyData: CompanyData = {
  nom_societe: '',
  adresse: '',
  code_postal: '',
  ville: '',
  pays: 'France',
  siret: '',
  numero_tva: '',
  telephone: '',
  email: '',
  site_web: '',
  logo_url: '',
  rib_banque: '',
  rib_iban: '',
  rib_bic: '',
  mentions_legales: ''
};

export default function CompanySettings() {
  const [companyData, setCompanyData] = useState<CompanyData>(defaultCompanyData);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('config')
        .eq('type', 'company')
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.config) {
        setCompanyData({ ...defaultCompanyData, ...data.config });
      }
    } catch (error) {
      console.error('Error loading company data:', error);
      toast.error('Erreur lors du chargement des données');
    }
  };

  const handleInputChange = (field: keyof CompanyData, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 2MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo.${fileExt}`;
      const filePath = `company/${fileName}`;

      // Upload du fichier
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setCompanyData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logo uploadé avec succès');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erreur lors de l\'upload du logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setCompanyData(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          type: 'company',
          config: companyData
        }, {
          onConflict: 'type'
        });

      if (error) throw error;
      toast.success('Données société enregistrées avec succès');
    } catch (error) {
      console.error('Error saving company data:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 ml-64">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Building className="w-8 h-8" />
          Paramétrage données société
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informations générales */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Informations générales</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la société *
                </label>
                <input
                  type="text"
                  value={companyData.nom_societe}
                  onChange={(e) => handleInputChange('nom_societe', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse *
                </label>
                <input
                  type="text"
                  value={companyData.adresse}
                  onChange={(e) => handleInputChange('adresse', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code postal *
                </label>
                <input
                  type="text"
                  value={companyData.code_postal}
                  onChange={(e) => handleInputChange('code_postal', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville *
                </label>
                <input
                  type="text"
                  value={companyData.ville}
                  onChange={(e) => handleInputChange('ville', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pays
                </label>
                <input
                  type="text"
                  value={companyData.pays}
                  onChange={(e) => handleInputChange('pays', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Informations légales */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Informations légales</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SIRET
                </label>
                <input
                  type="text"
                  value={companyData.siret}
                  onChange={(e) => handleInputChange('siret', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="123 456 789 00012"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° TVA intracommunautaire
                </label>
                <input
                  type="text"
                  value={companyData.numero_tva}
                  onChange={(e) => handleInputChange('numero_tva', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="FR12345678900"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Contact</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={companyData.telephone}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={companyData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site web
                </label>
                <input
                  type="url"
                  value={companyData.site_web}
                  onChange={(e) => handleInputChange('site_web', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="https://www.exemple.com"
                />
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Logo</h2>
            
            <div className="space-y-4">
              {companyData.logo_url ? (
                <div className="flex items-center gap-4">
                  <img
                    src={companyData.logo_url}
                    alt="Logo société"
                    className="h-20 w-auto object-contain border border-gray-200 rounded"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <X size={16} />
                    Supprimer
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Aucun logo uploadé
                  </p>
                </div>
              )}

              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    disabled:opacity-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Formats acceptés: JPG, PNG, SVG. Taille max: 2MB
                </p>
              </div>
            </div>
          </div>

          {/* RIB */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Informations bancaires (RIB)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la banque
                </label>
                <input
                  type="text"
                  value={companyData.rib_banque}
                  onChange={(e) => handleInputChange('rib_banque', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IBAN
                </label>
                <input
                  type="text"
                  value={companyData.rib_iban}
                  onChange={(e) => handleInputChange('rib_iban', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  BIC/SWIFT
                </label>
                <input
                  type="text"
                  value={companyData.rib_bic}
                  onChange={(e) => handleInputChange('rib_bic', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="BNPAFRPPXXX"
                />
              </div>
            </div>
          </div>

          {/* Mentions légales */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">Mentions légales</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mentions légales pour les documents
              </label>
              <textarea
                value={companyData.mentions_legales}
                onChange={(e) => handleInputChange('mentions_legales', e.target.value)}
                rows={6}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Saisissez ici les mentions légales qui apparaîtront sur vos documents (factures, devis, etc.)"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ces mentions apparaîtront automatiquement sur tous vos documents générés
              </p>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-4">
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}