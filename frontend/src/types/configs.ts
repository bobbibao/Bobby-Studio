export type ConfigOption = {
  isActive: boolean;
  value?: any;
};

export type BasicConfig = {
  uploadImage: ConfigOption;
  inputValue?: ConfigOption;
  promptKeywords?: ConfigOption | { positive?: ConfigOption; negative?: ConfigOption } | any;
  selectSizeImage?: ConfigOption;
  season?: ConfigOption;
  factorOfUpScale?: ConfigOption;
  seed?: {
    useRandomSeed: ConfigOption;
    enterSeedValue?: ConfigOption;
  };
  setting?: {
    export: ConfigOption;
    import: ConfigOption;
  };
  generate: ConfigOption;
};

export type ProConfig = BasicConfig & {
  creativitySlider?: ConfigOption;
};

export type FeatureConfig = {
  basic: BasicConfig;
  pro: ProConfig;
};

export type ImageToImageFeatureConfig = {
  basic: ImageToImageBasicConfig;
  pro: ProConfig;
};

export type ImageToImageBasicConfig = {
  uploadImage: ConfigOption;
  inputValue?: ConfigOption;
  creativityValue?: ConfigOption;
  promptKeywords?: ConfigOption | { positive?: ConfigOption; negative?: ConfigOption } | any;
  selectSizeImage?: ConfigOption;
  season?: ConfigOption;
  seed?: {
    useRandomSeed: ConfigOption;
    enterSeedValue?: ConfigOption;
  };
  setting?: {
    export: ConfigOption;
    import: ConfigOption;
  };
  generate: ConfigOption;
};

export type InspirationConfig = {
  lineDrawingToImage: {
    isActive: boolean;
    config?: FeatureConfig;
  };
  textToImage: {
    isActive: boolean;
    config?: FeatureConfig;
  };
  imageUpscaling: {
    isActive: boolean;
    config?: FeatureConfig;
  };
  imageToImage: {
    isActive: boolean;
    config?: ImageToImageFeatureConfig;
  };
};

export type IEditorConfigResponse = {
  inspiration: InspirationConfig | null;
};

