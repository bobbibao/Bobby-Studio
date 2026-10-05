import { useDispatch } from 'react-redux';
import apiService from '@/services/api/data-client';
import { setLoading } from '../slices/loading';
import { ConfigurationDto } from '@/common/dtos/attribute/configuration.dto';

/** Reads the signed-in user's saved configuration. */
export const useConfigurationApi = () => {
  const dispatch = useDispatch();

  const fetchUserConfiguration = async (id: string): Promise<ConfigurationDto> => {
    dispatch(setLoading(true));
    try {
      return await apiService.get(`/configurations/user/${id}`);
    } finally {
      dispatch(setLoading(false));
    }
  };

  return { fetchUserConfiguration };
};
