import {
  ActionMethodEnum,
  AttributeTypeEnum,
  InspirationMethodEnum,
  InPaintingMethodEnum,
  OutPaintingMethodEnum,
  ActionTypeEnum,
  InputTypeEnum,
  CreationTypeEnum,
} from '../../../constant/attribute-type.enum';
import { ConfigurationDto } from './configuration.dto';

export class PatchingProjectDto {
  userId: string;
  projectId: string;

  folders?: Folder[];
}

export class Project {
  id?: string; // attributeID
  title?: string;
  type: AttributeTypeEnum;
  description?: string;
  folders?: Folder[];
  images?: VImage[];
}

export class Folder {
  id?: string;
  name: string;
  type: AttributeTypeEnum;
  images: VImage[];
}

export class VImage {
  id: string;
  attributeId?: string;
  path: string;
  method?: InspirationMethodEnum;
  thumbnail?: string;
  value: GeneratedImageAttributeEntity;
}

export class AttributeEntity<V, A> {
  id?: string; // userId
  version?: string;
  attributeId?: string; // attributeId
  type: AttributeTypeEnum;
  value: V;
  actions: A;
  isPublished?: boolean;
  jobId?: string;
  batchEditId?: string; // Batch ID for grouping related edits
}

export class ValueAttributeEntity {}

// original image
export class OriginalImageAttributeEntity extends ValueAttributeEntity {
  key: string;
  path: string;
}
// modeled image
export class GeneratedImageAttributeEntity extends ValueAttributeEntity {
  key: string;
  path: string;
  previousImageId?: string;
  usedModels?: string[];
  thumbnail?: string;
  dimensions?: string;
  original?: {
    path?: string;
    thumbnail?: string;
  }
}

export class ProjectAttributeEntity extends ValueAttributeEntity {
  id?: string;
  title?: string;
  type: AttributeTypeEnum;
  description?: string;
  folders?: Folder[];
  images?: VImage[];
}

export interface EditImageData {
  creationType?: string;
  inputType?: string;
  imagePath?: string;
  selectedStyle?: string;
  seed?: number | string;
  inputValue?: number;
  styleValue?: number;
  creativityValue?: number;
  prompt?: string;
  promptKeywords?: string;
  enhancedPrompt?: string;
  enabledAiPrompt?: boolean;
  [key: string]: unknown; // Allow additional properties
}

export class ActionEntity {
  jobId?: string;
  method?: InspirationMethodEnum;
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

  editImageParams?: {
    userId?: string;
    method?: string;
    data?: EditImageData;
  };
}

export class PaintingActionEntity {
  jobId?: string;
  method?: InPaintingMethodEnum | OutPaintingMethodEnum;
  createdAt?: Date;
  paintedImageParams?: InPaintingImageParams | OutPaintingImageParams;
}

export class GenerateImageParams<D> {
  userId: string;
  method: InspirationMethodEnum;
  projectId?: string;
  folderId?: string;
  selectedModels?: string[];
  data: D;
}

export class UploadImageParams<D> {
  userId: string;
  method: InspirationMethodEnum;
  data: D;
}

export class BasicTextToImageParams {
  attributeId?: string;
  template: string;
  imageSize: string;
  aspectRatio: string;
  prompt: string;
  seed: number;
  lora: string;
  creationType: string;
  inputType: string;
  selectedStyle: string;
  inputValue?: number;
  styleValue?: number;
  creativityValue?: number;
  selectedModels?: string[];
}
export class ProTextToImageParams {
  attributeId?: string = '';
  template: string;
  imageSize: string;
  prompt: string;
  lora: string;
  seed = -1;
  step: number;
  guidance: number;
  creationType: string;
  inputType: string;
  selectedStyle: string;
  inputValue?: number;
  styleValue?: number;
  creativityValue?: number;
  selectedModels?: string[];
}

export class BasicLineDrawingToImageParams {
  attributeId?: string;
  imageId: string; // imageId after upload
  imagePath: string;
  imageSize: string;
  promptKeywords: string;
  seed: number;
  lora: string;
  creationType: string;
  inputType: string;
  selectedStyle: string;
  inputValue?: number;
  styleValue?: number;
  creativityValue?: number;
}

export class ProLineDrawingToImageParams {
  attributeId?: string;
  imageId: string; // imageId after upload
  imagePath: string;
  imageSize: string;
  prompt: string;
  lora: string;
  seed: number;
  step: number;
  guidance: number;
  creationType: string;
  inputType: string;
  selectedStyle: string;
  inputValue?: number;
  styleValue?: number;
  creativityValue?: number;
}

export class BasicImageUpscalingParams {
  attributeId?: string;
  imageId: string; // imageId after upload
  imagePath: string;
  imageSize: string;
  upscaleBy: number;
  seed: number;
  creationType: string;
  inputType: string;
  selectedStyle: string;
  inputValue?: number;
  styleValue?: number;
  creativityValue?: number;
}
export class ProImageUpscalingParams {
  attributeId?: string;
  imageId: string; // imageId after upload
  imagePath: string;
  imageSize: string;

  upscaleModel: string;
  upscaleBy: number;
  step: number;
  seed: number;
  creationType: string;
  inputType: string;
  selectedStyle: string;
  inputValue?: number;
  styleValue?: number;
  creativityValue?: number;
}

