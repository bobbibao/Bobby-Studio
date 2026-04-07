import React, { useMemo, useState } from 'react';
import { Box, Badge, Flex, Text, Switch, Icon, useColorModeValue, useToken, Tooltip, Button } from '@chakra-ui/react';
import { LockIcon, QuestionOutlineIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';
import { GENERATION_MODELS, DEFAULT_GENERATION_MODEL_PRO } from '@/constants/models';
import TooltipWrapper from './TooltipWrapper';
import { GENERATION_TOOLTIPS } from '@/constants/tooltips';

interface Model {
  id: string;
  label: string;
}

interface ModeToggleBarProps {
  isProMode?: boolean;
  onProModeToggle?: (isEnabled: boolean) => void;
  availableModels?: Model[];
  selectedModels?: string[];
  onModelsChange?: (models: string[]) => void;
  restrictedModelIds?: string[];
  restrictionTooltip?: string;
  onUpgradeClick?: () => void;
}

const CARD_RADIUS = '6px';

const ModeToggleBar: React.FC<ModeToggleBarProps> = ({
  isProMode = false,
  onProModeToggle,
  availableModels = GENERATION_MODELS,
  selectedModels = [],
  onModelsChange,
  restrictedModelIds = [],
  restrictionTooltip,
  onUpgradeClick,
}) => {
  const { t } = useTranslation();
  const [proEnabled, setProEnabled] = useState(isProMode);
  const selectableModels = useMemo(
    () => availableModels,
    [availableModels]
  );

  const handleProToggle = (isEnabled: boolean) => {
    setProEnabled(isEnabled);
    onProModeToggle?.(isEnabled);

    // If turning off PRO mode, clear selected models
    if (!isEnabled) {
      onModelsChange?.([]);
    }
  };

  const handleModelToggle = (modelId: string) => {
    if (modelId === 'all') {
      // Toggle all models
      if (selectedModels.length === selectableModels.length) {
        onModelsChange?.([]);
      } else {
        onModelsChange?.(selectableModels.map((m) => m.id));
      }
    } else {
      // Toggle individual model
      const isSelected = selectedModels.includes(modelId);
      if (isSelected) {
        onModelsChange?.(selectedModels.filter((id) => id !== modelId));
      } else {
        onModelsChange?.([...selectedModels, modelId]);
      }
    }
  };

  const isAllSelected =
    selectableModels.length > 0 &&
    selectableModels.every((model) => selectedModels.includes(model.id));

  // Chakra color values
  const containerBg = useColorModeValue('zinc.150', 'zinc.800');
  const iconColor = useColorModeValue('zinc.900', 'white');
  const modeTextColor = useColorModeValue('zinc.900', 'white');
  const proTextColor = useColorModeValue('zinc.900', 'zinc.400');
  const modelSelectorBg = useColorModeValue('white', 'zinc.950');
  const modelTextColor = useColorModeValue('zinc.900', 'zinc.400');
  const questionIconColor = useColorModeValue('zinc.900', 'white');
  const [switchCheckedBgLight, switchCheckedBgDark] = useToken('colors', ['zinc.900', 'zinc.100']);
  const switchCheckedBg = useColorModeValue(switchCheckedBgLight, switchCheckedBgDark);

  return (
    <Flex
      w="full"
      bg={containerBg}
      borderRadius={CARD_RADIUS}
      px={4}
      py={4}
      direction="column"
      gap={4}
    >
      {/* Mode Toggle Bar Header */}
      <Flex w="full" align="center" justify="space-between">
        <Flex align="center" gap={3}>
          {/* Grid Icon */}
          <Box color={iconColor}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect x="2" y="2" width="6" height="6" rx="1" />
              <rect x="12" y="2" width="6" height="6" rx="1" />
              <rect x="2" y="12" width="6" height="6" rx="1" />
              <rect x="12" y="12" width="6" height="6" rx="1" />
            </svg>
          </Box>
          <Text color={modeTextColor} fontSize="sm" fontWeight="semibold">
            {t('generate:mode')}
          </Text>
        </Flex>

        <Flex align="center" gap={3}>
          <Flex align="center" gap={2}>
            <Switch
              size="md"
              isChecked={proEnabled}
              onChange={(e) => handleProToggle(e.target.checked)}
              sx={{
                '& .chakra-switch__track[data-checked]': {
                  bg: `${switchCheckedBg} !important`,
                },
              }}
            />
            <Text color={proTextColor} fontSize="sm" fontWeight="medium">
              {t('generate:pro')}
            </Text>
          </Flex>
          <TooltipWrapper translationKey={GENERATION_TOOLTIPS.PRO_MODE.key} placement={GENERATION_TOOLTIPS.PRO_MODE.placement} />
        </Flex>
      </Flex>

      {/* Model Selector - Only shown when PRO is enabled */}
      {proEnabled && availableModels.length > 0 && (
        <Flex
          w="full"
          bg={modelSelectorBg}
          borderRadius={CARD_RADIUS}
          px={4}
          py={3}
          direction="column"
          gap={3}
        >
          {/* All Models Toggle */}
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={2}>
              <Switch
                size="md"
                isChecked={isAllSelected}
                onChange={() => handleModelToggle('all')}
                isDisabled={selectableModels.length === 0}
                sx={{
                  '& .chakra-switch__track[data-checked]': {
                    bg: `${switchCheckedBg} !important`,
                  },
                }}
              />
              <Text color={modelTextColor} fontSize="sm" fontWeight="medium">
                All
              </Text>
            </Flex>
            <Icon as={QuestionOutlineIcon} w={5} h={5} color={questionIconColor} />
          </Flex>


          {availableModels.map((model) => {
            return (
              <Flex key={model.id} align="center" justify="space-between" >
                <Flex align="center" gap={2}>
                  <Switch
                    size="md"
                    isChecked={selectedModels.includes(model.id)}
                    onChange={() => handleModelToggle(model.id)}
                    sx={{
                      '& .chakra-switch__track[data-checked]': {
                        bg: `${switchCheckedBg} !important`,
                      },
                    }}
                  />

                  <Text color={modelTextColor} fontSize="sm" fontWeight="medium">
                    {model.label}
                  </Text>
                  {model.id === DEFAULT_GENERATION_MODEL_PRO && (
                    <Badge
                      fontSize="2xs"
                      fontWeight="semibold"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      bg={useColorModeValue('zinc.200', 'zinc.700')}
                      color={useColorModeValue('zinc.600', 'zinc.300')}
                    >
                      {t('common:default_badge', { defaultValue: 'Default' })}
                    </Badge>
                  )}
                </Flex>

                <Icon as={QuestionOutlineIcon} w={5} h={5} color={questionIconColor} />
              </Flex>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
};

export default ModeToggleBar;

