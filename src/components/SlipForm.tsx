import React, { useState, useEffect } from 'react';
import { useClients } from '../hooks/useClients';
import { useFournisseurs } from '../hooks/useFournisseurs';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';
import type { Client, TransportSlip, FreightSlip, Fournisseur, User } from '../types';
import { createFreightSlip, updateFreightSlip, createTransportSlip, updateTransportSlip } from '../services/slips';

function cleanPayload(data: Record<string, any>) {
  const numericFields = [
    "price", "purchase_price", "selling_price",
    "margin", "margin_rate", "volume", "weight", "kilometers"
  ];

  const timeFields = [
    "loading_time", "delivery_time",
    "loading_time_start", "loading_time_end",
    "delivery_time_start", "delivery_time_end"
  ];

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.endsWith('_id') && value === "") {
      result[key] = null;
    } else if (numericFields.includes(key) && (value === "" || isNaN(Number(value)))) {
      result[key] = 0;
    } else if (timeFields.includes(key) && (value === "" || value === undefined)) {
      result[key] = null;
    } else {
      result[key] = value;
    }
  }
  return result;
}

const VEHICLE_TYPES = [
  'T1',
  'T2',
  'T3', 
  'T4',
  'Small truck',
  'Porte char',
  'Porte char + rampe',
  'Extra basse',
  'Taut',
  'Grue',
  'Frigo',
  'Porteur',
  'Fourgon',
  'Plateau',
  'Autre'
];

interface AddressFields {
  company: string;
  address: string;
  postalCode: string;
  city: string;
}

interface SlipFormProps {
  type: 'transport' | 'freight';
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
  initialData?: TransportSlip | FreightSlip | null;
}

type LoadingTimeMode = 'fixed' | 'range';
type DeliveryTimeMode = 'none' | 'fixed' | 'range';

