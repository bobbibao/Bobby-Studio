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
  const formBorderWidth = 0;
  const formBorderColor = 'transparent';
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
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if(userCredential.user.emailVerified === false){
        await sendEmailVerification(i18n.language || 'en');
        toggleModalEmailVerify(true);
        return;
      }
      const token = await userCredential.user.getIdToken();      
      sessionStorage.setItem('authToken', token);
      const sessionResult = await createAuthSession();
      const { lastLogin, isActive } = sessionResult ?? {};


      if(sessionResult === null){
        toggleModalServerError.on();
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

  return (
    <motion.div
      key="page"
      initial={{ x: '20%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-20%', opacity: 0, transition: { duration: 0.2 } }}
      transition={{ delay: 0, duration: 0.2 }}
    >
      <Flex
        h="100vh"
        maxH="calc(100vh - 150px)"
        align="center"
        justify="center"
        px={{ base: 4, md: 0 }}
        bg={useColorModeValue('white', 'zinc.900')}
      >
        <Box
          w="360px"
          maxW="md"
          rounded="lg"
          p={6}
          borderWidth={formBorderWidth}
          borderColor={formBorderColor}
          bg={useColorModeValue('white', 'zinc.900')}
        >
          <Text as="h4" mb={2.5} fontSize="2xl" fontWeight="bold" color="text.primary">
            {translatorProfileNS('log_in_to_your_account')}
          </Text>
          <Text mb={9} fontSize="base" color="text.muted">
            {translatorProfileNS('welcome_back_please_enter_your_details')}
          </Text>
          <form onSubmit={handleSubmit}>
            <FormControl isInvalid={!!emailError} mb={3}>
              <FormLabel htmlFor="email" color="text.primary">
                {translatorProfileNS('email')}{' '}
                <Text as="span" color="brand.600">
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
                bg={useColorModeValue('zinc.50', 'zinc.800')}
                color="text.primary"
                borderColor="border.default"
                _placeholder={{ color: 'text.subtle' }}
                _hover={{ borderColor: 'zinc.400' }}
                _focus={{ borderColor: 'zinc.600', boxShadow: 'none' }}
              />
              <FormErrorMessage mt={0}>{emailError}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!passwordError}>
              <FormLabel htmlFor="password" color="text.primary">
                {translatorProfileNS('password')}{' '}
                <Text as="span" color="brand.600">
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
                  mb={3}
                  variant="outline"
                  bg={useColorModeValue('zinc.50', 'zinc.800')}
                  color="text.primary"
                  borderColor="border.default"
                  _placeholder={{ color: 'text.subtle' }}
                  _hover={{ borderColor: 'zinc.400' }}
                  _focus={{ borderColor: 'zinc.600', boxShadow: 'none' }}
                />
                <InputRightElement>
                  <Button
                    variant="unstyled"
                    pl={4}
                    onClick={() => setShowPassword(!showPassword)}
                    color="text.muted"
                    _hover={{ color: 'text.primary' }}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage mt={0}>{passwordError}</FormErrorMessage>
            </FormControl>

            <Button
              width="full"
              mt={4}
              type="submit"
              fontWeight="normal"
              bg={useColorModeValue('zinc.900', 'zinc.100')}
              color={useColorModeValue('white', 'zinc.900')}
              transition="all 0.2s"
              _hover={{
                bg: useColorModeValue('zinc.800', 'zinc.200'),
                transform: 'translateY(-1px)',
                boxShadow: 'md',
              }}
              _active={{
                bg: useColorModeValue('zinc.700', 'zinc.300'),
                transform: 'translateY(0px)',
              }}
            >
              {translatorProfileNS('sign_in')}
            </Button>
            <Button
              onClick={signInWithGoogle}
              variant="outline"
              width="full"
              h="44px"
              mt={2}
              fontWeight="normal"
              borderColor="border.default"
              bg="bg.surface"
              color="text.primary"
              _hover={{ bg: 'bg.subtle' }}
            >
              <img src={google_icon} className="w-5 h-5 mr-2" alt="Sign in with Google" />
              {translatorProfileNS('sign_in_with_google')}
            </Button>
          </form>

          <Box mt={4} textAlign="center">
            <Text as="span" fontSize="sm" fontWeight="medium" mr={2} color="text.muted">
              {translatorProfileNS('dont_have_an_account')}
            </Text>
            <Link
              as={NavLink}
              to="/auth/sign-up"
              color="brand.600"
              fontWeight="semibold"
              _hover={{ color: 'brand.700', textDecoration: 'underline' }}
            >
              {translatorProfileNS('sign_up_now')}
            </Link>
          </Box>
        </Box>
      </Flex>
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



