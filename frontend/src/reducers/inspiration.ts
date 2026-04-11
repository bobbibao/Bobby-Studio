import { createSlice } from '@reduxjs/toolkit';
import { uploadImages, getUserImages } from '../actions/inspiration';
import { GenerateImageResponse, UploadImageResponse, VImage } from '@/common/dtos/attribute/common.dto';
import { InspirationMethodEnum } from '@/constants/attribute-enum';
import { HistoryJobDto } from '@/actions/history';

const getProgressStateKey = (method: InspirationMethodEnum) => {
  const methodToStateMap = {
    [InspirationMethodEnum.BASIC_TEXT_TO_IMAGE]: 'currentImageGenerationProgress',
    [InspirationMethodEnum.PRO_TEXT_TO_IMAGE]: 'currentImageGenerationProgress',
    [InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE]: 'currentLineDrawingToImageProgress',
    [InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE]: 'currentLineDrawingToImageProgress',
    [InspirationMethodEnum.BASIC_IMAGE_UPSCALING]: 'currentImageUpscalingProgress',
    [InspirationMethodEnum.PRO_IMAGE_UPSCALING]: 'currentImageUpscalingProgress',
    [InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE]: 'currentSeasonalTransformationProgress',
    [InspirationMethodEnum.PRO_IMAGE_TO_IMAGE]: 'currentSeasonalTransformationProgress',
  } as const;

  if (!(method in methodToStateMap)) {
    return 'currentImageGenerationProgress'; // fallback for unhandled methods
  }
  return methodToStateMap[method as keyof typeof methodToStateMap];
};

interface HistoryJob {
  id: string;
  jobId: string;
  userId: string;
  status?: 'waiting' | 'active' | 'progress' | 'completed' | 'failed';
  progress?: number;
  method: string;
  inputType: string;
  prompt?: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  type?: string;
  error?: string;
}

interface InspirationState {
  currentImageGenerationProgress: {
    loading: boolean;
    error: string | null;
    data: GenerateImageResponse[] | null;
    uploadedImage?: UploadImageResponse | null;
    status: 'idle' | 'pending' | 'fulfilled' | 'rejected' | 'folder-error';
  };
  currentLineDrawingToImageProgress: {
    loading: boolean;
    error: string | null;
    data: GenerateImageResponse | null;
    uploadedImage: UploadImageResponse | null;
    status: 'idle' | 'pending' | 'fulfilled' | 'rejected' | 'folder-error';
  };
  currentImageUpscalingProgress: {
    loading: boolean;
    error: string | null;
    data: GenerateImageResponse | null;
    uploadedImage: UploadImageResponse | null;
    status: 'idle' | 'pending' | 'fulfilled' | 'rejected' | 'folder-error';
  };
  currentSeasonalTransformationProgress: {
    loading: boolean;
    error: string | null;
    data: GenerateImageResponse | null;
    uploadedImage: UploadImageResponse | null;
    status: 'idle' | 'pending' | 'fulfilled' | 'rejected' | 'folder-error';
  };
  inspirationImages: any[];
  historyJobs: HistoryJobDto[];
  filter: string;
  lineDrawingImages: {
    uploadedImages: VImage;
    assignedImages: VImage;
  };
  loading: boolean;
  error: string | null;
  activeJobIds: string[]; // Track jobIds being listened to
  historyJobsLoading: boolean;
  historyJobsError: string | null;
  uploadProgress: {
    isUploading: boolean;
  };
}

const initialState: InspirationState = {
  currentImageGenerationProgress: {
    loading: false,
    error: null,
    data: null,
    uploadedImage: null,
    status: 'idle',
  },
  currentLineDrawingToImageProgress: {
    loading: false,
    error: null,
    data: null,
    uploadedImage: null,
    status: 'idle',
  },
  currentImageUpscalingProgress: {
    loading: false,
    error: null,
    data: null,
    uploadedImage: null,
    status: 'idle',
  },
  currentSeasonalTransformationProgress: {
    loading: false,
    error: null,
    data: null,
    uploadedImage: null,
    status: 'idle',
  },
  inspirationImages: [],
  historyJobs: [],
  filter: 'All',
  lineDrawingImages: {
    uploadedImages: { id: '', path: '', value: { key: '', path: '' } },
    assignedImages: { id: '', path: '', value: { key: '', path: '' } },
  },
  loading: false,
  error: null,
  activeJobIds: [],
  historyJobsLoading: false,
  historyJobsError: null,
  uploadProgress: {
    isUploading: false,
  },
};

