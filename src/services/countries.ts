import { supabase } from '../lib/supabase';
import type { Country } from '../types';

export async function getAllCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Error fetching countries: ${error.message}`);
  }

  return data || [];
}

export async function createCountry(name: string, code: string): Promise<Country> {
  const flag_url = `https://flagcdn.com/${code.toLowerCase()}.svg`;

  const { data, error } = await supabase
    .from('countries')
    .insert([{ name, code, flag_url }])
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating country: ${error.message}`);
  }

  return data;
}

export async function updateCountry(id: string, name: string, code: string): Promise<Country> {
  const flag_url = `https://flagcdn.com/${code.toLowerCase()}.svg`;

  const { data, error } = await supabase
    .from('countries')
    .update({ name, code, flag_url })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating country: ${error.message}`);
  }

  return data;
}