export enum AttributeTypeEnum {
  ORIGINAL_IMAGE = 'Original_Image',
  GENERATED_IMAGE = 'Generated_Image',
  PROJECT = 'Project',
  FOLDER = 'Folder',
  CONFIGURATION = 'Configuration',
  PICTURE_PROFILE = 'Picture_Profile',
  PAINTED_IMAGE = 'Painted_Image',
}

export enum ActionMethodEnum {
  TEXT_TO_IMAGE = 'Text to Image',
  LINE_DRAWING_TO_IMAGE = 'Line Drawing to Image',
  IMAGE_UPSCALING = 'Image Upscaling',
  IMAGE_TO_IMAGE = 'Image to Image',
}

export enum InspirationMethodEnum {
  BASIC_TEXT_TO_IMAGE = 'BASIC_TEXT_TO_IMAGE',
  PRO_TEXT_TO_IMAGE = 'PRO_TEXT_TO_IMAGE',

  BASIC_LINE_DRAWING_TO_IMAGE = 'BASIC_LINE_DRAWING_TO_IMAGE',
  PRO_LINE_DRAWING_TO_IMAGE = 'PRO_LINE_DRAWING_TO_IMAGE',

  BASIC_IMAGE_UPSCALING = 'BASIC_IMAGE_UPSCALING',
  PRO_IMAGE_UPSCALING = 'PRO_IMAGE_UPSCALING',

  BASIC_IMAGE_TO_IMAGE = 'BASIC_IMAGE_TO_IMAGE',
  PRO_IMAGE_TO_IMAGE = 'PRO_IMAGE_TO_IMAGE',
}

export enum InPaintingMethodEnum {
  BASIC_INPAINT = 'BASIC_INPAINT',
  PRO_INPAINT = 'PRO_INPAINT',
}

export enum OutPaintingMethodEnum {
  BASIC_OUTPAINT = 'BASIC_OUTPAINT',
  PRO_OUTPAINT = 'PRO_OUTPAINT',
}

export const InspirationMethodURL: ReadonlyMap<InspirationMethodEnum, string> = new Map([
  [InspirationMethodEnum.BASIC_TEXT_TO_IMAGE, 'basic/text-to-image'],
  [InspirationMethodEnum.PRO_TEXT_TO_IMAGE, 'pro/text-to-image'],
  [InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE, 'basic/line-drawing-to-image'],
  [InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE, 'pro/line-drawing-to-image'],
  [InspirationMethodEnum.BASIC_IMAGE_UPSCALING, 'basic/image-upscaling'],
  [InspirationMethodEnum.PRO_IMAGE_UPSCALING, 'pro/image-upscaling'],
  [InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE, 'basic/image-to-image'],
  [InspirationMethodEnum.PRO_IMAGE_TO_IMAGE, 'pro/image-to-image'],
]);

export const InspirationToActionMethodMap: ReadonlyMap<InspirationMethodEnum, ActionMethodEnum> = new Map([
  [InspirationMethodEnum.BASIC_TEXT_TO_IMAGE, ActionMethodEnum.TEXT_TO_IMAGE],
  [InspirationMethodEnum.PRO_TEXT_TO_IMAGE, ActionMethodEnum.TEXT_TO_IMAGE],

  [InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE, ActionMethodEnum.LINE_DRAWING_TO_IMAGE],
  [InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE, ActionMethodEnum.LINE_DRAWING_TO_IMAGE],

  [InspirationMethodEnum.BASIC_IMAGE_UPSCALING, ActionMethodEnum.IMAGE_UPSCALING],
  [InspirationMethodEnum.PRO_IMAGE_UPSCALING, ActionMethodEnum.IMAGE_UPSCALING],

  [InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE, ActionMethodEnum.IMAGE_TO_IMAGE],
  [InspirationMethodEnum.PRO_IMAGE_TO_IMAGE, ActionMethodEnum.IMAGE_TO_IMAGE],
]);

export enum ActionTypeEnum {
  FAVORITE = 'FAVORITE',
  BOOKMARK = 'BOOKMARK',
  SHARE = 'SHARE',
}

export enum CreationTypeEnum {
  EXTERIOR = 'exterior',
  INTERIOR = 'interior',
}

export enum InputTypeEnum {
  LINE_DRAWING = 'line-drawing',
  TEXT_PROMPT = 'text-prompt',
  REFERENCE = 'reference',
  MODEL_3D = '3d-model',
  UPSCALE = 'upscale',
  object_removal = 'object_removal',
  inpainting = 'inpainting',
  extend = 'extend',
  ai_style = 'style_transfer',
}

export enum GenerateInputTypeEnum {
  LINE_DRAWING = 'line-drawing',
  TEXT_PROMPT = 'text-prompt',
  REFERENCE = 'reference',
  MODEL_3D = '3d-model',
}

export enum StyleEnum {
  MODERN = 'modern',
  CHALET = 'chalet',
  APARTMENT = 'apartment',
  DARK_FA = 'dark-fa',
  WOOD = 'wood',
  CREATIVE = 'creative',
  TROPICAL = 'tropical',
  TROPICAL_TOW = 'tropical-tow',
}

export const CreationTypeToTextMap: ReadonlyMap<CreationTypeEnum, string> = new Map([
  [CreationTypeEnum.EXTERIOR, 'exterior'],
  [CreationTypeEnum.INTERIOR, 'interior'],
]);

export const InputTypeToTextMap: ReadonlyMap<InputTypeEnum, string> = new Map([
  [InputTypeEnum.LINE_DRAWING, 'line_drawing'],
  [InputTypeEnum.TEXT_PROMPT, 'text_prompt'],
  [InputTypeEnum.REFERENCE, 'reference'],
  [InputTypeEnum.MODEL_3D, 'model_3d'],
  [InputTypeEnum.UPSCALE, 'upscale'],
  [InputTypeEnum.object_removal, 'object_removal'],
  [InputTypeEnum.inpainting, 'replace'],
  [InputTypeEnum.extend, 'extend'],
  [InputTypeEnum.ai_style, 'ai_style'],
]);

export const GenerateInputTypeToTextMap: ReadonlyMap<GenerateInputTypeEnum, string> = new Map([
  [GenerateInputTypeEnum.LINE_DRAWING, 'line_drawing'],
  [GenerateInputTypeEnum.TEXT_PROMPT, 'text_prompt'],
  [GenerateInputTypeEnum.REFERENCE, 'reference'],
  [GenerateInputTypeEnum.MODEL_3D, 'model_3d'],
]);

export const StyleToTextMap: ReadonlyMap<StyleEnum, string> = new Map([
  [StyleEnum.MODERN, 'modern'],
  [StyleEnum.CHALET, 'chalet'],
  [StyleEnum.APARTMENT, 'apartment_building'],
  [StyleEnum.DARK_FA, 'dark_facade'],
  [StyleEnum.WOOD, 'wood_facade'],
  [StyleEnum.CREATIVE, 'creative'],
  [StyleEnum.TROPICAL, 'tropical_villa'],
  [StyleEnum.TROPICAL_TOW, 'tropical_tower'],
]);

