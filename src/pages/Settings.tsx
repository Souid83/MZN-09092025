import React from 'react';
import { Settings as SettingsIcon, Mail, Users, ChevronRight, Bot, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

export default function Settings() {
  const { user } = useUser();
  const isAdmin = user?.role === 'admin';
  const isSalome = user?.email === 'salome@mzn.fr';

  return (
    <div className="p-8 ml-64">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8" />
          Paramètres
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company Settings Card */}
          <Link
            to="/settings/company"
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                  <Building size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Paramétrage données société</h2>
                  <p className="text-sm text-gray-500">
                    Configuration des informations administratives
                  </p>
                </div>
              </div>
              <ChevronRight 
                size={20} 
                className="text-gray-400 group-hover:text-gray-600 transition-colors"
              />
            </div>
          </Link>

          {/* Email Configuration Card */}
          <Link
            to="/settings/email"
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <Mail size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Configuration Email</h2>
                  <p className="text-sm text-gray-500">
                    Paramètres SMTP et modèles d'emails
                  </p>
                </div>
              </div>
              <ChevronRight 
                size={20} 
                className="text-gray-400 group-hover:text-gray-600 transition-colors"
              />
            </div>
          </Link>

          {/* AI Configuration Card - Only visible to admins */}
          {isAdmin && (
            <Link
              to="/settings/ai"
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Intelligence Artificielle</h2>
                    <p className="text-sm text-gray-500">
                      Configuration des clés API et prompts
                    </p>
                    {isSalome && (
                      <span className="inline-block mt-1 text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        Accès administrateur
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight 
                  size={20} 
                  className="text-gray-400 group-hover:text-gray-600 transition-colors"
                />
              </div>
            </Link>
          )}

          {/* User Management Card - Only visible to admins */}
          {isAdmin && (
            <Link
              to="/settings/users"
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                    <Users size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Gestion des utilisateurs</h2>
                    <p className="text-sm text-gray-500">
                      Créer et gérer les accès utilisateurs
                    </p>
                  </div>
                </div>
                <ChevronRight 
                  size={20} 
                  className="text-gray-400 group-hover:text-gray-600 transition-colors"
                />
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}