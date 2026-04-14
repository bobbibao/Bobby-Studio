import { FeedbackType } from '@/constants/feedback-enum';

export type FeedbackUrlParamsType = {
  attributeId: string;
  version: string;
};

export type FeedbackBodyParamsType = {
  userId: string;
  attributeId: string;
  version: string;
  type: FeedbackType;
  categories: string[];
  comment?: string;
};

export type FeedbackResponseType = {
  id: string;
  attributeId: string;
  version: string;
  userId: string;
  type: FeedbackType;
  categories: string[];
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

