export class GenerateResourceParamsDto {
    data?: any;
    userId: string;
    attributeId: string;
    permissionId?: string;
    policyId?: string;
    configuration: GenerateResourceParams; // Add the Params field
  
    constructor(data: any, userId: string, permissionId: string, policyId: string, configuration: GenerateResourceParams) {
      this.data = data;
      this.userId = userId;
      this.permissionId = permissionId;
      this.policyId = policyId;
      this.configuration = configuration;
    }
  }
  
  export class GenerateInspirationBasicParamsDto {
    imagePath: string;
    inputValue: number;
    promptKeywords: string[];
    seed: {
        useRandomSeed: boolean;
        seedValue: {
            isRandomSeed: boolean;
            value: string;
        };
    }
    setting: {
      export: boolean;
      import: boolean;
    };
  }
  
  export class GenerateInspirationProParamsDto {
    imagePath: string;
    inputValue: number;
    promptKeywords: {
        positive: string[];
        negative: string[];
    };
    seed: {
        useRandomSeed: boolean;
    };
  }
  
  export class GenerateProjectBasicParamsDto {
    selectSizeImage: string[];
    promptKeywords: string[];
    seed: {
      useRandomSeed: boolean;
      seedValue: {
        isRandomSeed: boolean;
        value: string;
    };
    };
    setting: {
      export: boolean;
      import: boolean;
    };
  }
  
  export class GenerateProjectProParamsDto {
    selectSizeImage: string[];
    promptKeywords: {
        positive: string[];
        negative: string[];
    };
    seed: {
      useRandomSeed: boolean;
      seedValue: {
        isRandomSeed: boolean;
        value: string;
    };
    };
    setting: {
      export: boolean;
      import: boolean;
    };
  }
  
  export class GenerateLearningCenterBasicParamsDto {
    imagePath: string;
    factorOfUpScale: number[];
    setting: {
        export: boolean;
        import: boolean;
    };
  }   
  
  export class GenerateLearningCenterProParamsDto {
    imagePath: string;
    factorOfUpScale: number[];
    creativitySlider: number[];
    seed: {
        useRandomSeed: boolean;
        seedValue: {
            isRandomSeed: boolean;
            value: string;
        };
    };
    setting: {
        export: boolean;
        import: boolean;
    };
  }
  
  export type GenerateInspirationParams = GenerateInspirationBasicParamsDto | GenerateInspirationProParamsDto
  export type GenerateProjectParams = GenerateProjectBasicParamsDto | GenerateProjectProParamsDto
  export type GenerateLearningCenterParams = GenerateLearningCenterBasicParamsDto | GenerateLearningCenterProParamsDto   
  export type GenerateResourceParams = GenerateInspirationParams | GenerateProjectParams | GenerateLearningCenterParams