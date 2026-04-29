import {
  ActionMethodEnum,
  AttributeTypeEnum,
  InPaintingMethodEnum,
  OutPaintingMethodEnum,
  ActionTypeEnum,
  InputTypeEnum,
  CreationTypeEnum,
} from '../../../constant/attribute-type.enum';
import { ConfigurationDto } from './configuration.dto';
import {
  BasicTextToImageParams,
  ProTextToImageParams,
  BasicLineDrawingToImageParams,
  ProLineDrawingToImageParams,
  BasicImageUpscalingParams,
  ProImageUpscalingParams,
  BasicImageToImageParams,
  ProImageToImageParams,
  OriginalImageAttributeEntity as CommonOriginalImageAttributeEntity,
  GeneratedImageAttributeEntity as CommonGeneratedImageAttributeEntity,
  ValueAttributeEntity as CommonValueAttributeEntity,
  ProjectAttributeEntity as CommonProjectAttributeEntity,
  PaintingActionEntity as CommonPaintingActionEntity,
  InPaintingImageParams as CommonInPaintingImageParams,
  OutPaintingImageParams as CommonOutPaintingImageParams,
  OutPaintingImagePadParams as CommonOutPaintingImagePadParams,
  InPaintingImageDTO as CommonInPaintingImageDTO,
  OutPaintingImageDTO as CommonOutPaintingImageDTO,
  SignInResponse as CommonSignInResponse,
  SignInUserResponse as CommonSignInUserResponse,
  UserState as CommonUserState,
  PersonalProfile as CommonPersonalProfile,
  CompanyProfile as CommonCompanyProfile,
  UploadImageResponse as CommonUploadImageResponse,
  Prompt as CommonPrompt,
  GetImagesParams as CommonGetImagesParams,
  GetHistoryJobsParams as CommonGetHistoryJobsParams,
  GetUserProjectParams as CommonGetUserProjectParams,
  GetFavoriteImagesParams as CommonGetFavoriteImagesParams,
  GetImagesDTO as CommonGetImagesDTO,
} from './common.dto';

export type ImageEditMethod = string;

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
  method?: ImageEditMethod;
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
}

export class ProjectAttributeEntity extends ValueAttributeEntity {
  id?: string;
  title?: string;
  type: AttributeTypeEnum;
  description?: string;
  folders?: Folder[];
  images?: VImage[];
}

export class ActionEntityEdit {
  jobId?: string;
  method?: ImageEditMethod;
  isFavorite?: boolean;
  createdAt?: Date;
  isBookmarked?: boolean;
  actionType?: ActionTypeEnum;

  editImageParams?: GenerateImageParams<
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

export class PaintingActionEntity {
  method?: InPaintingMethodEnum | OutPaintingMethodEnum;
  createdAt?: Date;
  paintedImageParams?: InPaintingImageParams | OutPaintingImageParams;
}

export class GenerateImageParams<D> {
  userId: string;
  method: ImageEditMethod;
  projectId?: string;
  folderId?: string;
  selectedModels?: string[];
  data: D;
}

export class UploadImageParams<D> {
  userId: string;
  method: ImageEditMethod;
  data: D;
}

// Re-export DTOs from common.dto.ts to avoid duplication
export type SignInResponse = CommonSignInResponse;
export type SignInUserResponse = CommonSignInUserResponse;
export type UserState<P> = CommonUserState<P>;
export type PersonalProfile = CommonPersonalProfile;
export type CompanyProfile = CommonCompanyProfile;
export type UploadImageResponse = CommonUploadImageResponse;
export type Prompt = CommonPrompt;
export type GetImagesParams = CommonGetImagesParams;
export type GetHistoryJobsParams = CommonGetHistoryJobsParams;
export type GetUserProjectParams = CommonGetUserProjectParams;
export type GetFavoriteImagesParams = CommonGetFavoriteImagesParams;
export type GetImagesDTO = CommonGetImagesDTO;
export type InPaintingImageDTO = CommonInPaintingImageDTO;
export type OutPaintingImageDTO = CommonOutPaintingImageDTO;
export type InPaintingImageParams = CommonInPaintingImageParams;
export type OutPaintingImageParams = CommonOutPaintingImageParams;
export type OutPaintingImagePadParams = CommonOutPaintingImagePadParams;

// Add GenerateImageResponse specific for ImageEditMethod
export class GenerateImageResponse {
  userId: string;
  attributeId: string;
  imagePath?: string;
  generatedImage: {
    location: string;
    eTag: string;
    bucket: string;
    key: string;
    thumbnail?: string;
  };
  method?: ImageEditMethod;
}

// Remove all duplicate classes below - use imports from common.dto.ts instead
/* REMOVED: SignInUserResponse, UserState, PersonalProfile, CompanyProfile, 
   UploadImageResponse, Prompt, GetImagesParams, GetHistoryJobsParams,
   GetUserProjectParams, GetFavoriteImagesParams, GetImagesDTO, 
   InPaintingImageDTO, InPaintingImageParams, OutPaintingImageDTO,
   OutPaintingImageParams, OutPaintingImagePadParams, GenerateImageResponse
   - All these are now imported from common.dto.ts */
