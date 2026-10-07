import { useToast, Text, InputGroup, Button, VStack, Box, Flex, useColorModeValue } from '@chakra-ui/react';
import React, { useState } from 'react';
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
import { sendEmailVerification } from '@/features/auth';
import { useAuth } from '@/common/context/useAuthContext';
import ModalEmailVerify from '@/features/auth/pages/auth/components/ModalEmailVerify';

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
  const [loading, setLoading] = useState<boolean>(false);
  const [modalEmailVerifyOpen, toggleModalEmailVerify] = useState<boolean>(false);
  const { setAuthUser } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ISignupRequest>({
    defaultValues: { email: '', password: '' },
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

  const isVietnamese = i18n.language?.toLowerCase().startsWith('vi');

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
          {translatorProfileNS('create_account')}
        </Text>
        <Text fontSize="sm" color="text.muted" mb={6} lineHeight="1.5">
          {isVietnamese ? 'Tạo tài khoản để bắt đầu sáng tạo cùng Bobby Studio AI.' : 'Create an account to start creating with Bobby Studio AI.'}
        </Text>

        {/* Fast Google Auth */}
        <Button
          onClick={signUpWithGoogle}
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
          {translatorProfileNS('sign_up_with_google')}
        </Button>

        {/* Divider */}
        <Flex align="center" gap={3} mb={5}>
          <Box flex={1} h="1px" bg={useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)')} />
          <Text fontSize="2xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.06em" color="text.muted">
            {isVietnamese ? 'Hoặc đăng ký bằng email' : 'Or register with email'}
          </Text>
          <Box flex={1} h="1px" bg={useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)')} />
        </Flex>

        <form onSubmit={handleSubmit(handleSignUp)}>
          <FormControl isInvalid={!!errors.email} mb={4}>
            <FormLabel htmlFor="email" fontSize="xs" fontWeight="600" color="text.primary" mb={1.5}>
              {translatorProfileNS('email')}{' '}
              <Text as="span" color="brand.500">
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
              )}
            />
            <FormErrorMessage fontSize="xs" mt={1}>
              {errors.email?.message ? translatorProfileNS(errors.email?.message) : errors.email?.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!errors.password} mb={3}>
            <FormLabel htmlFor="password" fontSize="xs" fontWeight="600" color="text.primary" mb={1.5}>
              {translatorProfileNS('password')}{' '}
              <Text as="span" color="brand.500">
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
                )}
              />
            </InputGroup>
            <FormErrorMessage fontSize="xs" mt={1}>
              {errors.password?.message ? translatorProfileNS(errors.password?.message) : errors.password?.message}
            </FormErrorMessage>
          </FormControl>

          <VStack align="flex-start" spacing={1.5} fontSize="xs" mb={5} px={1}>
            <HStack spacing={2}>
              <InfoIcon />
              <Text color={errors.password ? 'red.400' : 'text.muted'}>
                {translatorProfileNS('minimum_8_characters')}
              </Text>
            </HStack>
            <HStack spacing={2}>
              <InfoIcon />
              <Text color={errors.password ? 'red.400' : 'text.muted'}>
                {translatorProfileNS('include_numbers_and_special_characters')}
              </Text>
            </HStack>
          </VStack>

          {/* Submit Button */}
          <Button
            isDisabled={loading}
            isLoading={loading}
            width="full"
            h="46px"
            borderRadius="14px"
            type="submit"
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
            {translatorProfileNS('create_account')}
          </Button>

          <Box mt={6} textAlign="center">
            <Text as="span" fontSize="xs" fontWeight="500" mr={2} color="text.muted">
              {translatorProfileNS('already_have_an_account')}
            </Text>
            <Link
              as={NavLink}
              to="/auth/sign-in"
              color="brand.400"
              fontSize="xs"
              fontWeight="700"
              _hover={{ textDecoration: 'underline', color: 'brand.300' }}
            >
              {translatorProfileNS('login')}
            </Link>
          </Box>
        </form>
      </Box>

      <ModalEmailVerify
        isOpen={modalEmailVerifyOpen}
        onClose={() => toggleModalEmailVerify(false)}
        userEmail={auth.currentUser?.email || ''}
      />
    </motion.div>
  );
}



