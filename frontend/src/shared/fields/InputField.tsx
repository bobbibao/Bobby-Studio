import React from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
} from '@chakra-ui/react';

interface InputFieldProps {
  label: string;
  id: string;
  extra?: string;
  type: string;
  placeholder: string;
  state?: 'error' | 'success';
  disabled?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  id,
  extra,
  type,
  placeholder,
  state,
  disabled,
  value,
  onChange,
}) => {
  return (
    <FormControl
      className={extra}
      isInvalid={state === 'error'}
      isDisabled={disabled}
    >
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <Input
        type={type}
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        borderColor={state === 'error' ? 'red.500' : 'gray.200'}
        focusBorderColor={state === 'success' ? 'green.500' : 'zinc.600'}
        _placeholder={{
          color: state === 'error' ? 'red.500' : 'gray.400',
        }}
      />
      {state === 'error' && (
        <FormErrorMessage>Please enter a valid value.</FormErrorMessage>
      )}
    </FormControl>
  );
};

export default InputField;