const SlipForm: React.FC<SlipFormProps> = ({
  type,
  onSubmit,
  onCancel,
  loading = false,
  initialData
}) => {
  const { user } = useUser();
  const { data: clients } = useClients();
  const { data: fournisseurs } = useFournisseurs();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [margin, setMargin] = useState<number>(0);
  const [marginRate, setMarginRate] = useState<number>(0);
  const [selectedCommercial, setSelectedCommercial] = useState<string>('');
  const [commercialUsers, setCommercialUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [customVehicleType, setCustomVehicleType] = useState('');
  const [tailgate, setTailgate] = useState(false);
  const [deliveryAtLoading, setDeliveryAtLoading] = useState(false);
  const [kilometers, setKilometers] = useState<string>('');
  const [pricePerKm, setPricePerKm] = useState<number | null>(null);

  const [loadingTimeMode, setLoadingTimeMode] = useState<LoadingTimeMode>('fixed');
  const [deliveryTimeMode, setDeliveryTimeMode] = useState<DeliveryTimeMode>('fixed');
  
  const [loadingTimeRange, setLoadingTimeRange] = useState({
    start: '',
    end: ''
  });
  
  const [deliveryTimeRange, setDeliveryTimeRange] = useState({
    start: '',
    end: ''
  });

  const [loadingAddress, setLoadingAddress] = useState<AddressFields>({
    company: '',
    address: '',
    postalCode: '',
    city: ''
  });

  const [deliveryAddress, setDeliveryAddress] = useState<AddressFields>({
    company: '',
    address: '',
    postalCode: '',
    city: ''
  });

  const [formData, setFormData] = useState({
    client_id: '',
    fournisseur_id: '',
    commercial_id: '',
    loading_date: '',
    loading_time: '',
    loading_contact: '',
    delivery_date: '',
    delivery_time: '',
    delivery_contact: '',
    goods_description: '',
    volume: '',
    weight: '',
    metre: '',
    vehicle_type: 'T1',
    exchange_type: '',
    instructions: '',
    loading_instructions: '',
    unloading_instructions: '',
    price: '',
    payment_method: type === 'freight' ? 'Virement 30j FDM' : '',
    observations: '',
    photo_required: true,
    order_number: '',
    purchase_price: '',
    selling_price: '',
    margin: 0,
    margin_rate: 0,
    kilometers: ''
  });

  useEffect(() => {
    const fetchCommercialUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('name');

        if (error) throw error;
        setCommercialUsers(data || []);
      } catch (error) {
        console.error('Error fetching commercial users:', error);
      }
    };

    fetchCommercialUsers();
  }, []);

  useEffect(() => {
    if (type === 'freight' && !initialData && user?.name) {
      setSelectedCommercial(user.name);
      setFormData(prev => ({ ...prev, commercial_id: user.name }));
    }
  }, [type, user, initialData]);

  useEffect(() => {
    if (type === 'freight' && initialData && 'commercial_id' in initialData) {
      const commercialName = initialData.commercial_id || '';
      setSelectedCommercial(commercialName);
      setFormData(prev => ({ ...prev, commercial_id: commercialName }));
    }
  }, [type, initialData]);

  useEffect(() => {
    if (!initialData) return;

    const loading_time_start = initialData.loading_time_start;
    const loading_time_end = initialData.loading_time_end;
    const loading_time = initialData.loading_time;

    const delivery_time_start = initialData.delivery_time_start;
    const delivery_time_end = initialData.delivery_time_end;
    const delivery_time = initialData.delivery_time;

    if (loading_time_start && loading_time_end) {
      setLoadingTimeMode('range');
      setLoadingTimeRange({
        start: loading_time_start.slice(0, 5),
        end: loading_time_end.slice(0, 5)
      });
      setFormData(prev => ({
        ...prev,
        loading_time: ''
      }));
    } else if (loading_time) {
      setLoadingTimeMode('fixed');
      setLoadingTimeRange({ start: '', end: '' });
      setFormData(prev => ({
        ...prev,
        loading_time: loading_time.slice(0, 5)
      }));
    } else {
      setLoadingTimeMode('fixed');
      setLoadingTimeRange({ start: '', end: '' });
      setFormData(prev => ({
        ...prev,
        loading_time: ''
      }));
    }

    if (delivery_time_start && delivery_time_end) {
      setDeliveryTimeMode('range');
      setDeliveryTimeRange({
        start: delivery_time_start.slice(0, 5),
        end: delivery_time_end.slice(0, 5)
      });
      setFormData(prev => ({
        ...prev,
        delivery_time: ''
      }));
    } else if (delivery_time) {
      setDeliveryTimeMode('fixed');
      setDeliveryTimeRange({ start: '', end: '' });
      setFormData(prev => ({
        ...prev,
        delivery_time: delivery_time.slice(0, 5)
      }));
    } else {
      setDeliveryTimeMode('none');
      setDeliveryTimeRange({ start: '', end: '' });
      setFormData(prev => ({
        ...prev,
        delivery_time: ''
      }));
    }

    const slipData = initialData as any;
    const loadParts = slipData.loading_address?.split(',') || [];
    const deliveryParts = slipData.delivery_address?.split(',') || [];

    setLoadingAddress({
      company: loadParts[0]?.trim() || '',
      address: loadParts[1]?.trim() || '',
      postalCode: loadParts[2]?.trim().split(' ')[0] || '',
      city: loadParts[2]?.trim().split(' ').slice(1).join(' ') || ''
    });

    setDeliveryAddress({
      company: deliveryParts[0]?.trim() || '',
      address: deliveryParts[1]?.trim() || '',
      postalCode: deliveryParts[2]?.trim().split(' ')[0] || '',
      city: deliveryParts[2]?.trim().split(' ').slice(1).join(' ') || ''
    });

    setSelectedCommercial(slipData.commercial_id || '');
    setTailgate(slipData.tailgate || false);
    setCustomVehicleType(slipData.custom_vehicle_type || '');

    if (slipData.custom_vehicle_type) {
      setFormData(prev => ({ ...prev, vehicle_type: 'Autre' }));
    }

    const sameAddress = slipData.loading_address === slipData.delivery_address;
    setDeliveryAtLoading(sameAddress);

    if (slipData.kilometers) {
      setKilometers(slipData.kilometers.toString());
      if (slipData.price && slipData.kilometers > 0) {
        const calculatedPricePerKm = slipData.price / slipData.kilometers;
        setPricePerKm(calculatedPricePerKm);
      }
    }

    setFormData(prev => {
      const base = {
        ...prev,
        client_id: slipData.client_id || '',
        fournisseur_id: slipData.fournisseur_id || '',
        commercial_id: slipData.commercial_id || '',
        loading_date: slipData.loading_date || '',
        loading_contact: slipData.loading_contact || '',
        delivery_date: slipData.delivery_date || '',
        delivery_contact: slipData.delivery_contact || '',
        goods_description: slipData.goods_description || '',
        volume: slipData.volume?.toString() || '',
        weight: slipData.weight?.toString() || '',
        metre: slipData.metre?.toString() || '',
        vehicle_type: slipData.vehicle_type === 'Autre' && slipData.custom_vehicle_type 
          ? 'Autre' 
          : slipData.vehicle_type || 'T1',
        exchange_type: slipData.exchange_type || '',
        instructions: slipData.instructions || '',
        loading_instructions: slipData.loading_instructions || '',
        unloading_instructions: slipData.unloading_instructions || '',
        price: slipData.price?.toString() || '',
        payment_method: slipData.payment_method || '',
        observations: slipData.observations || '',
        purchase_price: slipData.purchase_price?.toString() || '',
        selling_price: slipData.selling_price?.toString() || '',
        margin: slipData.margin || 0,
        margin_rate: slipData.margin_rate || 0,
        kilometers: slipData.kilometers?.toString() || '',
      };
      if ('order_number' in slipData) {
        return { ...base, order_number: typeof slipData.order_number === 'string' ? slipData.order_number : '' };
      }
      return base;
    });

    setPurchasePrice(slipData.purchase_price || 0);
    setSellingPrice(slipData.selling_price || 0);
    setMargin(slipData.margin || 0);
    setMarginRate(slipData.margin_rate || 0);
  }, [initialData]);

  useEffect(() => {
    if (type === 'freight') {
      const margin = sellingPrice - purchasePrice;
      const rate = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;
      setMargin(margin);
      setMarginRate(rate);
    }
  }, [purchasePrice, sellingPrice, type]);

  useEffect(() => {
    if (type === 'transport') {
      const price = parseFloat(formData.price);
      const km = parseFloat(kilometers);
      
      if (!isNaN(price) && !isNaN(km) && km > 0) {
        const pricePerKm = price / km;
        setPricePerKm(pricePerKm);
      } else {
        setPricePerKm(null);
      }
    }
  }, [formData.price, kilometers, type]);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const client = clients.find(c => c.id === e.target.value);
    setSelectedClient(client || null);
    setFormData(prev => ({ ...prev, client_id: e.target.value }));
  };

  const handleFournisseurChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const fournisseur = fournisseurs.find(f => f.id === e.target.value);
    setSelectedFournisseur(fournisseur || null);
    setFormData(prev => ({ ...prev, fournisseur_id: e.target.value }));
  };

  const handleCommercialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const commercialName = e.target.value;
    setSelectedCommercial(commercialName);
    setFormData(prev => ({ ...prev, commercial_id: commercialName }));
  };

  const handleSameAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      setDeliveryAddress(loadingAddress);
    } else {
      setDeliveryAddress({
        company: '',
        address: '',
        postalCode: '',
        city: ''
      });
    }
  };

  const handleLoadingAddressChange = (field: keyof AddressFields, value: string) => {
    setLoadingAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleDeliveryAddressChange = (field: keyof AddressFields, value: string) => {
    setDeliveryAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleDeliveryAtLoadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setDeliveryAtLoading(checked);
    
    if (checked) {
      setDeliveryAddress({
        company: '',
        address: '',
        postalCode: '',
        city: ''
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleKilometersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKilometers(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const fullLoadingAddress = `${loadingAddress.company}, ${loadingAddress.address}, ${loadingAddress.postalCode} ${loadingAddress.city}`;
    const fullDeliveryAddress = deliveryAtLoading 
      ? fullLoadingAddress 
      : `${deliveryAddress.company}, ${deliveryAddress.address}, ${deliveryAddress.postalCode} ${deliveryAddress.city}`;

    let submitData: any = {
      ...formData,
      loading_address: fullLoadingAddress,
      delivery_address: fullDeliveryAddress,
      volume: formData.volume ? Number(formData.volume) : null,
      weight: formData.weight ? Number(formData.weight) : null,
      metre: formData.metre ? Number(formData.metre) : null,
      price: Number(formData.price) || 0,
      purchase_price: purchasePrice || 0,
      selling_price: sellingPrice || 0,
      margin: margin || 0,
      margin_rate: marginRate || 0,
      commercial_id: selectedCommercial || null,
      vehicle_type: formData.vehicle_type,
      custom_vehicle_type: formData.vehicle_type === 'Autre' ? customVehicleType : null,
      tailgate: tailgate,
      kilometers: kilometers ? Number(kilometers) : null,
      ...(formData.order_number !== undefined ? { order_number: formData.order_number || null } : {}),
      loading_time: loadingTimeMode === 'fixed' ? formData.loading_time || null : null,
      loading_time_start: loadingTimeMode === 'range' ? loadingTimeRange.start || null : null,
      loading_time_end: loadingTimeMode === 'range' ? loadingTimeRange.end || null : null,
      delivery_time: deliveryTimeMode === 'fixed' ? formData.delivery_time || null : null,
      delivery_time_start: deliveryTimeMode === 'range' ? deliveryTimeRange.start || null : null,
      delivery_time_end: deliveryTimeMode === 'range' ? deliveryTimeRange.end || null : null
    };

    console.log('📝 Submit data:', submitData);

    const cleanedData = cleanPayload(submitData);
    console.log('🧹 Cleaned data:', cleanedData);

    try {
      if (type === 'freight') {
        if (initialData && 'id' in initialData) {
          await updateFreightSlip(initialData.id, cleanedData);
          onSubmit(cleanedData);
        } else {
          await createFreightSlip(cleanedData);
          onCancel();
        }
      } else if (type === 'transport') {
        console.log('🚚 Données envoyées à updateTransportSlip/createTransportSlip :', cleanedData);
        if (initialData && 'id' in initialData) {
          await updateTransportSlip(initialData.id, cleanedData);
          onSubmit(cleanedData);
        } else {
          await createTransportSlip(cleanedData);
          onCancel();
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Erreur lors de la soumission du bordereau : ' + (error as any)?.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">
          {initialData ? 'Modifier le bordereau' : `Nouveau bordereau de ${type === 'transport' ? 'transport' : 'affrètement'}`}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Client</label>
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleClientChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Sélectionner un client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.nom}</option>
                ))}
              </select>
            </div>

            {type === 'freight' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Commercial
                </label>
                <select
                  name="commercial_id"
                  value={selectedCommercial}
                  onChange={handleCommercialChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un commercial</option>
                  {commercialUsers.map(user => (
                    <option key={user.id} value={user.name}>{user.name}</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'freight' && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Sous-traitant</label>
                <select
                  name="fournisseur_id"
                  value={formData.fournisseur_id}
                  onChange={handleFournisseurChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un fournisseur</option>
                  {fournisseurs.map(fournisseur => (
                    <option key={fournisseur.id} value={fournisseur.id}>{fournisseur.nom}</option>
                  ))}
                </select>
                {selectedFournisseur && (
                  <div className="mt-2 p-4 bg-gray-50 rounded-md">
                    <p><strong>Contact:</strong> {selectedFournisseur.contact_nom}</p>
                    <p><strong>Téléphone:</strong> {selectedFournisseur.telephone}</p>
                    <p><strong>Email:</strong> {selectedFournisseur.email}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'transport' && selectedClient?.numero_commande_requis && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Numéro de commande client</label>
                <input
                  type="text"
                  name="order_number"
                  value={formData.order_number}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="col-span-2 border p-4 rounded-md">
              <h3 className="text-lg font-medium mb-4">Adresse de chargement</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Entreprise</label>
                  <input
                    type="text"
                    value={loadingAddress.company}
                    onChange={(e) => handleLoadingAddressChange('company', e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Adresse</label>
                  <input
                    type="text"
                    value={loadingAddress.address}
                    onChange={(e) => handleLoadingAddressChange('address', e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code postal</label>
                  <input
                    type="text"
                    value={loadingAddress.postalCode}
                    onChange={(e) => handleLoadingAddressChange('postalCode', e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ville</label>
                  <input
                    type="text"
                    value={loadingAddress.city}
                    onChange={(e) => handleLoadingAddressChange('city', e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Contact chargement</label>
                <input
                  type="text"
                  name="loading_contact"
                  value={formData.loading_contact}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    name="loading_date"
                    value={formData.loading_date}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure de chargement</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setLoadingTimeMode('fixed')}
                      className={`px-3 py-1 rounded ${
                        loadingTimeMode === 'fixed'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Horaire fixe
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoadingTimeMode('range')}
                      className={`px-3 py-1 rounded ${
                        loadingTimeMode === 'range'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Créneau horaire
                    </button>
                  </div>
                  {loadingTimeMode === 'fixed' ? (
                    <input
                      type="time"
                      name="loading_time"
                      value={formData.loading_time || ''}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        value={loadingTimeRange.start || ''}
                        onChange={(e) => setLoadingTimeRange(prev => ({ ...prev, start: e.target.value }))}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-gray-500">à</span>
                      <input
                        type="time"
                        value={loadingTimeRange.end || ''}
                        onChange={(e) => setLoadingTimeRange(prev => ({ ...prev, end: e.target.value }))}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-2 border p-4 rounded-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Adresse de livraison</h3>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={deliveryAtLoading}
                    onChange={handleDeliveryAtLoadingChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="text-sm text-gray-600">Adresse au chargement</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Entreprise</label>
                  <input
                    type="text"
                    value={deliveryAddress.company}
                    onChange={(e) => handleDeliveryAddressChange('company', e.target.value)}
                    required
                    disabled={deliveryAtLoading}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      deliveryAtLoading ? 'bg-gray-100' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Adresse</label>
                  
                  <input
                    type="text"
                    value={deliveryAddress.address}
                    onChange={(e) => handleDeliveryAddressChange('address', e.target.value)}
                    required
                    disabled={deliveryAtLoading}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      deliveryAtLoading ? 'bg-gray-100' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code postal</label>
                  <input
                    type="text"
                    value={deliveryAddress.postalCode}
                    onChange={(e) => handleDeliveryAddressChange('postalCode', e.target.value)}
                    required
                    disabled={deliveryAtLoading}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      deliveryAtLoading ? 'bg-gray-100' : ''
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ville</label>
                  <input
                    type="text"
                    value={deliveryAddress.city}
                    onChange={(e) => handleDeliveryAddressChange('city', e.target.value)}
                    required
                    disabled={deliveryAtLoading}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      deliveryAtLoading ? 'bg-gray-100' : ''
                    }`}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">Contact livraison</label>
                <input
                  type="text"
                  name="delivery_contact"
                  value={formData.delivery_contact}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    name="delivery_date"
                    value={formData.delivery_date}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Heure de livraison</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryTimeMode('none')}
                      className={`px-3 py-1 rounded ${
                        deliveryTimeMode === 'none'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Livraison foulée
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryTimeMode('fixed')}
                      className={`px-3 py-1 rounded ${
                        deliveryTimeMode === 'fixed'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Horaire fixe
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryTimeMode('range')}
                      className={`px-3 py-1 rounded ${
                        deliveryTimeMode === 'range'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Créneau horaire
                    </button>
                  </div>
                  {deliveryTimeMode === 'fixed' && (
                    <input
                      type="time"
                      name="delivery_time"
                      value={formData.delivery_time || ''}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  )}
                  {deliveryTimeMode === 'range' && (
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        value={deliveryTimeRange.start || ''}
                        onChange={(e) => setDeliveryTimeRange(prev => ({ ...prev, start: e.target.value }))}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-gray-500">à</span>
                      <input
                        type="time"
                        value={deliveryTimeRange.end || ''}
                        onChange={(e) => setDeliveryTimeRange(prev => ({ ...prev, end: e.target.value }))}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Marchandise / désignation</label>
              <input
                type="text"
                name="goods_description"
                value={formData.goods_description}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Volume (m³)</label>
              <input
                type="number"
                name="volume"
                value={formData.volume}
                onChange={handleInputChange}
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Poids (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                step="0.01"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Type de véhicule</label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {VEHICLE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              {formData.vehicle_type === 'Autre' && (
                <input
                  type="text"
                  value={customVehicleType}
                  onChange={(e) => setCustomVehicleType(e.target.value)}
                  placeholder="Préciser le type de véhicule"
                  required
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              )}

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hayon</label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={!tailgate}
                        onChange={() => setTailgate(false)}
                        className="form-radio text-blue-600"
                      />
                      <span className="ml-2">Non</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={tailgate}
                        onChange={() => setTailgate(true)}
                        className="form-radio text-blue-600"
                      />
                      <span className="ml-2">Oui</span>
                    </label>
                  </div>
                </div>

                {type === 'freight' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mètre</label>
                    <input
                      type="number"
                      name="metre"
                      value={formData.metre}
                      onChange={handleInputChange}
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Échange palettes</label>
              <select
                name="exchange_type"
                value={formData.exchange_type}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Sélectionner</option>
                <option value="Oui">Oui</option>
                <option value="Non">Non</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Consignes</label>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                rows={3}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {type === 'transport' && (
              <>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Instructions de chargement</label>
                  <textarea
                    name="loading_instructions"
                    value={formData.loading_instructions}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Instructions de déchargement</label>
                  <textarea
                    name="unloading_instructions"
                    value={formData.unloading_instructions}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {type === 'freight' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prix d'achat (€ HT)</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(Number(e.target.value))}
                    step="0.01"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prix de vente (€ HT)</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    step="0.01"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Marge (€)</label>
                  <input
                    type="number"
                    value={String(margin)}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Taux de marge (%)</label>
                  <input
                    type="number"
                    value={String(Number(marginRate.toFixed(2)))}
                    readOnly
                    className={`mt-1 block w-full rounded-md border-gray-300 bg-gray-50 ${
                      marginRate >= 20 ? 'text-green-600' : 'text-red-600'
                    }`}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Prix de transport (HT)</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre de kilomètres</label>
                  <input
                    type="number"
                    value={kilometers}
                    onChange={handleKilometersChange}
                    step="0.01"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                  {pricePerKm !== null && (
                    <div className="mt-2 text-sm text-gray-600">
                      Prix/km: {pricePerKm.toFixed(2)} €/km
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Mode de règlement</label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Sélectionner un mode</option>
                <option value="Virement 30j FDM">Virement 30j FDM</option>
                <option value="virement">Virement</option>
                <option value="cheque">Chèque</option>
                <option value="especes">Espèces</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Observations</label>
              <textarea
                name="observations"
                value={formData.observations}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="photo_required"
                  checked={formData.photo_required}
                  onChange={(e) => setFormData(prev => ({ ...prev, photo_required: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-600">Photo CMR impérative</span>
              </label>
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
              disabled={loading || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {(loading || submitting) ? 'Chargement...' : initialData ? 'Modifier' : 'Créer le bordereau'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SlipForm;