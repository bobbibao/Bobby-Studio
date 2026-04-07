import { Flex, Input, Radio, RadioGroup } from '@chakra-ui/react';
import React, { useState } from 'react';
import ToolWrapper from './ToolWrapper';
import { SUBSCRIPTION_TYPE_ENUM } from '../types';
import { useTranslation } from 'react-i18next';

interface SeedProps {
  position?: number;
  subscriptionType: SUBSCRIPTION_TYPE_ENUM;
  onRandomSeed?: (state: boolean) => void;
  onEnterSeed?: (value: number) => void;
  defaultValue?: number
}

const Seed: React.FC<SeedProps> = ({
  position,
  subscriptionType = SUBSCRIPTION_TYPE_ENUM.BASIC,
  onEnterSeed,
  onRandomSeed,
  defaultValue
}) => {
  const { t } = useTranslation();
  const translatorGenerateNS = (key: string) => t(`generate:${key}`);

  const [seedMethod, setSeedMethod] = useState<string>(defaultValue !== null && defaultValue !== undefined ? 'manual' : 'random');

  const [seedValue, setSeedValue] = useState(defaultValue !== null && defaultValue !== undefined ? String(defaultValue) : '-1');

  const handleSeedMethodChange = (value: string) => {
    setSeedMethod(value);

    onRandomSeed?.(value === 'random');

    if (value === 'random') {
      setSeedValue('-1');
    }
  };

  const handleSeedValueChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;

    setSeedValue(value);

    if (onEnterSeed) {
      onEnterSeed(Number(value));
    }
  };

  return (
    <ToolWrapper position={position} title={translatorGenerateNS("seed")}>
      <RadioGroup value={seedMethod} onChange={handleSeedMethodChange}>
        <Flex direction="column">
          <Radio value="random">
            <span className="dark:text-white">{translatorGenerateNS('use_random_seed')}</span>
          </Radio>
          <Flex mt={2} className="justify-between">
            <Radio value="manual">
              <span className="block w-max dark:text-white">
                {translatorGenerateNS('enter_seed_value')}
              </span>
            </Radio>
            <Input
              className="!w-[150px] rounded-lg"
              type="number"
              value={seedMethod === 'manual' ? seedValue : ''}
              onChange={handleSeedValueChange}
              ml={2}
              disabled={seedMethod !== 'manual'}
            />
          </Flex>
        </Flex>
      </RadioGroup>
    </ToolWrapper>
  );
};

export default Seed;

