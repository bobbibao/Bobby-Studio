import {
  AttributeTypeEnum,
  InspirationMethodEnum,
  ActionMethodEnum,
  InPaintingMethodEnum,
  OutPaintingMethodEnum,
  ActionTypeEnum,
  InputTypeEnum,
} from '@/constants/attribute-enum';
import { ConfigurationDto } from './configuration.dto';

export interface PatchingProjectDto {
  userId: string;
  projectId: string;
  folders?: Folder[];
}

export interface Project {
  id?: string;
  title?: string;
  type: AttributeTypeEnum;
  description?: string;
  folders?: Folder[];
  images?: VImage[];
}

export interface Folder {
  id?: string;
  name: string;
  type: AttributeTypeEnum;
  images: VImage[];
}

export interface VImage {
  id: string;
  attributeId?: string;
  path: string;
  method?: InspirationMethodEnum;
  thumbnail?: string;
  value: GeneratedImageAttributeEntity;
}

export interface AttributeEntity<V, A> {
  id?: string;
  version?: string;
  attributeId?: string;
  type: AttributeTypeEnum;
  value: V;
  actions: A;
  isPublished?: boolean;
}

export interface ValueAttributeEntity {}

export interface OriginalImageAttributeEntity extends ValueAttributeEntity {
  key: string;
  path: string;
}

export interface GeneratedImageAttributeEntity extends ValueAttributeEntity {
  key: string;
  path: string;
  previousImageId?: string;
  usedModels?: string[];
  thumbnail?: string;
}

export interface ProjectAttributeEntity extends ValueAttributeEntity {
  id?: string;
  title?: string;
  type: AttributeTypeEnum;
  description?: string;
  folders?: Folder[];
  images?: VImage[];
}

export interface ActionEntity {
  method?: InspirationMethodEnum;
  inputType?: InputTypeEnum;
  isFavorite?: boolean;
  createdAt?: Date;
  isBookmarked?: boolean;
  actionType?: ActionTypeEnum;
  generateImageParams?: GenerateImageParams<
    | BasicTextToImageParams
    | ProTextToImageParams
    | BasicLineDrawingToImageParams
    | ProLineDrawingToImageParams
    | BasicImageUpscalingParams
    | ProImageUpscalingParams
    | BasicImageToImageParams
    | ProImageToImageParams
  >;
}

export interface PaintingActionEntity {
  method?: InPaintingMethodEnum | OutPaintingMethodEnum;
  createdAt?: Date;
  paintedImageParams?: InPaintingImageParams | OutPaintingImageParams;
}

export interface GenerateImageParams<D> {
  userId: string;
  userEmail: string;
  method: InspirationMethodEnum;
  numImages?: number;
  projectId?: string;
  folderId?: string;
  selectedModels?: string[];
  data: D;
}

export interface UploadImageParams<D> {
  userId: string;
  method?: InspirationMethodEnum;
  data: D;
}

// Basic and Pro params interfaces
export interface BasicTextToImageParams {
  attributeId?: string;
  template: string;
  imageSize: string;
  aspectRatio: string;
  prompt: string;
  enhancedPrompt: string;
  enabledAiPrompt: boolean;
  lora: string;
  selectedStyle: string;
  inputValue: number;
  styleValue: number;
  creativityValue: number;
  selectedModels?: string[];
  qualityLevel?: string;
}

export interface ProTextToImageParams {
  attributeId?: string;
  template: string;
  imageSize: string;
  aspectRatio: string;
  prompt: string;
  enhancedPrompt: string;
  enabledAiPrompt: boolean;
  lora: string;
  creativityValue: number;
  step: number;
  selectedStyle: string;
  guidance: number;
  selectedModels?: string[];
  qualityLevel?: string;
}

export interface BasicLineDrawingToImageParams {
  attributeId?: string;
  imageId: string;
  imagePath: string;
  imageSize: string;
  aspectRatio: string;
  inputValue: number;
  promptKeywords: string;
  enhancedPrompt: string;
  enabledAiPrompt: boolean;
  creativityValue: number;
  selectedStyle: string;
  lora: string;
  qualityLevel?: string;
}

export interface ProLineDrawingToImageParams {
  attributeId?: string;
  imageId: string;
  imagePath: string;
  imageSize: string;
  aspectRatio: string;
  inputValue: number;
  prompt: string;
  enhancedPrompt: string;
  enabledAiPrompt: boolean;
  lora: string;
  creativityValue: number;
  step: number;
  selectedStyle: string;
  guidance: number;
  qualityLevel?: string;
}

