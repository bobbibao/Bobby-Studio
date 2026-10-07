import React from 'react';
import { Spinner } from '@chakra-ui/react';
import { classNames } from '@/utils';

interface ButtonProps {
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  extraClass?: string;
  isDisabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'before' | 'after';
  className?: string;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  extraClass = '',
  isDisabled = false,
  isLoading = false,
  loadingText = 'Loading...',
  icon,
  iconPosition = 'before',
  className = '',
  type = 'button',
  ...props
}) => {
  // Enhanced wrapper to recursively handle nested buttons
  const IconWrapper = ({ children }: { children: React.ReactNode }): JSX.Element => {
    if (React.isValidElement(children)) {
      if (children.type === 'button') {
        return <>{children.props.children}</>;
      }

      if (children.props.children) {
        return React.cloneElement(children, {
          ...children.props,
          children: <IconWrapper>{children.props.children}</IconWrapper>,
        } as React.HTMLAttributes<HTMLElement>);
      }
    }
    return <>{children}</>;
  };

  const shouldBypassIconFilter = ['!text-primary', 'text-primary', '!text-white', 'dark:!text-white', '!text-black', 'dark:!text-black'].some(
    (token) => extraClass?.includes(token)
  );
  const iconColorClass = shouldBypassIconFilter ? '' : 'filter dark:invert';

  return (
    <button
      type={type}
      onClick={onClick}
      className={classNames(
        'flex items-center justify-center rounded-xl text-sm font-semibold bg-primary dark:bg-white',
        'px-5 py-2.5 text-white dark:text-primary shadow-md min-h-[44px] h-11 transition duration-200 ease-in-out',
        'hover:opacity-95 hover:shadow-lg active:scale-[0.98]',
        'disabled:bg-gray-400 dark:disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none disabled:active:scale-100',
        extraClass,
        className
      )}
      disabled={isDisabled || isLoading}
      style={{
        maxWidth: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center">
          <Spinner className="mr-2" />
          {loadingText}
        </span>
      ) : (
        <>
          {icon && iconPosition === 'before' && (
            <span
              className={`mr-2 ${iconColorClass}`}
            >
              <IconWrapper>{icon}</IconWrapper>
            </span>
          )}
          {label}
          {icon && iconPosition === 'after' && (
            <span
              className={`ml-2 ${iconColorClass}`}
            >
              <IconWrapper>{icon}</IconWrapper>
            </span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;

