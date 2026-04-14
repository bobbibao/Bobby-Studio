import { FilterState } from '@/features/admin/pages/admin/inspiration/types/filterDropdown';

export type FilterField = keyof FilterState;

const DEFAULT_FILTER_FIELDS: FilterField[] = ['models', 'type', 'time', 'name'];

export const countActiveFilters = (
  filters: Partial<FilterState> = {},
  fields: FilterField[] = DEFAULT_FILTER_FIELDS
): number => {
  return fields.reduce((total, field) => {
    const value = filters[field];

    if (!value) {
      return total;
    }

    if (Array.isArray(value)) {
      return total + value.filter(Boolean).length;
    }

    return total + 1;
  }, 0);
};


