import apiService from '../services/api';

export const API = {
  getDataImages: async (params: any): Promise<any> => {
    try {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });
      const response = await apiService.get(`/attributes/images?${searchParams}`);
      return response;
    } catch (error) {
      console.error('Fetch images error:', error);
      throw error;
    }
  },
  getFavoriteDataImages: async (params: any): Promise<any> => {
    try {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });

      const response = await apiService.get(`/attributes/favorite-images?${searchParams}`);
      return response;
    } catch (error) {
      console.error('Fetch images error:', error);
      throw error;
    }
  },
  getBookmarkedImages: async (params: any): Promise<any> => {
    try {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (Array.isArray(value)) {
          value.forEach((v) => searchParams.append(key, v));
        } else if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value);
        }
      });

      const response = await apiService.get(`/attributes/bookmarked-images?${searchParams}`);
      return response;
    } catch (error) {
      console.error('Fetch images error:', error);
      throw error;
    }
  },
  deactiveImage: async (attributeId: string) => {
    try {
      const response = await apiService.put(`/attributes/deactivate/${attributeId}`);
      return response.data;
    } catch (error: any) {
      console.error('Deactive image error:', error);
      throw error;
    }
  },
  publishImage: async (params: any): Promise<any> => {
    try {
      const response = await apiService.patch(`/attributes/versions/publish`, params);
      return response;
    } catch (error) {
      console.error('Publish image error:', error);
      throw error;
    }
  },
  publishAllImages: async (params: any): Promise<any> => {
    try {
      const response = await apiService.patch(`/attributes/versions/publish-all`, params);
      return response;
    } catch (error) {
      console.error('Publish all images error:', error);
      throw error;
    }
  },
};

