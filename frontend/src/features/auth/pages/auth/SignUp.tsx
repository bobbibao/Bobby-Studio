import { useToast, Text, InputGroup, Button, VStack, Box, Flex, useColorModeValue } from '@chakra-ui/react';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, NavLink } from 'react-router-dom';
import { ISignupRequest } from '@/types/auth';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Input, FormControl, FormLabel, FormErrorMessage, HStack, Link, InputRightElement } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import InfoIcon from '@/shared/icons/InfoIcon';
import { auth, googleProvider } from '@/configs/firebase';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import google_icon from '@/assets/svg/icons8-google.svg';
import EyeOffIcon from '@/shared/icons/EyeOffIcon';
import EyeIcon from '@/shared/icons/EyeIcon';
import { useTranslation } from 'react-i18next';
import { createAuthSession, sendEmailVerification, verifyEmail } from '@/features/auth';
import { useAuth } from '@/common/context/useAuthContext';
import ModalEmailVerify from '@/features/auth/pages/auth/components/ModalEmailVerify';
import { ModalUserNotActive } from '@/features/auth/pages/auth/components/ModalUserNotActive';

const validationSchema = yup.object({
  email: yup.string().email('invalid_email_format').required('email_is_required'),
  password: yup.string().min(8, 'password_must_be_at_least_8_characters').required('password_is_required'),
});

export default function SignUp() {
  const { t, i18n } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  const toast = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState<boolean>(false);
  const [modalEmailVerifyOpen, toggleModalEmailVerify] = useState<boolean>(false);
  const formBorderWidth = 0;
  const formBorderColor = 'transparent';
  const { setAuthUser } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<ISignupRequest>({
    resolver: yupResolver(validationSchema),
    mode: 'onChange',
  });
  const [showPassword, setShowPassword] = useState(false);

  const signUpWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      sessionStorage.setItem('authToken', token);
      setAuthUser({
        lastLogin: null,
      });
      navigate('/');
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleSignUp = async (formData: ISignupRequest) => {
    setLoading(true);

    // Start the sign-up process using the email and password provided
    try {
      const credential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await sendEmailVerification(i18n.language || 'en');
      
      setAuthUser({
        lastLogin:  null,
      });

      if(credential.user.emailVerified === false){
        toggleModalEmailVerify(true);
        return;
      }

      const token = await credential.user.getIdToken();
      sessionStorage.setItem('authToken', token);
      setAuthUser({
        lastLogin: null,
      });
      navigate('/');
      
      toast({
          title: translatorNotificationNS('signup_successful'),
          description: translatorNotificationNS('you_have_successfully_signed_up'),
          status: 'success',
          position: 'top-right',
          duration: 3000,
        });

    } catch (err: any) {
      toast({
        title: translatorNotificationNS('signup_failed'),
        description:
          err?.code === 'auth/email-already-in-use'
            ? translatorProfileNS('EMAIL_EXISTS')
            : translatorNotificationNS('something_went_wrong'),
        status: 'error',
        position: 'top-right',
        duration: 3000,
      });
    } finally {
      setLoading(false);
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
          <Text as="h4" mb={3} fontSize="2xl" fontWeight="bold" color="text.primary">
            {translatorProfileNS('create_account')}
          </Text>
          <Text mb={9} fontSize="base" color="text.muted">
            {translatorProfileNS('join_our_community_to_explore_save_and_share_innovative_architecture')}
          </Text>
          <form onSubmit={handleSubmit(handleSignUp)}>
            <FormControl isInvalid={!!errors.email} mb={3}>
              <FormLabel htmlFor="email" color="text.primary">
                {translatorProfileNS('email')}{' '}
                <Text as="span" color="red.500">
                  *
                </Text>
              </FormLabel>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    variant="outline"
                    autoFocus={true}
                    {...field}
                    id="email"
                    placeholder={translatorProfileNS('enter_your_email')}
                    isInvalid={!!errors.email}
                    bg={useColorModeValue('zinc.50', 'zinc.800')}
                    color="text.primary"
                    borderColor="border.default"
                    _placeholder={{ color: 'text.subtle' }}
                    _hover={{ borderColor: 'zinc.400' }}
                    _focus={{ borderColor: 'zinc.600', boxShadow: 'none' }}
                  />
                )}
              />
              <FormErrorMessage mt={0}>
                {errors.email?.message ? translatorProfileNS(errors.email?.message) : errors.email?.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password} mb={3}>
              <FormLabel htmlFor="password" color="text.primary">
                {translatorProfileNS('password')}{' '}
                <Text as="span" color="red.500">
                  *
                </Text>
              </FormLabel>
              <InputGroup>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <InputGroup>
                      <Input
                        variant="outline"
                        {...field}
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={translatorProfileNS('create_a_password')}
                        isInvalid={!!errors.password}
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
                  )}
                />
              </InputGroup>
              <FormErrorMessage mt={0}>
                {errors.password?.message ? translatorProfileNS(errors.password?.message) : errors.password?.message}
              </FormErrorMessage>
            </FormControl>

            <VStack align="flex-start" spacing={2} fontSize="sm" mb={4}>
              <HStack spacing={2}>
                <InfoIcon />
                <Text color={errors.password ? 'red.500' : 'text.muted'}>{translatorProfileNS('minimum_8_characters')}</Text>
              </HStack>
              <HStack spacing={2}>
                <InfoIcon />
                <Text color={errors.password ? 'red.500' : 'text.muted'}>
                  {translatorProfileNS('include_numbers_and_special_characters')}
                </Text>
              </HStack>
              <HStack spacing={2}>
                <InfoIcon />
                <Text color={errors.password ? 'red.500' : 'text.muted'}>
                  {translatorProfileNS('include_upper_and_lower_case_letters')}
                </Text>
              </HStack>
            </VStack>

            <Button
              isDisabled={loading}
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
              _disabled={{
                bg: useColorModeValue('zinc.300', 'zinc.600'),
                color: useColorModeValue('zinc.500', 'zinc.400'),
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
            >
              {translatorProfileNS('create_account')}
            </Button>

            <Button
              onClick={signUpWithGoogle}
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
              <img src={google_icon} className="w-5 h-5 mr-2" alt="Sign up with Google" />
              {translatorProfileNS('sign_up_with_google')}
            </Button>

            <Box mt={4} textAlign="center">
              <Text as="span" fontSize="sm" fontWeight="medium" mr={2} color="text.muted">
                {translatorProfileNS('already_have_an_account')}
              </Text>
              <Link
                as={NavLink}
                to="/auth/sign-in"
                color="brand.600"
                fontWeight="semibold"
                _hover={{ color: 'brand.700', textDecoration: 'underline' }}
              >
                {translatorProfileNS('login')}
              </Link>
            </Box>
          </form>
        </Box>
      </Flex>
      
      <ModalEmailVerify
        isOpen={modalEmailVerifyOpen}
        onClose ={ ()=>toggleModalEmailVerify(false)}
        userEmail={auth.currentUser?.email || ''}
      />
    </motion.div>
  );
}



