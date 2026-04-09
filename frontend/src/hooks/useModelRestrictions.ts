import { useMemo } from 'react';
import { ModelCatalogItem } from '@/types/modelCatalog';

interface UseModelRestrictionsParams {
  modelCatalog: ModelCatalogItem[];
  selectedModels: string[];
  planCode: string | null;
  user: any; // User from useAuthentication
  isProMode: boolean;
  providedAvailableModels?: { id: string; label: string }[];
  providedRestrictedIds?: string[];
  providedAllowedIds?: string[];
}

export const useModelRestrictions = ({
  modelCatalog,
  selectedModels,
  planCode,
  user,
  isProMode,
  providedAvailableModels,
  providedRestrictedIds,
  providedAllowedIds,
}: UseModelRestrictionsParams) => {
  // 1. Available models (id + label)
  const availableModels = useMemo(
    () =>
      providedAvailableModels ??
      modelCatalog.map((model) => ({ id: model.id, label: model.displayName || model.id })),
    [providedAvailableModels, modelCatalog]
  );

  // 2. Restricted model IDs (enabled: false)
  const restrictedModelIds = useMemo(() => {
    if (providedRestrictedIds) return providedRestrictedIds;
    return modelCatalog.filter((model) => model.entitlements?.enabled === false).map((model) => model.id);
  }, [providedRestrictedIds, modelCatalog]);

  // 3. Allowed model IDs (enabled: true or undefined)
  const allowedModelIds = useMemo(() => {
    if (providedAllowedIds) return providedAllowedIds;
    return modelCatalog.filter((model) => model.entitlements?.enabled !== false).map((model) => model.id);
  }, [providedAllowedIds, modelCatalog]);

  // 4. Entitlement map (model.id -> { enabled, allowedResolutions })
  const entitlementMap = useMemo(() => {
    const map = new Map<string, { allowedResolutions: string[]; enabled: boolean }>();
    modelCatalog.forEach((model) => {
      map.set(model.id, {
        enabled: model.entitlements?.enabled !== false,
        allowedResolutions:
          model.entitlements?.allowedResolutions?.length === 0
            ? ['1K', '2K', '4K']
            : model.entitlements?.allowedResolutions?.map((res) => res.toUpperCase()) ?? ['1K', '2K', '4K'],
      });
    });
    return map;
  }, [modelCatalog]);

  // 5. Fallback 4K restriction logic if entitlements are missing
  const planValue = (user?.subscription?.plan || user?.role || '').toString().toLowerCase();
  const isLowTierPlan = ['free', 'basic'].includes(planValue);
  const isBobbyAiActive = !isProMode || selectedModels.length > 0;
  const fallbackRestrict4K = false;

  // 6. Allowed resolutions for current selection (intersection of all selected models)
  const allowedResolutionsForSelection = useMemo(() => {
    if (entitlementMap.size === 0 || selectedModels.length === 0) return null;
    const sets = selectedModels
      .map((id) => entitlementMap.get(id))
      .filter(Boolean)
      .map((ent) =>
        ent?.allowedResolutions && ent.allowedResolutions.length > 0
          ? ent.allowedResolutions.map((res) => res.toUpperCase())
          : ['1K', '2K', '4K']
      );
    if (!sets.length) return null;
    return sets.reduce((acc, list) => acc.filter((res) => list.includes(res)), ['1K', '2K', '4K']);
  }, [entitlementMap, selectedModels]);

  // 7. Disabled resolutions (inverse of allowed)
  const disabledResolutions = useMemo(() => {
    if (allowedResolutionsForSelection) {
      return ['1K', '2K', '4K'].filter((res) => !allowedResolutionsForSelection.includes(res));
    }
    return fallbackRestrict4K ? ['4K'] : [];
  }, [allowedResolutionsForSelection, fallbackRestrict4K]);

  // 8. Should restrict 4K
  const shouldRestrict4K = disabledResolutions.includes('4K');

  return {
    availableModels,
    restrictedModelIds,
    allowedModelIds,
    entitlementMap,
    disabledResolutions,
    shouldRestrict4K,
    allowedResolutionsForSelection,
    fallbackRestrict4K,
    isLowTierPlan,
    isBobbyAiActive,
  };
};

