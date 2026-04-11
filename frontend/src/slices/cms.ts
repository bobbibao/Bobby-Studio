import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { IArticle, ICMSMeta, ICMSResponse, IGallery, LearningCenterType } from '@/types/cms';
import apiService from '@/services/api/data-client';
import { CMS_TOKEN, VITE_DOMAIN_BOBBY_CMS } from '@/config';
import cmsService from '@/services/cms';
import { IBlog } from '@/features/admin/pages/admin/home/components/CardBlog';

interface CMSState {
  galleries: {
    data: IGallery[];
    loading: boolean;
    error: string | null;
  };
  articles: {
    data: IArticle[];
    loading: boolean;
    error: string | null;
  };
  learning_center: {
    detail: IBlog | null;
    models: {
      data: IArticle[];
      meta: ICMSMeta | null;
      loading: boolean;
      error: string | null;
    };
    videos: {
      data: IArticle[];
      meta: ICMSMeta | null;
      loading: boolean;
      error: string | null;
    };
    tutorials: {
      data: IArticle[];
      meta: ICMSMeta | null;
      loading: boolean;
      error: string | null;
    };
    caseStudies: {
      data: IArticle[];
      meta: ICMSMeta | null;
      loading: boolean;
      error: string | null;
    };
  };
}

const initialState: CMSState = {
  galleries: {
    data: [],
    loading: false,
    error: null,
  },
  articles: {
    data: [],
    loading: false,
    error: null,
  },
  learning_center: {
    detail: null,
    models: {
      data: [],
      meta: null,
      loading: false,
      error: null,
    },
    videos: {
      data: [],
      meta: null,
      loading: false,
      error: null,
    },
    tutorials: {
      data: [],
      meta: null,
      loading: false,
      error: null,
    },
    caseStudies: {
      data: [],
      meta: null,
      loading: false,
      error: null,
    }
  },
};

const LEARNING_CENTER_PARAMS = {
  learningCenterVideo: 'videos',
  learningCenterCaseStudy: 'caseStudies',
  learningCenterTutorial: 'tutorials',
  learningCenterModel: 'models',
}

export const fetchCMSGalleries = createAsyncThunk(
  'cms/fetchGalleries',
  async () => {
    const response: ICMSResponse<IGallery[]> = await apiService.get(
      `/api/galleries?populate=*&filters[page][%24eq]=home`,
      {
        baseURL: VITE_DOMAIN_BOBBY_CMS,
        headers: {
          Authorization: `Bearer ${CMS_TOKEN}`,
        },
      }
    );
    return response.data;
  }
);

export const fetchCMSArticles = createAsyncThunk(
  'cms/fetchArticles',
  async () => {
    const response: ICMSResponse<IArticle[]> = await apiService.get(
      `/api/articles?populate=*&filters[page][%24eq]=home`,
      {
        baseURL: VITE_DOMAIN_BOBBY_CMS,
        headers: {
          Authorization: `Bearer ${CMS_TOKEN}`,
        },
      }
    );
    return response.data;
  }
);

export const getCMSLearningCenter = createAsyncThunk<
  ICMSResponse<IArticle[]>,      // Return type
  { type: LearningCenterType },  // Argument type
  { rejectValue: string }        // ThunkAPI configuration
>(
  'cms/getLearningCenter',
  async ({ type }, { rejectWithValue }) => {
    try {
      const response = await cmsService.getCMSLearningCenter(type);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const cmsSlice = createSlice({
  name: 'cms',
  initialState,
  reducers: {
    setDetailLearningCenter: (state, action) => {
      state.learning_center.detail = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Galleries
    builder
      .addCase(fetchCMSGalleries.pending, (state) => {
        state.galleries.loading = true;
        state.galleries.error = null;
      })
      .addCase(fetchCMSGalleries.fulfilled, (state, action) => {
        state.galleries.loading = false;
        state.galleries.data = action.payload;
      })
      .addCase(fetchCMSGalleries.rejected, (state, action) => {
        state.galleries.loading = false;
        state.galleries.error = action.error.message || 'Failed to fetch galleries';
      })
      // Articles
      .addCase(fetchCMSArticles.pending, (state) => {
        state.articles.loading = true;
        state.articles.error = null;
      })
      .addCase(fetchCMSArticles.fulfilled, (state, action) => {
        state.articles.loading = false;
        state.articles.data = action.payload;
      })
      .addCase(fetchCMSArticles.rejected, (state, action) => {
        state.articles.loading = false;
        state.articles.error = action.error.message || 'Failed to fetch articles';
      })
      // handle getCMSLearningCenter
      .addCase(getCMSLearningCenter.pending, (state, action) => {
        const key = LEARNING_CENTER_PARAMS[action?.meta?.arg?.type] as keyof typeof state.learning_center;
        if (key === 'models' || key === 'videos' || key === 'tutorials' || key === 'caseStudies') {
          state.learning_center[key].loading = true;
          state.learning_center[key].error = null;
        }
      })
      .addCase(getCMSLearningCenter.fulfilled, (state, action) => {
        const key = LEARNING_CENTER_PARAMS[action?.meta?.arg?.type] as keyof typeof state.learning_center;
        if (key === 'models' || key === 'videos' || key === 'tutorials' || key === 'caseStudies') {
          state.learning_center[key].loading = false;
          state.learning_center[key].error = null;
          state.learning_center[key].data = action.payload.data;
          state.learning_center[key].meta = action.payload.meta;
        }
      })
      .addCase(getCMSLearningCenter.rejected, (state, action) => {
        const key = LEARNING_CENTER_PARAMS[action?.meta?.arg?.type] as keyof typeof state.learning_center;
        if (key === 'models' || key === 'videos' || key === 'tutorials' || key === 'caseStudies') {
          state.learning_center[key].loading = false;
          state.learning_center[key].error = action.error.message || 'Failed to fetch learning center';
        }
      });
  },
});

export const { setDetailLearningCenter } = cmsSlice.actions;
export const cmsReducer = cmsSlice.reducer;

