# React ERP Frontend - Target Folder Structure

## Root Architecture

```
src/
  app/                    # App entry, providers, theme
  features/               # Feature modules (domain-driven)
  shared/                 # Reusable across features
  services/               # Global services (API, auth, i18n)
  hooks/                  # Custom hooks (queries, state, auth)
  types/                  # Global TypeScript types
  config/                 # Constants, env config
  styles/                 # Global styles, SCSS utilities
  routes/                 # Route definitions
```

## Detailed Structure

### `app/`
```
app/
  App.tsx                 # Root component
  providers.tsx           # Zustand, QueryClient, i18n setup
  theme.ts                # Theme config, tailwind/CSS vars
```

### `features/` (Domain-Driven)
```
features/
  offers/
    api/                  # Feature API layer
      hooks.ts            # useOffers, useOfferDetail, etc.
      client.ts           # OffersApiClient class
    components/
      atoms/              # Buttons, badges
      molecules/          # Forms, modals
      organisms/          # Tables, panels
    pages/
      OfferList.tsx
      OfferDetail.tsx
    hooks/                # Feature-local hooks
      useOfferFilters.ts
      useOfferForm.ts
    types/                # Feature types + DTOs
      offer.types.ts
      offer.dto.ts
    constants/
      endpoints.ts        # Feature API endpoints
      config.ts
    store/                # Feature Zustand store (if needed)
      offerStore.ts
    
  projects/
    api/hooks.ts
    components/
    pages/
    types/
    ...
  
  tasks/
  users/
  invoices/
  timesheet/
```

### `shared/`
```
shared/
  components/
    ui/                   # Buttons, inputs, modals
      Button.tsx
      Input.tsx
      Dialog.tsx
    layout/               # Layout wrappers
      PageLayout.tsx
      SidebarLayout.tsx
  
  hooks/
    useAsync.ts           # Async operations
    useDebounce.ts
    useLocalStorage.ts
    useQueryParams.ts     # Route query state
    useAuth.ts            # Auth state
  
  utils/
    string.ts             # truncate, format, etc.
    date.ts               # formatDate, parseDate
    number.ts             # formatCurrency, etc.
    object.ts             # deepMerge, pick, etc.
    api.ts                # buildQueryString, mappers
  
  types/
    common.ts             # Pagination, Response types
    auth.ts
  
  constants/
    api.ts                # Base URL, timeouts
    enums.ts              # Status, priorities, etc.
```

### `services/`
```
services/
  api/
    client.ts             # Axios instance + interceptors
    auth.interceptor.ts   # JWT attach + refresh
    error.handler.ts      # Error mapping, retry logic
  
  auth/
    auth.store.ts         # Zustand auth state
    auth.service.ts       # Login/logout logic
    tokenStorage.ts       # localStorage JWT ops
  
  i18n/
    i18n.config.ts        # i18next setup
    locales/
      en.ts
      de.ts
      es.ts
```

### `hooks/`
```
hooks/
  queries/
    useUsers.ts           # TanStack Query hooks
    usePaginatedOffers.ts
  mutations/
    useCreateOffer.ts
    useUpdateOffer.ts
    useDeleteOffer.ts
```

### `types/`
```
types/
  api.ts                  # Response<T>, PaginatedResponse<T>
  entities.ts             # Offer, Project, User, etc.
  forms.ts                # Form-related types
```

### `config/`
```
config/
  app.ts                  # APP_NAME, VERSION
  api.ts                  # BASE_URL, TIMEOUT
  auth.ts                 # TOKEN_KEY, REFRESH_ENDPOINT
  i18n.ts                 # Languages, defaults
```

### `routes/`
```
routes/
  routes.tsx              # Route definitions
  ProtectedRoute.tsx      # Auth guard wrapper
  NotFound.tsx
```

---

## Key Principles

| Principle | Rule |
|-----------|------|
| **Feature Isolation** | Each feature is self-contained; cross-feature imports only from `shared` or `types` |
| **API Per Feature** | Each feature has its own `api/hooks.ts` for data fetching |
| **Shared = Reusable** | Only truly reusable components/hooks; feature-specific logic stays local |
| **No Shared Stores** | Keep Zustand stores feature-scoped; no global feature state |
| **Flat Component Naming** | Avoid deep nesting; max 2-3 levels (atoms, molecules, organisms) |

---

## Migration Notes

- **Replace Vuex**: Use Zustand for lightweight state + TanStack Query for server state
- **Replace Vue components**: Use React hooks + TSX
- **Replace Vue Router**: Use React Router v6 with loader patterns
- **Keep endpoint structure**: Replicate endpoints.ts pattern in feature api/
- **Keep DTO pattern**: Maintain request/response DTO separation
