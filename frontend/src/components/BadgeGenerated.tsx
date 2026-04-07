import { Badge } from '@chakra-ui/react';
import { GENERATION_MODELS } from '@/constants';

type BadgeGeneratedProps = {
  title: string | undefined;
  className?: string;
};
const BadgeGenerated: React.FC<BadgeGeneratedProps> = ({ title, className = '' }) => {
  const getColorPalette = (): string => {
    switch (title) {
      case GENERATION_MODELS.LINE_DRAWING_TO_IMAGE:
        return 'brand';
      case GENERATION_MODELS.TEXT_TO_IMAGE:
        return 'error';
      case GENERATION_MODELS.IMAGE_UPSCALING:
        return 'success';
      case GENERATION_MODELS.SEASONAL_TRANSFORMATION:
        return 'brand';
      default:
        return 'zinc';
    }
  };
  if (!title) return null;
  return <Badge colorScheme={getColorPalette()} w={"fit-content"} className={className}>{title}</Badge>;
};
export default BadgeGenerated;

