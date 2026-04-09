import React from 'react';
import { SingleValue } from 'react-select';
import { OptionType } from '../../types';
import ThemedSelect from '@/components/ThemedSelect';

interface SelectProps {
  className?: string;
  placeholder: string;
  options: OptionType[];
  value?: OptionType | null;
  onChange: (value: OptionType) => void;
}

const SingleSelect: React.FC<SelectProps> = ({
  placeholder,
  options,
  value,
  className,
  onChange,
}) => {
  const handleChange = (
    value: SingleValue<{ value: string; label: string }>
  ) => {
    onChange(value as OptionType);
  };

  return (
    <ThemedSelect
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      options={options}
    />
  );
};

export default SingleSelect;

