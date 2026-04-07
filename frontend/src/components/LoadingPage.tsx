import { Spinner, useColorMode } from '@chakra-ui/react';
import logoImage from '@/assets/img/logo/header_white.png';
import { classNames } from '@/utils';

export default function LoadingPage(props: { minHeight?: string }) {
  const { colorMode } = useColorMode();
  const spinnerColors =
    colorMode === 'dark'
      ? { emptyColor: 'whiteAlpha.200', color: 'whiteAlpha.900' }
      : { emptyColor: 'gray.200', color: 'primary.500' };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3" style={{ minHeight: props.minHeight || '100vh' }}>
      <img
        src={logoImage}
        alt="Bobby Logo"
        className={classNames('w-auto object-contain', colorMode === 'light' ? 'filter invert' : '')}
        style={{ height: '15.6px' }}
      />
      <Spinner thickness="2px" speed="0.65s" size="sm" {...spinnerColors} />
    </div>
  );
}

