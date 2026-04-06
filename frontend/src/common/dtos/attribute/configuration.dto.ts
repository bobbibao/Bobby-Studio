import { ValueAttributeEntity } from './common.dto';

export interface InspirationLineDrawingToImageBasicConfigurationDto {
    uploadImage: {
        isActive: boolean;
        value: boolean;
    };
    inputValue: {
        isActive: boolean;
        value: number[];
    };
    promptKeywords: {
        isActive: boolean;
        value: string[];
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
        enterSeedValue: {
            isActive: boolean;
            value: string;
        };
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface InspirationLineDrawingToImageProConfigurationDto {
    uploadImage: {
        isActive: boolean;
        value: boolean;
    };
    inputValue: {
        isActive: boolean;
        value: number[];
    };
    promptKeywords: {
        positive: {
            isActive: boolean;
            value: string[];
        };
        negative: {
            isActive: boolean;
            value: string[];
        };
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface InspirationTextToImageBasicConfigurationDto {
    selectSizeImage: {
        isActive: boolean;
        value: string[];
    };
    promptKeywords: {
        isActive: boolean;
        value: string[];
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
        enterSeedValue: {
            isActive: boolean;
            value: string;
        };
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface InspirationTextToImageProConfigurationDto {
    selectSizeImage: {
        isActive: boolean;
        value: string[];
    };
    promptKeywords: {
        positive: {
            isActive: boolean;
            value: string[];
        };
        negative: {
            isActive: boolean;
            value: string[];
        };
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
        enterSeedValue: {
            isActive: boolean;
            value: string;
        };
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface InspirationImageUpscalingBasicConfigurationDto {
    uploadImage: {
        isActive: boolean;
    };
    factorOfUpScale: {
        isActive: boolean;
        value: number[];
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface InspirationImageUpscalingProConfigurationDto {
    uploadImage: {
        isActive: boolean;
    };
    factorOfUpScale: {
        isActive: boolean;
        value: number[];
    };
    creativitySlider: {
        isActive: boolean;
        value: number[];
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
        enterSeedValue: {
            isActive: boolean;
            value: string;
        };
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface InspirationSeasonalImageryBasicConfigurationDto {
    uploadImage: {
        isActive: boolean;
    };
    season: {
        isActive: boolean;
        value: string[];
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
        enterSeedValue: {
            isActive: boolean;
            value: string;
        };
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface InspirationSeasonalImageryProConfigurationDto {
    uploadImage: {
        isActive: boolean;
    };
    season: {
        isActive: boolean;
        value: string[];
    };
    inputValue: {
        isActive: boolean;
        value: number[];
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
        enterSeedValue: {
            isActive: boolean;
            value: string;
        };
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface ProjectBasicConfigurationDto {
    selectSizeImage: {
        isActive: boolean;
        value: string[];
    };
    promptKeywords: {
        isActive: boolean;
        value: string[];
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
        seedValue: {
            isRandomSeed: {
                isActive: boolean;
                value: boolean;
            };
            value: string;
        };
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
            value: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface ProjectProConfigurationDto {
    selectSizeImage: {
        isActive: boolean;
        value: string[];
    };
    promptKeywords: {
        positive: {
            isActive: boolean;
            value: string[];
        };
        negative: {
            isActive: boolean;
            value: string[];
        };
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
        seedValue: {
            isRandomSeed: {
                isActive: boolean;
                value: boolean;
            };
            value: string;
        };
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
            value: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface LearningCenterBasicConfigurationDto {
    uploadImage: {
        isActive: boolean;
        value: boolean;
    };
    factorOfUpScale: {
        isActive: boolean;
        value: number[];
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
            value: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface LearningCenterProConfigurationDto {
    uploadImage: {
        isActive: boolean;
        value: boolean;
    };
    factorOfUpScale: {
        isActive: boolean;
        value: number[];
    };
    creativitySlider: {
        isActive: boolean;
        value: number[];
    };
    seed: {
        useRandomSeed: {
            isActive: boolean;
            value: boolean;
        };
        seedValue: {
            isRandomSeed: boolean;
            value: string;
        };
    };
    setting: {
        export: {
            isActive: boolean;
        };
        import: {
            isActive: boolean;
            value: boolean;
        };
    };
    generate: {
        isActive: boolean;
    };
}

export interface ActiveInspirationConfigurationDto<B, P> {
    isActive: boolean;
    config: {
        basic: B;
        pro: P;
    };
}

export interface InspirationConfigurationDto {
    lineDrawingToImage: ActiveInspirationConfigurationDto<
        InspirationLineDrawingToImageBasicConfigurationDto,
        InspirationLineDrawingToImageProConfigurationDto
    >;
    textToImage: ActiveInspirationConfigurationDto<
        InspirationTextToImageBasicConfigurationDto,
        InspirationTextToImageProConfigurationDto
    >;
    imageUpscaling: ActiveInspirationConfigurationDto<
        InspirationImageUpscalingBasicConfigurationDto,
        InspirationImageUpscalingProConfigurationDto
    >;
    imageToImage: ActiveInspirationConfigurationDto<
        InspirationSeasonalImageryBasicConfigurationDto,
        InspirationSeasonalImageryProConfigurationDto
    >;
}

export interface ProjectConfigurationDto {
    basic: ProjectBasicConfigurationDto;
    pro: ProjectProConfigurationDto;
}

export interface LearningCenterConfigurationDto {
    basic: LearningCenterBasicConfigurationDto;
    pro: LearningCenterProConfigurationDto;
}

export interface ConfigurationDto extends ValueAttributeEntity {
    inspiration: InspirationConfigurationDto;
    // project: ProjectConfigurationDto;
    // learningCenter: LearningCenterConfigurationDto;
    isPublishMethod: boolean;
    isDeleteMethod: boolean;
}