const inspirationSlice = createSlice({
  name: 'inspiration',
  initialState,
  reducers: {
    // Optimistically add a job to inspirationImages (or a dedicated jobs list) for in-progress display
    addJobInProgress: (state, action) => {
      const job = action.payload;
      // Avoid duplicates
      if (!state.inspirationImages.some((j: any) => j.jobId === job.jobId)) {
        state.inspirationImages.unshift(job);
      }
    },
    addActiveJobId: (state, action) => {
      const jobId = action.payload;
      if (!state.activeJobIds.includes(jobId)) {
        state.activeJobIds.push(jobId);
      }
    },
    removeActiveJobId: (state, action) => {
      const jobId = action.payload;
      state.activeJobIds = state.activeJobIds.filter((id) => id !== jobId);
    },
    filterImagesByType: (state, action) => {
      state.filter = action.payload;
    },
    setCurrentImageGenerationProgress: (state, action) => {
      state.currentImageGenerationProgress = action.payload;
    },
    setCurrentLineDrawingToImageProgress: (state, action) => {
      state.currentLineDrawingToImageProgress.data = action.payload;
      state.currentLineDrawingToImageProgress.loading = false;
    },
    setCurrentImageUpscalingProgress: (state, action) => {
      state.currentImageUpscalingProgress.data = action.payload;
      state.currentImageUpscalingProgress.loading = false;
    },
    setCurrentSeasonalTransformationProgress: (state, action) => {
      state.currentSeasonalTransformationProgress.data = action.payload;
      state.currentSeasonalTransformationProgress.loading = false;
    },
    // Enhanced history job management
    setHistoryJobs: (state, action) => {
      state.historyJobs = action.payload;
      state.historyJobsLoading = false;
      state.historyJobsError = null;
    },
    setHistoryJobsLoading: (state, action) => {
      state.historyJobsLoading = action.payload;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = { ...state.uploadProgress, ...action.payload };
    },
    resetUploadProgress: (state) => {
      state.uploadProgress = {
        isUploading: false,
      };
    },
    addHistoryJob: (state, action) => {
      const newJob = action.payload;
      // Add new job to the beginning of the list if it doesn't exist
      const existingIndex = state.historyJobs.findIndex((job) => job.jobId === newJob.jobId);
      if (existingIndex === -1) {
        state.historyJobs.unshift(newJob);
      }
    },
    removeHistoryJob: (state, action) => {
      const jobId = action.payload;
      state.historyJobs = state.historyJobs.filter((job) => job.jobId !== jobId);
    },
    updateHistoryJobStatus: (state, action) => {
      const { jobId, status, progress, data, error } = action.payload;
      const jobIndex = state.historyJobs.findIndex((job) => job.jobId === jobId);
      if (jobIndex !== -1) {
        state.historyJobs[jobIndex].status = status;
        if (progress !== undefined) {
          state.historyJobs[jobIndex].progress = progress;
        }
        if (data) {
          // Update job data if provided
          Object.assign(state.historyJobs[jobIndex], data);
        }
        // Update the main status and completion time for final states
        if (status === 'completed' || status === 'failed') {
          state.historyJobs[jobIndex].status = status;
        }
      }
    },
    setJobStatusUpdate: (state, action) => {
      // action.payload: { jobId, status, data }
      const { jobId, status, data } = action.payload;
      // Find which progress key this jobId belongs to (if needed, you can map jobId to method elsewhere)
      // For now, update all progress keys if their data matches jobId
      const progressKeys = [
        'currentImageGenerationProgress',
        'currentLineDrawingToImageProgress',
        'currentImageUpscalingProgress',
        'currentSeasonalTransformationProgress',
      ];
      progressKeys.forEach((key) => {
        const progressState = state[key as keyof typeof state] as any;
        if (progressState?.data && progressState.data.jobId === jobId) {
          progressState.status = status;
          if (data) {
            progressState.data = { ...progressState.data, ...data };
          }
        }
      });

      // Also update history jobs if this job exists there
      const historyJobIndex = state.historyJobs.findIndex((job) => job.jobId === jobId);
      if (historyJobIndex !== -1) {
        state.historyJobs[historyJobIndex].status = status;
        if (data?.progress !== undefined) {
          state.historyJobs[historyJobIndex].progress = data.progress;
        }
        if (data?.id !== undefined) {
          state.historyJobs[historyJobIndex].jobId = data.id;
        }
        if (data) {
          Object.assign(state.historyJobs[historyJobIndex], data);
        }
      }

      // Remove jobId from activeJobIds if job is completed or failed
      if (['completed', 'failed'].includes(status)) {
        state.activeJobIds = state.activeJobIds.filter((id) => id !== jobId);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadImages.pending, (state, action) => {
        const progressKey = getProgressStateKey(action.meta.arg.method);
        // if (progressKey !== 'currentImageGenerationProgress') {
        state[progressKey].uploadedImage = null;
        state.loading = true;
        state.error = null;
        // }
      })
      .addCase(uploadImages.fulfilled, (state, action) => {
        const progressKey = getProgressStateKey(action.meta.arg.method);
        // if (progressKey !== 'currentImageGenerationProgress') {
        state[progressKey].uploadedImage = action.payload;
        state.loading = false;
        state.error = null;
        // }
      })
      .addCase(uploadImages.rejected, (state, action) => {
        const progressKey = getProgressStateKey(action.meta.arg.method);
        // if (progressKey !== 'currentImageGenerationProgress') {
        state[progressKey].uploadedImage = null;
        state.loading = false;
        state.error = action.error.message || 'Failed to upload images';
        // }
      })
      .addCase(getUserImages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserImages.fulfilled, (state, action) => {
        state.loading = false;
        state.inspirationImages = action.payload.data;
      })
      .addCase(getUserImages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to get images';
      });
  },
});

