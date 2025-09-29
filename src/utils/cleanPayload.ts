import { isUUID } from './validation';

export function cleanPayload<T extends Record<string, any>>(data: T): T {
  const result = {} as T;

  for (const [key, value] of Object.entries(data)) {
    // Handle UUID fields
    if (key.endsWith('_id')) {
      result[key] = (!value || value === '') ? null : value;
      continue;
    }

    // Handle numeric fields
    if (typeof value === 'number') {
      result[key] = isNaN(value) ? 0 : value;
      continue;
    }

    // Handle boolean fields
    if (typeof value === 'boolean') {
      result[key] = Boolean(value);
      continue;
    }

    // Handle string fields
    if (typeof value === 'string') {
      result[key] = value.trim();
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      result[key] = value;
      continue;
    }

    // Handle objects (including null)
    result[key] = value;
  }

  return result;
}