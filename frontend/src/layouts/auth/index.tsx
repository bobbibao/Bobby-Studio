import { Link, Route, Routes } from 'react-router-dom';
import SignUp from '@/features/auth/pages/auth/SignUp';
import SignIn from '@/features/auth/pages/auth/SignIn';
import { FormLabel, Switch, useColorMode, Text, Flex, Box, useColorModeValue, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { languageOptions } from '@/constants';
import React, { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { changeLanguage } from 'i18next';
import logoImage from '@/assets/img/logo/header_white.png';
import { ChevronDown } from 'lucide-react';

export default function Auth() {
  const { t } = useTranslation();
  const { colorMode, toggleColorMode } = useColorMode();
  const [language, setLanguage] = useState<any>(languageOptions[0]);

  // Static background images array
  // Images should be placed in: frontend/src/assets/img/auth/background/
  // Supports: .webp, .png, .jpg, .jpeg
  const webpModules = import.meta.glob('/src/assets/img/auth/background/*.webp', { eager: true, query: '?url', import: 'default' });
  const pngModules = import.meta.glob('/src/assets/img/auth/background/*.png', { eager: true, query: '?url', import: 'default' });
  const jpgModules = import.meta.glob('/src/assets/img/auth/background/*.jpg', { eager: true, query: '?url', import: 'default' });
  const jpegModules = import.meta.glob('/src/assets/img/auth/background/*.jpeg', { eager: true, query: '?url', import: 'default' });

  // Combine all image types - use entries to preserve file paths for sorting
  const allModules = {
    ...webpModules,
    ...pngModules,
    ...jpgModules,
    ...jpegModules,
  };

  // Convert to array of [path, url] pairs, sort by filename number, then extract URLs
  const backgroundImages = Object.entries(allModules)
    .filter(([path, url]) => Boolean(url))
    .sort(([pathA], [pathB]) => {
      // Extract number from file path for sorting (bg-1.webp -> 1)
      const numA = parseInt(pathA.match(/bg-(\d+)/)?.[1] || '0');
      const numB = parseInt(pathB.match(/bg-(\d+)/)?.[1] || '0');
      return numA - numB;
    })
    .map(([path, url]) => url as string);

  document.documentElement.dir = 'ltr';

  const handletoggleColorMode = async () => {
    toggleColorMode();
  };

  useEffect(() => {
    const langLocalStorage = localStorage.getItem('i18nextLng') || languageOptions[0]?.value;
    changeLanguage(langLocalStorage);
  }, []);

  useEffect(() => {
    if (language) changeLanguage(language.value);
  }, [language]);

  const firstImageSetRef = useRef<HTMLDivElement | null>(null);
  const languageSelectWrapperRef = useRef<HTMLDivElement | null>(null);
  const [scrollStyles, setScrollStyles] = useState<CSSProperties>({
    '--scroll-distance': '0px',
    '--scroll-duration': '60s',
  });

  const updateScrollMetrics = useCallback(() => {
    const section = firstImageSetRef.current;
    if (!section) return;
    const sectionHeight = section.offsetHeight;

    if (sectionHeight === 0) return;

    const duration = Math.max(80, sectionHeight / 20);

    setScrollStyles({
      '--scroll-distance': `${sectionHeight}px`,
      '--scroll-duration': `${duration}s`,
    } as CSSProperties);
  }, []);

  useEffect(() => {
    if (!backgroundImages.length) return;

    updateScrollMetrics();

    const handleResize = () => updateScrollMetrics();
    window.addEventListener('resize', handleResize);

    const section = firstImageSetRef.current;
    const images = Array.from(section?.querySelectorAll('img') ?? []);

    const handleImageEvent = () => updateScrollMetrics();

    images.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return;
      }
      img.addEventListener('load', handleImageEvent);
      img.addEventListener('error', handleImageEvent);
    });

    const fallbackTimer = window.setTimeout(updateScrollMetrics, 2000);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.clearTimeout(fallbackTimer);
      images.forEach((img) => {
        img.removeEventListener('load', handleImageEvent);
        img.removeEventListener('error', handleImageEvent);
      });
    };
  }, [backgroundImages, updateScrollMetrics]);

  const renderBackgroundImage = (imageSrc: string, index: number, keyPrefix: string) => (
    <div
      key={`${keyPrefix}-${index}`}
      className="relative w-full"
      style={{
        margin: '0',
        marginBottom: '5px',
        verticalAlign: 'top',
        display: 'inline-block',
      }}
    >
      <img
        src={imageSrc}
        alt={`Background ${(index % backgroundImages.length) + 1}`}
        className="w-full h-auto rounded-lg block"
        loading="lazy"
        style={{ display: 'block' }}
        onError={(e) => {
          console.error('Failed to load image:', imageSrc, e);
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );

  const bgColor = useColorModeValue('white', 'zinc.900');

  return (
    <Box className="flex h-screen w-full overflow-hidden overscroll-none" bg={bgColor}>
      {/* Left Side - Content (50%) */}
      <Box className="w-1/2 flex flex-col h-screen overflow-hidden" bg={bgColor}>
        <Box as="main" className="flex flex-col justify-start pt-12 px-4 lg:px-8 lg:pt-0 h-full w-full relative flex-1 overflow-hidden" bg={bgColor}>
          <Flex justify="space-between" align="center" w="full" mt={8} mb={4}>
              <img
                src={logoImage}
                alt="Bobby Logo"
              className={`h-3 w-auto object-contain ${colorMode === 'light' ? 'filter invert' : ''}`}
              />
            <Menu>
              {({ isOpen }) => (
                <>
                  <MenuButton
                    as={Text}
                    fontSize="sm"
                    color="text.muted"
                    fontWeight="normal"
                    cursor="pointer"
                    display="flex"
                    alignItems="center"
                    gap={1}
                    _hover={{ color: 'text.primary' }}
                    transition="color 0.2s"
                  >
                    <Box
                      as="span"
                      display="inline-flex"
                      alignItems="center"
                      transform={isOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
                      transition="transform 0.2s"
                    >
                      <ChevronDown size={12} strokeWidth={2} />
                    </Box>
                    {language?.value === 'de' ? 'Deutsch' : languageOptions.find(opt => opt.value === language?.value)?.label || 'English'}
                  </MenuButton>
                  <MenuList
                    bg="bg.surface"
                    borderColor="border.default"
                    minW="120px"
                    py={1}
                  >
                    {languageOptions.map((option) => (
                      <MenuItem
                        key={option.value}
                        onClick={() => {
                          setLanguage(option);
                          changeLanguage(option.value);
                        }}
                        bg={language?.value === option.value ? 'bg.subtle' : 'transparent'}
                        color={language?.value === option.value ? 'text.primary' : 'text.muted'}
                        fontSize="sm"
                        _hover={{ bg: 'bg.subtle', color: 'text.primary' }}
                      >
                        {option.value === 'de' ? 'Deutsch' : option.label}
                      </MenuItem>
                    ))}
                  </MenuList>
                </>
              )}
            </Menu>
          </Flex>
          <div className="items-center mb-auto flex flex-col pl-5 pr-5 md:pl-12 md:pr-0 lg:pl-0 w-full">
            <Link to="/" className="mt-0 w-max lg:pt-10"></Link>
            <Routes>
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/sign-in" element={<SignIn />} />
            </Routes>
          </div>
          <Flex justify="space-between" align="center" mb={8} w="full">
            <Text fontSize="sm" color="text.muted">
              © {new Date().getFullYear()} Bobby
            </Text>
            <Flex align="center" gap={1}>
              <Text as="label" htmlFor="darkmode" fontSize="sm" color="text.muted" fontWeight="normal" cursor="pointer">
                {t('common:dark_mode')}
              </Text>
              <Switch
                id="darkmode"
                isChecked={colorMode === 'dark'}
                ml={1}
                colorScheme="whiteAlpha"
                onChange={handletoggleColorMode}
              />
            </Flex>
          </Flex>
        </Box>
      </Box>

      {/* Right Side - Image Grid (50%) */}
      {backgroundImages.length > 0 && (
        <Box className="w-1/2 relative h-screen overflow-hidden">
          <div className="auth-scroll-viewport">
            <div className="auth-scroll-animation" style={scrollStyles}>
              <div className="layout-columns-2 auth-scroll-section" style={{ columnGap: '5px' }} ref={firstImageSetRef}>
                {backgroundImages.map((imageSrc, index) => renderBackgroundImage(imageSrc, index, 'bg'))}
              </div>
              <div className="layout-columns-2 auth-scroll-section" style={{ columnGap: '5px' }} aria-hidden>
                {backgroundImages.map((imageSrc, index) => renderBackgroundImage(imageSrc, index, 'bg-duplicate'))}
              </div>
            </div>
          </div>
        </Box>
      )}
    </Box>
  );
}

