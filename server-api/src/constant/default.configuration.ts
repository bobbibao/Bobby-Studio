import { ConfigurationDto } from '../modules/attribute/dto/configuration.dto';

const basicPromptKeywords = [
  'Vivid colors',
  'High detail',
  'Realistic',
  'Minimalist',
  'Elegant',
  'Dreamy',
  'Futuristic',
  'Clean lines',
  'Bright lighting',
  'Organic shapes',
  'Blurry',
  'Overexposed',
  'Noisy',
  'Low resolution',
  'Dark lighting',
  'Crowded',
  'Flat colors',
  'Harsh lines',
  'Distorted',
  'Unnatural',
];
const proPromptKeywords = {
  positive: [
    'Vivid colors',
    'High detail',
    'Realistic',
    'Minimalist',
    'Elegant',
    'Dreamy',
    'Futuristic',
    'Clean lines',
    'Bright lighting',
    'Unique',
    'Blurry',
    'Overexposed',
    'Noisy',
    'Low resolution',
    'Playful',
    'Invigorating',
    'Flat colors',
    'Tranquil',
    'Distorted',
    'Timeless',
  ],
  negative: [
    'Overcomplicated',
    'Muted',
    'Pixelated',
    'Uneven',
    'Chaotic',
    'Tired',
    'Inconsistent',
    'Unrefined',
    'Bright lighting',
    'Unique',
    'Blurry',
    'Overexposed',
    'Noisy',
    'Low resolution',
    'Playful',
    'Invigorating',
    'Flat colors',
    'Tranquil',
    'Distorted',
    'Timeless',
  ],
};
const imageSize = [
  '820x312', // Facebook cover
  '1024x768',
  '1080x1080', // Instagram
  '1280x720', // 720p
  '1920x1080', // 1080p
  '3840x2160', // 4K
];
const factorOfUpScale = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
const inputValue: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const creativitySlider: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const seasonValues: string[] = ['Summer', 'Winter'];
export const defaultConfiguration: ConfigurationDto = {
  inspiration: {
    lineDrawingToImage: {
      isActive: true,
      config: {
        basic: {
          uploadImage: {
            isActive: true,
            value: true,
          },
          inputValue: {
            isActive: true,
            value: inputValue,
          },
          promptKeywords: {
            isActive: true,
            value: basicPromptKeywords,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: false,
            },
          },
          generate: {
            isActive: true,
          },
        },
        pro: {
          uploadImage: {
            isActive: true,
            value: true,
          },
          inputValue: {
            isActive: true,
            value: inputValue,
          },
          promptKeywords: {
            positive: {
              isActive: true,
              value: proPromptKeywords.positive,
            },
            negative: {
              isActive: true,
              value: proPromptKeywords.negative,
            },
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
          },
          generate: {
            isActive: true,
          },
        },
      },
    },
    textToImage: {
      isActive: true,
      config: {
        basic: {
          selectSizeImage: {
            isActive: true,
            value: imageSize,
          },
          promptKeywords: {
            isActive: true,
            value: basicPromptKeywords,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
        pro: {
          selectSizeImage: {
            isActive: true,
            value: imageSize,
          },
          promptKeywords: {
            positive: {
              isActive: true,
              value: proPromptKeywords.positive,
            },
            negative: {
              isActive: true,
              value: proPromptKeywords.negative,
            },
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
      },
    },
    imageUpscaling: {
      isActive: true,
      config: {
        basic: {
          uploadImage: {
            isActive: true,
          },
          factorOfUpScale: {
            isActive: true,
            value: factorOfUpScale,
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
        pro: {
          uploadImage: {
            isActive: true,
          },
          factorOfUpScale: {
            isActive: true,
            value: factorOfUpScale,
          },
          creativitySlider: {
            isActive: true,
            value: creativitySlider,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
      },
    },
    imageToImage: {
      isActive: true,
      config: {
        basic: {
          uploadImage: {
            isActive: true,
          },
          season: {
            isActive: true,
            value: seasonValues,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
        pro: {
          uploadImage: {
            isActive: true,
          },
          season: {
            isActive: true,
            value: seasonValues,
          },
          inputValue: {
            isActive: true,
            value: inputValue,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
      },
    },
  },
  isPublishMethod: false,
  isDeleteMethod: false,
};

export const defaultAdminConfiguration: ConfigurationDto = {
  inspiration: {
    lineDrawingToImage: {
      isActive: true,
      config: {
        basic: {
          uploadImage: {
            isActive: true,
            value: true,
          },
          inputValue: {
            isActive: true,
            value: inputValue,
          },
          promptKeywords: {
            isActive: true,
            value: basicPromptKeywords,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: false,
            },
          },
          generate: {
            isActive: true,
          },
        },
        pro: {
          uploadImage: {
            isActive: true,
            value: true,
          },
          inputValue: {
            isActive: true,
            value: inputValue,
          },
          promptKeywords: {
            positive: {
              isActive: true,
              value: proPromptKeywords.positive,
            },
            negative: {
              isActive: true,
              value: proPromptKeywords.negative,
            },
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
          },
          generate: {
            isActive: true,
          },
        },
      },
    },
    textToImage: {
      isActive: true,
      config: {
        basic: {
          selectSizeImage: {
            isActive: true,
            value: imageSize,
          },
          promptKeywords: {
            isActive: true,
            value: basicPromptKeywords,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
        pro: {
          selectSizeImage: {
            isActive: true,
            value: imageSize,
          },
          promptKeywords: {
            positive: {
              isActive: true,
              value: proPromptKeywords.positive,
            },
            negative: {
              isActive: true,
              value: proPromptKeywords.negative,
            },
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
      },
    },
    imageUpscaling: {
      isActive: true,
      config: {
        basic: {
          uploadImage: {
            isActive: true,
          },
          factorOfUpScale: {
            isActive: true,
            value: factorOfUpScale,
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
        pro: {
          uploadImage: {
            isActive: true,
          },
          factorOfUpScale: {
            isActive: true,
            value: factorOfUpScale,
          },
          creativitySlider: {
            isActive: true,
            value: creativitySlider,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
      },
    },
    imageToImage: {
      isActive: true,
      config: {
        basic: {
          uploadImage: {
            isActive: true,
          },
          season: {
            isActive: true,
            value: seasonValues,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
        pro: {
          uploadImage: {
            isActive: true,
          },
          season: {
            isActive: true,
            value: seasonValues,
          },
          inputValue: {
            isActive: true,
            value: inputValue,
          },
          seed: {
            useRandomSeed: {
              isActive: true,
              value: false,
            },
            enterSeedValue: {
              isActive: true,
              value: '',
            },
          },
          setting: {
            export: {
              isActive: true,
            },
            import: {
              isActive: true,
            },
          },
          generate: {
            isActive: true,
          },
        },
      },
    },
  },
  isPublishMethod: true,
  isDeleteMethod: true,
};
