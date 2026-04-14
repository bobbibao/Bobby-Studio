import { InputTypeEnum, InputTypeToTextMap } from '@/constants/attribute-enum';
import { colors } from '@/theme/components/colors';

// TODO: Need to change generation types later
export enum GenerationType {
  BASIC_TEXT_TO_IMAGE = 'BASIC_TEXT_TO_IMAGE',
  BASIC_IMAGE_UPSCALING = 'BASIC_IMAGE_UPSCALING',
  BASIC_IMAGE_TO_IMAGE = 'BASIC_IMAGE_TO_IMAGE',
  BASIC_LINE_DRAWING_TO_IMAGE = 'BASIC_LINE_DRAWING_TO_IMAGE',
  TEXT_TO_IMAGE = 'Text to Image',
  IMAGE_UPSCALING = 'Image Upscaling',
  SEASONAL_TRANSFORMATION = 'Image to Image',
  LINE_DRAWING_TO_IMAGE = 'Line Drawing to Image',
  TEXT_PROMPT = InputTypeEnum.TEXT_PROMPT,
  MODEL_3D = InputTypeEnum.MODEL_3D,
  REFERENCE = InputTypeEnum.REFERENCE,
  LINE_DRAWING = InputTypeEnum.LINE_DRAWING,
}

export const GenerationTypeStyles = {
  [GenerationType.BASIC_TEXT_TO_IMAGE]: {
    title: 'Text to Image',
    textColor: colors.error[500],
    backgroundColor: colors.error[50],
  },
  [GenerationType.BASIC_IMAGE_UPSCALING]: {
    title: 'Image Upscaling',
    textColor: colors.success[500],
    backgroundColor: colors.success[50],
  },
  [GenerationType.BASIC_IMAGE_TO_IMAGE]: {
    title: 'Image to Image',
    textColor: colors.brand[600],
    backgroundColor: colors.brand[50],
  },
  [GenerationType.BASIC_LINE_DRAWING_TO_IMAGE]: {
    title: 'Line Drawing to Image',
    textColor: colors.brand[600],
    backgroundColor: colors.brand[50],
  },
  // Keep legacy styles for backward compatibility
  [GenerationType.TEXT_TO_IMAGE]: {
    title: 'Text to Image',
    textColor: colors.error[500],
    backgroundColor: colors.error[50],
  },
  [GenerationType.IMAGE_UPSCALING]: {
    title: 'Image Upscaling',
    textColor: colors.success[500],
    backgroundColor: colors.success[50],
  },
  [GenerationType.SEASONAL_TRANSFORMATION]: {
    title: 'Image to Image',
    textColor: colors.brand[600],
    backgroundColor: colors.brand[50],
  },
  [GenerationType.LINE_DRAWING_TO_IMAGE]: {
    title: 'Line Drawing to Image',
    textColor: colors.brand[600],
    backgroundColor: colors.brand[50],
  },
  // Keep legacy styles for backward compatibility
  [GenerationType.TEXT_PROMPT]: {
    title: `generate:${InputTypeToTextMap.get(InputTypeEnum.TEXT_PROMPT)}`,
    textColor: colors.error[500],
    backgroundColor: colors.error[50],
  },
  [GenerationType.MODEL_3D]: {
    title: `generate:${InputTypeToTextMap.get(InputTypeEnum.MODEL_3D)}`,
    textColor: colors.success[500],
    backgroundColor: colors.success[50],
  },
  [GenerationType.REFERENCE]: {
    title: `generate:${InputTypeToTextMap.get(InputTypeEnum.REFERENCE)}`,
    textColor: colors.brand[600],
    backgroundColor: colors.brand[50],
  },
  [GenerationType.LINE_DRAWING]: {
    title: `generate:${InputTypeToTextMap.get(InputTypeEnum.LINE_DRAWING)}`,
    textColor: colors.brand[600],
    backgroundColor: colors.brand[50],
  },
};

export const getGenerationTypeStyles = (type: string) => {
  return (
    GenerationTypeStyles[type as GenerationType] || {
      title: 'common:unknown',
      textColor: colors.zinc[900], // Default text
      backgroundColor: colors.zinc[100], // Default bg
    }
  );
};

