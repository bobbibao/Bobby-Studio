// PromptKeywords.tsx
import { Flex, Text, Textarea } from '@chakra-ui/react';
import React, { useState } from 'react';
import { SUBSCRIPTION_TYPE_PRO } from '../constants';
import MultiSelect from '../shared/multi-select';
import { OptionType, SUBSCRIPTION_TYPE_ENUM } from '../types';
import ToolWrapper from './ToolWrapper';
import AutoResizeTextArea from '../shared/fields/AutoResizeTextArea';
import { useTranslation } from 'react-i18next';

interface PromptKeywordsProps {
  position?: number;
  keywordOptions?: OptionType[];
  negativeOptions?: OptionType[];
  positiveOptions?: OptionType[];
  onKeywordsChange?: (value: OptionType[]) => void;
  onPositiveChange?: (value: OptionType[]) => void;
  onNegativeChange?: (value: OptionType[]) => void;
  onPromptChange: (value: string) => void;
  subscriptionType: SUBSCRIPTION_TYPE_ENUM;
  hasLabel?: boolean;
  defaultValue?: string;
}

const PromptKeywords: React.FC<PromptKeywordsProps> = ({
  position,
  keywordOptions,
  negativeOptions,
  positiveOptions,
  onKeywordsChange,
  onPositiveChange,
  onNegativeChange,
  onPromptChange,
  subscriptionType = SUBSCRIPTION_TYPE_ENUM.BASIC,
  hasLabel = true,
  defaultValue,
}) => {
  const { t } = useTranslation();
  const [selectedKeywords, setSelectedKeywords] = useState<OptionType[]>([]);
  const [selectedPositive, setSelectedPositive] = useState<OptionType[]>([]);
  const [selectedNegative, setSelectedNegative] = useState<OptionType[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>(defaultValue || '');

  const handleSelectChange = (value: OptionType[]) => {
    setSelectedKeywords(value || []);

    if (onKeywordsChange) {
      onKeywordsChange(value || []);
    }
  };

  const handlePositiveChange = (value: OptionType[]) => {
    setSelectedPositive(value);

    if (onPositiveChange) {
      onPositiveChange(value);
    }
  };

  const handleNegativeChange = (value: OptionType[]) => {
    setSelectedNegative(value);

    if (onNegativeChange) {
      onNegativeChange(value);
    }
  };
  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    setSelectedPrompt(newValue);
    onPromptChange(newValue);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('Text');
    const newValue = selectedPrompt + pastedText;
    setSelectedPrompt(newValue);
    onPromptChange(newValue);
  };

  return (
    <ToolWrapper position={position} title={t('generate:prompt_keywords')}>
      <Flex direction="column">
        {subscriptionType === SUBSCRIPTION_TYPE_PRO ? (
          <Flex flexDirection="column" gap={2}>
            <Flex gap={4} alignItems="center" justifyContent={'space-between'}>
              {hasLabel && (
                <Text mr={2} className="dark:text-white w-[70px]">
                  {t('generate:positive')}
                </Text>
              )}
              <MultiSelect
                placeholder={t('generate:please_select')}
                options={positiveOptions || []}
                value={selectedPositive}
                onChange={handlePositiveChange}
              />
            </Flex>
            <Flex alignItems="center" gap={4} flex={1} justifyContent={'space-between'}>
              {hasLabel && (
                <Text mr={2} className="dark:text-white w-[70px]" mt={4}>
                  {t('generate:negative')}
                </Text>
              )}
              <MultiSelect
                placeholder={t('generate:please_select')}
                options={negativeOptions || []}
                value={selectedNegative}
                onChange={handleNegativeChange}
              />
            </Flex>
          </Flex>
        ) : (
          <Flex gap={4} flex={1} justifyContent={'space-between'}>
            {hasLabel && (
              <Text mr={2} className="dark:text-white w-[70px]">
                {t('generate:keywords')}
              </Text>
            )}
            <AutoResizeTextArea
              value={selectedPrompt}
              onChange={handlePromptChange}
              onPaste={handlePaste}
              placeholder={t('generate:prompt')}
              size="md"
            />
          </Flex>
        )}
      </Flex>
    </ToolWrapper>
  );
};

export default PromptKeywords;

