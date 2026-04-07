import React from 'react';
import { Tooltip, Icon, PlacementWithLogical } from '@chakra-ui/react';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';

interface TooltipWrapperProps {
  translationKey: string;
  placement?: PlacementWithLogical;
  iconSize?: number | string;
  iconColor?: string;
  darkIconColor?: string;
  ariaLabel?: string;
}

/**
 * TooltipWrapper component wraps the question mark icon with a Chakra UI tooltip
 * Provides consistent styling and behavior across the application
 *
 * @param translationKey - The i18n translation key from tooltips namespace
 * @param placement - Position of the tooltip relative to the icon (default: 'top')
 * @param iconSize - Size of the question mark icon (default: 5)
 * @param iconColor - Color of the icon in light mode (default: 'black')
 * @param darkIconColor - Color of the icon in dark mode (default: 'white')
 * @param ariaLabel - Accessibility label for the icon
 */
const TooltipWrapper: React.FC<TooltipWrapperProps> = ({
  translationKey,
  placement = 'top',
  iconSize = 5,
  iconColor = 'black',
  darkIconColor = 'white',
  ariaLabel = 'Help information',
}) => {
  const { t } = useTranslation('tooltips');

  return (
    <Tooltip
      label={t(translationKey)}
      placement={placement}
      fontSize="sm"
      maxW="300px"
      whiteSpace="pre-line"
    >
      <Icon
        as={QuestionOutlineIcon}
        w={iconSize}
        h={iconSize}
        color={iconColor}
        _dark={{ color: darkIconColor }}
        cursor="help"
        aria-label={ariaLabel}
      />
    </Tooltip>
  );
};

export default TooltipWrapper;

