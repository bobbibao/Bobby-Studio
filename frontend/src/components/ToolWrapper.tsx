import React, { ReactNode } from 'react';

interface ToolWrapperProps {
  position?: number;
  title: string;
  children?: ReactNode;
}

const ToolWrapper: React.FC<ToolWrapperProps> = ({
  position = 1,
  title,
  children,
}) => {
  return (
    <div className="tool-wrapper flex flex-col gap-4">
      {!!title && (
        <div className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black text-[12px] leading-none font-bold text-white dark:bg-white dark:text-black">
            {position}
          </span>
          <h2 className="tool-title text-base font-bold dark:text-white">
            {title}
          </h2>
        </div>
      )}
      <div className="tool-content">{children}</div>
    </div>
  );
};

export default ToolWrapper;

