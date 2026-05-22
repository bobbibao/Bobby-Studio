import apiService from '@/services/api/data-client';
import { CMS_TOKEN, VITE_DOMAIN_BOBBY_CMS } from '@/config';
import { IArticle, ICMSResponse, IGallery, LearningCenterType } from '@/types/cms';

const cmsApiConfig = {
  baseURL: VITE_DOMAIN_BOBBY_CMS,
  headers: {
    Authorization: `Bearer ${CMS_TOKEN}`,
  },
};

export const cmsService = {
  getCMSGalleries: async (): Promise<IGallery[]> => {
    try {
      const response: ICMSResponse<IGallery[]> = await apiService.get(
        `/api/galleries?populate=*&filters[page][%24eq]=home`,
        cmsApiConfig
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCMSArticles: async (): Promise<IArticle[]> => {
    try {
      const response: ICMSResponse<IArticle[]> = await apiService.get(
        `/api/articles?populate=*&filters[page][%24eq]=home`,
        cmsApiConfig
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCMSLearningCenter: async (type: LearningCenterType): Promise<ICMSResponse<IArticle[]>> => {
    try {
      const response: ICMSResponse<IArticle[]> = await apiService.get(
        `/api/articles?populate=*&filters[page][%24eq]=learning&filters[category][%24eq]=${type}`,
        cmsApiConfig
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default cmsService;

