import { Link, Route, Routes } from 'react-router-dom';
import SignUp from '@/features/auth/pages/auth/SignUp';
import SignIn from '@/features/auth/pages/auth/SignIn';
import { Switch, useColorMode, Text, Flex, Box, Image, useColorModeValue, Menu, MenuButton, MenuList, MenuItem, Button } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { languageOptions } from '@/constants';
import { ChevronDown, Sparkles } from 'lucide-react';
import { LogoBobbyFull } from '@/shared/logo';
import welcomeArtwork from '@/assets/img/auth/bobby-studio-courtyard.webp';

export default function Auth() {
  const { t, i18n } = useTranslation();
  const { colorMode, toggleColorMode } = useColorMode();
  const bgColor = useColorModeValue('zinc.50', 'zinc.950');
  const language = languageOptions.find(option => option.value === i18n.resolvedLanguage?.split('-')[0]) ?? languageOptions[0];

  return (
    <Flex minH="100dvh" w="full" bg={bgColor} className="aurora-bg">
      <Flex direction="column" w={{ base: 'full', lg: '50%' }} minW={0} px={{ base: 6, md: 12 }} py={8}>
        <Flex as="header" justify="space-between" align="center" gap={4}>
          <Link to="/" aria-label="Bobby Studio home">
            <LogoBobbyFull />
          </Link>
          <Menu>
            <MenuButton
              as={Button}
              variant="ghost"
              size="sm"
              borderRadius="xl"
              rightIcon={<ChevronDown size={14} />}
              _hover={{ bg: useColorModeValue('zinc.100', 'zinc.800') }}
            >
              {language.label}
            </MenuButton>
            <MenuList bg="bg.surface" borderColor="border.default" borderRadius="16px" boxShadow="xl" minW="130px">
              {languageOptions.map(option => (
                <MenuItem
                  key={option.value}
                  onClick={() => void i18n.changeLanguage(option.value)}
                  bg={language.value === option.value ? 'bg.subtle' : 'transparent'}
                  color="text.primary"
                  _hover={{ bg: 'bg.subtle' }}
                  fontSize="sm"
                >
                  {option.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Flex>
        <Flex as="main" flex={1} direction="column" justify="center" align="center" minW={0} py={{ base: 12, lg: 16 }}>
          <Box
            w="full"
            maxW="440px"
            p={{ base: 6, sm: 8 }}
            borderRadius="24px"
            bg={useColorModeValue('rgba(255, 255, 255, 0.85)', 'rgba(18, 19, 28, 0.85)')}
            backdropFilter="blur(20px)"
            border="1px solid"
            borderColor={useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.08)')}
            boxShadow={useColorModeValue('0 20px 40px -15px rgba(0,0,0,0.08)', '0 25px 50px -12px rgba(0,0,0,0.6)')}
          >
            <Routes>
              <Route path="/sign-up" element={<SignUp />} />
              <Route path="/sign-in" element={<SignIn />} />
            </Routes>
          </Box>
        </Flex>
        <Flex as="footer" justify="space-between" align="center" gap={4}>
          <Text fontSize="xs" color="text.muted">© {new Date().getFullYear()} Bobby Studio</Text>
          <Flex align="center" gap={2}>
            <Text as="label" htmlFor="darkmode" fontSize="xs" color="text.muted" cursor="pointer">
              {t('common:dark_mode')}
            </Text>
            <Switch id="darkmode" isChecked={colorMode === 'dark'} colorScheme="purple" onChange={toggleColorMode} />
          </Flex>
        </Flex>
      </Flex>
      <Box display={{ base: 'none', lg: 'block' }} w="50%" position="sticky" top={0} h="100dvh" p={4} aria-hidden="true">
        <Box position="relative" w="full" h="full" borderRadius="24px" overflow="hidden">
          <Image src={welcomeArtwork} alt="" w="full" h="full" objectFit="cover" />
          <Box
            position="absolute"
            inset={0}
            bg="linear-gradient(180deg, rgba(127, 86, 217, 0.25) 0%, rgba(9, 10, 14, 0.75) 100%)"
            pointerEvents="none"
          />
          <Box
            position="absolute"
            bottom={10}
            left={10}
            right={10}
            p={6}
            borderRadius="20px"
            bg="rgba(10, 11, 16, 0.65)"
            backdropFilter="blur(20px)"
            border="1px solid rgba(255, 255, 255, 0.12)"
            boxShadow="0 20px 40px rgba(0,0,0,0.5)"
          >
            <Flex align="center" gap={2} mb={2}>
              <Box p={1.5} borderRadius="lg" bg="linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)">
                <Sparkles size={16} color="white" />
              </Box>
              <Text fontSize="sm" fontWeight="600" color="white" letterSpacing="0.02em">
                Bobby Studio AI
              </Text>
            </Flex>
            <Text fontSize="lg" fontWeight="600" color="white" lineHeight="short" mb={1}>
              The Professional Generative Creative Workspace
            </Text>
            <Text fontSize="xs" color="zinc.300">
              Transform ideas into high-fidelity architectural & creative concepts in real time.
            </Text>
          </Box>
        </Box>
      </Box>
    </Flex>
  );
}
