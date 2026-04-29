import { ValueAttributeEntity } from "./common.dto";

export class InspirationLineDrawingToImageBasicConfigurationDto {
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
    }
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

export class InspirationLineDrawingToImageProConfigurationDto {
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

export class InspirationTextToImageBasicConfigurationDto {
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

export class InspirationTextToImageProConfigurationDto {
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

export class InspirationImageUpscalingBasicConfigurationDto {
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

export class InspirationImageUpscalingProConfigurationDto {
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

export class InspirationSeasonalImageryBasicConfigurationDto {
    uploadImage: {
        isActive: boolean;
    };
    season: {
        isActive: boolean;
        value: string[]
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

export class InspirationSeasonalImageryProConfigurationDto {
    uploadImage: {
        isActive: boolean;
    };
    season: {
        isActive: boolean;
        value: string[]
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

export class ProjectBasicConfigurationDto {
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

export class ProjectProConfigurationDto {
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

export class LearningCenterBasicConfigurationDto {
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

export class LearningCenterProConfigurationDto {
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
        }
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

export class ActiveInspirationConfigurationDto<B,P> {
    isActive: boolean;
    config: {
        basic: B,
        pro: P
    }
}

export class InspirationConfigurationDto {
    lineDrawingToImage: ActiveInspirationConfigurationDto<InspirationLineDrawingToImageBasicConfigurationDto, InspirationLineDrawingToImageProConfigurationDto>
    textToImage: ActiveInspirationConfigurationDto<InspirationTextToImageBasicConfigurationDto, InspirationTextToImageProConfigurationDto>
    imageUpscaling: ActiveInspirationConfigurationDto<InspirationImageUpscalingBasicConfigurationDto, InspirationImageUpscalingProConfigurationDto>
    imageToImage: ActiveInspirationConfigurationDto<InspirationSeasonalImageryBasicConfigurationDto, InspirationSeasonalImageryProConfigurationDto>
   
}

export class ProjectConfigurationDto {
    basic: ProjectBasicConfigurationDto;
    pro: ProjectProConfigurationDto;
}

export class LearningCenterConfigurationDto {
    basic: LearningCenterBasicConfigurationDto;
    pro: LearningCenterProConfigurationDto;
}

export class ConfigurationDto extends ValueAttributeEntity{
    inspiration: InspirationConfigurationDto;
    // project: ProjectConfigurationDto;
    // learningCenter: LearningCenterConfigurationDto;
    isPublishMethod: boolean;
    isDeleteMethod: boolean;
}