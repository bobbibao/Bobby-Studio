import { FeedbackBodyParamsType, FeedbackResponseType, FeedbackUrlParamsType } from '@/types/feedback';
import apiService from '@/services/api/data-client';

const endpointFeedback = {
  create: '/feedback',
  get: (attributeId: string, versionId: string) => `/feedback/attribute/${attributeId}/version/${versionId}`,
  update: (attributeId: string, versionId: string) => `/feedback/attribute/${attributeId}/version/${versionId}`,
  delete: (attributeId: string, versionId: string) => `/feedback/attribute/${attributeId}/version/${versionId}`,
};

const createFeedbackApi = (params: FeedbackBodyParamsType): Promise<FeedbackResponseType> => {
  return apiService.post(endpointFeedback.create, params);
};

const getFeedbackByAttributeIdApi = (feedbackObj: FeedbackUrlParamsType): Promise<FeedbackResponseType> => {
  return apiService.get(endpointFeedback.update(feedbackObj.attributeId, feedbackObj.version));
}

const updateFeedbackApi = (feedbackObj: FeedbackUrlParamsType, params: Partial<FeedbackBodyParamsType>): Promise<FeedbackResponseType> => {
  return apiService.put(endpointFeedback.update(feedbackObj.attributeId, feedbackObj.version), params);
};

const deleteFeedbackApi = (feedbackObj: FeedbackUrlParamsType): Promise<FeedbackResponseType> => {
  return apiService.delete(endpointFeedback.update(feedbackObj.attributeId, feedbackObj.version));
}

export default {
  createFeedbackApi,
  getFeedbackByAttributeIdApi,
  updateFeedbackApi,
  deleteFeedbackApi,
};

