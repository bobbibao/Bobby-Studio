import { API_BASE_URL } from '@/config/api';
import { getToken } from '@/services/auth/tokenStorage';

export async function uploadImageWithProgress(
  url: string,
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<unknown> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);

  const token = await getToken();
  const fullUrl = `${API_BASE_URL}${url}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed due to network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload was aborted')));

    xhr.open('POST', fullUrl);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}

