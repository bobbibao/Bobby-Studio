import {
  Box,
  Flex,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import ToolWrapper from './ToolWrapper';

interface DynamicSliderProps {
  toolName?: string;
  position?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  longTickValues: number[];
  onValueChange?: (value: number) => void;
}

const DynamicSlider: React.FC<DynamicSliderProps> = ({
  toolName = '',
  position,
  defaultValue = 0,
  min = 0,
  max = 10,
  step = 0.5,
  longTickValues,
  onValueChange,
}) => {
  const [value, setValue] = useState<number>(defaultValue);

  const handleSliderChange = (val: number) => {
    setValue(val);

    if (onValueChange) {
      onValueChange(val);
    }
  };

  const sliderValues = Array.from(
    { length: (max - min) / step + 1 },
    (_, i) => min + i * step
  );

  return (
    <ToolWrapper position={position} title={toolName}>
      <Box>
        <Slider
          aria-label="dynamic-slider"
          defaultValue={value}
          min={min}
          max={max}
          step={step}
          onChange={handleSliderChange}
          colorScheme="primary"
        >
          <SliderTrack height="6px" className="bg-white dark:bg-[#2E2E2E]">
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb boxSize={2.5} bg={'bg-primary'} className="bg-primary" />
        </Slider>
        <Flex justifyContent="space-between">
          {sliderValues.map((val, index) => (
            <Box key={index} textAlign="center">
              <Box
                key={index}
                height={longTickValues.includes(val) ? 3 : 2}
                width="1px"
                className="bg-[#E0E0E0] dark:bg-[#2E2E2E] ms-1"
              />
              {index % 2 === 0 && (
                <Text
                  fontSize="xs"
                  className="text-secondary dark:text-white me-0"
                >
                  {val}
                </Text>
              )}
            </Box>
          ))}
        </Flex>
      </Box>
    </ToolWrapper>
  );
};

export default DynamicSlider;

