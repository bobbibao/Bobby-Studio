import { getGenerationTypeStyles } from '@/utils/generationTypeStyles';
import { Badge } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface BadgeGenerationTypeProps {
  generationType: string;
}

export const BadgeGenerationType = ({ generationType }: BadgeGenerationTypeProps) => {
  const { title, textColor, backgroundColor } = getGenerationTypeStyles(generationType);
  const { t } = useTranslation();

  return (
    <Badge bg={backgroundColor} color={textColor} className="!capitalize text-base !px-3 !rounded-lg !font-medium w-auto">
      {t(title)}
    </Badge>
  );
};

