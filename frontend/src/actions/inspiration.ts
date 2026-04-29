import { createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../services/api';
import {
  UploadImageResponse,
  UploadImageParams,
  OriginalImageAttributeEntity,
  GeneratedImageAttributeEntity,
  ActionEntity,
} from '@/common/dtos/attribute/common.dto';
import { BaseResponse, BobbyResponse } from '@/common/dtos/base.dto';
import {
  UpdateBookmarkAttributeDto,
  UpdateFavoriteAttributeDto,
  UserAttributeEntity,
} from '@/common/dtos/attribute/userAttribute.dto';
import { setUploadProgress, resetUploadProgress } from '@/reducers/inspiration';

export const uploadImages = createAsyncThunk(
  'inspiration/uploadImages',
  async (payload: UploadImageParams<{ file: File; userId: string }>, { dispatch }): Promise<UploadImageResponse | null> => {
    try {
      const { file, userId } = payload.data;

      // Set uploading state
      dispatch(setUploadProgress({ isUploading: true }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      const response = await apiService.post(`/attributes/upload-images/${userId}`, formData);

      // Reset upload state on success
      dispatch(resetUploadProgress());

      const { attributeId, imagePath } = response.data[0];
      return { userId, attributeId, imagePath };
    } catch (err: any) {
      // Reset upload state on error
      dispatch(resetUploadProgress());
      console.error('uploadImages error:', err);
      return null;
    }
  }
);

export const updateImageInfo = createAsyncThunk(
  'inspiration/updateImageInfo',
  async (
    imageData:
      | UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>
      | UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>[]
  ) => {
    try {
      // Convert single item to array if needed

      const images = Array.isArray(imageData) ? imageData : [imageData];
      // Process all images in parallel

      const response = await apiService.put(`/attributes`, images);
      const result: BobbyResponse<UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity>> =
        response.data;
      return result.data;
    } catch (err) {
      return Promise.reject(err);
    }
  }
);

export const toggleFavorite = createAsyncThunk(
  'inspiration/toggleFavoriteInfo',
  async (favoriteData: UpdateFavoriteAttributeDto | UpdateFavoriteAttributeDto[]) => {
    try {
      if (!Array.isArray(favoriteData)) {
        favoriteData = [favoriteData];
      }

      const response = await apiService.put<BaseResponse<null>>(`/attributes/favorites/toggle`, favoriteData);
      const result = response.data;
      return result.success;
    } catch (err) {
      return Promise.reject(err);
    }
  }
);

export const toggleBookmark = createAsyncThunk(
  'inspiration/toggleBookmarkInfo',
  async (bookmarkData: UpdateBookmarkAttributeDto | UpdateBookmarkAttributeDto[]) => {
    try {
      if (!Array.isArray(bookmarkData)) {
        bookmarkData = [bookmarkData];
      }

      const response = await apiService.put<BaseResponse<null>>(`/attributes/bookmark/toggle`, bookmarkData);
      const result = response.data;
      return result.success;
    } catch (err) {
      return Promise.reject(err);
    }
  }
);

export const getUserImages = createAsyncThunk('inspiration/getImages', async (userId: string, { rejectWithValue }) => {
  try {
    const response = await apiService.get(`/attributes/images?page=1&limit=9999`);
    return response.data;
  } catch (error: any) {
    let errorMessage = 'An unexpected error has occurred. Our team has been notified';

    if (error.response && error.response && error.response.status == 404) {
      errorMessage = "It looks like your images doesn't exist yet.";
    }
    return rejectWithValue(errorMessage);
  }
});

