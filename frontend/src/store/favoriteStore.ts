import { create } from 'zustand';

import apiService from '../services/api';

export type TYPE_ACTION = 'FAVORITE' | 'BOOKMARK';
const organizeImages = (images: any) => {
  if (!Array.isArray(images)) return { favorites: [], bookmarked: [] };
  return {
    favorites: images
      .filter((img) => {
        return (
          img?.actions &&
          'isFavorite' in img.actions &&
          img.actions.isFavorite === true
        );
      })
      .map((img) => ({
        id: img.attributeId || '',
        userId: img.userId || '',
        path: img.value?.path || '',
        createdAt: img.createdAt || new Date().toISOString(),
        actions: img.actions,
        type: img.type || 'Unknown',
      })),

    bookmarked: images
      .filter((img) => {
        return (
          img?.actions &&
          'isBookmarked' in img.actions &&
          img.actions.isBookmarked === true
        );
      })
      .map((img) => ({
        id: img.attributeId || '',
        userId: img.userId || '',
        path: img.value?.path || '',
        actions: img.actions,
        createdAt: img.createdAt || new Date().toISOString(),
        type: img.type || 'Unknown',
      })),
  };
};

export interface GetUserImagesAction {
  userId: string;
  images: string[];
  page: number;
  limit: number;
}

interface ListStore {
  userProjects: any;
  items: any[];
  favorites: any[];
  bookmarked: any[];
  loading: boolean;
  error: string | null;
  updateImage: (imageData: any, type: TYPE_ACTION) => Promise<void>;
  fetchUserProjects: (userId: string) => Promise<void>;
  fetchItems: (params: GetUserImagesAction) => Promise<void>;
}

const favoriteStore = create<ListStore>((set, get) => ({
  userProjects: null,
  items: [],
  favorites: [],
  bookmarked: [],
  loading: false,
  error: null,

  fetchUserProjects: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const response = await apiService.get(`/projects/user/${userId}`);
      set({ userProjects: response.data, loading: false });
      return response.data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false,
      });
    }
  },

  fetchItems: async (params: GetUserImagesAction) => {
    try {
      const { userId, images, page, limit } = params;
      set({ loading: true, error: null });
      const response = await apiService.post(
        `/attributes/assigned/${userId}?page=${page}&limit=${limit}`,
        {
          imageIds: images,
        }
      );
      const organized = organizeImages(response.data.data);
      set({
        items: response.data.data,
        favorites: organized.favorites,
        bookmarked: organized.bookmarked,
        loading: false,
      });
      return response.data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false,
      });
    }
  },

  updateImage: async (imageData: any, type: TYPE_ACTION) => {
    try {
      set({ loading: true, error: null });
      const state = get();
      const images = Array.isArray(imageData) ? imageData : [imageData];
      const response = await apiService.put(`/attributes`, images);

      if (type === 'FAVORITE') {
        const filter = state.favorites.filter(
          (item) => item.id !== imageData.attributeId
        );
        set({
          favorites: filter,
        });
      }

      if (type === 'BOOKMARK') {
        const filter = state.bookmarked.filter(
          (item) => item.id !== imageData.attributeId
        );
        set({
          bookmarked: filter,
        });
      }

      return response.data;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false,
      });
    }
  },
}));

export default favoriteStore;

