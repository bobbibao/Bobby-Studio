import {
  Box,
  IconButton,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from '@chakra-ui/react';
import { FC } from 'react';
import imagePlaceholder from '../../assets/img/layout/image-placeholder.png';
import heart_circle_ic from '../../assets/svg/icons/heart.svg';
import save_circle_ic from '../../assets/svg/icons/bookmark.svg';
import Button from '../buttons/Button';
import ThreeDotIconVertical from '../icons/ThreeDotIconVertical';
import { useTranslation } from 'react-i18next';

interface CardTemplateProps {
  imageSrc: string;
  onUseTemplate?: () => void;
  onLikeTemplate?: () => void;
  onSaveTemplate?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  showOptions?: boolean;
}

const CardTemplate: FC<CardTemplateProps> = ({
  imageSrc,
  onUseTemplate,
  onLikeTemplate,
  onSaveTemplate,
  onMove,
  onDelete,
  showOptions = false,
}) => {
  const { t } = useTranslation();

  return (
    <Box className="relative w-full max-w-[360px]shadow-md rounded-lg overflow-hidden group mb-4">
      {/* Card Image */}
      <Image
        src={imageSrc}
        fallbackSrc={imagePlaceholder}
        alt="Card Image"
        className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />

      {/* Hover Area */}
      <Box className="absolute bottom-0 left-0 w-full h-full opacity-0 group-hover:opacity-100 group-hover:visible transition-opacity duration-300">
        {showOptions && (
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<ThreeDotIconVertical />}
              aria-label="Options"
              position="absolute"
              top="2"
              right="-3"
              zIndex="1"
              variant="unstyled"
            />
            <MenuList>
              <MenuItem onClick={onMove}>{t('common:move')}</MenuItem>
              <MenuItem onClick={onDelete}>{t('common:delete_')}</MenuItem>
            </MenuList>
          </Menu>
        )}

        <Button
          label={t('common:use_template')}
          extraClass="rounded-md absolute !h-[26px]
          bottom-3 left-3 px-2.5 py-1 !text-white text-xs transition backdrop-blur-md"
          onClick={onUseTemplate}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        />

        <Box className="absolute bottom-3 right-3 space-x-1 flex flex-row justify-center items-center">
          <button
            onClick={onLikeTemplate}
            className="flex flex-row justify-center items-center h-[26px] w-[26px] rounded-md transition backdrop-blur-md"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          >
            <img src={heart_circle_ic} alt="heart-circle" className="w-[14px] h-[14px]" />
          </button>
          <button
            onClick={onSaveTemplate}
            className="flex flex-row justify-center items-center h-[26px] w-[26px] rounded-md transition backdrop-blur-md"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          >
            <img src={save_circle_ic} alt="save-circle" className="w-[14px] h-[14px]" />
          </button>
        </Box>
      </Box>
    </Box>
  );
};

export default CardTemplate;

