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
        'flex items-center justify-center rounded-lg text-sm bg-primary dark:bg-white',
        'px-3 py-2 text-white dark:text-primary shadow-lg h-10 transition duration-200 ease-in-out',
        'hover:bg-gray-800 dark:hover:bg-gray-100 hover:shadow-xl',
        'disabled:bg-gray-400 dark:disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 disabled:hover:shadow-lg',
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

