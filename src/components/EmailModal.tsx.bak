import React, { useState, useEffect } from 'react';
import { X, Send, Plus, Bot, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { sendEmail } from '../services/email';
import { generatePDF } from '../services/slips';
import AIEmailAssistant from './AIEmailAssistant';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import type { TransportSlip, FreightSlip, ClientInvoice } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmailModalProps {
  slip?: TransportSlip | FreightSlip;
  invoice?: ClientInvoice;
  type?: 'transport' | 'freight' | 'invoice';
  onClose: () => void;
  clientEmail?: string;
}

function isFreightSlip(slip: TransportSlip | FreightSlip | undefined): slip is FreightSlip {
  return !!slip && ('fournisseur_id' in slip);
}

export default function EmailModal({ 
  slip, 
  invoice, 
  type = 'transport', 
  onClose, 
  clientEmail 
}: EmailModalProps) {
  const { user } = useUser();
  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiMode, setAIMode] = useState<'generate' | 'improve'>('generate');
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [attachDocument, setAttachDocument] = useState(true);

  useEffect(() => {
    // Initialiser la liste des emails selon le type de document
    let defaultEmail = '';
    
    if (type === 'freight' && isFreightSlip(slip)) {
      // Pour les bordereaux d'affrètement, UNIQUEMENT l'email du fournisseur
      // Aucun repli vers l'email du client
      const fournisseursEmails = slip.fournisseur?.emails as string[] | undefined;
      const fournisseurPrimary = slip.fournisseur?.email as string | undefined;
      const firstValid = fournisseursEmails?.find(e => e && e.trim()) || '';
      defaultEmail = (fournisseurPrimary && fournisseurPrimary.trim()) ? fournisseurPrimary : firstValid;
    } else {
      // Pour tous les autres types (transport, invoice), utiliser l'email du client
      if (slip && slip.client?.email) {
        defaultEmail = slip.client.email;
      } else if (invoice && invoice.client?.email) {
        defaultEmail = invoice.client.email;
      } else if (clientEmail) {
        defaultEmail = clientEmail;
      }
    }
    
    // Initialiser la liste avec l'email trouvé (s'il existe et n'est pas vide)
    setEmailList(defaultEmail && defaultEmail.trim() ? [defaultEmail] : []);

    // Set default subject based on type
    if (slip) {
      if (type === 'transport') {
        setSubject(`Bordereau de transport - ${slip.client?.nom || 'Client'} - ${slip.number}`);
      } else if (type === 'freight') {
        setSubject(`Confirmation d'affrètement - ${isFreightSlip(slip) ? slip.fournisseur?.nom : 'Affréteur'} - ${slip.number}`);
      }
    } else if (invoice) {
      setSubject(`Facture ${invoice.numero} - ${invoice.client?.nom || 'Client'}`);
    }

    // Load email template and signature
    loadEmailTemplate();
  }, [slip, invoice, type, clientEmail]);

  const loadEmailTemplate = async () => {
    setLoadingTemplate(true);
    try {
      // Get user signature
      let signature = '';
      if (user?.id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('metadata')
          .eq('id', user.id)
          .single();

        if (!userError && userData?.metadata?.email_signature) {
          signature = userData.metadata.email_signature;
        }
      }

      // Get email templates
      const { data: templateData, error: templateError } = await supabase
        .from('settings')
        .select('config')
        .eq('type', 'email_templates')
        .maybeSingle();

      if (templateError) throw templateError;

      const templates = templateData?.config?.templates || {
        transport: `Bonjour,\n\nVeuillez trouver ci-joint le bordereau de transport.\n\n{{signature}}`,
        freight: `Bonjour,\n\nVeuillez trouver ci-joint la confirmation d'affrètement.\n\nMerci de bien vouloir confirmer la prise en charge de ce transport.\n\n{{signature}}`,
        invoice: `Bonjour,\n\nVeuillez trouver ci-joint la facture.\n\n{{signature}}`
      };

      // Get the appropriate template
      let template = templates[type] || '';

      // Replace variables in the template
      let body = template;

      // Common replacements
      body = body.replace(/{{signature}}/g, signature);
      
      if (slip) {
        const slipNumber = slip.number;
        const slipDate = format(new Date(slip.loading_date), 'dd/MM/yyyy', { locale: fr });
        
        if (type === 'freight' && isFreightSlip(slip)) {
          // Pour l'affrètement, utiliser les données du fournisseur
          const fournisseurName = slip.fournisseur?.nom || 'Affréteur';
          const contactName = slip.fournisseur?.contact_nom || '';
          
          body = body.replace(/{{nom_fournisseur}}/g, fournisseurName);
          body = body.replace(/{{contact_fournisseur}}/g, contactName);
          body = body.replace(/{{nom_client}}/g, fournisseurName); // Fallback pour les anciens templates
        } else {
          // Pour le transport, utiliser les données du client
          const clientName = slip.client?.nom || 'Client';
          body = body.replace(/{{nom_client}}/g, clientName);
        }
        
        body = body.replace(/{{numero_bordereau}}/g, slipNumber);
        body = body.replace(/{{date}}/g, slipDate);
      } else if (invoice) {
        const clientName = invoice.client?.nom || 'Client';
        const invoiceNumber = invoice.numero;
        const invoiceDate = format(new Date(invoice.date_emission), 'dd/MM/yyyy', { locale: fr });
        const montantHT = `${invoice.montant_ht.toFixed(2)}`;
        const montantTTC = `${invoice.montant_ttc.toFixed(2)}`;
        
        body = body.replace(/{{nom_client}}/g, clientName);
        body = body.replace(/{{numero_facture}}/g, invoiceNumber);
        body = body.replace(/{{date}}/g, invoiceDate);
        body = body.replace(/{{montant_ht}}/g, montantHT);
        body = body.replace(/{{montant_ttc}}/g, montantTTC);
      }

      setEmailBody(body);
    } catch (error) {
      console.error('Error loading email template:', error);
      // Fallback to basic template
      setEmailBody(`Bonjour,\n\nVeuillez trouver ci-joint le document.\n\nCordialement,\n${user?.name || 'MZN Transport'}`);
    } finally {
      setLoadingTemplate(false);
    }
  };

  const handleAddEmail = () => {
    if (emailInput && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      if (!emailList.includes(emailInput)) {
        setEmailList([...emailList, emailInput]);
      }
      setEmailInput('');
    } else {
      toast.error('Adresse email invalide');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleSend = async () => {
    if (emailList.length === 0) {
      toast.error('Veuillez ajouter au moins un destinataire');
      return;
    }

    try {
      setSending(true);

      let pdfBlob;
      if (attachDocument) {
        if (slip) {
          pdfBlob = await generatePDF(slip, type as 'transport' | 'freight');
        } else if (invoice && invoice.lien_pdf) {
          // Get the PDF from storage
          const { data, error } = await supabase.storage
            .from('documents')
            .download(invoice.lien_pdf);
          
          if (error) throw error;
          pdfBlob = data;
        } else {
          throw new Error('Aucun document à envoyer');
        }
      }

      let attachments = [];
      
      if (attachDocument && pdfBlob) {
        const pdfBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]);
          };
          reader.readAsDataURL(pdfBlob);
        });

        // Determine filename based on document type
        let filename;
        if (slip) {
          const documentType = type === 'transport' ? 'transport' : 'affretement';
          filename = `bordereau_${documentType}_${slip.number}.pdf`;
        } else if (invoice) {
          filename = `facture_${invoice.numero}.pdf`;
        } else {
          filename = 'document.pdf';
        }

        attachments.push({
          filename,
          content: pdfBase64,
          contentType: 'application/pdf'
        });
      }

      const additionalFilesPromises = additionalFiles.map(async (file) => {
        return new Promise<{name: string, content: string, contentType: string}>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve({
              name: file.name,
              content: base64.split(',')[1],
              contentType: file.type
            });
          };
          reader.readAsDataURL(file);
        });
      });

      const additionalFilesBase64 = await Promise.all(additionalFilesPromises);
      
      attachments = [
        ...attachments,
        ...additionalFilesBase64.map(file => ({
          filename: file.name,
          content: file.content,
          contentType: file.contentType
        }))
      ];

      // Ajouter automatiquement la signature de l'utilisateur connecté
      let finalEmailBody = emailBody;
      if (user?.metadata?.email_signature) {
        // Ajouter la signature si elle n'est pas déjà présente
        if (!finalEmailBody.includes(user.metadata.email_signature)) {
          finalEmailBody += '\n\n' + user.metadata.email_signature;
        }
      }

      await sendEmail({
        to: emailList.join(', '),
        subject,
        body: finalEmailBody,
        attachments,
        replyTo: user?.email || ''
      });

      toast.success('Email envoyé avec succès');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setSending(false);
    }
  };

  const handleGeneratedText = (text: string) => {
    setEmailBody(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {type === 'invoice' 
              ? 'Envoyer la facture' 
              : `Envoyer le bordereau ${type === 'transport' ? 'de transport' : "d'affrètement"}`}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              À l'attention de
            </label>
            <div className="text-sm text-gray-600 mb-2">
              {slip 
                ? (type === 'transport' 
                  ? slip.client?.nom 
                  : (isFreightSlip(slip) ? slip.fournisseur?.nom : 'Affréteur'))
                : invoice?.client?.nom}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destinataires
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {emailList.map((email, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => setEmailList(emails => emails.filter(e => e !== email))}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ajouter une adresse email"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddEmail}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAIMode('generate');
                    setShowAIAssistant(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                >
                  <Bot size={16} />
                  Assistant IA
                </button>
                {emailBody && (
                  <button
                    onClick={() => {
                      setAIMode('improve');
                      setShowAIAssistant(true);
                    }}
                    className="text-green-600 hover:text-green-800 flex items-center gap-1 text-sm"
                  >
                    <Bot size={16} />
                    Améliorer
                  </button>
                )}
              </div>
            </div>
            {loadingTemplate ? (
              <div className="flex items-center justify-center h-32 bg-gray-50 rounded-md">
                <Loader className="animate-spin text-blue-500 mr-2" size={20} />
                <span className="text-gray-500">Chargement du modèle...</span>
              </div>
            ) : (
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pièces jointes
            </label>
            <div className="p-3 bg-gray-50 rounded-md mb-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Document principal : </span>
                  {slip 
                    ? `Bordereau ${type === 'transport' ? 'de transport' : "d'affrètement"} ${slip.number}`
                    : `Facture ${invoice?.numero}`}
                </div>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={attachDocument}
                    onChange={(e) => setAttachDocument(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span>Joindre le document</span>
                </label>
              </div>
            </div>
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files) {
                  setAdditionalFiles([...additionalFiles, ...Array.from(e.target.files)]);
                }
              }}
              multiple
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {additionalFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {additionalFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setAdditionalFiles(files => files.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-800"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || emailList.length === 0 || loadingTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Send size={20} />
              {sending ? 'Envoi en cours...' : 'Envoyer'}
            </button>
          </div>
        </div>

        {showAIAssistant && (
          <AIEmailAssistant
            onClose={() => setShowAIAssistant(false)}
            onGenerate={handleGeneratedText}
            clientName={slip?.client?.nom || invoice?.client?.nom || 'Client'}
            documentType={type}
            documentNumber={slip?.number || invoice?.numero || ''}
            currentText={aiMode === 'improve' ? emailBody : undefined}
            mode={aiMode}
          />
        )}
      </div>
    </div>
  );
}
