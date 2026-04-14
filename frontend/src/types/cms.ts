export interface ICMSPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface ICMSMeta {
  pagination: ICMSPagination;
}

export interface ICMSResponse<T> {
  data: T;
  meta: ICMSMeta;
}

export interface IImageSize {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path: any;
  size: number;
  width: number;
  height: number;
  sizeInBytes: number;
}

export interface IFormats {
  large: IImageSize;
  small: IImageSize;
  medium: IImageSize;
  thumbnail: IImageSize;
}

export interface IPhoto {
  id: number;
  documentId: string;
  name: string;
  alternativeText: any;
  caption: any;
  width: number;
  height: number;
  formats: IFormats;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: any;
  provider: string;
  provider_metadata: any;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

export interface IGallery {
  id: number;
  documentId: string;
  author: string;
  imageType: string;
  page: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  photo: IPhoto;
  authorAvatar: IAuthorAvatar;
}

export interface IArticle {
  id: number
  documentId: string
  title: string
  description: string
  content: string
  category: string
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  coverImage: ICoverImage;
}

interface IAuthorAvatar {
  id: number;
  documentId: string;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number;
  height: number;
  formats: {
    large?: ImageFormat;
    medium?: ImageFormat;
    small?: ImageFormat;
    thumbnail?: ImageFormat;
  };
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: string | null;
  provider: string;
  provider_metadata: any | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

interface ImageFormat {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path: string | null;
  size: number;
  width: number;
  height: number;
  sizeInBytes: number;
}

interface ImageFormat {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path: string | null;
  size: number;
  width: number;
  height: number;
  sizeInBytes: number;
}

interface ImageFormats {
  large: ImageFormat;
  small: ImageFormat;
  medium: ImageFormat;
  thumbnail: ImageFormat;
}

interface ICoverImage {
  id: number;
  documentId: string;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number;
  height: number;
  formats: ImageFormats;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: string | null;
  provider: string;
  provider_metadata: Record<string, any> | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  publishedAt: string; // ISO date string
}

export type LearningCenterType = 'learningCenterVideo' | 'learningCenterCaseStudy' | 'learningCenterTutorial' | 'learningCenterModel';

