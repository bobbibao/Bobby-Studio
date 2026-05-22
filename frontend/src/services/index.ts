import { useDispatch } from 'react-redux';
import apiService from '@/services/api/data-client';
import { setLoading } from '../slices/loading';
import { IDesignItemResponse } from '../types';
import {
  ISigninRequest,
  ISignupRequest,
  ISignupResponse,
  User,
} from '../types/auth';
import { SignInResponse } from '@/common/dtos/attribute/common.dto';
import { ConfigurationDto } from '@/common/dtos/attribute/configuration.dto';

export const useApi = () => {
  const dispatch = useDispatch();
  const userId = '189800ca-ea8e-41a8-a9c1-fc6c891d339b';
  // const userId = '1432cae7-0f32-4180-8d0a-7fe621a27267';

  const fetchMyDesign = async (): Promise<IDesignItemResponse[]> => {
    dispatch(setLoading(true));
    try {
      return new Promise((resolve) => {
        const fakeResponse: IDesignItemResponse[] = [
          {
            path: '',
            title: 'Design 1',
            subtitle: 'This is a subtitle for design 1',
          },
          {
            path: '',
            title: 'Design 2',
            subtitle: 'This is a subtitle for design 2',
          },
          {
            path: '',
            title: 'Design 3',
            subtitle: 'This is a subtitle for design 3',
          },
          {
            path: '',
            title: 'Design 4',
            subtitle: 'This is a subtitle for design 4',
          },
          {
            path: '',
            title: 'Design 5',
            subtitle: 'This is a subtitle for design 5',
          },
          {
            path: '',
            title: 'Design 6',
            subtitle: 'This is a subtitle for design 6',
          },
          {
            path: '',
            title: 'Design 7',
            subtitle: 'This is a subtitle for design 7',
          },
          {
            path: '',
            title: 'Design 8',
            subtitle: 'This is a subtitle for design 8',
          },
          {
            path: '',
            title: 'Design 9',
            subtitle: 'This is a subtitle for design 9',
          },
          {
            path: '',
            title: 'Design 10',
            subtitle: 'This is a subtitle for design 10',
          },
        ];
        setTimeout(() => {
          resolve(fakeResponse);
          // set for finally when api ready
          dispatch(setLoading(false));
        }, 500);
      });
    } catch (error) {
      console.error('Failed to fetch designs:', error);
      throw error;
    }
  };

  const signUp = async (data: ISignupRequest): Promise<ISignupResponse> => {
    dispatch(setLoading(true));

    try {
      const response: ISignupResponse = await apiService.post(
        '/auth/sign-up',
        data
      );

      return response;
    } catch (error) {
      console.error('Sign Up Error:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const signIn = async (data: ISigninRequest): Promise<SignInResponse> => {
    dispatch(setLoading(true));

    try {
      const response: SignInResponse = await apiService.post(
        '/auth/sign-in',
        data
      );

      return response;
    } catch (error) {
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchUserProfileById = async (id: string): Promise<User> => {
    dispatch(setLoading(true));

    try {
      const response: User = await apiService.get(`/users/${id}/profile`);
      return response;
    } catch (error) {
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const uploadImages = async (file: File): Promise<any> => {
    dispatch(setLoading(true));

    try {
      const formData = new FormData();
      formData.append('images', file);

      const response: any = await apiService.post(
        '/attributes/upload-images',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response;
    } catch (error) {
      console.error('Upload image failed:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };

  const fetchUserConfiguration = async (id: string): Promise<ConfigurationDto> => {
    dispatch(setLoading(true));

    try {
      const response: ConfigurationDto = await apiService.get(`/configurations/user/${id}`);
      return response;
    } catch (error) {
      console.error('Fetch User Profile Error:', error);
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  };
  return {
    fetchMyDesign,
    signUp,
    signIn,
    fetchUserProfileById,
    uploadImages,
    fetchUserConfiguration,
  };
};

