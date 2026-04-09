import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { resolvePlan, getDefaultGenerationModelId, getDefaultEditingModelId, PlanCode } from '@/utils/subscriptionRestrictions';

export const useDefaultModels = () => {
  const { user } = useSelector((state: RootState) => state.currentUser);

  const plan = useMemo<PlanCode | null>(() => resolvePlan(user?.role, user?.subscription?.plan), [user?.role, user?.subscription?.plan]);

  const defaultGenerationModelId = useMemo(() => getDefaultGenerationModelId(plan), [plan]);
  const defaultEditingModelId = useMemo(() => getDefaultEditingModelId(plan), [plan]);

  return {
    plan,
    defaultGenerationModelId,
    defaultEditingModelId,
  };
};


