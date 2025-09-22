import React, { useState, useEffect } from 'react';
import { BarChart, PieChart, ArrowUp, ArrowDown, Download, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subMonths, subQuarters, subYears, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useClients } from '../hooks/useClients';
import { useFournisseurs } from '../hooks/useFournisseurs';
import * as XLSX from 'xlsx';
import { getClientDisputesStats } from '../services/slips';
import { getUnpaidInvoicesStats } from '../services/invoices';
import TableHeader from '../components/TableHeader';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';

type PeriodType = 'month' | 'quarter' | 'year' | 'custom';

// Define tab types
type TabType = 'global' | 'freight' | 'transport';

// Define statistics data types
interface GlobalStats {
  totalRevenue: number;
  totalTrips: number;
  totalKilometers: number;
  avgPricePerKm: number;
  avgPurchasePrice: number;
  avgSellingPrice: number;
  totalMargin: number;
  avgMarginRate: number;
  transportRevenue: number;
  freightRevenue: number;
  transportPercentage: number;
  freightPercentage: number;
  growthRate: number;
}

interface FreightStats {
  totalFreight: number;
  totalPurchase: number;
  totalSelling: number;
  revenuePercentage: number;
  totalMargin: number;
  marginRate: number;
  marginPercentage: number;
  growthRate: number;
}

interface TransportStats {
  totalTrips: number;
  totalKilometers: number;
  totalRevenue: number;
  revenuePercentage: number;
  revenueGrowthRate: number;
  avgPricePerKm: number;
}