export interface BasicImageUpscalingParams {
  attributeId?: string;
  imageId: string;
  imagePath: string;
  imageSize: string;
  aspectRatio: string;
  upscaleBy: number;
  seed: number;
}

export interface ProImageUpscalingParams {
  attributeId?: string;
  imageId: string;
  imagePath: string;
  imageSize: string;
  aspectRatio: string;
  upscaleModel: string;
  upscaleBy: number;
  step: number;
  seed: number;
}

export interface BasicImageToImageParams {
  attributeId?: string;
  imageId: string;
  imagePath: string;
  imageSize: string;
  aspectRatio: string;
  inputValue: number;
  lora: string;
  creativityValue: number;
  selectedStyle: string;
  prompt: string;
  enhancedPrompt: string;
  enabledAiPrompt: boolean;
  selectedModels?: string[];
  qualityLevel?: string;
}

export interface ProImageToImageParams {
  attributeId?: string;
  imageId: string;
  imagePath: string;
  imageSize: string;
  aspectRatio: string;
  inputValue: number;
  prompt: string;
  lora: string;
  creativityValue: number;
  step: number;
  selectedStyle: string;
  guidance: number;
  enhancedPrompt: string;
  enabledAiPrompt: boolean;
  selectedModels?: string[];
  qualityLevel?: string;
}

export interface SignInResponse {
  userId: string;
  access_token: string;
  configurations: ConfigurationDto;
}

export interface SignInUserResponse {
  id: string;
  password: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
  plan: string | null;
  gender: string | null;
  address: string | null;
  country: string | null;
  phoneNumber: string | null;
  avatar: Buffer | null;
}

export interface UserState<P> {
  userId: string;
  userConfiguration: ConfigurationDto;
  userProfile: P;
}

export interface PersonalProfile {
  firstName: string;
  lastName: string;
  jobTitle: string;
  phoneNumber: string;
  pictureProfile: string;
}

export interface CompanyProfile {
  name: string;
  type: string;
  size: number;
  email: string;
  website: string;
  country: string;
  postalCode: string;
  city: string;
  state: string;
  streetAddress: string;
  pictureProfile: string;
}

export interface UploadImageResponse {
  userId: string;
  attributeId: string;
  imagePath: string;
}

export interface Prompt {
  msg?: string;
  keywords?: string[];
  negativeKeywords?: string[];
  positiveKeywords?: string[];
}

export interface GenerateImageResponse {
  userId: string;
  attributeId: string;
  version: string;
  jobId?: string;
  requestId?: string;
  createdAt?: string;
  imagePath?: string;
  isFavorite?: boolean;
  isBookmarked?: boolean;
  generatedImage: {
    location: string;
    eTag: string;
    bucket: string;
    key: string;
    thumbnail?: string;
    dimensions?: string;
    creationType?: string;
    inputType?: string;
    selectedStyle?: string;
    prompt?: string;
  };
  method?: InspirationMethodEnum;
  // Additional metadata for template loading
  inputValue?: number;
  creativityValue?: number;
  styleValue?: number;
  seed?: string;
  enhancedPrompt?: string;
}

export interface GetImagesParams {
  userId?: string;
  limit?: number;
  offset?: number;
  type?: InspirationMethodEnum[];
  isBookmark?: boolean;
  isFavorite?: boolean;
  isPublished?: boolean;
  orderBy?: 'asc' | 'desc';
}

export interface GetFavoriteImagesParams {
  userId?: string;
  limit?: number;
  offset?: number;
  type?: InspirationMethodEnum[];
  isBookmark?: boolean;
  isFavorite?: boolean;
  isPublished?: boolean;
  orderBy?: 'asc' | 'desc';
}

export interface GetImagesDTO {
  userId: string;
  limit: number;
  offset: number;
  type?: ActionMethodEnum;
  isBookmark?: boolean;
  isFavorite?: boolean;
  isPublished?: boolean;
  orderBy?: 'asc' | 'desc';
}

export interface InPaintingImageDTO {
  userId: string;
  prompt: string;
  imagePath: string;
}

export interface InPaintingImageParams {
  userId: string;
  prompt: string;
  method: InPaintingMethodEnum;
}

export interface OutPaintingImageDTO {
  userId: string;
  prompt: string;
  imagePath: string;
  ratio: string;
  pad: OutPaintingImagePadParams;
}

export interface OutPaintingImageParams {
  method: OutPaintingMethodEnum;
  userId: string;
  prompt: string;
  ratio: string;
  pad: string;
}

export interface OutPaintingImagePadParams {
  left: number;
  right: number;
  top: number;
  bottom: number;
  feathering: number;
}

