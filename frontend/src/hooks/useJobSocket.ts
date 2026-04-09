import { useEffect, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  updateHistoryJobStatus,
  addHistoryJob,
  addActiveJobId,
  removeActiveJobId,
  selectHistoryJobs,
  selectActiveJobIds,
  setJobStatusUpdate,
  setCurrentImageGenerationProgress,
  removeHistoryJob,
} from '@/reducers/inspiration';
import { connectSocket, leaveJobRoom, joinMultipleJobRooms, isSocketConnected } from '@/utils/socket';
import { HistoryJobDto } from '@/actions/history';
import { useQueryClient } from '@tanstack/react-query';
import { getUserProjects } from '@/actions/project';

interface JobStatusUpdatePayload {
  jobId: string;
  status: 'waiting' | 'active' | 'progress' | 'completed' | 'failed';
  progress?: number;
  data?: HistoryJobDto;
  error?: string;
}

interface UseJobSocketOptions {
  // Enable specific tracking modes
  trackHistoryJobs?: boolean;

  // Auto-join rooms for active jobs
  autoJoinActiveJobs?: boolean;
}

export const useJobSocket = (options: UseJobSocketOptions = {}) => {
  const { trackHistoryJobs = true, autoJoinActiveJobs = true } = options;

  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const toast = useToast();
  const currentHistoryJobs = useAppSelector(selectHistoryJobs);
  const activeJobIds = useAppSelector(selectActiveJobIds);
  const currentImageGenerationProgress = useAppSelector((state) => state.inspiration.currentImageGenerationProgress);
  const currentUser = useAppSelector((state) => state.currentUser.user);

  // Use provided historyJobs or fallback to Redux state
  const jobs = currentHistoryJobs;

  const handleJobStatus = useCallback(
    (payload: JobStatusUpdatePayload) => {
      // Always update the general job status
      switch (payload.status) {
        case 'waiting':
          break;

        case 'active':
          dispatch(addHistoryJob(payload.data));
          dispatch(addActiveJobId(payload.jobId));
          dispatch(setJobStatusUpdate(payload));
          break;
        case 'progress':
          dispatch(addHistoryJob(payload.data));
          dispatch(addActiveJobId(payload.jobId));

          dispatch(updateHistoryJobStatus(payload));
          dispatch(setJobStatusUpdate(payload));
          break;

        case 'failed':
          dispatch(removeActiveJobId(payload.jobId));
          dispatch(removeHistoryJob(payload.jobId));
          dispatch(setJobStatusUpdate(payload));

          // Extract user-friendly error message
          const errorMessage = payload.error || 'Generation failed. Please try again.';
          console.error(`Job ${payload.jobId} failed:`, errorMessage);

          if (!toast.isActive(payload.jobId)) {
            toast({
              id: payload.jobId,
              title: 'Generation Failed',
              description: errorMessage,
              status: 'error',
              duration: 8000,
              isClosable: true,
              position: 'top-right',
            });
          }

          dispatch((dispatch, getState) => {
            const currentState = getState().inspiration.currentImageGenerationProgress;
            const existingData = currentState.data || [];
            const updatedData = existingData.filter((item) => item.jobId !== payload.jobId);

            dispatch(
              setCurrentImageGenerationProgress({
                ...currentState,
                loading: activeJobIds.length > 1,
                error: errorMessage,
                status: 'rejected',
                data: updatedData,
              })
            );
          });
          break;

        case 'completed':
          dispatch(removeActiveJobId(payload.jobId));
          dispatch(updateHistoryJobStatus(payload));

          // Refetch vizpoints to update credit balance after job completion
          queryClient.invalidateQueries({ queryKey: ['vizPoints'] });

          // Refresh user projects to show newly assigned images
          if (currentUser?.id) {
            dispatch(getUserProjects({ userId: currentUser.id, orderBy: 'desc', inputType: [], creationType: '' }));
          }

          dispatch((dispatch, getState) => {
            const currentState = getState().inspiration.currentImageGenerationProgress;
            const existingData = currentState.data || [];
            const isDuplicate = existingData.some((item) => item.jobId === payload.jobId);

            if (!isDuplicate) {
              dispatch(
                setCurrentImageGenerationProgress({
                  ...currentState,
                  error: null,
                  data: [...existingData, payload.data],
                })
              );
            }
          });
          break;

        default:
          console.warn('Unknown job status:', payload.status);
          return;
      }

      // Update history jobs if tracking is enabled
      if (trackHistoryJobs) {
        dispatch(
          updateHistoryJobStatus({
            jobId: payload.jobId,
            status: payload.status,
            progress: payload.progress,
            data: payload.data,
            error: payload.error,
          })
        );
      }
    },
    [dispatch, trackHistoryJobs, queryClient, toast, activeJobIds]
  );

  useEffect(() => {
    if (activeJobIds.length === 0 && currentImageGenerationProgress.status !== 'fulfilled') {
      dispatch(
        setCurrentImageGenerationProgress({
          ...currentImageGenerationProgress,
          loading: false,
          status: 'fulfilled',
        })
      );
    }
  }, [activeJobIds.length]);

  // Timeout mechanism for stuck jobs (5 minutes timeout)
  useEffect(() => {
    const JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const jobTimeouts = new Map<string, NodeJS.Timeout>();

    // Set timeout for each active job
    activeJobIds.forEach((jobId) => {
      if (!jobTimeouts.has(jobId)) {
        const timeoutId = setTimeout(() => {
          console.warn(`Job ${jobId} timed out after ${JOB_TIMEOUT_MS / 1000} seconds`);

          // Handle timeout as a failure
          handleJobStatus({
            jobId,
            status: 'failed',
            progress: 0,
            error: 'Job timed out. The server may be experiencing issues. Please try again.',
          });
        }, JOB_TIMEOUT_MS);

        jobTimeouts.set(jobId, timeoutId);
      }
    });

    // Cleanup timeouts for completed/removed jobs
    return () => {
      jobTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      jobTimeouts.clear();
    };
  }, [activeJobIds, handleJobStatus]);

  // Function to manually join rooms for specific jobs
  const joinJobRooms = useCallback((jobIds: string[]) => {
    if (isSocketConnected()) {
      joinMultipleJobRooms(jobIds);
    }
  }, []);

  // Function to leave specific job rooms
  const leaveJobRooms = useCallback((jobIds: string[]) => {
    jobIds.forEach((jobId) => leaveJobRoom(jobId));
  }, []);

  // Auto-join rooms for new active job IDs (for history tracking)
  useEffect(() => {
    if (!trackHistoryJobs || !autoJoinActiveJobs) return;

    const newActiveJobs = activeJobIds.filter(
      (jobId) =>
        !jobs.some((job) => job.jobId === jobId) ||
        jobs.some((job) => job.jobId === jobId && ['waiting', 'active', 'progress'].includes(job.status))
    );

    if (newActiveJobs.length > 0) {
      joinMultipleJobRooms(newActiveJobs);
    }
  }, [activeJobIds, jobs, trackHistoryJobs, autoJoinActiveJobs]);

  // Main socket connection and event handlers
  useEffect(() => {
    // Use same origin for socket connection to avoid cross-origin issues
    const socketUrl = import.meta.env.VITE_API_SOCKET_URL || window.location.origin;

    // Handle socket connection errors
    const handleConnectionError = (error: Error) => {
      console.error('Socket connection error in useJobSocket:', error);

      // If we have active jobs and socket fails, show error after a delay
      if (activeJobIds.length > 0) {
        setTimeout(() => {
          // Check if jobs are still active after delay
          activeJobIds.forEach((jobId) => {
            handleJobStatus({
              jobId,
              status: 'failed',
              progress: 0,
              error: 'Connection lost. Unable to receive updates. Please refresh the page.',
            });
          });
        }, 10000); // Wait 10 seconds before marking as failed
      }
    };

    const socket = connectSocket(socketUrl, handleConnectionError);

    // Set up event listeners
    socket.on('jobStatus', handleJobStatus);

    // Join rooms for active/in-progress jobs (history tracking)
    if (trackHistoryJobs && autoJoinActiveJobs) {
      const activeJobs = jobs.filter((job) => job.status === 'waiting' || job.status === 'active' || job.status === 'progress');

      if (activeJobs.length > 0) {
        const jobIds = activeJobs.map((job) => job.jobId);
        joinMultipleJobRooms(jobIds);
      }
    }

    return () => {
      // Clean up event listeners
      socket.off('jobStatus', handleJobStatus);

      // Note: We don't disconnect the socket here to maintain connection
      // across different components and page navigations
    };
  }, [jobs, trackHistoryJobs, autoJoinActiveJobs, handleJobStatus, activeJobIds]);

  return {
    joinJobRooms,
    leaveJobRooms,
    isConnected: isSocketConnected(),
    activeJobIds,
  };
};