const { actions } = inspirationSlice;

export const {
  filterImagesByType,
  setCurrentImageGenerationProgress,
  setCurrentImageUpscalingProgress,
  setCurrentSeasonalTransformationProgress,
  setJobStatusUpdate,
  addActiveJobId,
  removeActiveJobId,
  addJobInProgress,
  setHistoryJobs,
  setHistoryJobsLoading,
  addHistoryJob,
  updateHistoryJobStatus,
  removeHistoryJob,
  setUploadProgress,
  resetUploadProgress,
} = actions;

export const selectImageGenerationProgress = (state: { inspiration: InspirationState }) =>
  state.inspiration.currentImageGenerationProgress ?? {
    loading: false,
    error: null,
    data: null,
    status: 'idle',
  };

// History job selectors
export const selectHistoryJobs = (state: { inspiration: InspirationState }) => state.inspiration.historyJobs;
export const selectHistoryJobsLoading = (state: { inspiration: InspirationState }) => state.inspiration.historyJobsLoading;
export const selectHistoryJobsError = (state: { inspiration: InspirationState }) => state.inspiration.historyJobsError;
export const selectActiveJobIds = (state: { inspiration: InspirationState }) => state.inspiration.activeJobIds;

// Get a specific history job by jobId
export const selectHistoryJobByJobId = (jobId: string) => (state: { inspiration: InspirationState }) =>
  state.inspiration.historyJobs.find((job) => job.jobId === jobId);

// Get jobs with active real-time status
export const selectActiveHistoryJobs = (state: { inspiration: InspirationState }) =>
  state.inspiration.historyJobs.filter((job) => job.status && ['waiting', 'active', 'progress'].includes(job.status));

export default inspirationSlice.reducer;

