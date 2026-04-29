import { ActionEntity, GeneratedImageAttributeEntity, OriginalImageAttributeEntity, VImage } from "@/common/dtos/attribute/common.dto";
import { UserAttributeEntity } from "@/common/dtos/attribute/userAttribute.dto";

export interface TextToImageRequest {
    template: string;
    imageSize: string;
    prompt: string;
    seed: number;
    lora: string;
    creativityValue: number;
}

export interface PromptImage {
    location: string;
    eTag: string;
    bucket: string;
    key: string;
}
export interface TextToImageData {
    userId: string | null;
    attributeId: string;
    generatedImage: PromptImage;
}

export interface InspiractionWorkspaceState {
    loading: boolean;
    error: string | null;
    currentImageGenerationProgress: {
        loading: boolean;
        error: string | null;
        data?: TextToImageData | null;
    },
    inspirationImages: VImage[];
}

export type ProjectAttribute = UserAttributeEntity<OriginalImageAttributeEntity| GeneratedImageAttributeEntity, ActionEntity>


