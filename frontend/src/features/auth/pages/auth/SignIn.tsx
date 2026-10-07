import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  useToast,
  Box,
  Flex,
  Text,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Link,
  FormErrorMessage,
  useColorModeValue,
  useBoolean,
} from '@chakra-ui/react';
import { ModalCommon } from '@/shared/modal';
import { WarningIcon } from '@chakra-ui/icons';
import { motion } from 'framer-motion';
import { isUserActive } from '@/features/user';
import {signInWithEmailAndPassword, signInWithPopup, UserCredential } from 'firebase/auth';
import { auth, googleProvider } from '@/configs/firebase';
import { useTranslation } from 'react-i18next';
import EyeOffIcon from '@/shared/icons/EyeOffIcon';
import EyeIcon from '@/shared/icons/EyeIcon';
import google_icon from '@/assets/svg/icons8-google.svg';
import { ModalUserNotActive } from '@/features/auth/pages/auth/components/ModalUserNotActive';
import { createAuthSession, sendEmailVerification, verifyEmail } from '@/features/auth';
import { useAuth } from '@/common/context/useAuthContext';
import { setUserProfile } from '@/slices/users';
import i18n from '@/translations';
import ModalEmailVerify from '@/features/auth/pages/auth/components/ModalEmailVerify';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/selectors/user';
import { useAppDispatch } from '@/store';
import { fetchCurrentUser } from '@/slices/currentUserSlice';

