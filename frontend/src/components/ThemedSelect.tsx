// components/ThemedSelect.tsx
import Select, { StylesConfig } from 'react-select';
import { useColorMode } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

// Define proper TypeScript types
type OptionType = { label: string; value: string };

const getCustomStyles = (isDark: boolean): StylesConfig => ({
  container: (base) => ({
    ...base,
    maxWidth: 'none', // Remove width constraints
    flex: '1 1 0%',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: isDark ? 'rgba(10, 10, 10, 0.8)' : 'rgba(255, 255, 255, 0.8)', // zinc.950/80 or white/80
    backdropFilter: 'blur(12px)', // backdrop-blur-md
    zIndex: 9999,
    boxShadow: isDark
      ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
      : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    borderRadius: '0.75rem', // rounded-xl
    border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #E5E5E5', // whiteAlpha.100 or zinc.200
  }),
  menuList: (base) => ({
    ...base,
    borderWidth: 0,
    padding: '0.5rem',
    borderRadius: '0.75rem',
    backgroundColor: 'transparent', // Transparent because parent menu has the bg/blur
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    cursor: 'pointer',
    backgroundColor: isDark
      ? isSelected
        ? '#FAFAFA' // zinc.50 - light background in dark mode
        : isFocused
        ? 'rgba(250, 250, 250, 0.1)' // zinc.50 with opacity for hover
        : 'transparent'
      : isSelected
      ? '#0A0A0A' // zinc.950 - dark background in light mode
      : isFocused
      ? '#F5F5F5' // zinc.100
      : 'transparent',
    color: isDark
      ? isSelected
        ? '#0A0A0A' // zinc.950 - dark text on light background in dark mode
        : '#FAFAFA' // zinc.50 - light text
      : isSelected
      ? '#FAFAFA' // zinc.50 - light text on dark background in light mode
      : '#171717', // zinc.900 - dark text
    borderRadius: '0.5rem', // rounded-lg
    marginBottom: '2px',
    '&:active': {
      backgroundColor: isDark ? '#FAFAFA' : '#0A0A0A', // zinc.50 in dark, zinc.950 in light
      color: isDark ? '#0A0A0A' : '#FAFAFA', // zinc.950 in dark, zinc.50 in light
    },
  }),
  control: (base, { isFocused }) => ({
    ...base,
    minHeight: '40px', // h-10
    height: '40px',
    borderRadius: '0.375rem', // rounded-md (matches input rounded-md)
    cursor: 'pointer',
    backgroundColor: isDark ? '#262626' : '#FAFAFA', // zinc.800 or zinc.50
    borderColor: isFocused
      ? (isDark ? '#737373' : '#525252') // zinc.500 in dark, zinc.600 in light
      : isDark
      ? '#404040' // zinc.700
      : '#E5E5E5', // zinc.200
    boxShadow: isFocused
      ? (isDark ? '0 0 0 1px #737373' : '0 0 0 1px #525252') // zinc.500 in dark, zinc.600 in light
      : 'none',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: isFocused
        ? (isDark ? '#737373' : '#525252') // zinc.500 in dark, zinc.600 in light
        : isDark
        ? '#525252' // zinc.600
        : '#A3A3A3', // zinc.400
    },
  }),
  clearIndicator: (base, props) => ({
    ...base,
    paddingRight: 0,
    color: isDark ? '#A3A3A3' : '#737373', // zinc.400 or zinc.500
  }),
  singleValue: (base) => ({
    ...base,
    color: isDark ? '#FAFAFA' : '#171717', // zinc.50 or zinc.900
  }),
  placeholder: (base) => ({
    ...base,
    color: isDark ? '#737373' : '#A3A3A3', // zinc.500 or zinc.400
    fontSize: '0.875rem', // text-sm
  }),
  dropdownIndicator: (base, { selectProps }) => ({
    ...base,
    color: isDark ? '#A3A3A3' : '#737373', // zinc.400 or zinc.500
    transition: 'all 0.3s ease-in-out',
    transform: selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  }),
  indicatorSeparator: (base) => ({
    ...base,
    display: 'none',
  }),
  valueContainer: (base) => ({
    ...base,
    paddingLeft: '0.75rem', // px-3
    paddingRight: 0,
    fontSize: '0.875rem', // text-sm
    fontWeight: 400,
  }),
  input: (base) => ({
    ...base,
    color: isDark ? '#FAFAFA' : '#171717', // zinc.50 or zinc.900
  }),
});

const ThemedSelect = (props: any) => {
  const { t } = useTranslation();
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  return (
    <Select
      styles={{ ...getCustomStyles(props?.isDarkMode || isDark), ...props?.customStyles }}
      menuPortalTarget={document.body}
      menuPosition="fixed"
      isClearable={props?.isClearable}
      isSearchable={false}
      placeholder={t('select') + '...'}
      // menuIsOpen={true}
      {...props}
    />
  );
};

export default ThemedSelect;

