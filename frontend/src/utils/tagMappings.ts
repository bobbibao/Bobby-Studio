// Import images for creation types
import ExteriorType from '@/assets/img/ai-design/ExteriorType.jpg';
import InteriorType from '@/assets/img/ai-design/InteriorType.jpg';

// Import images for input types
import LineDrawing from '@/assets/img/generate-tab/LineDrawing.webp';
import ThreeDModel from '@/assets/img/generate-tab/3DModel.webp';
import TextPrompt from '@/assets/img/generate-tab/TextPrompt.jpg';
import ReferenceImage from '@/assets/img/generate-tab/ReferenceImage.jpg';

// Import images for styles
import ModernStyle from '@/assets/img/generate-styles/ModernStyle.jpg';
import ChaletStyle from '@/assets/img/generate-styles/ChaletStyle.jpg';
import ApartmentStyle from '@/assets/img/generate-styles/ApartmentStyle.jpg';
import WoodStyle from '@/assets/img/generate-styles/WoodStyle.jpg';
import CreativeStyle from '@/assets/img/generate-styles/CreativeStyle.jpg';
import TropicalVilStyle from '@/assets/img/generate-styles/TropicalVilStyle.jpg';
import DarkFaStyle from '@/assets/img/generate-styles/DarkFaStyle.jpg';
import TropicalTowStyle from '@/assets/img/generate-styles/TropicalTowStyle.jpg';

export interface TagInfo {
  label: string;
  image: string;
}

// Creation Type Mappings
export const creationTypeMap: Record<string, TagInfo> = {
  exterior: {
    label: 'exterior',
    image: ExteriorType,
  },
  interior: {
    label: 'interior',
    image: InteriorType,
  },
};

// Input Type Mappings
export const inputTypeMap: Record<string, TagInfo> = {
  'line-drawing': {
    label: 'line_drawing',
    image: LineDrawing,
  },
  'text-prompt': {
    label: 'text-prompt',
    image: TextPrompt,
  },
  reference: {
    label: 'reference',
    image: ReferenceImage,
  },
  '3d-model': {
    label: '3d-model',
    image: ThreeDModel,
  },
};

// Style Mappings
export const styleMap: Record<string, TagInfo> = {
  modern: {
    label: 'modern',
    image: ModernStyle,
  },
  chalet: {
    label: 'chalet',
    image: ChaletStyle,
  },
  apartment: {
    label: 'apartment',
    image: ApartmentStyle,
  },
  'dark-fa': {
    label: 'dark-fa',
    image: DarkFaStyle,
  },
  wood: {
    label: 'wood',
    image: WoodStyle,
  },
  creative: {
    label: 'creative',
    image: CreativeStyle,
  },
  tropical: {
    label: 'tropical',
    image: TropicalVilStyle,
  },
  'tropical-tow': {
    label: 'tropical-tow',
    image: TropicalTowStyle,
  },
};

// Helper functions to get tag info
export const getCreationTypeTag = (creationType?: string): TagInfo => {
  if (!creationType) {
    return { label: 'None', image: ExteriorType };
  }
  return creationTypeMap[creationType] || { label: creationType, image: ExteriorType };
};

export const getInputTypeTag = (inputType?: string): TagInfo => {
  if (!inputType) {
    return { label: 'None', image: TextPrompt };
  }
  return inputTypeMap[inputType] || { label: inputType, image: TextPrompt };
};

export const getStyleTag = (style?: string): TagInfo => {
  if (!style) {
    return { label: '', image: '' };
  }
  return styleMap[style] || { label: style, image: ModernStyle };
};

