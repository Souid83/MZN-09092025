import React from 'react';
import { Plus, Pencil } from 'lucide-react';
import type { Country } from '../types';

interface CountrySelectorProps {
  countries: Country[];
  selectedCountryId?: string;
  onSelect: (countryId: string) => void;
  onCreateCountry: () => void;
  onEditCountry?: (country: Country) => void;
  className?: string;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  countries,
  selectedCountryId,
  onSelect,
  onCreateCountry,
  onEditCountry,
  className = ''
}) => {
  const selectedCountry = countries.find(c => c.id === selectedCountryId);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onCreateCountry}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 text-sm"
      >
        <span>Créer un pays</span>
        <Plus size={16} />
      </button>
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative flex-1">
          <select
            value={selectedCountryId || ''}
            onChange={(e) => onSelect(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pr-24"
          >
            <option value="">Sélectionner un pays</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          {selectedCountry && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {onEditCountry && (
                <button
                  type="button"
                  onClick={() => onEditCountry(selectedCountry)}
                  className="text-gray-400 hover:text-blue-600 group relative"
                  title="Modifier"
                >
                  <Pencil size={16} />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Modifier
                  </span>
                </button>
              )}
              <img
                src={selectedCountry.flag_url}
                alt={`Drapeau ${selectedCountry.name}`}
                className="w-6 h-6 rounded-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountrySelector;