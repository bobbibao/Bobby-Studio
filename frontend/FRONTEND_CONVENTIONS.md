# Frontend Conventions & Rules

## 1. Import Direction Rules

**ALLOWED:**
```typescript
// Feature importing from shared
import { Button } from '@/shared/components/ui/Button';
import { useDebounce } from '@/shared/hooks';

// Feature importing from services
import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/services/auth/auth.store';

// Feature importing from same feature
import { useOffers } from '../api/hooks';
```

**FORBIDDEN:**
```typescript
// Feature importing from other feature
import { useProjects } from '@/features/projects/api/hooks'; // ❌

// Shared importing from feature
import { offersApiClient } from '@/features/offers/api/client'; // ❌

// Circular imports
```

---

## 2. File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| **React Component** | PascalCase | `OfferTable.tsx`, `UserProfile.tsx` |
| **Hook** | camelCase with 'use' prefix | `useOffers.ts`, `useQueryParams.ts` |
| **Service/Class** | camelCase or PascalCase | `offersApiClient.ts`, `AuthService.ts` |
| **Utility Function** | camelCase | `buildQueryString.ts`, `formatDate.ts` |
| **Type/Interface** | PascalCase | `Offer.ts`, `CreateOfferDTO.ts` |
| **Constant/Enum** | UPPER_SNAKE_CASE | `OFFERS_ENDPOINTS.ts`, `USER_ROLES.ts` |
| **Store** | camelCase with 'Store' suffix | `offerStore.ts`, `authStore.ts` |

---

## 3. API Client Pattern

### Endpoint Definition
```typescript
// features/offers/api/endpoints.ts
export const OFFERS_ENDPOINTS = {
  GET_OFFERS: '/offers',
  GET_OFFER: (id: number) => `/offer/${id}`,
  CREATE_OFFER: '/offer',
  UPDATE_OFFER: (id: number) => `/offer/${id}`,
  DELETE_OFFER: (id: number) => `/offer/${id}`,
};
```

### Client Implementation
```typescript
// features/offers/api/client.ts
export class OffersApiClient {
  async getOffers(filters) { /* ... */ }
  async getOffer(id) { /* ... */ }
  async createOffer(data) { /* ... */ }
}

export const offersApiClient = new OffersApiClient();
```

### React Query Hooks
```typescript
// features/offers/api/hooks.ts
export function useOffers(filters) {
  return useQuery({
    queryKey: ['offers', filters],
    queryFn: () => offersApiClient.getOffers(filters),
  });
}
```

---

## 4. Hook Naming Rules

| Pattern | Usage | Example |
|---------|-------|---------|
| `use[Entity]` | Query hook | `useOffers`, `useOfferDetail` |
| `use[Action][Entity]` | Mutation hook | `useCreateOffer`, `useUpdateOffer` |
| `use[Behavior]` | Custom hook | `useDebounce`, `useQueryParams` |
| `useAsync` | Generic async | `useAsync(fetchFn)` |

---

## 5. Component Hierarchy (Atomic Design)

### Atoms (Primitive UI)
```typescript
// shared/components/ui/atoms/
Button.tsx       // No business logic
Input.tsx
Badge.tsx
Spinner.tsx
```

**Rules:**
- No feature-specific logic
- Pure presentation
- Accept only props
- Reusable everywhere

### Molecules (Compound UI)
```typescript
// features/offers/components/molecules/
OfferStatusFilter.tsx    // Combines atoms
OfferSearchInput.tsx
CostEstimateForm.tsx
```

**Rules:**
- Combine atoms
- Feature-local (if needed)
- May have simple state
- Minimal logic

### Organisms (Feature Sections)
```typescript
// features/offers/components/organisms/
OffersTable.tsx          # Data + actions
OfferHeader.tsx
OfferDetailPanel.tsx
```

**Rules:**
- Consume hooks (useOffers, etc.)
- Complex logic allowed
- Typically 1 per page
- Feature-scoped

### Pages (Feature Routes)
```typescript
// features/offers/pages/
OfferList.tsx            # useOffers hook + layout
OfferDetail.tsx          # useOfferDetail + form
```

---

## 6. Type Organization

### Global Types
```typescript
// types/entities.ts - Export all domain models
export type Offer = { id: number; name: string; /* ... */ };
export type Project = { id: number; /* ... */ };
export type User = { id: number; email: string; /* ... */ };

// types/api.ts - API contracts
export interface Response<T> { error: boolean; payload?: T; }

// types/forms.ts - Form-specific
export interface OfferFormData { name: string; customerId: number; }
```

### Feature Types
```typescript
// features/offers/types/
offer.ts              # Offer interface + enums
offer.dto.ts          # CreateOfferDTO, UpdateOfferDTO
offer.form.ts         # OfferFormData (local form state)
```

### DTO Pattern
```typescript
// Request DTOs (for sending)
export interface CreateOfferDTO {
  name: string;
  customerId: number;
  status?: 'draft' | 'sent' | 'accepted';
}

// Response types (from API)
export interface Offer extends CreateOfferDTO {
  id: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 7. Constant Organization

### Global Constants
```typescript
// config/api.ts
export const API_BASE_URL = process.env.REACT_APP_API_URL;
export const API_TIMEOUT = 30000;

