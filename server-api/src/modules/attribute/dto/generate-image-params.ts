import { ValueAttributeEntity } from "./common.dto";

export class GenerateImageInspirationLineDrawingToImageBasicConfigurationDto {
    inputValue:  number;
    promptKeywords: string[];
    seed: {
        useRandomSeed:  boolean;
        enterSeedValue:  string;
    }
}

export class GenerateImageInspirationLineDrawingToImageProConfigurationDto {
    inputValue:  number;
    promptKeywords: {
        positive:  string[];
        negative:  string[];
    };
    seed: {
        useRandomSeed:  boolean;
    };
}

export class GenerateImageInspirationTextToImageBasicConfigurationDto {
    selectSizeImage:  string;
    promptKeywords:  string[];
    seed: {
        useRandomSeed:  boolean;
        enterSeedValue:  string;
    };
}

export class GenerateImageInspirationTextToImageProConfigurationDto {
    selectSizeImage:  string;
    promptKeywords: {
        positive:  string[];
        negative:  string[];
    };
    seed: {
        useRandomSeed:  boolean;
        enterSeedValue:  string;
    };
}

export class GenerateImageInspirationImageUpscalingBasicConfigurationDto {
    factorOfUpScale:  number;
}   

export class GenerateImageInspirationImageUpscalingProConfigurationDto {
    factorOfUpScale:  number;
    creativitySlider:  number;
    seed: {
        useRandomSeed:  boolean;
        enterSeedValue:  string;
    };
}

export class GenerateImageInspirationSeasonalImageryBasicConfigurationDto {
    season:  string;

    seed: {
        useRandomSeed: boolean;
        enterSeedValue:  string;
    };
  }

export class GenerateImageInspirationSeasonalImageryProConfigurationDto {
    season: string;

    inputValue: number;
    seed: {
        useRandomSeed: boolean;
        enterSeedValue: string;
    };
}

export type GenerateImageInspirationLineDrawingToImageConfigurationDto = GenerateImageInspirationLineDrawingToImageBasicConfigurationDto | GenerateImageInspirationLineDrawingToImageProConfigurationDto
export type GenerateImageInspirationTextToImageConfigurationDto = GenerateImageInspirationTextToImageBasicConfigurationDto | GenerateImageInspirationTextToImageProConfigurationDto
export type GenerateImageInspirationImageUpscalingConfigurationDto = GenerateImageInspirationImageUpscalingBasicConfigurationDto | GenerateImageInspirationImageUpscalingProConfigurationDto
export type GenerateImageInspirationSeasonalImageryConfigurationDto = GenerateImageInspirationSeasonalImageryBasicConfigurationDto | GenerateImageInspirationSeasonalImageryProConfigurationDto
export type GenerateImageInspirationConfigurationDto = GenerateImageInspirationLineDrawingToImageConfigurationDto | GenerateImageInspirationTextToImageConfigurationDto | GenerateImageInspirationImageUpscalingConfigurationDto | GenerateImageInspirationSeasonalImageryConfigurationDto

export class GenerateImageConfigurationDto extends ValueAttributeEntity{
    inspiration: GenerateImageInspirationConfigurationDto;
}