import { FC } from 'react';
import { useColorMode } from '@chakra-ui/react';
import BobbyLogoIcon from '@/shared/icons/BobbyLogoIcon';
import BobbyTextIcon from '@/shared/icons/BobbyTextIcon';
import { classNames } from '@/utils';

export const LogoBobbyFull: FC<{ className?: string }> = ({ className = '' }) => {
  const { colorMode } = useColorMode();

  return (
    <div className={classNames('h-6 flex items-center gap-2', colorMode === 'dark' ? 'text-white' : 'text-dark', className)}>
      <BobbyLogoIcon />
      <BobbyTextIcon />
    </div>
  );
};

