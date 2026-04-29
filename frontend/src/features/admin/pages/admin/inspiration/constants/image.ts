import { ImageSize } from '@/types/image';

export const getAllImageSizes = (): string[] => {
  return Object.values(ImageSize);
};

export const findLoraOrDefault = (valueToFind: string) => {
  // Find the first match
  const matchedLora = LORAS.find((lora) => lora.value === valueToFind);

  // Return the match if found, otherwise return LORAS[0]
  return matchedLora || LORAS[0];
};
export const getImageSizeLabelByType = (type: keyof typeof ImageSize): string | undefined => {
  return ImageSize[type];
};

export const LORAS = [
  { value: 'bobby_v1.safetensors', label: 'Bobby v1' },
  { value: 'bobby_v2.safetensors', label: 'Bobby v2' },
  { value: 'bobby_v3.safetensors', label: 'Bobby v3' },
];

export const MODELS = [
  { value: '4x-UltraSharp.pth', label: '4x-UltraSharp.pth' },
  { value: '4x_NMKD-Siax_200k.pth', label: '4x_NMKD-Siax_200k.pth' },
  { value: 'RealESRGAN_x4.pth', label: 'RealESRGAN_x4.pth' },
  { value: 'spsr.pth', label: 'spsr.pth' },
];

export const DEFAULT_TEMPLATE_GENERATE = 'text-2-image';
export const DEFAULT_INPUT_VALUE = 0.5;
export const DEFAULT_STYLE_VALUE = 0.5;
export const DEFAULT_CREATIVITY_VALUE = 1;



