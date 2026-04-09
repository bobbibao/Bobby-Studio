import { useAppSelector } from './useAppDispatch';

export const useInspirationWorkspace = () => {
  const { loading, error, currentImageGenerationProgress, inspirationImages, filter } = useAppSelector((state) => state.inspiration);
  let userImages = [];

  if (filter !== 'All') {
    userImages = inspirationImages.filter((item) => item.method && item.method.toLocaleLowerCase() === filter.toLocaleLowerCase());
  }

  return {
    currentImageGenerationProgress,
    inspirationImages,
    userImages: filter === 'All' ? inspirationImages : userImages,
    loading,
    error,
  };
};

