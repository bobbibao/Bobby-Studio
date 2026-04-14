import { OptionType } from '../types';
import { IArticle } from '@/types/cms';
import { IBlog } from '@/features/admin/pages/admin/home/components/CardBlog';
import { VITE_DOMAIN_BOBBY_CMS } from '@/config';
import { ImageData } from '@/types';
import moment from 'moment';
import { ActionMethodEnum, InspirationMethodEnum } from '@/constants/attribute-enum';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import { ActionEntity, GeneratedImageAttributeEntity, OriginalImageAttributeEntity } from '@/common/dtos/attribute/common.dto';

export * from './classNames';

/**
 * Check if a method is an edit method (not generate)
 * Use Template should only be available for generated images, not edited images
 */
export const isEditMethod = (method?: string | null): boolean => {
  if (!method || method === undefined) return true;
  const upperMethod = method.toUpperCase();
  return upperMethod.startsWith('EDIT_') || upperMethod.includes('EDIT');
};

const MAX_UPLOAD_SIZE_MB = 5;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const fileUpload = (file: File, onUpload: (preview: string, imgSize?: { width?: number; height?: number }) => void) => {
  const validFormats = ['image/jpeg', 'image/png', 'image/jp2', 'image/webp'];

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    alert(`File is too large. Please upload an image smaller than ${MAX_UPLOAD_SIZE_MB}MB.`);
    return;
  }

  if (validFormats.includes(file.type)) {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const imageSize = {
          width: img.width || 0,
          height: img.height || 0,
        };
        onUpload(result, imageSize);
      };
      img.src = result;
    };

    reader.readAsDataURL(file);
  } else {
    alert('Unsupported file format. Please upload JPG, JPEG2000, or PNG.');
  }
};

export const downloadImage = async (url: string): Promise<void> => {
  if (!url) {
    console.error('downloadImage: URL is empty or undefined');
    return;
  }

  try {
    // First, try to fetch the image and create a blob
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const blob = await response.blob();

    // Extract file extension from the URL
    const fileExtension = url.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpeg', 'png', 'jpg', 'jp2'];

    // Set default extension if it's not a valid image extension
    const fileExtensionFinal = validExtensions.includes(fileExtension || '') ? fileExtension : 'jpg';

    // Dynamically set the file name with extension
    const fileName = `downloaded-image-${Date.now()}.${fileExtensionFinal}`;

    // Create object URL from blob
    const objectUrl = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.style.display = 'none';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('Failed to download image via fetch, trying direct download:', error);

    try {
      // Fallback: Direct download approach
      const link = document.createElement('a');

      // Extract file extension from the URL
      const fileExtension = url.split('.').pop()?.toLowerCase();
      const validExtensions = ['jpeg', 'png', 'jpg', 'jp2'];

      // Set default extension if it's not a valid image extension
      const fileExtensionFinal = validExtensions.includes(fileExtension || '') ? fileExtension : 'jpg';

      // Dynamically set the file name with extension
      const fileName = `downloaded-image-${Date.now()}.${fileExtensionFinal}`;

      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (secondError) {
      console.error('Both download methods failed:', secondError);
      // Last resort: open in new tab
      window.open(url, '_blank');
    }
  }
};

export const downloadImageUrl = (url: string) => {
  const link = document.createElement('a');
  const fileName = url.substring(url.lastIndexOf('/') + 1);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadUrl = (url: string, fileName: string) => {
  const link = document.createElement('a');

  link.download = fileName;
  link.href = url;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
};

export const formatOptions = (stringArray: string[]): OptionType[] => {
  if (!stringArray) return [];
  return stringArray.map((keyword) => ({ value: keyword, label: keyword }));
};

export const validateEmail = (value: string) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Email is invalid.');

export const validatePassword = (value: string) => (value.length < 8 ? 'Password must be at least 8 characters.' : '');

export const validateRequired = (value: string) => (value.trim() === '' ? 'This field is required.' : '');

export const removeEmpty = (obj: object) => {
  return Object.entries(obj)
    .filter(([, v]) => !!v)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
};

export const mapArticlesToBlogs = (
  articles: IArticle[],
  type: 'models' | 'videos' | 'tutorials' | 'case-studies' = 'tutorials'
): IBlog[] => {
  return articles.map((article) => ({
    imageSrc: article?.coverImage ? `${VITE_DOMAIN_BOBBY_CMS}${article?.coverImage?.formats?.thumbnail?.url}` : '',
    largeImageSrc: article?.coverImage ? `${VITE_DOMAIN_BOBBY_CMS}${article?.coverImage?.formats?.large?.url}` : '',
    title: article?.title,
    description: article?.description,
    published_at: moment(article?.publishedAt).format('MMM DD, YYYY'),
    link: `/learning-center/${type}/${article?.id}`,
    content: article?.content,
    type: article?.description || undefined,
    id: article?.id,
    category: article?.category || '',
  }));
};

export const handleUseTemplate = (
  matchedAttribute: UserAttributeEntity<OriginalImageAttributeEntity | GeneratedImageAttributeEntity, ActionEntity> | undefined,
  navigate: any,
  img: ImageData
) => {
  const method = matchedAttribute?.method;

  const currentPath = window.location.pathname;
  const isOnGeneratePage = currentPath.includes('/generate');
  const navigateToUrl = (url: string, state: any) => {
    if (isOnGeneratePage) {
      // Force navigation by first going to a different route, then to target
      navigate('/temp-redirect', { replace: true });
      setTimeout(() => {
        navigate(url, state);
      }, 0);
    } else {
      // Normal navigation for other pages
      navigate(url, state);
    }
  };

  switch (method?.toLocaleLowerCase()) {
    case ActionMethodEnum.TEXT_TO_IMAGE.toLocaleLowerCase():
      navigate(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=1`, {
        state: { img, matchedAttribute },
      });
      break;
    case ActionMethodEnum.LINE_DRAWING_TO_IMAGE.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=1`, {
        state: { img, matchedAttribute },
      });
      break;
    case ActionMethodEnum.IMAGE_UPSCALING.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=1`, {
        state: { img, matchedAttribute },
      });
      break;
    case ActionMethodEnum.IMAGE_TO_IMAGE.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=1`, {
        state: { img, matchedAttribute },
      });
      break;
    case InspirationMethodEnum.BASIC_TEXT_TO_IMAGE.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=1`, {
        state: { img, matchedAttribute },
      });
      break;
    case InspirationMethodEnum.PRO_TEXT_TO_IMAGE.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=0`, {
        state: { img, matchedAttribute },
      });
      break;
    case InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=1`, {
        state: { img, matchedAttribute },
      });
      break;
    case InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=0`, {
        state: { img, matchedAttribute },
      });
      break;
    case InspirationMethodEnum.BASIC_IMAGE_UPSCALING.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=1`, {
        state: { img, matchedAttribute },
      });
      break;
    case InspirationMethodEnum.PRO_IMAGE_UPSCALING.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=0`, {
        state: { img, matchedAttribute },
      });
      break;
    case InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=1`, {
        state: { img, matchedAttribute },
      });
      break;
    case InspirationMethodEnum.PRO_IMAGE_TO_IMAGE.toLocaleLowerCase():
      navigateToUrl(`/generate?projectId=${img.projectId}&folderName=${img.folderName}&isBasic=0`, {
        state: { img, matchedAttribute },
      });
      break;
    default:
      break;
  }
};

export const capitalize = (s: string) => {
  if (typeof s !== 'string' || !s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// ... existing code ...

