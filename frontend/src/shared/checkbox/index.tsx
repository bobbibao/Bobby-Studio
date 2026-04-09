import React from 'react';
import './checkboxStyle.css';
import { useColorMode } from '@chakra-ui/react';
import { classNames } from '@/utils';

interface CheckboxCustomProps {
  id?: string;
  label?: string;
  disabled?: boolean;
  checked?: boolean;
  type?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CheckboxCustom: React.FC<CheckboxCustomProps> = ({
  id,
  label = ' ',
  disabled = false,
  checked = false,
  type = 'checkbox',
  onChange,
  ...props
}) => {
  const { colorMode } = useColorMode();

  return (
    <div
      className={classNames(
        "checkbox-container flex items-center",
        colorMode === 'dark' ? 'checkbox-container-dark' : ''
      )}
    >
      <input type={type} id={id} disabled={disabled} checked={checked} onChange={onChange} {...props} />
      {label && <label htmlFor={id}>{label}</label>}
    </div>
  );
};

type CheckboxTableProps = {
  id?: string;
  label?: string;
  disabled?: boolean;
  checked?: boolean;
  indeterminate?: boolean;
  type?: string;
  className?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const CheckboxTable: React.FC<CheckboxTableProps> = ({
  id,
  label = ' ',
  disabled = false,
  checked = false,
  indeterminate = false,
  type = 'checkbox',
  className = '',
  onChange,
}) => {
  const checkboxRef = React.useRef<HTMLInputElement>(null);
  const { colorMode } = useColorMode();

  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <div
      className={classNames(
        'checkbox-container checkbox-table',
        colorMode === 'dark' ? 'checkbox-container-dark' : '',
        indeterminate ? 'indeterminate' : '',
        className
      )}
    >
      <input ref={checkboxRef} type={type} id={id} disabled={disabled} checked={checked} onChange={onChange} />
      {label && <label htmlFor={id}>{label}</label>}
    </div>
  );
};

