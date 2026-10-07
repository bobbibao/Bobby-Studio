import { FC } from 'react';
import { useColorMode } from '@chakra-ui/react';
import BobbyLogoIcon from '@/shared/icons/BobbyLogoIcon';
import BobbyTextIcon from '@/shared/icons/BobbyTextIcon';
import { classNames } from '@/utils';

export const LogoBobbyFull: FC<{ className?: string }> = ({ className = '' }) => {
  const { colorMode } = useColorMode();

  return (
    <div role="img" aria-label="Bobby Studio" className={classNames('flex shrink-0 items-center gap-2', colorMode === 'dark' ? 'text-white' : 'text-dark', className)}>
      <BobbyLogoIcon />
      <BobbyTextIcon />
    </div>
  );
};