export class BasicImageToImageParams {
  attributeId?: string;
  imageId: string; // imageId after upload
  imagePath: string;
  imageSize: string;
  aspectRatio: string;
  lora: string;
  seed: number;
  prompt: string;
  creationType: string;
  inputType: string;
  selectedStyle: string;
  inputValue?: number;
  styleValue?: number;
  creativityValue?: number;
  selectedModels?: string[];
}
export class ProImageToImageParams {
  attributeId?: string;
  imageId: string; // imageId after upload
  imagePath: string;
  imageSize: string;
  prompt: string;
  lora: string;
  step: number;
  seed: number;
  guidance: number;
  creationType: string;
  inputType: string;
  selectedStyle: string;
  inputValue?: number;
  styleValue?: number;
  creativityValue?: number;
  selectedModels?: string[];
}

export class SignInResponse {
  userId: string;
  access_token: string;
  configurations: ConfigurationDto;
}

export class SignInUserResponse {
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

export class UserState<P> {
  userId: string;
  userConfiguration: ConfigurationDto;
  userProfile: P;
}

export class PersonalProfile {
  firstName: string;
  lastName: string;
  jobTitle: string;
  phoneNumber: string;
  pictureProfile: string;
}
export class CompanyProfile {
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

export class UploadImageResponse {
  userId: string;
  attributeId: string;
  imagePath: string;
}

export class Prompt {
  msg?: string;
  keywords?: string[];
  negativeKeywords?: string[];
  positiveKeywords?: string[];
}

export class GenerateImageResponse {
  userId: string;
  attributeId: string;
  jobId?: string;
  requestId?: string;
  createdAt?: string;
  imagePath?: string;
  generatedImage: {
    /**
     * URL of the uploaded object.
     */
    location: string;
    /**
     * ETag of the uploaded object.
     */
    eTag: string;
    /**
     * Bucket to which the object was uploaded.
     */
    bucket: string;
    /**
     * Key to which the object was uploaded.
     */
    key: string;
    thumbnail?: string;
    dimensions?: string;
    creationType?: string;
    inputType?: string;
    selectedStyle?: string;
    prompt?: string;
  };
  method?: InspirationMethodEnum;
}

export class GetImagesParams {
  userId?: string;
  limit?: number; // currentPage
  offset?: number; // pageSize, offset = (currentPage - 1) * limit (deprecated, use keyset pagination)
  inputType?: InputTypeEnum[];
  creationType?: string;
  isBookmark?: boolean;
  isFavorite?: boolean;
  isPublished?: boolean;
  orderBy?: 'asc' | 'desc';
  models?: ActionMethodEnum[];
  // Keyset pagination parameters
  lastCreatedAt?: Date; // cursor for keyset pagination
  lastId?: string; // cursor for keyset pagination
}

export type HistoryImageFilter = 'all' | 'generated-only' | 'edited-only';

export class GetHistoryJobsParams {
  userId: string;
  limit?: number; // currentPage
  offset?: number; // pageSize, offset = (currentPage - 1) * limit
  orderBy?: 'asc' | 'desc';
  inputType?: InputTypeEnum[];
  creationType?: CreationTypeEnum;
  includeEditImages?: HistoryImageFilter; // Whether to include generated/edit images
  minDate?: Date; // Minimum date for history filtering (based on subscription plan)
}

export class GetEditImageHistoryParams {
  userId: string;
  limit?: number;
  offset?: number;
  orderBy?: 'asc' | 'desc';
  imageId?: string; // Filter by source image ID
}

export class GetUserProjectParams {
  userId: string;
  orderBy?: 'asc' | 'desc';
  inputType?: InputTypeEnum[];
  creationType?: CreationTypeEnum;
}

export class GetFavoriteImagesParams {
  userId?: string;
  limit?: number; // currentPage
  offset?: number; // pageSize, offset = (currentPage - 1) * limit
  type?: InspirationMethodEnum[];
  isBookmark?: boolean;
  isFavorite?: boolean;
  isPublished?: boolean;
  orderBy?: 'asc' | 'desc';
}

export class GetImagesDTO {
  userId: string;
  limit: number;
  offset: number; // deprecated, use keyset pagination
  inputType?: InputTypeEnum[];
  creationType?: CreationTypeEnum;
  type?: ActionMethodEnum;
  isBookmark?: boolean;
  isFavorite?: boolean;
  isPublished?: boolean;
  orderBy?: 'asc' | 'desc';
  // Keyset pagination parameters
  lastCreatedAt?: Date; // cursor for keyset pagination
  lastId?: string; // cursor for keyset pagination
}

export class InPaintingImageDTO {
  userId: string;
  prompt: string;
  imagePath: string;
}

export class InPaintingImageParams {
  userId: string;
  prompt: string;
  method: InPaintingMethodEnum;
}

export class OutPaintingImageDTO {
  userId: string;
  prompt: string;
  imagePath: string;
  ratio: string;
  pad: OutPaintingImagePadParams;
}

export class OutPaintingImageParams {
  method: OutPaintingMethodEnum;
  userId: string;
  prompt: string;
  ratio: string;
  pad: string;
}

export class OutPaintingImagePadParams {
  left: number;
  right: number;
  top: number;
  bottom: number;
  feathering: number;
}
