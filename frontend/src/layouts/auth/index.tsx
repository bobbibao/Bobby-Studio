import { Link, Route, Routes } from 'react-router-dom';
import SignUp from '@/features/auth/pages/auth/SignUp';
import SignIn from '@/features/auth/pages/auth/SignIn';
import { Switch, useColorMode, Text, Flex, Box, Image, useColorModeValue, Menu, MenuButton, MenuList, MenuItem, Button } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { languageOptions } from '@/constants';
import { ChevronDown } from 'lucide-react';
import { LogoBobbyFull } from '@/shared/logo';
import welcomeArtwork from '@/assets/img/auth/bobby-studio-courtyard.webp';

export default function Auth() {
  const { t, i18n } = useTranslation();
  const { colorMode, toggleColorMode } = useColorMode();
  const bgColor = useColorModeValue('white', 'zinc.900');
  const language = languageOptions.find(option => option.value === i18n.resolvedLanguage?.split('-')[0]) ?? languageOptions[0];

  return (
    <Flex minH="100dvh" w="full" bg={bgColor}>
      <Flex direction="column" w={{ base: 'full', lg: '50%' }} minW={0} px={{ base: 6, md: 12 }} py={8}>
        <Flex as="header" justify="space-between" align="center" gap={4}>
          <Link to="/" aria-label="Bobby Studio home"><LogoBobbyFull /></Link>
          <Menu>
            <MenuButton as={Button} variant="ghost" size="sm" rightIcon={<ChevronDown size={14} />}>
              {language.value === 'de' ? 'Deutsch' : language.label}
            </MenuButton>
            <MenuList bg="bg.surface" borderColor="border.default" minW="120px">
              {languageOptions.map(option => (
                <MenuItem
                  key={option.value}
                  onClick={() => void i18n.changeLanguage(option.value)}
                  bg={language.value === option.value ? 'bg.subtle' : 'transparent'}
                  color="text.primary"
                  _hover={{ bg: 'bg.subtle' }}
                >
                  {option.value === 'de' ? 'Deutsch' : option.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Flex>
        <Flex as="main" flex={1} direction="column" justify="center" align="center" minW={0} py={{ base: 12, lg: 16 }}>
          <Routes>
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/sign-in" element={<SignIn />} />
          </Routes>
        </Flex>
        <Flex as="footer" justify="space-between" align="center" gap={4}>
          <Text fontSize="sm" color="text.muted">© {new Date().getFullYear()} Bobby Studio</Text>
          <Flex align="center" gap={2}>
            <Text as="label" htmlFor="darkmode" fontSize="sm" color="text.muted" cursor="pointer">
              {t('common:dark_mode')}
            </Text>
            <Switch id="darkmode" isChecked={colorMode === 'dark'} colorScheme="purple" onChange={toggleColorMode} />
          </Flex>
        </Flex>
      </Flex>
      <Box display={{ base: 'none', lg: 'block' }} w="50%" position="sticky" top={0} h="100dvh" p={4} aria-hidden="true">
        <Image src={welcomeArtwork} alt="" w="full" h="full" objectFit="cover" borderRadius="24px" />
      </Box>
    </Flex>
  );
}