// config/auth.ts
export const TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

// shared/constants/enums.ts
export enum OfferStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
```

### Feature Constants
```typescript
// features/offers/constants/
endpoints.ts         # Feature-scoped API endpoints
config.ts            # Feature defaults
```

---

## 8. Form Pattern

### Uncontrolled (Recommended)
```typescript
import { useForm } from 'react-hook-form';

export function OfferForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<OfferFormData>();
  const { mutate: createOffer } = useCreateOffer();
  
  return (
    <form onSubmit={handleSubmit((data) => createOffer(data))}>
      <input {...register('name', { required: true })} />
      {errors.name && <span>Required</span>}
    </form>
  );
}
```

### Field Validation
```typescript
// Always use schema validation
import { z } from 'zod';

export const OfferFormSchema = z.object({
  name: z.string().min(1, 'Name required'),
  customerId: z.number().int('Invalid customer'),
  amount: z.number().min(0, 'Must be positive'),
});

export type OfferFormData = z.infer<typeof OfferFormSchema>;
```

---

## 9. Table Pattern

```typescript
// features/offers/components/organisms/OffersTable.tsx
export function OffersTable() {
  const { data, isLoading } = useOffers(page, pageSize);
  const { mutate: deleteOffer } = useDeleteOffer();
  
  const columns = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Status', accessorKey: 'status' },
    {
      header: 'Actions',
      cell: (row) => (
        <>
          <EditButton onClick={() => navigate(`/offer/${row.id}`)} />
          <DeleteButton onClick={() => deleteOffer(row.id)} />
        </>
      ),
    },
  ];
  
  return <DataTable columns={columns} data={data?.items || []} />;
}
```

---

## 10. Query Parameter Handling

```typescript
// shared/hooks/useQueryParams.ts
export function useQueryParams() {
  const [params, setParams] = useSearchParams();
  
  return {
    page: parseInt(params.get('page') || '1'),
    pageSize: parseInt(params.get('page_size') || '20'),
    search: params.get('search') || '',
    sort: params.get('sort') || '',
    
    setPage: (page) => setParams({ ...Object.fromEntries(params), page: page.toString() }),
    setSearch: (search) => setParams({ ...Object.fromEntries(params), search }),
  };
}

// Usage in page
export function OfferListPage() {
  const { page, pageSize, search, setPage, setSearch } = useQueryParams();
  const { data } = useOffers(page, pageSize, search);
  
  return (
    <>
      <SearchInput value={search} onChange={setSearch} />
      <OffersTable data={data} />
      <Pagination page={page} onPageChange={setPage} />
    </>
  );
}
```

---

## 11. Error Handling & User Feedback

### Toast Notification Pattern
```typescript
// components/useToast hook (global)
export function useToast() {
  return {
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    loading: (message) => toast.loading(message),
  };
}

// Usage
const { mutate: deleteOffer } = useMutation({
  mutationFn: offersApiClient.deleteOffer,
  onSuccess: () => {
    toast.success('Offer deleted');
    queryClient.invalidateQueries({ queryKey: ['offers'] });
  },
  onError: (error) => {
    toast.error(error.message || 'Failed to delete');
  },
});
```

---

## 12. i18n Usage

### Key Naming
```typescript
// locales/en.ts
export const en = {
  menu: {
    offers: 'Offers',
    projects: 'Projects',
  },
  button: {
    create: 'Create',
    save: 'Save',
    delete: 'Delete',
  },
  message: {
    deleteConfirm: 'Are you sure?',
    deletedSuccess: 'Deleted successfully',
  },
};
```

### Component Usage
```typescript
import { useTranslation } from 'react-i18next';

export function OfferTable() {
  const { t } = useTranslation();
  
  return (
    <>
      <h1>{t('menu.offers')}</h1>
      <Button>{t('button.create')}</Button>
    </>
  );
}
```

---

## 13. Feature Isolation Checklist

- [ ] Feature folder contains only its logic
- [ ] Cross-feature imports only use `@/shared` and `@/services`
- [ ] Feature API is isolated in `api/`
- [ ] Components use feature-scoped hooks
- [ ] No prop drilling beyond 2 levels
- [ ] Store (if any) is Zustand at feature level
- [ ] Types exported from `types/index.ts`

---

## 14. Performance Rules

**AVOID:**
```typescript
// Don't refetch on every render
const { data } = useOffers(); // Gets fresh data constantly

// Don't pass entire objects unnecessarily
<OfferTable offers={offers} /> // Pass only needed fields

// Don't re-render parent on child state change
// Use local state in component
```

**DO:**
```typescript
// Cache with query key staleness
const { data } = useOffers({
  staleTime: 5 * 60 * 1000, // 5 min
});

// Memoize expensive components
const OfferTable = memo(({ offers }) => {/* ... */});

// Lazy load pages
const OfferDetail = lazy(() => import('./pages/OfferDetail'));
```

---

## 15. Code Organization Checklist

- [ ] One component per file (with exceptions for atoms)
- [ ] Export from `index.ts` files
- [ ] Consistent 2-space indentation
- [ ] TypeScript strict mode enabled
- [ ] ESLint + Prettier configured
- [ ] No console.logs in production code
- [ ] No magic strings (use constants)
- [ ] Error boundaries around feature sections
