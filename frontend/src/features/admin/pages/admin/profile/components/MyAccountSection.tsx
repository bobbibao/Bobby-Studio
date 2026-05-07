import {
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  useDisclosure,
  useBoolean,
  useToast,
  Box,
  Flex,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import UploadImageProfile from '@/components/UploadImageProfile';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { deleteAccount, getProfile, updateProfile } from '@/features/user';
import { selectCurrentUser } from '@/selectors/user';
import { uploadImage } from '@/features/upload';
import ChangePasswordModal from './ChangePasswordModal';
import ThemedSelect from '@/components/ThemedSelect';
import { ModalCommon } from '@/shared/modal';
import { WarningIcon } from '@/shared/icons/WarningIcon';
// import { useNavigate, useLocation, unstable_usePrompt } from 'react-router-dom';
import { Controller } from 'react-hook-form';
import { fetchCurrentUser } from '@/slices/currentUserSlice';
import { useAppDispatchRaw } from '@/store';
import { changeLanguage } from 'i18next';
import { useTranslation } from 'react-i18next';
import { languageOptions } from '@/constants';
import { FiEdit2, FiImage } from 'react-icons/fi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/configs/firebase';
import { ModalDeleteAccount } from './ModalDeleteAccount';

interface FormInputs {
  firstName: string;
  lastName: string;
  // email: string;
  // password: string;
  jobTitle?: string;
  phoneNumber?: string;
  language: string;
  pictureProfile?: string;
  // Address fields
  streetAddress?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
}

const validationSchema: yup.ObjectSchema<FormInputs> = yup.object().shape({
  firstName: yup.string().required('first_name_is_required'),
  lastName: yup.string().required('last_name_is_required'),
  // email: yup.string().email('invalid_email_format').required('email_is_required'),
  // password: yup.string().min(8, 'password_must_be_at_least_8_characters'),
  jobTitle: yup.string(),
  phoneNumber: yup
    .string()
    .optional()
    .test('phoneValidation', 'invalid_phone_number', function (value) {
      if (!value || value.length === 0) return true;

      const digitsOnly = /^[0-9]+$/.test(value);
      const minLength = value.length >= 10;

      if (!digitsOnly) {
        return this.createError({
          message: 'phone_number_must_contain_only_digits',
        });
      }

      if (!minLength) {
        return this.createError({
          message: 'phone_number_must_be_at_least_10_digits',
        });
      }

      return true;
    }),
  language: yup.string().required('language_is_required'),
  pictureProfile: yup.string(),
  // Address fields
  streetAddress: yup.string(),
  postalCode: yup.string(),
  country: yup.string(),
  countryCode: yup.string(),
});

export const MyAccountSection: React.FC = () => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);

  // Chakra color values
  const cardBg = useColorModeValue('white', 'zinc.950');
  const cardBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const cardShadow = useColorModeValue('none', '0 20px 60px rgba(17,17,19,0.08)');
  const labelColor = useColorModeValue('zinc.500', 'zinc.400');
  const inputBg = useColorModeValue('white', 'zinc.800');
  const inputBorderColor = useColorModeValue('zinc.200', 'whiteAlpha.100');
  const inputTextColor = useColorModeValue('zinc.900', 'white');
  const inputPlaceholderColor = useColorModeValue('zinc.500', 'zinc.400');
  const sectionSubtextColor = useColorModeValue('zinc.600', 'zinc.400');
  const sectionBorderColor = useColorModeValue('zinc.200', 'whiteAlpha.50');
  const passwordSectionBg = useColorModeValue('white', 'zinc.800');
  const passwordSectionBorderColor = useColorModeValue('zinc.200', 'whiteAlpha.100');
  const passwordLabelColor = useColorModeValue('zinc.600', 'zinc.300');
  const passwordTextColor = useColorModeValue('zinc.900', 'white');
  const inputFocusBorder = useColorModeValue('zinc.600', 'zinc.500');
  const inputFocusRing = useColorModeValue('zinc.600', 'zinc.500');
  const logoUploadBg = useColorModeValue('zinc.100', 'zinc.800');
  const logoUploadBorder = useColorModeValue('zinc.200', 'whiteAlpha.100');
  const logoUploadIconColor = useColorModeValue('zinc.400', 'zinc.500');
  const logoUploadHoverBorder = useColorModeValue('zinc.300', 'whiteAlpha.200');
  const logoUploadOverlay = useColorModeValue('blackAlpha.200', 'blackAlpha.500');

  const toast = useToast();
  const [profile, setProfile] = useState<any>({});
  const { isOpen: isChangePasswordOpen, onOpen: onChangePasswordOpen, onClose: onChangePasswordClose } = useDisclosure();
  const [modalWarningUnsave, toggleModalWarningUnsave] = useBoolean();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const temporaryAvatarUrl = useRef<string | null>(null);
  const { user: currentUser, fetchingStatus } = useSelector(selectCurrentUser);
  const dispatch = useAppDispatchRaw();
  
  // Countries state for address section
  const [countries, setCountries] = useState<any[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const {
    handleSubmit,
    register,
    setValue,
    formState: { errors, isDirty },
    getValues,
    reset,
    control,
    watch,
  } = useForm<FormInputs>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      // email: currentUser?.email || '',
      // password: '***************',
      jobTitle: profile.jobTitle || '',
      phoneNumber: profile.phoneNumber || '',
      pictureProfile: profile.pictureProfile || '',
      language: 'en',
      // Address fields with Switzerland as default
      streetAddress: profile.streetAddress || '',
      postalCode: profile.postalCode || '',
      country: profile.country || 'Switzerland',
      countryCode: profile.countryCode || 'CH',
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const profileResp: any = await getProfile();
      setProfile(profileResp);
      reset({
        firstName: profileResp.firstName || '',
        lastName: profileResp.lastName || '',
        jobTitle: profileResp.jobTitle || '',
        phoneNumber: profileResp.phoneNumber || '',
        pictureProfile: profileResp.pictureProfile || '',
        language: profileResp.language || 'en',
        // Address fields with Switzerland as default
        streetAddress: profileResp.streetAddress || '',
        postalCode: profileResp.postalCode || '',
        country: profileResp.country || 'Switzerland',
        countryCode: profileResp.countryCode || 'CH',
      });
    };
    fetchProfile();
  }, [reset]);

  // Fetch countries from GeoNames API (same as Company section)
  useEffect(() => {
    setIsLoadingCountries(true);
    axios
      .get('https://secure.geonames.org/countryInfoJSON?username=nmvuong92')
      .then((response) => {
        setCountries(response.data.geonames);
      })
      .finally(() => setIsLoadingCountries(false));
  }, []);

  useEffect(() => {
    var language = "en"
    if (currentUser?.language) language = currentUser?.language;
    
    setIsLoadingCountries(true);
    axios
      .get(
        `https://secure.geonames.org/countryInfoJSON?username=nmvuong92&lang=${language}`
      )
      .then((res) => setCountries(res.data.geonames || []))
      .finally(() => setIsLoadingCountries(false));
  }, [currentUser?.language]);


  // Map countries to options for ThemedSelect
  const countryOptions = countries.map((country: any) => ({
    value: country.countryCode,
    label: country.countryName,
  }));
  
  useEffect(() => {
    return () => {
      if (isDirty) updateProfile(getValues());
    };
  }, [isDirty]);

  // useEffect(() => {
  //   const handleBeforeUnload = (e: any) => {
  //     if (isDirty) {
  //       e.preventDefault();
  //       e.returnValue = "You have unsaved changes. Are you sure you want to leave the page?";
  //       return e.returnValue;
  //     }
  //   };
  //
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //   return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  // }, [isDirty]);

  // unstable_usePrompt({
  //   message: "Are you sure?",
  //   when: ({ currentLocation, nextLocation }) =>
  //     isDirty &&
  //     currentLocation.pathname !== nextLocation.pathname,
  // });

  const onSubmit: SubmitHandler<FormInputs> = async () => {
    try {
      var result;
      if(file) {
        result =  await handleUpload(file)
      }
      const latestValues = getValues();
      // Update profile on server
      await updateProfile(latestValues);
      
      reset(getValues());
      changeLanguage(latestValues.language);
      try {
        localStorage.setItem('i18nextLng', latestValues.language);
        // mark that user explicitly set language from UI so background sync won't overwrite
        localStorage.setItem('i18nextLng_manual', '1');
      } catch {
        // ignore if localStorage isn't writable
        console.error('Failed to set i18nextLng');
      }

      toast({
        title: translatorNotificationNS('update_profile'),
        description: translatorNotificationNS('successfully'),
        status: 'success',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    } catch {
      toast({
        title: translatorNotificationNS('update_profile'),
        description: translatorNotificationNS('something_went_wrong'),
        status: 'error',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    }
    finally {
      await dispatch(fetchCurrentUser());
    }
  };
  const navigate = useNavigate();
  const [modalDelete, toggleModalDelete] = useBoolean();
  const onDelete =async ()=>{
    try{
      await deleteAccount()
      
      toast({
        title: translatorNotificationNS('delete_account'),
        description: translatorNotificationNS('successfully'),
        status: 'success',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
      auth.signOut();
      localStorage.removeItem('i18nextLng');
      localStorage.removeItem('i18nextLng_manual');
      navigate("/auth/sign-in")
    }
    catch(error){
      toast({
        title: translatorNotificationNS('update_profile'),
        description: translatorNotificationNS('something_went_wrong'),
        status: 'error',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    }
  }

  // const handleOnChangeButton = (): void => {
  //   if (editing) {
  //     buttonRef.current?.click();
  //     return;
  //   }
  //   setEditing(true);
  // };

  // const handleCancel = (): void => {
  //   reset();
  //   setEditing(false);
  // };

  const handleLeaveWithoutSaving = useCallback(() => {
    // reset();
    // toggleModalWarningUnsave.off();
    // confirmNavigation();
  }, []);

  const handleSaveBeforeLeaving = useCallback(() => {
    // buttonRef.current?.click();
    // toggleModalWarningUnsave.off();
  }, []);

  const handleUpload = async (file: File | null): Promise<void> => {
    try {
      if (file) {
        const response: {
          message: string;
          imgUrl: string;
        } | null = await uploadImage(file);
        
        if (response?.imgUrl) {
          setValue('pictureProfile', response.imgUrl, { shouldDirty: true });
          if (temporaryAvatarUrl.current) {
            URL.revokeObjectURL(temporaryAvatarUrl.current);
            temporaryAvatarUrl.current = null;
          }
          setAvatarPreview(response.imgUrl);
          
        }
        toast({
            title: translatorNotificationNS('upload_image'),
            description: translatorNotificationNS('image_uploaded_successfully'),
            status: 'success',
            duration: 5000,
            position: 'bottom-right',
            isClosable: true,
          });
      }
    } catch (error: any) {
      toast({
        title: translatorNotificationNS('upload_image'),
        description: error?.response?.data?.message || translatorNotificationNS('something_wrong_when_upload_image'),
        status: 'error',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    }
  };

  const pictureProfileValue = watch('pictureProfile');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    setAvatarPreview(pictureProfileValue || null);
  }, [pictureProfileValue]);

  useEffect(() => {
    return () => {
      if (temporaryAvatarUrl.current) {
        URL.revokeObjectURL(temporaryAvatarUrl.current);
      }
    };
  }, []);
  const [file, setFile] = useState<File | null>(null);
  const triggerAvatarPicker = () => avatarInputRef.current?.click();
  const handleAvatarInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      if (temporaryAvatarUrl.current) {
        URL.revokeObjectURL(temporaryAvatarUrl.current);
      }
      setValue('pictureProfile', objectUrl, { shouldDirty: true });
      temporaryAvatarUrl.current = objectUrl;
      setAvatarPreview(objectUrl);
      setFile(file);
      event.target.value = '';
    }
  };

  const handleAvatarKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      triggerAvatarPicker();
    }
  };

  return (
    <Box position="relative" w="full" minH="full">
      <Box as="form" w="full" maxW="3xl" display="flex" flexDirection="column" gap={6} pb="25px" onSubmit={handleSubmit(onSubmit)}>
        <Box mb={4} display="flex" flexDirection="column" gap={1}>
          <Text fontSize="xl" fontWeight="medium" color={inputTextColor}>
            {translatorProfileNS('personal_info')}
          </Text>
          <Text fontSize="sm" color={sectionSubtextColor}>
            {translatorProfileNS('update_your_photo_and_personal_details_here')}
          </Text>
        </Box>

        <Box
          mb={6}
          w="full"
          borderRadius="xl"
          borderWidth="1px"
          borderColor={cardBorderColor}
          bg={cardBg}
          p={6}
          boxShadow={cardShadow}
        >
          <Box mb={6} borderBottomWidth="1px" borderColor={sectionBorderColor} pb={4}>
            <Text fontSize="16px" fontWeight="medium" color={inputTextColor}>
              {translatorProfileNS('public_profile')}
            </Text>
            <Text fontSize="sm" color={sectionSubtextColor}>
              {translatorProfileNS('refresh_your_avatar_name_and_role')}
            </Text>
          </Box>
          <Flex direction={{ base: 'column', md: 'row' }} gap={6} align={{ md: 'flex-start' }}>
            <Box
              role="button"
              tabIndex={0}
              position="relative"
              h="72px"
              w="72px"
              flexShrink={0}
              cursor="pointer"
              overflow="hidden"
              borderRadius="lg"
              borderWidth="1px"
              borderColor={logoUploadBorder}
              bg={logoUploadBg}
              transition="all 0.2s"
              _hover={{ borderColor: logoUploadHoverBorder }}
              onClick={triggerAvatarPicker}
              onKeyDown={handleAvatarKeyPress}
            >
              {avatarPreview ? (
                <Box
                  as="img"
                  src={avatarPreview}
                  alt={translatorProfileNS('profile_picture')}
                  h="full"
                  w="full"
                  objectFit="cover"
                  transition="opacity 0.2s"
                  _groupHover={{ opacity: 0.8 }}
                />
              ) : (
                <Flex h="full" w="full" direction="column" align="center" justify="center" gap={1} textAlign="center">
                  <Box as={FiImage} color={logoUploadIconColor} fontSize="16px" />
                </Flex>
              )}
              <Box
                pointerEvents="none"
                position="absolute"
                inset={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg={logoUploadOverlay}
                opacity={0}
                transition="opacity 0.2s"
                _groupHover={{ opacity: 1 }}
              >
                <Box as={FiEdit2} color="white" fontSize="12px" />
              </Box>
            </Box>
            <Box as="input" ref={avatarInputRef} type="file" accept="image/*" display="none" onChange={handleAvatarInputChange} />
            <Box as="input" type="hidden" {...register('pictureProfile')} />

            <Flex flex={1} direction="column" gap={5}>
              <Flex direction={{ base: 'column', md: 'row' }} gap={5}>
                <FormControl isInvalid={!!errors.firstName}>
                  <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                    {translatorProfileNS('first_name')}
                  </FormLabel>
                  <Input
                    {...register('firstName')}
                    placeholder={translatorProfileNS('first_name')}
                    h={10}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={inputBorderColor}
                    bg={inputBg}
                    px={3}
                    fontSize="sm"
                    color={inputTextColor}
                    _placeholder={{ color: inputPlaceholderColor }}
                    _focus={{ outline: 'none', ring: 1, ringColor: inputFocusRing, borderColor: inputFocusBorder }}
                    transition="all 0.2s"
                  />
                  <FormErrorMessage>
                    {errors.firstName?.message ? translatorProfileNS(errors.firstName?.message) : errors.firstName?.message}
                  </FormErrorMessage>
                </FormControl>
                <FormControl isInvalid={!!errors.lastName}>
                  <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                    {translatorProfileNS('last_name')}
                  </FormLabel>
                  <Input
                    {...register('lastName')}
                    placeholder={translatorProfileNS('last_name')}
                    h={10}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={inputBorderColor}
                    bg={inputBg}
                    px={3}
                    fontSize="sm"
                    color={inputTextColor}
                    _placeholder={{ color: inputPlaceholderColor }}
                    _focus={{ outline: 'none', ring: 1, ringColor: inputFocusRing, borderColor: inputFocusBorder }}
                    transition="all 0.2s"
                  />
                  <FormErrorMessage>
                    {errors.lastName?.message ? translatorProfileNS(errors.lastName?.message) : errors.lastName?.message}
                  </FormErrorMessage>
                </FormControl>
              </Flex>
              <FormControl isInvalid={!!errors.jobTitle} w="full">
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                  {translatorProfileNS('job_title')}
                </FormLabel>
                <Input
                  {...register('jobTitle')}
                  placeholder={translatorProfileNS('job_title')}
                  h={10}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={inputBorderColor}
                  bg={inputBg}
                  px={3}
                  fontSize="sm"
                  color={inputTextColor}
                  _placeholder={{ color: inputPlaceholderColor }}
                  _focus={{ outline: 'none', ring: 1, ringColor: inputFocusRing, borderColor: inputFocusBorder }}
                  transition="all 0.2s"
                />
                <FormErrorMessage>
                  {errors.jobTitle?.message ? translatorProfileNS(errors.jobTitle?.message) : errors.jobTitle?.message}
                </FormErrorMessage>
              </FormControl>
            </Flex>
          </Flex>
        </Box>

        <Box
          mb={6}
          w="full"
          borderRadius="xl"
          borderWidth="1px"
          borderColor={cardBorderColor}
          bg={cardBg}
          p={6}
          boxShadow={cardShadow}
        >
          <Box mb={6} borderBottomWidth="1px" borderColor={sectionBorderColor} pb={4}>
            <Text fontSize="16px" fontWeight="medium" color={inputTextColor}>
              {translatorProfileNS('contact_and_security')}
            </Text>
            <Text fontSize="sm" color={sectionSubtextColor}>
              {translatorProfileNS('keep_your_contact_methods_current')}
            </Text>
          </Box>
          <Flex direction="column" gap={5}>
            <Flex direction={{ base: 'column', md: 'row' }} gap={5}>
              <FormControl>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                  {translatorProfileNS('email')}
                </FormLabel>
                <Input
                  value={currentUser?.email || ''}
                  readOnly
                  isReadOnly
                  h={10}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={inputBorderColor}
                  bg={inputBg}
                  px={3}
                  fontSize="sm"
                  color={inputTextColor}
                  cursor="not-allowed"
                  opacity={0.6}
                  _placeholder={{ color: inputPlaceholderColor }}
                  _focus={{ outline: 'none', ring: 1, ringColor: inputFocusRing, borderColor: inputFocusBorder }}
                  transition="all 0.2s"
                />
              </FormControl>

              <FormControl isInvalid={!!errors.phoneNumber}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                  {translatorProfileNS('phone_number')}
                </FormLabel>
                <Input
                  {...register('phoneNumber')}
                  placeholder={translatorProfileNS('phone_number')}
                  h={10}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={inputBorderColor}
                  bg={inputBg}
                  px={3}
                  fontSize="sm"
                  color={inputTextColor}
                  _placeholder={{ color: inputPlaceholderColor }}
                  _focus={{ outline: 'none', ring: 1, ringColor: inputFocusRing, borderColor: inputFocusBorder }}
                  transition="all 0.2s"
                />
                <FormErrorMessage>
                  {errors.phoneNumber?.message ? translatorProfileNS(errors.phoneNumber?.message) : errors.phoneNumber?.message}
                </FormErrorMessage>
              </FormControl>
            </Flex>

            <FormControl isInvalid={!!errors.language} w="full">
              <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                {translatorProfileNS('language')}
              </FormLabel>
              <Controller
                control={control}
                name="language"
                render={({ field }) => (
                  <ThemedSelect
                    {...field}
                    options={languageOptions}
                    value={languageOptions.find((opt) => opt.value === field.value)}
                    onChange={(selected: any) => {
                      field.onChange(selected?.value);
                    }}
                  />
                )}
              />
              <FormErrorMessage>
                {errors.language?.message ? translatorProfileNS(errors.language?.message) : errors.language?.message}
              </FormErrorMessage>
            </FormControl>

            <Flex
              mt={2}
              direction={{ base: 'column', md: 'row' }}
              gap={3}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={passwordSectionBorderColor}
              bg={passwordSectionBg}
              p={4}
              align={{ md: 'center' }}
              justify={{ md: 'space-between' }}
            >
              <Box>
                <Text fontSize="sm" fontWeight="medium" color={passwordLabelColor}>
                  {translatorProfileNS('password')}
                </Text>
                <Text fontSize="lg" fontWeight="semibold" letterSpacing="0.3em" color={passwordTextColor}>
                  ••••••••
                </Text>
              </Box>
              <Flex align="center" gap={3}>
                <Button
                  type="button"
                  onClick={onChangePasswordOpen}
                  variant="link"
                  color={useColorModeValue('zinc.900', 'zinc.50')}
                  fontSize="sm"
                  fontWeight="normal"
                  _hover={{ color: useColorModeValue('zinc.600', 'zinc.300') }}
                >
                  {translatorProfileNS('change_your_password')}
                </Button>
              </Flex>
            </Flex>
            <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={onChangePasswordClose} />
          </Flex>
        </Box>

        {/* Address Section */}
        <Box
          mb={6}
          w="full"
          borderRadius="xl"
          borderWidth="1px"
          borderColor={cardBorderColor}
          bg={cardBg}
          p={6}
          boxShadow={cardShadow}
        >
          <Box mb={6} borderBottomWidth="1px" borderColor={sectionBorderColor} pb={4}>
            <Text fontSize="16px" fontWeight="medium" color={inputTextColor}>
              {translatorProfileNS('address_section')}
            </Text>
            <Text fontSize="sm" color={sectionSubtextColor}>
              {translatorProfileNS('update_your_address')}
            </Text>
          </Box>
          <Flex direction="column" gap={5}>
            <FormControl isInvalid={!!errors.streetAddress}>
              <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5}>
                {translatorProfileNS('street_address')}
              </FormLabel>
              <Input
                {...register('streetAddress')}
                placeholder={translatorProfileNS('street_address')}
                h={10}
                borderRadius="md"
                borderWidth="1px"
                borderColor={inputBorderColor}
                bg={inputBg}
                px={3}
                fontSize="sm"
                color={inputTextColor}
                _placeholder={{ color: inputPlaceholderColor }}
                _focus={{ outline: 'none', ring: 1, ringColor: inputFocusRing, borderColor: inputFocusBorder }}
                transition="all 0.2s"
              />
              <FormErrorMessage>
                {errors.streetAddress?.message ? translatorProfileNS(errors.streetAddress?.message) : errors.streetAddress?.message}
              </FormErrorMessage>
            </FormControl>

            <Flex direction={{ base: 'column', md: 'row' }} gap={5}>
              <FormControl isInvalid={!!errors.postalCode}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5}>
                  {translatorProfileNS('postal_code')}
                </FormLabel>
                <Input
                  {...register('postalCode')}
                  placeholder={translatorProfileNS('postal_code')}
                  h={10}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={inputBorderColor}
                  bg={inputBg}
                  px={3}
                  fontSize="sm"
                  color={inputTextColor}
                  _placeholder={{ color: inputPlaceholderColor }}
                  _focus={{ outline: 'none', ring: 1, ringColor: inputFocusRing, borderColor: inputFocusBorder }}
                  transition="all 0.2s"
                />
                <FormErrorMessage>
                  {errors.postalCode?.message ? translatorProfileNS(errors.postalCode?.message) : errors.postalCode?.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.countryCode}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5}>
                  {translatorProfileNS('country')}
                </FormLabel>
                <ThemedSelect
                  options={countryOptions}
                  value={countryOptions.find((option: any) => option.value === watch('countryCode'))}
                  onChange={(selectedOption: { value: any; label: string }) => {
                    setValue('countryCode', selectedOption?.value || '', { shouldDirty: true });
                    setValue('country', selectedOption?.label || '', { shouldDirty: true });
                  }}
                  isDisabled={isLoadingCountries}
                  placeholder={isLoadingCountries ? t('common:loading') : translatorProfileNS('select_a_country')}
                  getOptionValue={(option: { value: any }) => option.value}
                  isSearchable={true}
                />
                <FormErrorMessage>
                  {errors.countryCode?.message ? translatorProfileNS(errors.countryCode?.message) : errors.countryCode?.message}
                </FormErrorMessage>
              </FormControl>
            </Flex>
          </Flex>
        </Box>

        <Box
          borderRadius="xl"
          borderWidth="1px"
          borderColor="red.500"
          borderOpacity={0.2}
          bg="red.50"
          p={6}
          shadow="none"
          _dark={{
            borderColor: 'red.500',
            borderOpacity: '0.2',
            bg: 'red.500',
            bgOpacity: '0.05',
            shadow: '0 25px 80px rgba(127,29,29,0.25)',
          }}
        >
          <Box mb={4}>
            <Text fontSize="lg" fontWeight="semibold" color="red.700" _dark={{ color: 'red.300' }}>
              {translatorProfileNS('danger_zone')}
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="red.600" opacity={0.9} _dark={{ color: 'red.200', opacity: 0.8 }}>
              {translatorProfileNS('delete_account')}
            </Text>
            <Text mt={2} fontSize="sm" color="red.600" opacity={0.8} _dark={{ color: 'red.100', opacity: 0.8 }}>
              {translatorProfileNS('permanently_remove_your_account')}
            </Text>
          </Box>
          <Button
            type="button"
            borderRadius="lg"
            bg="red.600"
            px={4}
            py={2}
            fontSize="sm"
            fontWeight="medium"
            color="white"
            transition="all 0.2s"
            _hover={{ bg: 'red.700' }}
            _dark={{ bg: 'whiteAlpha.900', _hover: { bg: 'red.400',color:'whiteAlpha.600' },color:'gray.900' }}
            onClick={()=>{

             toggleModalDelete.on()
            }}
          >
            {translatorProfileNS('delete_account')}
          </Button>
        </Box>
      </Box>

      <Box
        position="sticky"
        bottom={0}
        mx={-4}
        mb={-4}
        mt="auto"
        display="flex"
        justify="center"
        borderTopWidth="1px"
        borderColor={useColorModeValue('border.default', 'whiteAlpha.200')}
        bg={useColorModeValue('whiteAlpha.800', 'blackAlpha.700')}
        p={4}
        backdropFilter="blur(12px)"
        transition="all 0.2s"
        zIndex={40}
      >
        <Flex w="full" maxW="3xl" justify="flex-end" pr="60px">
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            isDisabled={!isDirty}
            variant="solid"
            h={10}
            px={3}
            py={2}
            fontSize="sm"
            fontWeight="semibold"
            borderRadius="lg"
            _disabled={{ cursor: 'not-allowed', opacity: 0.5 }}
          >
            {t('common:save_changes', { defaultValue: 'Save Changes' })}
          </Button>
        </Flex>
      </Box>

      <ModalCommon
        isOpen={modalWarningUnsave}
        showClose={false}
        showFooter
        onSubmit={handleLeaveWithoutSaving}
        onClose={handleSaveBeforeLeaving}
        labelCancel={t('common:save_changes')}
        labelSubmit={t('common:leave')}
      >
        <Box mb={8}>
          <WarningIcon />
          <Text as="h1" mt={5} fontSize="xl" fontWeight="semibold">
            {translatorProfileNS('unsaved_changes')}
          </Text>
          <Text mt={2} color={sectionSubtextColor}>
            {translatorProfileNS('your_recent_changes_havent_been_saved')}
            <br />
            {translatorProfileNS('do_you_want_to_leave_without_saving')}
          </Text>
        </Box>
      </ModalCommon>

      <ModalDeleteAccount
        open={modalDelete}
        onClose ={ ()=>toggleModalDelete.off()}
        onDelete = {onDelete}
      > 

      </ModalDeleteAccount>
    </Box>
  );
};




