import React, { useEffect, useState } from 'react';
import { Flex, Text } from '@chakra-ui/react';
import Select from 'react-select';
import ThemedSelect from './ThemedSelect';
import { OptionType, SUBSCRIPTION_TYPE_ENUM } from '../types';
import ToolWrapper from './ToolWrapper';
import { useTranslation } from 'react-i18next';


interface SelectImageSizeProps {
  position?: number;
  options: OptionType[];
  title?: string;
  onSizeChange?: (option: OptionType | null) => void;
  subscriptionType: SUBSCRIPTION_TYPE_ENUM;
  name?: string;
  value?: OptionType;
}


const SelectImageSize: React.FC<SelectImageSizeProps> = ({
  position,
  options,
  onSizeChange,
  subscriptionType = SUBSCRIPTION_TYPE_ENUM.BASIC,
  title = 'Select Ratio',
  name = 'Ratio',
  value
}) => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null);

  useEffect(() => {
    if (value) {
      setSelectedOption(value);
    }
  }, [value]);

  const handleSelectChange = (option: OptionType | null) => {
    setSelectedOption(option);

    if (onSizeChange) {
      onSizeChange(option);
    }
  };

  return (
    <ToolWrapper position={position} title={title}>
      <Flex direction="column">
        <Flex flexDirection={'column'} gap={2}>
          <Flex gap={12} className="justify-between">
            <Text mr={2} className="dark:text-white">
              {t(`generate:${name.toLowerCase().replace(/ /g, '_')}`)}
            </Text>
            <ThemedSelect
              placeholder={t('generate:please_select')}
              value={selectedOption}
              onChange={handleSelectChange}
              options={options}
              isClearable={false}
              classNamePrefix="react-select"
              menuPortalTarget={document.body} // Ensures portal to body
            />
          </Flex>
        </Flex>
      </Flex>
    </ToolWrapper>
  );
};

export default SelectImageSize;