const Statistics = () => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<TabType>('global');
  
  // State for filters
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedServiceType, setSelectedServiceType] = useState<'all' | 'transport' | 'freight'>('all');
  const [minMarginRate, setMinMarginRate] = useState<number>(0);
  const [maxMarginRate, setMaxMarginRate] = useState<number>(100);
  const [selectedFournisseur, setSelectedFournisseur] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [minPricePerKm, setMinPricePerKm] = useState<number>(0);
  const [showNegativeGrowthOnly, setShowNegativeGrowthOnly] = useState<boolean>(false);
  
  // State for statistics data
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [freightStats, setFreightStats] = useState<FreightStats | null>(null);
  const [transportStats, setTransportStats] = useState<TransportStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // KPI par client et sous-traitant
  const [kpiByClient, setKpiByClient] = useState<any[]>([]);
  const [kpiByFournisseur, setKpiByFournisseur] = useState<any[]>([]);

  // State for disputes stats
  const [disputesStats, setDisputesStats] = useState<{ disputes: { client_id: string, client_nom: string, count: number }[], totalClientsWithDispute: number }>({ disputes: [], totalClientsWithDispute: 0 });

  // State for unpaid/overdue invoices stats
  const [unpaidStats, setUnpaidStats] = useState<{ unpaidCount: number, unpaidTotal: number, overdueCount: number, overdueTotal: number }>({ unpaidCount: 0, unpaidTotal: 0, overdueCount: 0, overdueTotal: 0 });
  
  // Get clients and fournisseurs for filters
  const { data: clients } = useClients();
  const { data: fournisseurs } = useFournisseurs();

  // Calculate date range based on period type
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    if (periodType === 'custom' && customStartDate && customEndDate) {
      return {
        start: customStartDate,
        end: customEndDate
      };
    }

    switch (periodType) {
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfQuarter(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
    }

    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    };
  };

  // Calculate previous period date range
  const getPreviousPeriodDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    
    switch (periodType) {
      case 'month':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = startOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfQuarter(subQuarters(now, 1));
        endDate = startOfQuarter(now);
        break;
      case 'year':
        startDate = startOfYear(subYears(now, 1));
        endDate = startOfYear(now);
        break;
      default:
        startDate = startOfMonth(subMonths(now, 1));
        endDate = startOfMonth(now);
    }
    
    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd')
    };
  };

  // Fetch statistics data
  useEffect(() => {
    fetchStatistics();
  }, [periodType, selectedServiceType, minMarginRate, maxMarginRate, selectedFournisseur, selectedClient, minPricePerKm, showNegativeGrowthOnly, activeTab]);

  // Fetch disputes stats
  useEffect(() => {
    const fetchDisputes = async () => {
      const dateRange = getDateRange();
      const stats = await getClientDisputesStats(dateRange.start, dateRange.end);
      setDisputesStats(stats);
    };
    fetchDisputes();

    // Fetch unpaid/overdue invoices stats
    const fetchUnpaid = async () => {
      const dateRange = getDateRange();
      const stats = await getUnpaidInvoicesStats(dateRange.start, dateRange.end);
      setUnpaidStats(stats);
    };
    fetchUnpaid();
    // eslint-disable-next-line
  }, [periodType, customStartDate, customEndDate]);

  const fetchStatistics = async () => {
    setLoading(true);
    
    try {
      const dateRange = getDateRange();
      const previousPeriodDateRange = getPreviousPeriodDateRange();
      
      // Fetch data based on active tab
      switch (activeTab) {
        case 'global':
          await fetchGlobalStats(dateRange, previousPeriodDateRange);
          break;
        case 'freight':
          await fetchFreightStats(dateRange, previousPeriodDateRange);
          break;
        case 'transport':
          await fetchTransportStats(dateRange, previousPeriodDateRange);
          break;
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalStats = async (dateRange: { start: string, end: string }, previousPeriodDateRange: { start: string, end: string }) => {
    // Fetch transport slips
    const { data: transportSlips, error: transportError } = await supabase
      .from('transport_slips')
      .select('*, client:client_id(nom), fournisseur_id, fournisseur:fournisseur_id(nom)')
      .gte('loading_date', dateRange.start)
      .lte('loading_date', dateRange.end)
      .neq('status', 'dispute');
      
    if (transportError) throw transportError;
    
    // Fetch freight slips
    const { data: freightSlips, error: freightError } = await supabase
      .from('freight_slips')
      .select('*, client:client_id(nom), fournisseur_id, fournisseur:fournisseur_id(nom)')
      .gte('loading_date', dateRange.start)
      .lte('loading_date', dateRange.end)
      .neq('status', 'dispute');
      
    if (freightError) throw freightError;
    
    // Fetch previous period data for comparison
    const { data: prevTransportSlips, error: prevTransportError } = await supabase
      .from('transport_slips')
      .select('*')
      .gte('loading_date', previousPeriodDateRange.start)
      .lte('loading_date', previousPeriodDateRange.end)
      .neq('status', 'dispute');
      
    if (prevTransportError) throw prevTransportError;
    
    const { data: prevFreightSlips, error: prevFreightError } = await supabase
      .from('freight_slips')
      .select('*')
      .gte('loading_date', previousPeriodDateRange.start)
      .lte('loading_date', previousPeriodDateRange.end)
      .neq('status', 'dispute');
      
    if (prevFreightError) throw prevFreightError;
    
    // Apply service type filter if needed
    let filteredTransportSlips = transportSlips || [];
    let filteredFreightSlips = freightSlips || [];
    
    if (selectedServiceType === 'transport') {
      filteredFreightSlips = [];
    } else if (selectedServiceType === 'freight') {
      filteredTransportSlips = [];
    }
    
    // Apply margin rate filter to freight slips
    filteredFreightSlips = filteredFreightSlips.filter(slip => {
      const marginRate = slip.margin_rate || 0;
      return marginRate >= minMarginRate && marginRate <= maxMarginRate;
    });
    
    // Calculate statistics globaux
    const totalTransportTrips = filteredTransportSlips.length;
    const totalFreightTrips = filteredFreightSlips.length;
    const totalTrips = totalTransportTrips + totalFreightTrips;
    
    const totalTransportRevenue = filteredTransportSlips.reduce((sum, slip) => sum + (slip.price || 0), 0);
    const totalFreightRevenue = filteredFreightSlips.reduce((sum, slip) => sum + (slip.selling_price || 0), 0);
    const totalRevenue = totalTransportRevenue + totalFreightRevenue;
    
    const totalKilometers = filteredTransportSlips.reduce((sum, slip) => sum + (slip.kilometers || 0), 0);
    
    const avgPricePerKm = totalKilometers > 0 ? totalTransportRevenue / totalKilometers : 0;
    
    const totalPurchasePrice = filteredFreightSlips.reduce((sum, slip) => sum + (slip.purchase_price || 0), 0);
    const avgPurchasePrice = totalFreightTrips > 0 ? totalPurchasePrice / totalFreightTrips : 0;
    
    const totalSellingPrice = filteredFreightSlips.reduce((sum, slip) => sum + (slip.selling_price || 0), 0);
    const avgSellingPrice = totalFreightTrips > 0 ? totalSellingPrice / totalFreightTrips : 0;
    
    const totalMargin = filteredFreightSlips.reduce((sum, slip) => sum + (slip.margin || 0), 0);
    const avgMarginRate = totalSellingPrice > 0 ? (totalMargin / totalSellingPrice) * 100 : 0;
    
    const transportPercentage = totalRevenue > 0 ? (totalTransportRevenue / totalRevenue) * 100 : 0;
    const freightPercentage = totalRevenue > 0 ? (totalFreightRevenue / totalRevenue) * 100 : 0;
    
    // Calculate growth rate compared to previous period
    const prevTotalTransportRevenue = prevTransportSlips?.reduce((sum, slip) => sum + (slip.price || 0), 0) || 0;
    const prevTotalFreightRevenue = prevFreightSlips?.reduce((sum, slip) => sum + (slip.selling_price || 0), 0) || 0;
    const prevTotalRevenue = prevTotalTransportRevenue + prevTotalFreightRevenue;
    
    const growthRate = prevTotalRevenue > 0 
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
      : 0;
    
    setGlobalStats({
      totalRevenue,
      totalTrips,
      totalKilometers,
      avgPricePerKm,
      avgPurchasePrice,
      avgSellingPrice,
      totalMargin,
      avgMarginRate,
      transportRevenue: totalTransportRevenue,
      freightRevenue: totalFreightRevenue,
      transportPercentage,
      freightPercentage,
      growthRate
    });

    // Agrégation KPI par client
    const kpiClientMap: Record<string, any> = {};
    filteredTransportSlips.forEach(slip => {
      if (!slip.client_id) return;
      const key = slip.client_id;
      if (!kpiClientMap[key]) {
        kpiClientMap[key] = {
          client_id: key,
          client_nom: slip.client?.nom || 'Inconnu',
          ca: 0,
          km: 0,
          courses: 0,
          marge: 0,
          tauxMarge: 0
        };
      }
      kpiClientMap[key].ca += slip.price || 0;
      kpiClientMap[key].km += slip.kilometers || 0;
      kpiClientMap[key].courses += 1;
    });
    filteredFreightSlips.forEach(slip => {
      if (!slip.client_id) return;
      const key = slip.client_id;
      if (!kpiClientMap[key]) {
        kpiClientMap[key] = {
          client_id: key,
          client_nom: slip.client?.nom || 'Inconnu',
          ca: 0,
          km: 0,
          courses: 0,
          marge: 0,
          tauxMarge: 0
        };
      }
      kpiClientMap[key].ca += slip.selling_price || 0;
      kpiClientMap[key].marge += slip.margin || 0;
      kpiClientMap[key].courses += 1;
    });
    // Calcul du CA/km et taux de marge
    Object.values(kpiClientMap).forEach((k: any) => {
      k.caParKm = k.km > 0 ? k.ca / k.km : 0;
      k.tauxMarge = k.ca > 0 ? (k.marge / k.ca) * 100 : 0;
    });
    setKpiByClient(Object.values(kpiClientMap));

    // Agrégation KPI par sous-traitant
    const kpiFournisseurMap: Record<string, any> = {};
    filteredFreightSlips.forEach(slip => {
      if (!slip.fournisseur_id) return;
      const key = slip.fournisseur_id;
      if (!kpiFournisseurMap[key]) {
        kpiFournisseurMap[key] = {
          fournisseur_id: key,
          fournisseur_nom: slip.fournisseur?.nom || 'Inconnu',
          ca: 0,
          km: 0,
          courses: 0,
          marge: 0,
          tauxMarge: 0
        };
      }
      kpiFournisseurMap[key].ca += slip.selling_price || 0;
      kpiFournisseurMap[key].marge += slip.margin || 0;
      kpiFournisseurMap[key].courses += 1;
    });
    filteredTransportSlips.forEach(slip => {
      if (!slip.fournisseur_id) return;
      const key = slip.fournisseur_id;
      if (!kpiFournisseurMap[key]) {
        kpiFournisseurMap[key] = {
          fournisseur_id: key,
          fournisseur_nom: slip.fournisseur?.nom || 'Inconnu',
          ca: 0,
          km: 0,
          courses: 0,
          marge: 0,
          tauxMarge: 0
        };
      }
      kpiFournisseurMap[key].ca += slip.price || 0;
      kpiFournisseurMap[key].km += slip.kilometers || 0;
      kpiFournisseurMap[key].courses += 1;
    });
    Object.values(kpiFournisseurMap).forEach((k: any) => {
      k.caParKm = k.km > 0 ? k.ca / k.km : 0;
      k.tauxMarge = k.ca > 0 ? (k.marge / k.ca) * 100 : 0;
    });
    setKpiByFournisseur(Object.values(kpiFournisseurMap));
  };

  const fetchFreightStats = async (dateRange: { start: string, end: string }, previousPeriodDateRange: { start: string, end: string }) => {
    // Build query with filters
    let query = supabase
      .from('freight_slips')
      .select('*')
      .gte('loading_date', dateRange.start)
      .lte('loading_date', dateRange.end)
      .neq('status', 'dispute');
    
    // Apply fournisseur filter if selected
    if (selectedFournisseur) {
      query = query.eq('fournisseur_id', selectedFournisseur);
    }
    
    // Apply margin rate filter
    query = query.gte('margin_rate', minMarginRate).lte('margin_rate', maxMarginRate);
    
    const { data: freightSlips, error: freightError } = await query;
    if (freightError) throw freightError;
    
    // Fetch previous period data for comparison
    let prevQuery = supabase
      .from('freight_slips')
      .select('*')
      .gte('loading_date', previousPeriodDateRange.start)
      .lte('loading_date', previousPeriodDateRange.end)
      .neq('status', 'dispute');
    
    if (selectedFournisseur) {
      prevQuery = prevQuery.eq('fournisseur_id', selectedFournisseur);
    }
    
    prevQuery = prevQuery.gte('margin_rate', minMarginRate).lte('margin_rate', maxMarginRate);
    
    const { data: prevFreightSlips, error: prevFreightError } = await prevQuery;
    if (prevFreightError) throw prevFreightError;
    
    // Fetch global revenue for percentage calculation - separate queries
    const { data: allFreightSlips, error: allFreightError } = await supabase
      .from('freight_slips')
      .select('selling_price')
      .gte('loading_date', dateRange.start)
      .lte('loading_date', dateRange.end)
      .neq('status', 'dispute');
    
    if (allFreightError) throw allFreightError;
    
    const { data: allTransportSlips, error: allTransportError } = await supabase
      .from('transport_slips')
      .select('price')
      .gte('loading_date', dateRange.start)
      .lte('loading_date', dateRange.end)
      .neq('status', 'dispute');
    
    if (allTransportError) throw allTransportError;
    
    // Calculate statistics
    const totalFreight = freightSlips?.length || 0;
    const totalPurchase = freightSlips?.reduce((sum, slip) => sum + (slip.purchase_price || 0), 0) || 0;
    const totalSelling = freightSlips?.reduce((sum, slip) => sum + (slip.selling_price || 0), 0) || 0;
    
    // Calculate total global revenue by combining both queries
    const totalFreightRevenue = allFreightSlips?.reduce((sum, slip) => sum + (slip.selling_price || 0), 0) || 0;
    const totalTransportRevenue = allTransportSlips?.reduce((sum, slip) => sum + (slip.price || 0), 0) || 0;
    const totalGlobalRevenue = totalFreightRevenue + totalTransportRevenue;
    
    const revenuePercentage = totalGlobalRevenue > 0 ? (totalSelling / totalGlobalRevenue) * 100 : 0;
    
    const totalMargin = freightSlips?.reduce((sum, slip) => sum + (slip.margin || 0), 0) || 0;
    const marginRate = totalSelling > 0 ? (totalMargin / totalSelling) * 100 : 0;
    
    // Calculate margin percentage of total margin (only freight slips have margin data)
    const totalGlobalMargin = allFreightSlips?.reduce((sum, slip) => sum + (slip.margin || 0), 0) || 0;
    const marginPercentage = totalGlobalMargin > 0 ? (totalMargin / totalGlobalMargin) * 100 : 0;
    
    // Calculate growth rate compared to previous period
    const prevTotalSelling = prevFreightSlips?.reduce((sum, slip) => sum + (slip.selling_price || 0), 0) || 0;
    const growthRate = prevTotalSelling > 0 
      ? ((totalSelling - prevTotalSelling) / prevTotalSelling) * 100 
      : 0;
    
    setFreightStats({
      totalFreight,
      totalPurchase,
      totalSelling,
      revenuePercentage,
      totalMargin,
      marginRate,
      marginPercentage,
      growthRate
    });
  };

  const fetchTransportStats = async (dateRange: { start: string, end: string }, previousPeriodDateRange: { start: string, end: string }) => {
    // Build query with filters
    let query = supabase
      .from('transport_slips')
      .select('*')
      .gte('loading_date', dateRange.start)
      .lte('loading_date', dateRange.end)
      .neq('status', 'dispute');
    
    // Apply client filter if selected
    if (selectedClient) {
      query = query.eq('client_id', selectedClient);
    }
    
    // Apply price per km filter
    if (minPricePerKm > 0) {
      query = query.gte('price_per_km', minPricePerKm);
    }
    
    const { data: transportSlips, error: transportError } = await query;
    if (transportError) throw transportError;
    
    // Fetch previous period data for comparison
    let prevQuery = supabase
      .from('transport_slips')
      .select('*')
      .gte('loading_date', previousPeriodDateRange.start)
      .lte('loading_date', previousPeriodDateRange.end)
      .neq('status', 'dispute');
    
    if (selectedClient) {
      prevQuery = prevQuery.eq('client_id', selectedClient);
    }
    
    if (minPricePerKm > 0) {
      prevQuery = prevQuery.gte('price_per_km', minPricePerKm);
    }
    
    const { data: prevTransportSlips, error: prevTransportError } = await prevQuery;
    if (prevTransportError) throw prevTransportError;
    
    // Fetch global revenue for percentage calculation - separate queries
    const { data: allTransportSlips, error: allTransportError } = await supabase
      .from('transport_slips')
      .select('price')
      .gte('loading_date', dateRange.start)
      .lte('loading_date', dateRange.end)
      .neq('status', 'dispute');
    
    if (allTransportError) throw allTransportError;
    
    const { data: allFreightSlips, error: allFreightError } = await supabase
      .from('freight_slips')
      .select('selling_price')
      .gte('loading_date', dateRange.start)
      .lte('loading_date', dateRange.end)
      .neq('status', 'dispute');
    
    if (allFreightError) throw allFreightError;
    
    // Calculate statistics
    const totalTrips = transportSlips?.length || 0;
    const totalKilometers = transportSlips?.reduce((sum, slip) => sum + (slip.kilometers || 0), 0) || 0;
    const totalRevenue = transportSlips?.reduce((sum, slip) => sum + (slip.price || 0), 0) || 0;
    
    // Calculate total global revenue by combining both queries
    const totalTransportRevenue = allTransportSlips?.reduce((sum, slip) => sum + (slip.price || 0), 0) || 0;
    const totalFreightRevenue = allFreightSlips?.reduce((sum, slip) => sum + (slip.selling_price || 0), 0) || 0;
    const totalGlobalRevenue = totalTransportRevenue + totalFreightRevenue;
    
    const revenuePercentage = totalGlobalRevenue > 0 ? (totalRevenue / totalGlobalRevenue) * 100 : 0;
    
    const avgPricePerKm = totalKilometers > 0 ? totalRevenue / totalKilometers : 0;
    
    // Calculate growth rate compared to previous period
    const prevTotalRevenue = prevTransportSlips?.reduce((sum, slip) => sum + (slip.price || 0), 0) || 0;
    const revenueGrowthRate = prevTotalRevenue > 0 
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
      : 0;
    
    // Apply negative growth filter if enabled
    if (showNegativeGrowthOnly && revenueGrowthRate >= 0) {
      setTransportStats(null);
      return;
    }
    
    setTransportStats({
      totalTrips,
      totalKilometers,
      totalRevenue,
      revenuePercentage,
      revenueGrowthRate,
      avgPricePerKm
    });
  };

  // Export data to Excel
  const exportToExcel = () => {
    try {
      let wb = XLSX.utils.book_new();
      let filename = '';

      switch (activeTab) {
        case 'global':
          if (!globalStats) return;
          // Statistiques globales
          const globalData = [{
            'Total CA global': globalStats.totalRevenue,
            'Total nombre de courses': globalStats.totalTrips,
            'Total nombre de kilomètres': Math.round(globalStats.totalKilometers),
            'Prix moyen au kilomètre': globalStats.avgPricePerKm,
            'Prix moyen d\'achat': globalStats.avgPurchasePrice,
            'Prix moyen de vente': globalStats.avgSellingPrice,
            'Marge brute totale': globalStats.totalMargin,
            'Taux de marge moyen': globalStats.avgMarginRate,
            'Part CA Transport': globalStats.transportPercentage,
            'Part CA Affrètement': globalStats.freightPercentage,
            'Évolution globale': globalStats.growthRate
          }];
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(globalData), 'Statistiques');

          // KPI par client
          if (kpiByClient.length > 0) {
            const clientData = kpiByClient.map(k => ({
              'Client': k.client_nom,
              'CA': k.ca,
              'CA/km': k.caParKm,
              'Courses': k.courses,
              'Marge': k.marge,
              'Taux de marge': k.tauxMarge
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientData), 'KPI Clients');
          }

          // KPI par sous-traitant
          if (kpiByFournisseur.length > 0) {
            const fournisseurData = kpiByFournisseur.map(k => ({
              'Sous-traitant': k.fournisseur_nom,
              'CA': k.ca,
              'CA/km': k.caParKm,
              'Courses': k.courses,
              'Marge': k.marge,
              'Taux de marge': k.tauxMarge
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fournisseurData), 'KPI Sous-traitants');
          }

          filename = `Statistiques_Globales_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case 'freight':
          if (!freightStats) return;
          const freightData = [{
            'Nombre d\'affrètements': freightStats.totalFreight,
            'Prix total acheté': freightStats.totalPurchase,
            'Prix total vendu': freightStats.totalSelling,
            'Part du chiffre d\'affaires': freightStats.revenuePercentage,
            'Marge brute totale': freightStats.totalMargin,
            'Taux de marge': freightStats.marginRate,
            'Part de marge': freightStats.marginPercentage,
            'Évolution': freightStats.growthRate
          }];
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(freightData), 'Statistiques');
          filename = `Statistiques_Affretement_${format(new Date(), 'yyyy-MM-dd')}`;
          break;

        case 'transport':
          if (!transportStats) return;
          const transportData = [{
            'Nombre de courses': transportStats.totalTrips,
            'Nombre total de kilomètres': Math.round(transportStats.totalKilometers),
            'Chiffre d\'affaires transport': transportStats.totalRevenue,
            'Part du chiffre d\'affaires total': transportStats.revenuePercentage,
            'Évolution du CA transport': transportStats.revenueGrowthRate,
            'Prix moyen par kilomètre': transportStats.avgPricePerKm
          }];
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transportData), 'Statistiques');
          filename = `Statistiques_Transport_${format(new Date(), 'yyyy-MM-dd')}`;
          break;
      }

      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success('Export Excel réussi');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Erreur lors de l\'export Excel');
    }
  };

  // Helper function to format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // Helper function to get color based on margin rate
  const getMarginRateColor = (rate: number): string => {
    if (rate >= 20) return 'text-green-600';
    if (rate >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to get color based on growth rate
  const getGrowthRateColor = (rate: number): string => {
    return rate >= 0 ? 'text-green-600' : 'text-red-600';
  };

  // Helper function to get growth icon
  const getGrowthIcon = (rate: number) => {
    return rate >= 0 ? <ArrowUp size={16} className="text-green-600" /> : <ArrowDown size={16} className="text-red-600" />;
  };

  return (
    <div className="w-full p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <BarChart className="w-8 h-8" />
          Statistiques
        </h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            onClick={() => setActiveTab('global')}
            className={`inline-flex items-center px-4 py-2 rounded-lg ${
              activeTab === 'global'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Global société
          </button>
          <button
            onClick={() => setActiveTab('freight')}
            className={`inline-flex items-center px-4 py-2 rounded-lg ${
              activeTab === 'freight'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Affrètement
          </button>
          <button
            onClick={() => setActiveTab('transport')}
            className={`inline-flex items-center px-4 py-2 rounded-lg ${
              activeTab === 'transport'
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Transport
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-gray-500" />
          <h2 className="text-lg font-semibold">Filtres</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Period filter - common to all tabs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Période
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="month">Mois en cours</option>
              <option value="quarter">Trimestre en cours</option>
              <option value="year">Année en cours</option>
              <option value="custom">Plage personnalisée</option>
            </select>
          </div>
          {periodType === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Global tab specific filters */}
          {activeTab === 'global' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de prestation
                </label>
                <select
                  value={selectedServiceType}
                  onChange={(e) => setSelectedServiceType(e.target.value as 'all' | 'transport' | 'freight')}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tous</option>
                  <option value="transport">Transport</option>
                  <option value="freight">Affrètement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taux de marge minimum (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minMarginRate}
                  onChange={(e) => setMinMarginRate(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taux de marge maximum (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={maxMarginRate}
                  onChange={(e) => setMaxMarginRate(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Freight tab specific filters */}
          {activeTab === 'freight' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fournisseur
                </label>
                <select
                  value={selectedFournisseur}
                  onChange={(e) => setSelectedFournisseur(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les fournisseurs</option>
                  {fournisseurs.map(fournisseur => (
                    <option key={fournisseur.id} value={fournisseur.id}>
                      {fournisseur.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marge minimum (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={minMarginRate}
                  onChange={(e) => setMinMarginRate(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marge maximum (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={maxMarginRate}
                  onChange={(e) => setMaxMarginRate(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Transport tab specific filters */}
          {activeTab === 'transport' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tous les clients</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prix moyen par km minimum (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={minPricePerKm}
                  onChange={(e) => setMinPricePerKm(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showNegativeGrowthOnly}
                    onChange={(e) => setShowNegativeGrowthOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-600">Afficher uniquement les évolutions négatives</span>
                </label>
              </div>
            </>
          )}

          {/* Export button - common to all tabs */}
          <div className="flex items-end">
            <button
              onClick={exportToExcel}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Statistics content */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Global statistics */}
            {activeTab === 'global' && globalStats && (
              <div>
                <h2 className="text-xl font-bold mb-6">Synthèse globale de l'activité</h2>

                {/* Indicateur global litiges */}
                <div className="mb-4">
                  <span className="font-semibold">Clients avec au moins un litige sur la période : </span>
                  {disputesStats.totalClientsWithDispute} / {clients.length} (
                  {clients.length > 0 ? ((disputesStats.totalClientsWithDispute / clients.length) * 100).toFixed(1) : '0'}%)
                </div>
                {/* Indicateurs factures impayées */}
                <div className="mb-4">
                  <span className="font-semibold">Factures impayées : </span>
                  {unpaidStats.unpaidCount} facture{unpaidStats.unpaidCount > 1 ? 's' : ''} en attente (
                  {formatCurrency(unpaidStats.unpaidTotal)})
                  <br />
                  <span className="font-semibold">Factures en retard : </span>
                  {unpaidStats.overdueCount} facture{unpaidStats.overdueCount > 1 ? 's' : ''} en retard (
                  {formatCurrency(unpaidStats.overdueTotal)})
                </div>
                {/* Tableau litiges par client */}
                {disputesStats.disputes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Litiges par client</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre de litiges</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {disputesStats.disputes.map((d) => (
                            <tr key={d.client_id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{d.client_nom}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{d.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {/* Tableau KPI par client */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-2">KPI par client</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <TableHeader>Client</TableHeader>
                          <TableHeader align="right">CA</TableHeader>
                          <TableHeader align="right">CA/km</TableHeader>
                          <TableHeader align="right">Courses</TableHeader>
                          <TableHeader align="right">Marge</TableHeader>
                          <TableHeader align="right">Taux de marge</TableHeader>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {kpiByClient.map((k) => (
                          <tr key={k.client_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{k.client_nom}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(k.ca)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(k.caParKm)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{k.courses}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(k.marge)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{k.tauxMarge.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Graphique barres CA par client */}
                  {kpiByClient.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">CA par client (barres)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <ReBarChart data={kpiByClient.slice(0, 10)}>
                          <XAxis dataKey="client_nom" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="ca" fill="#2563eb" />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {/* Graphique camembert CA par client */}
                  {kpiByClient.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">Répartition CA par client (camembert)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <RePieChart>
                          <Pie data={kpiByClient} dataKey="ca" nameKey="client_nom" cx="50%" cy="50%" outerRadius={100} label>
                            {kpiByClient.map((entry, index) => (
                              <Cell key={`cell-client-${index}`} fill={["#2563eb", "#22c55e", "#f59e42", "#e11d48", "#a21caf", "#0ea5e9", "#fbbf24", "#14b8a6", "#6366f1", "#f43f5e"][index % 10]} />
                            ))}
                          </Pie>
                          <Legend />
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                {/* Tableau KPI par sous-traitant */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-2">KPI par sous-traitant</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <TableHeader>Sous-traitant</TableHeader>
                          <TableHeader align="right">CA</TableHeader>
                          <TableHeader align="right">CA/km</TableHeader>
                          <TableHeader align="right">Courses</TableHeader>
                          <TableHeader align="right">Marge</TableHeader>
                          <TableHeader align="right">Taux de marge</TableHeader>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {kpiByFournisseur.map((k) => (
                          <tr key={k.fournisseur_id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{k.fournisseur_nom}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(k.ca)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(k.caParKm)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{k.courses}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(k.marge)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{k.tauxMarge.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Graphique barres CA par sous-traitant */}
                  {kpiByFournisseur.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">CA par sous-traitant (barres)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <ReBarChart data={kpiByFournisseur.slice(0, 10)}>
                          <XAxis dataKey="fournisseur_nom" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="ca" fill="#22c55e" />
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {/* Graphique camembert CA par sous-traitant */}
                  {kpiByFournisseur.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">Répartition CA par sous-traitant (camembert)</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <RePieChart>
                          <Pie data={kpiByFournisseur} dataKey="ca" nameKey="fournisseur_nom" cx="50%" cy="50%" outerRadius={100} label>
                            {kpiByFournisseur.map((entry, index) => (
                              <Cell key={`cell-fournisseur-${index}`} fill={["#22c55e", "#2563eb", "#f59e42", "#e11d48", "#a21caf", "#0ea5e9", "#fbbf24", "#14b8a6", "#6366f1", "#f43f5e"][index % 10]} />
                            ))}
                          </Pie>
                          <Legend />
                          <Tooltip />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total CA global</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total nombre de courses</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total nombre de kilomètres</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix moyen au kilomètre</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix moyen d'achat</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix moyen de vente</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marge brute totale</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taux de marge moyen</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part CA Transport</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part CA Affrètement</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Évolution globale</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(globalStats.totalRevenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{globalStats.totalTrips}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Math.round(globalStats.totalKilometers)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(globalStats.avgPricePerKm)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(globalStats.avgPurchasePrice)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(globalStats.avgSellingPrice)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(globalStats.totalMargin)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getMarginRateColor(globalStats.avgMarginRate)}`}>
                          {globalStats.avgMarginRate.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{globalStats.transportPercentage.toFixed(2)}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{globalStats.freightPercentage.toFixed(2)}%</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center ${getGrowthRateColor(globalStats.growthRate)}`}>
                          {getGrowthIcon(globalStats.growthRate)}
                          <span className="ml-1">{globalStats.growthRate.toFixed(2)}%</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Répartition du chiffre d'affaires</h3>
                    <div className="flex items-center justify-center h-64">
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col items-center">
                          <div className="w-32 h-32 rounded-full border-8 border-blue-500 flex items-center justify-center">
                            <span className="text-xl font-bold">{globalStats.transportPercentage.toFixed(0)}%</span>
                          </div>
                          <span className="mt-2 font-medium">Transport</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-32 h-32 rounded-full border-8 border-green-500 flex items-center justify-center">
                            <span className="text-xl font-bold">{globalStats.freightPercentage.toFixed(0)}%</span>
                          </div>
                          <span className="mt-2 font-medium">Affrètement</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Évolution par rapport à la période précédente</h3>
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className={`text-6xl font-bold ${getGrowthRateColor(globalStats.growthRate)}`}>
                          {globalStats.growthRate > 0 ? '+' : ''}{globalStats.growthRate.toFixed(1)}%
                        </div>
                        <div className="mt-4 text-gray-600">
                          {periodType === 'month' && 'Par rapport au mois précédent'}
                          {periodType === 'quarter' && 'Par rapport au trimestre précédent'}
                          {periodType === 'year' && 'Par rapport à l\'année précédente'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Freight statistics */}
            {activeTab === 'freight' && freightStats && (
              <div>
                <h2 className="text-xl font-bold mb-6">Statistiques d'affrètement</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre d'affrètements</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix total acheté</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix total vendu</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part du chiffre d'affaires</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marge brute totale</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taux de marge</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part de marge</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Évolution</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{freightStats.totalFreight}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(freightStats.totalPurchase)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(freightStats.totalSelling)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{freightStats.revenuePercentage.toFixed(2)}%</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(freightStats.totalMargin)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getMarginRateColor(freightStats.marginRate)}`}>
                          {freightStats.marginRate.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{freightStats.marginPercentage.toFixed(2)}%</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center ${getGrowthRateColor(freightStats.growthRate)}`}>
                          {getGrowthIcon(freightStats.growthRate)}
                          <span className="ml-1">{freightStats.growthRate.toFixed(2)}%</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Répartition achat/vente/marge</h3>
                    <div className="flex items-center justify-center h-64">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center text-white">
                            <span className="text-sm font-bold">{formatCurrency(freightStats.totalPurchase)}</span>
                          </div>
                          <span className="mt-2 font-medium">Achat</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center text-white">
                            <span className="text-sm font-bold">{formatCurrency(freightStats.totalSelling)}</span>
                          </div>
                          <span className="mt-2 font-medium">Vente</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white">
                            <span className="text-sm font-bold">{formatCurrency(freightStats.totalMargin)}</span>
                          </div>
                          <span className="mt-2 font-medium">Marge</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Taux de marge</h3>
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className={`text-6xl font-bold ${getMarginRateColor(freightStats.marginRate)}`}>
                          {freightStats.marginRate.toFixed(1)}%
                        </div>
                        <div className="mt-4 text-gray-600">
                          Taux de marge moyen
                        </div>
                        <div className="mt-2 flex items-center justify-center">
                          <div className={`text-2xl font-bold ${getGrowthRateColor(freightStats.growthRate)}`}>
                            {freightStats.growthRate > 0 ? '+' : ''}{freightStats.growthRate.toFixed(1)}%
                          </div>
                          <div className="ml-2 text-gray-600">
                            d'évolution
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transport statistics */}
            {activeTab === 'transport' && transportStats && (
              <div>
                <h2 className="text-xl font-bold mb-6">Statistiques de transport</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre de courses</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre total de kilomètres</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chiffre d'affaires transport</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part du chiffre d'affaires total</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Évolution du CA transport</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prix moyen par kilomètre</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transportStats.totalTrips}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Math.round(transportStats.totalKilometers)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(transportStats.totalRevenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transportStats.revenuePercentage.toFixed(2)}%</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center ${getGrowthRateColor(transportStats.revenueGrowthRate)}`}>
                          {getGrowthIcon(transportStats.revenueGrowthRate)}
                          <span className="ml-1">{transportStats.revenueGrowthRate.toFixed(2)}%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(transportStats.avgPricePerKm)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Répartition du chiffre d'affaires</h3>
                    <div className="flex items-center justify-center h-64">
                      <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full border-8 border-blue-500 flex items-center justify-center">
                          <span className="text-xl font-bold">{transportStats.revenuePercentage.toFixed(0)}%</span>
                        </div>
                        <span className="mt-2 font-medium">du CA total</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Évolution du chiffre d'affaires transport</h3>
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <div className={`text-6xl font-bold ${getGrowthRateColor(transportStats.revenueGrowthRate)}`}>
                          {transportStats.revenueGrowthRate > 0 ? '+' : ''}{transportStats.revenueGrowthRate.toFixed(1)}%
                        </div>
                        <div className="mt-4 text-gray-600">
                          {periodType === 'month' && 'Par rapport au mois précédent'}
                          {periodType === 'quarter' && 'Par rapport au trimestre précédent'}
                          {periodType === 'year' && 'Par rapport à l\'année précédente'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No data message */}
            {activeTab === 'global' && !globalStats && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune donnée disponible pour les filtres sélectionnés</p>
              </div>
            )}
            {activeTab === 'freight' && !freightStats && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune donnée disponible pour les filtres sélectionnés</p>
              </div>
            )}
            {activeTab === 'transport' && !transportStats && (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune donnée disponible pour les filtres sélectionnés</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Statistics;
