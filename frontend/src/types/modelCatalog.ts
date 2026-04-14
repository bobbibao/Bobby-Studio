export interface ModelEntitlement {
  enabled: boolean;
  allowedResolutions: string[];
  metadata?: Record<string, any> | null;
}

export interface ModelCatalogItem {
  id: string;
  provider: string;
  displayName: string;
  description?: string | null;
  status: string;
  sortOrder: number;
  metadata?:
  {
    actionTypes: ACTION_TYPE_ENUM[];
  }
  | Record<string, any> | null;
  entitlements: ModelEntitlement;
  pricing?: Record<string, number> | null;
}

export enum ACTION_TYPE_ENUM {
  IMAGE_GENERATION = 'image-generation',
}
export interface ModelsResponse {
  plan: string;
  models: ModelCatalogItem[];
}

