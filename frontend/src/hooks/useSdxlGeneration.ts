import { useCallback, useMemo, useRef, useState } from 'react';
import SdxlGenerationAPI  from '@/features/generation';
import { useAuthentication } from '@/hooks/useAuthentication';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  addActiveJobId,
  addHistoryJob,
  setCurrentImageGenerationProgress,
  setJobStatusUpdate,
} from '@/reducers/inspiration';
import { joinMultipleJobRooms } from '@/utils/socket';
import { SdxlGenerateRequest, SdxlGenerateResponse } from '@/types/sdxl';

export const useSdxlGeneration = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuthentication();
  const abortRef = useRef<AbortController | null>(null);
  const progress = useAppSelector((state) => state.inspiration.currentImageGenerationProgress);
  const [lastResponse, setLastResponse] = useState<SdxlGenerateResponse | null>(null);
  const [submittedAt, setSubmittedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latestResult = useMemo(() => {
    const data = Array.isArray(progress.data) ? progress.data : [];
    return data.length > 0 ? data[data.length - 1] : null;
  }, [progress.data]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch(
      setCurrentImageGenerationProgress({
        ...progress,
        loading: false,
        status: 'idle',
      })
    );
  }, [dispatch, progress]);

  const generate = useCallback(
    async (request: SdxlGenerateRequest) => {
      if (progress.loading) {
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setSubmittedAt(Date.now());

      dispatch(
        setCurrentImageGenerationProgress({
          ...progress,
          loading: true,
          error: null,
          status: 'active',
        })
      );

      try {
        const response = await SdxlGenerationAPI.generate(
          {
            ...request,
            userId: request.userId || user?.id,
            userEmail: request.userEmail || user?.email,
          },
          controller.signal
        );

        setLastResponse(response);

        response.jobIds.forEach((jobId) => {
          dispatch(addActiveJobId(jobId));
        });

        if (response.jobIds.length > 0) {
          const optimisticJob = {
            jobId: response.jobIds[0],
            jobIds: response.jobIds,
            requestId: response.requestId,
            userId: request.userId || user?.id,
            status: 'waiting',
            progress: 10,
            method: 'SDXL_CONTROLNET_LORA',
            inputType: request.mode,
            prompt: request.prompt,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            type: 'Architectural SDXL',
            numImages: 1,
            selectedModels: ['python-vision-local'],
          };

          dispatch(addHistoryJob(optimisticJob as any));
          dispatch(
            setJobStatusUpdate({
              jobId: response.jobIds[0],
              status: 'waiting',
              data: optimisticJob as any,
            })
          );
          joinMultipleJobRooms(response.jobIds);
        }

        return response;
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          return null;
        }

        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Unable to start SDXL generation. Please try again.';
        setError(message);
        dispatch(
          setCurrentImageGenerationProgress({
            ...progress,
            loading: false,
            error: message,
            status: 'rejected',
          })
        );
        throw err;
      } finally {
        abortRef.current = null;
      }
    },
    [dispatch, progress, user?.email, user?.id]
  );

  return {
    generate,
    cancel,
    progress,
    latestResult,
    lastResponse,
    submittedAt,
    error,
    isGenerating: Boolean(progress.loading),
  };
};

