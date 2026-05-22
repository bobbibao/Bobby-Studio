import { ActionMethodEnum } from './attribute-enum';

export const SUBSCRIPTION_TYPE_BASIC = 'Basic';
export const SUBSCRIPTION_TYPE_PRO = 'Pro';
export const TAB_TYPE_GENERATE = 'Generate';
export const TAB_TYPE_EDIT = 'Edit';

export const TERMS_OF_BASIC_MONTHLY = [
  'Access to core AI design features',
  'Generate up to 5 projects per month',
  'Basic support',
  'Limited design template library',
];

export const TERMS_OF_PRO_MONTHLY = [
  'Unlimited project generation',
  'Full access to the premium design template library',
  'Priority customer support',
  'Collaborative tools for team projects',
  'Early access to new AI features and updates',
];

export const TERMS_OF_BASIC_YEARLY = [
  'Access to core AI design features',
  'Generate up to 5 projects per month',
  'Basic support',
  'Limited design template library',
];

export const TERMS_OF_PRO_YEARLY = [
  'Unlimited project generation',
  'Full access to the premium design template library',
  'Priority customer support',
  'Collaborative tools for team projects',
  'Early access to new AI features and updates',
];

export const VIEW_OPTIONS = {
  GRID: 'Grid View',
  LIST: 'List View',
};

export const INSPIRATION_TABS = {
  ALL: 'All',
  LINE_DRAWING_TO_IMAGE: 'Line Drawing to Image',
  TEXT_TO_IMAGE: 'Text to Image',
  IMAGE_UPSCALING: 'Image Upscaling',
  SEASONAL_TRANSFORMATION: 'Image to Image',
};

export const PROJECT_TREE_ITEM = {
  ALL_PROJECT: 'All project',
  CHILD_PROJECT: 'Child project',
  UNASSIGNED: 'Unassigned',
  UPLOADS: 'Uploads',
  FOLDER: 'Folder',
};

export const GENERATION_MODELS = {
  LINE_DRAWING_TO_IMAGE: 'Line Drawing to Image',
  TEXT_TO_IMAGE: 'Text to Image',
  IMAGE_UPSCALING: 'Image Upscaling',
  SEASONAL_TRANSFORMATION: 'Image to Image',
};

export const OPTIONS_METHOD = (t: (key: string) => string) => [
  { label: t('common:all'), value: 'all' },
  { label: t('common:text_to_image'), value: 'Text to Image' },
  { label: t('common:line_drawing_to_image'), value: 'Line Drawing to Image' },
  { label: t('common:image_upscaling'), value: 'Image Upscaling' },
  { label: t('common:image_to_image'), value: 'Image to Image' },
];

export const OPTIONS_INPUT = (t: (key: string) => string) => [
  { label: t('common:all'), value: 'all' },
  { label: t('generate:text_prompt'), value: 'text-prompt' },
  { label: t('generate:line_drawing'), value: 'line-drawing' },
  { label: t('generate:reference'), value: 'reference' },
  { label: t('generate:model_3d'), value: '3d-model' },
];

export const OPTIONS_SORTS = (t: (key: string) => string) => [
  {
    label: t('common:newest'),
    value: 'newest',
  },
  {
    label: t('common:oldest'),
    value: 'oldest',
  },
];

export const OPTIONS_ORDERS = (t: (key: string) => string) => [
  {
    label: t('common:desc'),
    value: 'desc',
  },
  {
    label: t('common:asc'),
    value: 'asc',
  },
];

export const languageOptions = [
  { value: 'en', label: 'English', shortLabel: 'ENG' },
  { value: 'de', label: 'Deutsch (German)', shortLabel: 'DE' },
  { value: 'vi', label: 'Tiếng Việt (Vietnamese)', shortLabel: 'VI' },
];

