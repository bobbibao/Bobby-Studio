import { uploadImage as uploadWithClient } from '@/services/api';

export const uploadImage = async (
  file: File
): Promise<{
  message: string;
  imgUrl: string;
} | null> => {
  const response = await uploadWithClient('/upload/image', file);
  return response.data as { message: string; imgUrl: string } | null;
};

