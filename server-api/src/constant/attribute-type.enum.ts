export enum AttributeTypeEnum {
  ORIGINAL_IMAGE = 'Original_Image',
  GENERATED_IMAGE = 'Generated_Image',
  GENERATED_VIDEO = 'Generated_Video',
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

export const InspirationMethodURL: ReadonlyMap<InspirationMethodEnum, string> =
  new Map([
    [InspirationMethodEnum.BASIC_TEXT_TO_IMAGE, 'basic/text-to-image'],
    [InspirationMethodEnum.PRO_TEXT_TO_IMAGE, 'pro/text-to-image'],
    [
      InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE,
      'basic/line-drawing-to-image',
    ],
    [
      InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE,
      'pro/line-drawing-to-image',
    ],
    [InspirationMethodEnum.BASIC_IMAGE_UPSCALING, 'basic/image-upscaling'],
    [InspirationMethodEnum.PRO_IMAGE_UPSCALING, 'pro/image-upscaling'],
    [InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE, 'basic/image-to-image'],
    [InspirationMethodEnum.PRO_IMAGE_TO_IMAGE, 'pro/image-to-image'],
  ]);

export const InspirationToActionMethodMap: ReadonlyMap<
  InspirationMethodEnum,
  ActionMethodEnum
> = new Map([
  [InspirationMethodEnum.BASIC_TEXT_TO_IMAGE, ActionMethodEnum.TEXT_TO_IMAGE],
  [InspirationMethodEnum.PRO_TEXT_TO_IMAGE, ActionMethodEnum.TEXT_TO_IMAGE],

  [
    InspirationMethodEnum.BASIC_LINE_DRAWING_TO_IMAGE,
    ActionMethodEnum.LINE_DRAWING_TO_IMAGE,
  ],
  [
    InspirationMethodEnum.PRO_LINE_DRAWING_TO_IMAGE,
    ActionMethodEnum.LINE_DRAWING_TO_IMAGE,
  ],

  [
    InspirationMethodEnum.BASIC_IMAGE_UPSCALING,
    ActionMethodEnum.IMAGE_UPSCALING,
  ],
  [InspirationMethodEnum.PRO_IMAGE_UPSCALING, ActionMethodEnum.IMAGE_UPSCALING],

  [InspirationMethodEnum.BASIC_IMAGE_TO_IMAGE, ActionMethodEnum.IMAGE_TO_IMAGE],
  [InspirationMethodEnum.PRO_IMAGE_TO_IMAGE, ActionMethodEnum.IMAGE_TO_IMAGE],
]);

export enum ActionTypeEnum {
  FAVORITE = 'FAVORITE',
  BOOKMARK = 'BOOKMARK',
  SHARE = 'SHARE',
}

export enum InputTypeEnum {
  LINE_DRAWING = 'line-drawing',
  TEXT_PROMPT = 'text-prompt',
  REFERENCE = 'reference',
  MODEL_3D = '3d-model',
}

export enum CreationTypeEnum {
  EXTERIOR = 'exterior',
  INTERIOR = 'interior',
}
