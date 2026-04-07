import { Flex, Radio, RadioGroup, Text } from '@chakra-ui/react';
import React, { useState } from 'react';
import ToolWrapper from './ToolWrapper';

interface SeasonProps {
  position?: number;
  options: string[];
  onSeasonChange?: (value: string) => void;
}

const Season: React.FC<SeasonProps> = ({
  position,
  options,
  onSeasonChange,
}) => {
  const [selectedSeason, setSelectedSeason] = useState<string>(options[0]);

  const handleSeasonChange = (value: string) => {
    setSelectedSeason(value);
    if (onSeasonChange) {
      onSeasonChange(value);
    }
  };

  return (
    <ToolWrapper position={position} title="Season">
      <RadioGroup value={selectedSeason} onChange={handleSeasonChange}>
        <Flex direction="row" justifyContent="flex-start" gap={4}>
          {options.map((option) => (
            <Radio key={option} value={option} className="dark:text-white">
              <Text className="dark:text-white">{option}</Text>
            </Radio>
          ))}
        </Flex>
      </RadioGroup>
    </ToolWrapper>
  );
};

export default Season;

