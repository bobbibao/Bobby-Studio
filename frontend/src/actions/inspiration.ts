import { createAsyncThunk } from '@reduxjs/toolkit';
import apiService from '../services/api';
import { BaseResponse } from '@/common/dtos/base.dto';
import { UpdateBookmarkAttributeDto, UpdateFavoriteAttributeDto } from '@/common/dtos/attribute/userAttribute.dto';

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

