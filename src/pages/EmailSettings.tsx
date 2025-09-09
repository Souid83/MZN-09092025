import React, { useState, useEffect } from 'react';
import { Save, Mail, Bot, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { testSmtpConnection as testSmtpService } from '../services/email';

interface EmailSettings {
  email: string;
  signature: string;
  templates: {
    transport: string;
    freight: string;
    invoice: string;
  };
}

interface SmtpSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: 'tls' | 'ssl';
}

export default function EmailSettings() {
  const { user } = useUser();
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email: '',
    signature: 'Cordialement,\nMZN Transport',
    templates: {
      transport: `Bonjour {{nom_client}},\n\nVeuillez trouver ci-joint le bordereau de transport n°{{numero_bordereau}} pour votre livraison prévue le {{date}}.\n\nN'hésitez pas à nous contacter pour toute question.\n\n{{signature}}`,
      freight: `Bonjour {{nom_client}},\n\nVeuillez trouver ci-joint la confirmation d'affrètement n°{{numero_bordereau}} pour votre transport prévu le {{date}}.\n\nN'hésitez pas à nous contacter pour toute question.\n\n{{signature}}`,
      invoice: `Bonjour {{nom_client}},\n\nVeuillez trouver ci-joint la facture n°{{numero_facture}} d'un montant de {{montant_ttc}}€ TTC.\n\nNous vous remercions pour votre confiance.\n\n{{signature}}`
    }
  });

  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'tls'
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'transport' | 'freight' | 'invoice'>('transport');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Load email settings from Supabase
    loadEmailSettings();
    
    // Load SMTP settings from Supabase
    loadSmtpSettings();
  }, []);

  const loadEmailSettings = async () => {
    try {
      // First try to load user-specific settings
      if (user?.id) {
        const { data: userSettings, error: userError } = await supabase
          .from('users')
          .select('email, metadata')
          .eq('id', user.id)
          .single();

        if (!userError && userSettings) {
          const metadata = userSettings.metadata || {};
          if (metadata.email_signature) {
            setEmailSettings(prev => ({
              ...prev,
              email: userSettings.email || '',
              signature: metadata.email_signature || prev.signature
            }));
          }
        }
      }

      // Then load global email templates
      const { data: globalSettings, error: globalError } = await supabase
        .from('settings')
        .select('config')
        .eq('type', 'email_templates')
        .maybeSingle();

      if (!globalError && globalSettings?.config) {
        const templates = globalSettings.config.templates || {};
        setEmailSettings(prev => ({
          ...prev,
          templates: {
            transport: templates.transport || prev.templates.transport,
            freight: templates.freight || prev.templates.freight,
            invoice: templates.invoice || prev.templates.invoice
          }
        }));
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
      toast.error('Erreur lors du chargement des paramètres email');
    }
  };

  const loadSmtpSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('config')
        .eq('type', 'smtp')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.config) {
        setSmtpSettings(data.config);
      }
    } catch (error) {
      console.error('Error loading SMTP settings:', error);
      toast.error('Erreur lors du chargement des paramètres SMTP');
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save user signature
      if (user?.id) {
        const { data: userData, error: userDataError } = await supabase
          .from('users')
          .select('metadata')
          .eq('id', user.id)
          .single();

        if (userDataError && userDataError.code !== 'PGRST116') {
          throw userDataError;
        }

        const currentMetadata = userData?.metadata || {};
        const updatedMetadata = {
          ...currentMetadata,
          email_signature: emailSettings.signature
        };

        const { error: updateError } = await supabase
          .from('users')
          .update({ metadata: updatedMetadata })
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      // Save global email templates
      const { error: templatesError } = await supabase
        .from('settings')
        .upsert({
          type: 'email_templates',
          config: {
            templates: emailSettings.templates
          }
        }, {
          onConflict: 'type'
        });

      if (templatesError) throw templatesError;

      toast.success('Paramètres email enregistrés');
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast.error('Erreur lors de l\'enregistrement des paramètres email');
    } finally {
      setLoading(false);
    }
  };

  const handleSmtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          type: 'smtp',
          config: smtpSettings
        }, {
          onConflict: 'type'
        });

      if (error) throw error;
      toast.success('Configuration SMTP enregistrée');
    } catch (error) {
      console.error('Error saving SMTP settings:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  const testSmtpConnection = async () => {
    setLoading(true);
    try {
      await testSmtpService(smtpSettings);
      toast.success('Connexion SMTP réussie');
    } catch (error) {
      console.error('SMTP test error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur de connexion SMTP');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (template: string) => {
    setEmailSettings({
      ...emailSettings,
      templates: {
        ...emailSettings.templates,
        [activeTab]: template
      }
    });
  };

  return (
    <div className="p-8 ml-64">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Mail className="w-8 h-8" />
          Configuration Email
        </h1>

        <div className="space-y-6">
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Configuration des emails</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={emailSettings.email}
                    onChange={(e) => setEmailSettings({ ...emailSettings, email: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Signature
                  </label>
                  <textarea
                    value={emailSettings.signature}
                    onChange={(e) => setEmailSettings({ ...emailSettings, signature: e.target.value })}
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Votre signature..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
  Cette signature sera automatiquement ajoutée à vos emails en remplaçant la variable {'{{signature}}'}.
</p>

                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modèles d'emails
                  </label>
                  
                  <div className="mb-4">
                    <div className="flex border-b border-gray-200">
                      <button
                        type="button"
                        className={`py-2 px-4 font-medium text-sm ${activeTab === 'transport' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('transport')}
                      >
                        Bordereau de transport
                      </button>
                      <button
                        type="button"
                        className={`py-2 px-4 font-medium text-sm ${activeTab === 'freight' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('freight')}
                      >
                        Bordereau d'affrètement
                      </button>
                      <button
                        type="button"
                        className={`py-2 px-4 font-medium text-sm ${activeTab === 'invoice' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('invoice')}
                      >
                        Facture
                      </button>
                    </div>
                  </div>
                  
                  <textarea
                    value={emailSettings.templates[activeTab]}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    rows={8}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Modèle d'email..."
                  />
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-700 mb-1">Variables disponibles:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div><code>{'{{nom_client}}'}</code> - Nom du client</div>
                      <div><code>{'{{date}}'}</code> - Date du document</div>
                      <div><code>{'{{numero_bordereau}}'}</code> - N° de bordereau</div>
                      <div><code>{'{{numero_facture}}'}</code> - N° de facture</div>
                      <div><code>{'{{montant_ht}}'}</code> - Montant HT</div>
                      <div><code>{'{{montant_ttc}}'}</code> - Montant TTC</div>
                      <div><code>{'{{signature}}'}</code> - Votre signature</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={20} className="mr-2" />
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </form>

          <form onSubmit={handleSmtpSubmit} className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Configuration SMTP</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hôte SMTP
                  </label>
                  <input
                    type="text"
                    value={smtpSettings.smtp_host}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="smtp.example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    type="number"
                    value={smtpSettings.smtp_port}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: parseInt(e.target.value) })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="587"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email expéditeur
                  </label>
                  <input
                    type="email"
                    value={smtpSettings.smtp_user}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="noreply@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={smtpSettings.smtp_pass}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_pass: e.target.value })}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sécurité
                  </label>
                  <select
                    value={smtpSettings.smtp_secure}
                    onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_secure: e.target.value as 'tls' | 'ssl' })}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={20} className="mr-2" />
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={testSmtpConnection}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Tester la connexion
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}