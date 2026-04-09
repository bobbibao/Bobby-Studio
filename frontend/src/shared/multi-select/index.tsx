// MultiSelect.tsx
import React from 'react';
import { MultiValue } from 'react-select';
import { OptionType } from '../../types';
import ThemedSelect from '@/components/ThemedSelect';

interface MultiSelectProps {
  placeholder: string;
  options: OptionType[];
  value: OptionType[];
  onChange: (value: OptionType[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  placeholder,
  options,
  value,
  onChange,
}) => {
  const handleChange = (
    selectedOption: MultiValue<{ value: string; label: string }>
  ) => {
    const selectedValues = selectedOption
      ? selectedOption.map((opt: OptionType) => {
          return {
            value: opt.value,
            label: opt.label,
          };
        })
      : [];

    onChange(selectedValues);
  };

  return (
    <ThemedSelect 
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      options={options}
      isMulti
      isClearable={false}
    />
  );
};

export default MultiSelect;

