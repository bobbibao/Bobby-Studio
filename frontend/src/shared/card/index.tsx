import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: string;
  extra?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ variant, extra, children, ...rest }) => {
  return (
    <div
      className={`!z-5 flex flex-col  bg-white bg-clip-border dark:!bg-gray-900 dark:text-white ${extra}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;

