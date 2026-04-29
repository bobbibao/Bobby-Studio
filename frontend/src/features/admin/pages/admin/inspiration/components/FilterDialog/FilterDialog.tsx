import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Checkbox, Flex, Heading, VStack, Divider, Text } from '@chakra-ui/react';
import { FilterState } from '@/types/filterDropdown';
import { GenerateInputTypeEnum, GenerateInputTypeToTextMap } from '@/constants/attribute-enum';
import { FilterButton } from '@/components/FilterButton';

interface FilterModalProps {
  onApplyFilter?: (filters: FilterState) => void;
  onResetFilters?: () => void;
  onCancel?: () => void;
  initialFilters?: Partial<FilterState>;
  filterFields?: string[];
  typeOptions?: string[];
}

const FilterModal: React.FC<FilterModalProps> = ({
  onApplyFilter,
  onResetFilters,
  onCancel,
  initialFilters = {},
  filterFields = ['models', 'type', 'time'],
  typeOptions = ['exterior', 'interior'],
}) => {
  const { t } = useTranslation();
  const translatorCommonNS = (key: string) => t(`common:${key}`);

  const [selectedName, setSelectedName] = useState<string>(initialFilters.name || '');
  const [selectedModels, setSelectedModels] = useState<string[]>(initialFilters.models || []);
  const [selectedType, setSelectedType] = useState<string>(initialFilters.type || '');
  const [selectedTime, setSelectedTime] = useState<string>(initialFilters.time || '');
  const modalRef = useRef<HTMLDivElement | null>(null);

  const handleNameChange = (name: string): void => {
    setSelectedName(name === selectedName ? '' : name);
  };

  const handleModelChange = (model: string): void => {
    setSelectedModels((prev) => (prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]));
  };

  const handleTypeChange = (type: string): void => {
    setSelectedType(type === selectedType ? '' : type);
  };

  const handleTimeChange = (time: string): void => {
    setSelectedTime(time === selectedTime ? '' : time);
  };

  const handleCancel = useCallback((): void => {
    setSelectedName('');
    setSelectedModels([]);
    setSelectedType('');
    setSelectedTime('');
    onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleCancel]);

  const handleApplyFilter = (): void => {
    const filters: FilterState = {
      name: selectedName,
      models: selectedModels,
      type: selectedType,
      time: selectedTime,
    };
    onApplyFilter?.(filters);
  };

  // Helper to render selection buttons
  const FilterOptionButton = ({ 
    label, 
    isSelected, 
    onClick 
  }: { 
    label: string; 
    isSelected: boolean; 
    onClick: () => void;
  }) => {
    return (
      <FilterButton
        label={label}
        isActive={isSelected}
        onClick={onClick}
        justifyContent="space-between"
        rightIcon={
          <Checkbox 
            isChecked={isSelected} 
            isReadOnly 
            colorScheme="brand" 
            size="sm" 
            sx={{ 
               // Prevent checkbox from capturing click events so the button handles it
               pointerEvents: 'none' 
            }} 
          />
        }
      />
    );
  };

  return (
    <Box 
      ref={modalRef}
      bg="zinc.950" 
      _light={{ bg: "bg.surface" }}
      rounded="lg" 
      shadow="xl" 
      w="450px" 
      borderWidth="1px" 
      borderColor="border.default"
    >
      <Box p={4}>
        <Flex justify="space-between" align="center" mb={2}>
          <Heading size="md" color="text.primary">
            {translatorCommonNS('filter')}
          </Heading>
          <Button
            variant="ghost"
            size="sm"
            color="text.secondary"
            onClick={() => {
              setSelectedName('');
              setSelectedModels([]);
              setSelectedType('');
              setSelectedTime('');
              onResetFilters?.();
            }}
          >
            {translatorCommonNS('reset_filters')}
          </Button>
        </Flex>

        <Divider mb={4} borderColor="border.subtle" />

        <VStack align="stretch" spacing={4}>
        {/* Name Section */}
        {filterFields.includes('name') && (
            <Box>
              <Text fontWeight="bold" mb={2} color="text.secondary" fontSize="sm">
                {translatorCommonNS('name')}
              </Text>
              <Flex gap={2} flexWrap="wrap">
              {(['desc', 'asc'] as const).map((name) => (
                  <FilterOptionButton
                  key={name}
                    label={translatorCommonNS(name.toLowerCase())}
                    isSelected={selectedName === name}
                  onClick={() => handleNameChange(name)}
                  />
                ))}
              </Flex>
            </Box>
        )}

        {/* Model Section */}
        {filterFields.includes('models') && (
            <Box>
              <Text fontWeight="bold" mb={2} color="text.secondary" fontSize="sm">
                {translatorCommonNS('model')}
              </Text>
              <Flex gap={2} flexWrap="wrap">
              {Object.values(GenerateInputTypeEnum).map((inputType: string) => (
                  <FilterOptionButton
                  key={inputType}
                    label={t(`generate:${GenerateInputTypeToTextMap.get(inputType as GenerateInputTypeEnum)}`)}
                    isSelected={selectedModels.includes(inputType)}
                  onClick={() => handleModelChange(inputType)}
                  />
                ))}
              </Flex>
            </Box>
        )}

        {/* Type Section */}
        {filterFields.includes('type') && typeOptions.length > 0 && (
            <Box>
              <Text fontWeight="bold" mb={2} color="text.secondary" fontSize="sm">
                {translatorCommonNS('type')}
              </Text>
              <Flex gap={2} flexWrap="wrap">
              {typeOptions.map((type) => {
                const label = translatorCommonNS(type.toLowerCase());
                const displayLabel = label
                  ? label.charAt(0).toUpperCase() + label.slice(1)
                  : type.charAt(0).toUpperCase() + type.slice(1);
                return (
                  <FilterOptionButton
                    key={type}
                    label={displayLabel}
                    isSelected={selectedType === type}
                    onClick={() => handleTypeChange(type)}
                  />
                );
              })}
              </Flex>
            </Box>
        )}

        {/* Time Section */}
        {filterFields.includes('time') && (
            <Box>
              <Text fontWeight="bold" mb={2} color="text.secondary" fontSize="sm">
                {translatorCommonNS('time')}
              </Text>
              <Flex gap={2} flexWrap="wrap">
              {(['newest', 'oldest'] as const).map((time) => (
                  <FilterOptionButton
                  key={time}
                    label={translatorCommonNS(time.toLowerCase())}
                    isSelected={selectedTime === time}
                  onClick={() => handleTimeChange(time)}
                  />
                ))}
              </Flex>
            </Box>
          )}
        </VStack>

        <Divider my={4} borderColor="border.subtle" />

        {/* Action Buttons */}
        <Flex gap={3}>
          <Button
            flex={1}
            onClick={handleCancel}
            variant="outline"
            borderColor="border.default"
            color="text.muted"
            _hover={{ bg: 'bg.subtle' }}
            h="10"
            fontSize="sm"
            fontWeight="semibold"
            borderRadius="lg"
            px={3}
            py={2}
          >
            {translatorCommonNS('cancel')}
          </Button>
          <Button
            flex={1}
            onClick={handleApplyFilter}
            variant="primary" // Uses the brand color from theme
            h="10"
            fontSize="sm"
            fontWeight="semibold"
            borderRadius="lg"
            px={3}
            py={2}
          >
            {translatorCommonNS('apply_filter')}
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default FilterModal;