export default function SignIn() {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  const navigate = useNavigate();
  const toast = useToast();
  const [modalNotActive, toggleModalNotActive] = useBoolean();
  const [modalServerError, toggleModalServerError] = useBoolean();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { setAuthUser } = useAuth();
  const { user: currentUser } = useSelector(selectCurrentUser);
  const dispatch = useAppDispatch();

  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value) ? '' : translatorProfileNS('please_enter_a_valid_email_address');
  };

  const validatePassword = (value: string) => {
    return value.length >= 8 ? '' : translatorProfileNS('password_must_be_at_least_8_characters_long');
  };

  const handleInputChange =
    (
      setter: React.Dispatch<React.SetStateAction<string>>,
      validator: (value: string) => string,
      errorSetter: React.Dispatch<React.SetStateAction<string>>
    ) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setter(value);
      errorSetter(validator(value));
    };
  const [modalEmailVerifyOpen, toggleModalEmailVerify] = useState<boolean>(false);


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if(userCredential.user.emailVerified === false){
        await sendEmailVerification(i18n.language || 'en');
        toggleModalEmailVerify(true);
        setLoading(false);
        return;
      }
      const token = await userCredential.user.getIdToken();      
      sessionStorage.setItem('authToken', token);
      const sessionResult = await createAuthSession();
      const { lastLogin, isActive } = sessionResult ?? {};


      if(sessionResult === null){
        toggleModalServerError.on();
        setLoading(false);
        return;
      }
      setAuthUser({
        lastLogin: lastLogin?? null
      });
      const emailVerified = currentUser?.emailVerified || false;
      //If firebase email is verified but backend emailVerified is false, update it
      if(userCredential.user.emailVerified === true && emailVerified === false ){
        await verifyEmail();
        await dispatch(fetchCurrentUser());
      }

      if (!isActive) {
        sessionStorage.removeItem('authToken');
        toggleModalNotActive.on();
        setLoading(false);
        return;
      }  
    
      navigate('/');
    } catch (err: any) {
      switch (err.code) {
        case 'auth/invalid-email':
          toast({
            title: translatorNotificationNS('login_failed'),
            description: translatorNotificationNS('invalid_email_address'),
            position: 'top-right',
            status: 'error',
          });
          break;
        case 'auth/user-not-found':
          toast({
            title: translatorNotificationNS('login_failed'),
            description: translatorNotificationNS('no_user_found_with_this_email'),
            position: 'top-right',
            status: 'error',
          });
          break;
        case 'auth/invalid-credential':
          toast({
            title: translatorNotificationNS('login_failed'),
            description: translatorNotificationNS('invalid_password'),
            position: 'top-right',
            status: 'error',
          });
          break;
        default:
          toast({
            title: translatorNotificationNS('login_failed'),
            position: 'top-right',
            status: 'error',
          });
      }
      console.error(JSON.stringify(err, null, 2));
    } finally {
      setLoading(false);
    }
  };
  

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      const token = await result.user.getIdToken();
      sessionStorage.setItem('authToken', token);
      const sessionResult = await createAuthSession();
      const { lastLogin, isActive } = sessionResult ?? {};
      setAuthUser({
        lastLogin: lastLogin
      });
      if (!isActive) {
        sessionStorage.removeItem('authToken');
        toggleModalNotActive.on();
        return;
      }
      navigate('/');
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const isVietnamese = i18n.language?.toLowerCase().startsWith('vi');
  const [loading, setLoading] = useState(false);

  return (
    <motion.div
      key="page"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <Box w="full">
        {/* Cyber Access Badge */}
        <Flex align="center" gap={2} mb={3}>
          <Box
            px={2.5}
            py={0.5}
            rounded="full"
            bg={useColorModeValue('rgba(127, 86, 217, 0.08)', 'rgba(139, 92, 246, 0.16)')}
            border="1px solid"
            borderColor={useColorModeValue('rgba(127, 86, 217, 0.25)', 'rgba(168, 85, 247, 0.35)')}
            fontSize="2xs"
            fontWeight="700"
            color="brand.400"
            letterSpacing="0.06em"
            textTransform="uppercase"
          >
            ✦ Studio Access Gateway
          </Box>
        </Flex>

        {/* Heading */}
        <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="800" letterSpacing="-0.02em" color="text.primary" mb={1.5}>
          {translatorProfileNS('log_in_to_your_account')}
        </Text>
        <Text fontSize="sm" color="text.muted" mb={6} lineHeight="1.5">
          {translatorProfileNS('welcome_back_please_enter_your_details')}
        </Text>

        {/* Fast Google Auth */}
        <Button
          onClick={signInWithGoogle}
          variant="outline"
          width="full"
          h="46px"
          borderRadius="14px"
          fontWeight="600"
          fontSize="sm"
          borderColor={useColorModeValue('rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.12)')}
          bg={useColorModeValue('rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.04)')}
          backdropFilter="blur(10px)"
          color="text.primary"
          _hover={{
            bg: useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.08)'),
            borderColor: 'brand.400',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 14px rgba(127, 86, 217, 0.15)',
          }}
          transition="all 0.2s"
          mb={5}
        >
          <img src={google_icon} className="w-5 h-5 mr-2.5" alt="Google icon" />
          {translatorProfileNS('sign_in_with_google')}
        </Button>

        {/* Divider */}
        <Flex align="center" gap={3} mb={5}>
          <Box flex={1} h="1px" bg={useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)')} />
          <Text fontSize="2xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.06em" color="text.muted">
            {isVietnamese ? 'Hoặc tiếp tục với email' : 'Or continue with email'}
          </Text>
          <Box flex={1} h="1px" bg={useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)')} />
        </Flex>

        <form onSubmit={handleSubmit}>
          <FormControl isInvalid={!!emailError} mb={4}>
            <FormLabel htmlFor="email" fontSize="xs" fontWeight="600" color="text.primary" mb={1.5}>
              {translatorProfileNS('email')}{' '}
              <Text as="span" color="brand.500">
                *
              </Text>
            </FormLabel>
            <Input
              id="email"
              variant="outline"
              type="email"
              autoFocus={true}
              placeholder={translatorProfileNS('enter_your_email')}
              value={email}
              onChange={handleInputChange(setEmail, validateEmail, setEmailError)}
              h="46px"
              borderRadius="14px"
              bg={useColorModeValue('rgba(0, 0, 0, 0.02)', 'rgba(255, 255, 255, 0.04)')}
              color="text.primary"
              borderColor={useColorModeValue('rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.1)')}
              _placeholder={{ color: 'text.muted', fontSize: 'sm' }}
              _hover={{ borderColor: 'brand.400' }}
              _focus={{
                borderColor: 'brand.400',
                boxShadow: '0 0 0 3px rgba(127, 86, 217, 0.2)',
                bg: useColorModeValue('#FFFFFF', 'rgba(255, 255, 255, 0.06)'),
              }}
              transition="all 0.2s"
            />
            <FormErrorMessage fontSize="xs" mt={1}>{emailError}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!passwordError} mb={2}>
            <FormLabel htmlFor="password" fontSize="xs" fontWeight="600" color="text.primary" mb={1.5}>
              {translatorProfileNS('password')}{' '}
              <Text as="span" color="brand.500">
                *
              </Text>
            </FormLabel>
            <InputGroup>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={translatorProfileNS('enter_your_password')}
                value={password}
                onChange={handleInputChange(setPassword, validatePassword, setPasswordError)}
                h="46px"
                borderRadius="14px"
                variant="outline"
                bg={useColorModeValue('rgba(0, 0, 0, 0.02)', 'rgba(255, 255, 255, 0.04)')}
                color="text.primary"
                borderColor={useColorModeValue('rgba(0, 0, 0, 0.1)', 'rgba(255, 255, 255, 0.1)')}
                _placeholder={{ color: 'text.muted', fontSize: 'sm' }}
                _hover={{ borderColor: 'brand.400' }}
                _focus={{
                  borderColor: 'brand.400',
                  boxShadow: '0 0 0 3px rgba(127, 86, 217, 0.2)',
                  bg: useColorModeValue('#FFFFFF', 'rgba(255, 255, 255, 0.06)'),
                }}
                transition="all 0.2s"
              />
              <InputRightElement h="46px" pr={1}>
                <Button
                  variant="ghost"
                  size="sm"
                  borderRadius="full"
                  onClick={() => setShowPassword(!showPassword)}
                  color="text.muted"
                  _hover={{ color: 'text.primary', bg: 'transparent' }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </Button>
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage fontSize="xs" mt={1}>{passwordError}</FormErrorMessage>
          </FormControl>

          {/* Submit Button */}
          <Button
            width="full"
            mt={5}
            h="46px"
            borderRadius="14px"
            type="submit"
            isLoading={loading}
            fontWeight="700"
            fontSize="sm"
            background="linear-gradient(135deg, #7F56D9 0%, #6366F1 50%, #EC4899 100%)"
            color="white"
            boxShadow="0 4px 18px rgba(127, 86, 217, 0.35)"
            _hover={{
              filter: 'brightness(1.08)',
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 22px rgba(127, 86, 217, 0.5)',
            }}
            _active={{
              transform: 'translateY(0)',
            }}
            transition="all 0.2s"
          >
            {translatorProfileNS('sign_in')}
          </Button>
        </form>

        <Box mt={6} textAlign="center">
          <Text as="span" fontSize="xs" fontWeight="500" mr={2} color="text.muted">
            {translatorProfileNS('dont_have_an_account')}
          </Text>
          <Link
            as={NavLink}
            to="/auth/sign-up"
            color="brand.400"
            fontSize="xs"
            fontWeight="700"
            _hover={{ textDecoration: 'underline', color: 'brand.300' }}
          >
            {translatorProfileNS('sign_up_now')}
          </Link>
        </Box>
      </Box>
      <ModalUserNotActive
        open={modalNotActive}
        onClose ={ ()=>toggleModalNotActive.off()}
      >
      </ModalUserNotActive>


      <ModalCommon
      isOpen={modalServerError}
      showClose={false}
      closeOnOverlayClick={false}
      onClose={toggleModalServerError.off}
      size="md"
      showFooter
      classNameFooter="mt-8"
      labelSubmit="Close"
      onSubmit={toggleModalServerError.off}
      loadingSubmit={false}
      showCancel={false}
    >
      <p className="flex justify-center">
        <WarningIcon w={12} h={12} color="red.500" />
      </p>
      <h1 className="text-txtPrimary dark:text-white mt-5 text-xl font-semibold text-center">
        Something Went Wrong
      </h1>
      <p className="text-secondary mt-2 text-sm text-center whitespace-pre-line">
        There is an unexpected error. Please contact admin for assistance.
        <div className='mt-1'>Email: <span className='font-bold'>info@bobby.ai </span> </div>
      </p>
      </ModalCommon>

    <ModalEmailVerify
      isOpen={modalEmailVerifyOpen}
      onClose ={ ()=>toggleModalEmailVerify(false)}
      userEmail={auth.currentUser?.email || ''}
    />


    </motion.div>
  );
}



