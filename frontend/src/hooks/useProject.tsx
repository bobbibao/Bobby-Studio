import { useAppSelector } from '@/hooks/useAppDispatch';

export const useProject = () => {
  const { loading, error, projects, unassignedAttributes, assignedAttributes } =
    useAppSelector((state) => state.projectManagement);
  return { loading, error, projects, unassignedAttributes, assignedAttributes };
};  
