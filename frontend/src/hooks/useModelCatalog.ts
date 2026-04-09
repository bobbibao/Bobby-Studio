import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchModels } from '@/slices/models';
import { mapCatalogToPlan } from '@/constants/models';

const HIDDEN_MODEL_IDS: Set<string> = new Set();

export const useModelCatalog = (plan?: string | null) => {
  const dispatch = useAppDispatch();
  const { items, status, error, plan: storedPlan, source } = useAppSelector(
    (state) => state.models,
  );

  useEffect(() => {
    const normalizedPlan = plan || storedPlan;
    if (status === 'idle' || (normalizedPlan && normalizedPlan !== storedPlan)) {
      dispatch(fetchModels(normalizedPlan || undefined));
    }
  }, [dispatch, plan, storedPlan, status]);

  const fallbackModels =
    items && items.length > 0 ? items : mapCatalogToPlan(plan || storedPlan);

  const filteredModels = useMemo(
    () => fallbackModels.filter((m) => !HIDDEN_MODEL_IDS.has(m.id)),
    [fallbackModels],
  );

  return {
    models: filteredModels,
    loading: status === 'loading',
    error,
    plan: storedPlan || plan || null,
    source,
  };
};

