import React from 'react';
import { X, Phone, Mail, MapPin, Truck, Clock } from 'lucide-react';
import type { Fournisseur } from '../types';

interface FournisseurDetailsModalProps {
  fournisseur: Fournisseur;
  onClose: () => void;
}

const FournisseurDetailsModal: React.FC<FournisseurDetailsModalProps> = ({
  fournisseur,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{fournisseur.nom}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Contact principal */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Contact principal</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-medium text-gray-900 mb-2">
                {fournisseur.contact_nom}
              </div>
              {fournisseur.email && (
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Mail size={16} className="mr-2" />
                  <a
                    href={`mailto:${fournisseur.email}`}
                    className="hover:text-blue-600"
                  >
                    {fournisseur.email}
                  </a>
                </div>
              )}
              {fournisseur.telephone && (
                <div className="flex items-center text-sm text-gray-600">
                  <Phone size={16} className="mr-2" />
                  <a
                    href={`tel:${fournisseur.telephone}`}
                    className="hover:text-blue-600"
                  >
                    {fournisseur.telephone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Emails supplémentaires */}
          {fournisseur.emails && fournisseur.emails.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Emails supplémentaires</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {fournisseur.emails.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center text-sm text-gray-600 mb-1 last:mb-0"
                  >
                    <Mail size={16} className="mr-2" />
                    <a
                      href={`mailto:${email}`}
                      className="hover:text-blue-600"
                    >
                      {email}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services et zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Services offerts */}
            {fournisseur.services_offerts && fournisseur.services_offerts.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Services offerts</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {fournisseur.services_offerts.map((service, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        <Truck size={14} className="mr-1" />
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Zones couvertes */}
            {fournisseur.zones_couvertes && fournisseur.zones_couvertes.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Zones couvertes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {fournisseur.zones_couvertes.map((zone, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        <MapPin size={14} className="mr-1" />
                        {zone}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Conditions de paiement */}
          {fournisseur.conditions_paiement && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Conditions de paiement</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Clock size={16} className="mr-2" />
                  {fournisseur.conditions_paiement}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FournisseurDetailsModal;