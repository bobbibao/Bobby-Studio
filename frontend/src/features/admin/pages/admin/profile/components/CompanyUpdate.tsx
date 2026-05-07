import {
  Button,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Textarea,
  useToast,
  Box,
  Flex,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useState, useRef, useEffect } from 'react';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import axios from 'axios';
import { getCompanyProfile, updateCompanyProfile } from '@/features/user';
import { uploadImage } from '@/features/upload';
import ThemedSelect from '@/components/ThemedSelect';
import { COMPANY_TYPES } from '@/features/auth/pages/auth/Company';
import { useTranslation } from 'react-i18next';
import { FiEdit2, FiImage } from 'react-icons/fi';

interface FormInputs {
  name: string;
  type?: string;
  size?: number;
  email: string;
  website?: string | null;
  country?: string;
  countryCode: string;
  postalCode?: string;
  city?: string;
  cityCode?: string;
  state?: string;
  stateCode?: string;
  streetAddress?: string;
  vatNumber?: string;
  businessRegistrationNumber?: string;
  companyDescription?: string; // New field
  billingContactName?: string; // New field
  billingEmailAddress?: string; // New field
  billingAddress?: string; // New field
  pictureProfile?: string;
}

const validationSchema: yup.ObjectSchema<FormInputs> = yup.object().shape({
  name: yup.string().required('company_name_is_required'),
  type: yup.string(),
  size: yup.number(),
  email: yup.string().email('invalid_email_format').required('company_email_is_required'),
  website: yup
    .string()
    .test('valid-url', 'invalid_website_url', function (value) {
      if (!value) return true; // Allow empty values
      return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,4}(\/[\w-]+)*$/.test(value);
    })
    .nullable(),
  country: yup.string(),
  countryCode: yup.string().required('country_is_required'),
  postalCode: yup.string(),
  city: yup.string(),
  cityCode: yup.string(),
  state: yup.string(),
  stateCode: yup.string(),
  streetAddress: yup.string(),
  vatNumber: yup.string(),
  businessRegistrationNumber: yup.string(),
  companyDescription: yup.string(), // Optional field
  billingContactName: yup.string(),
  billingEmailAddress: yup.string().email('invalid_email_format'),
  billingAddress: yup.string(),
  pictureProfile: yup.string(),
});

interface CompanyUpdateProps {
  company?: any; // Nếu company không có, nghĩa là đang tạo mới
  refreshData?: () => void;
}

export const CompanyUpdate: React.FC<CompanyUpdateProps> = ({ company, refreshData }) => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);

  // Chakra color values
  const cardBg = useColorModeValue('white', 'zinc.950');
  const cardBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const cardShadow = useColorModeValue('none', '0 20px 60px rgba(17,17,19,0.08)');
  const labelColor = useColorModeValue('zinc.500', 'zinc.400');
  const inputBg = useColorModeValue('zinc.50', 'zinc.800');
  const inputBorderColor = useColorModeValue('zinc.200', 'whiteAlpha.100');
  const inputTextColor = useColorModeValue('zinc.900', 'white');
  const inputPlaceholderColor = useColorModeValue('zinc.500', 'zinc.400');
  const sectionSubtextColor = useColorModeValue('zinc.600', 'zinc.400');
  const sectionBorderColor = useColorModeValue('zinc.200', 'whiteAlpha.50');
  const logoUploadBg = useColorModeValue('zinc.100', 'zinc.800');
  const logoUploadBorder = useColorModeValue('zinc.200', 'whiteAlpha.100');
  const logoUploadIconColor = useColorModeValue('zinc.400', 'zinc.500');
  const logoUploadHoverBorder = useColorModeValue('zinc.300', 'whiteAlpha.200');
  const logoUploadOverlay = useColorModeValue('blackAlpha.200', 'blackAlpha.500');
  const inputFocusBorder = useColorModeValue('zinc.600', 'zinc.500');
  const inputFocusRing = useColorModeValue('zinc.600', 'zinc.500');

  const toast = useToast();
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const temporaryLogoUrl = useRef<string | null>(null);

  const [action, setAction] = useState<string>('create');
  const [isLoading, setIsLoading] = useState(true);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const {
    handleSubmit,
    register,
    setValue,
    formState: { errors, isSubmitting, isDirty },
    reset,
    watch,
    getValues,
  } = useForm<FormInputs>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: '',
      type: '',
      size: 1,
      email: '',
      website: '',
      country: 'Switzerland',
      countryCode: 'CH',
      postalCode: '',
      city: '',
      cityCode: '',
      state: '',
      stateCode: '',
      streetAddress: '',
      vatNumber: '',
      businessRegistrationNumber: '',
      companyDescription: '', // New field
      billingContactName: '', // New field
      billingEmailAddress: '', // New field
      billingAddress: '', // New field
      pictureProfile: '',
    },
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name || '',
        type: company.type || '',
        size: company.size || 1,
        email: company.email || '',
        website: company.website || '',
        country: company.country || '',
        countryCode: company.countryCode || '',
        postalCode: company.postalCode || '',
        city: company.city || '',
        cityCode: company.cityCode || '',
        state: company.state || '',
        stateCode: company.stateCode || '',
        streetAddress: company.streetAddress || '',
        vatNumber: company.vatNumber || '',
        businessRegistrationNumber: company.businessRegistrationNumber || '',
        companyDescription: company.companyDescription || '', // New field
        billingContactName: company.billingContactName || '', // New field
        billingEmailAddress: company.billingEmailAddress || '', // New field
        billingAddress: company.billingAddress || '', // New field
        pictureProfile: company.pictureProfile || '',
      });
    }
  }, [reset, company]);

  const selectedCountry = watch('countryCode');
  const selectedCity = watch('cityCode');
  const selectedState = watch('stateCode');
  const picturePreview = watch('pictureProfile');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const companyTypeOptions = COMPANY_TYPES.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const countryOptions = countries.map((country: any) => ({
    value: country.countryCode,
    label: country.countryName,
  }));

  const stateOptions = states.map((item: any) => ({
    value: item.adminCode1,
    label: item.toponymName,
  }));

  const cityOptions = cities.map((city: any) => ({
    value: city.geonameId?.toString() || city.adminCode2 || city.toponymName,
    label: city.toponymName,
  }));

  useEffect(() => {
    if (selectedCountry) {
      setIsLoading(true);
      axios
        .get(`https://secure.geonames.org/searchJSON?country=${selectedCountry}&featureClass=A&featureCode=ADM1&username=nmvuong92`)
        .then((response) => {
          setStates(response.data.geonames);
          setValue('stateCode', '');
          setValue('cityCode', '');
        })
        .finally(() => setIsLoading(false));
    }
  }, [selectedCountry, setValue]);

  useEffect(() => {
    if (selectedCountry && selectedState) {
      setIsLoading(true);
      axios
        .get(
          `https://secure.geonames.org/searchJSON?country=${selectedCountry}&adminCode1=${selectedState}&featureClass=A&featureCode=ADM2&maxRows=10&username=nmvuong92`
        )
        .then((response) => {
          setCities(response.data.geonames);
          setValue('cityCode', '');
        })
        .finally(() => setIsLoading(false));
    }
  }, [selectedState, setValue]);

  useEffect(() => {
    setIsLoading(true);
    axios
      .get('https://secure.geonames.org/countryInfoJSON?username=nmvuong92')
      .then((response) => {
        setCountries(response.data.geonames);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!company) {
      setAction('create');
    } else {
      setAction('update');
    }
  }, [company]);

  useEffect(() => {
    return () => {
      if (isDirty) updateCompanyProfile(getValues());
    };
  }, [isDirty]);

  const onSubmit: SubmitHandler<FormInputs> = async (values: FormInputs) => {
    try {
      const resp = await updateCompanyProfile(values);
      refreshData?.();
      if (action === 'create') {
        setAction('update');
      }

      // reset(getValues());
      toast({
        title: translatorNotificationNS(!company ? 'create_company' : 'update_company'),
        description: translatorNotificationNS('successfully'),
        status: 'success',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: translatorNotificationNS(!company ? 'create_company' : 'update_company'),
        description: translatorNotificationNS('something_went_wrong'),
        status: 'error',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    setLogoPreview(picturePreview || null);
  }, [picturePreview]);

  useEffect(() => {
    return () => {
      if (temporaryLogoUrl.current) {
        URL.revokeObjectURL(temporaryLogoUrl.current);
      }
    };
  }, []);

  const handleUpload = async (file: File | null): Promise<void> => {
    if (!file) {
      return;
    }
    const response: {
      message: string;
      s3Url: string;
    } | null = await uploadImage(file);
    if (response?.s3Url) {
      setValue('pictureProfile', response.s3Url, { shouldDirty: true });
      if (temporaryLogoUrl.current) {
        URL.revokeObjectURL(temporaryLogoUrl.current);
        temporaryLogoUrl.current = null;
      }
      setLogoPreview(response.s3Url);
    }
  };

  const handleLogoInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      if (temporaryLogoUrl.current) {
        URL.revokeObjectURL(temporaryLogoUrl.current);
      }
      temporaryLogoUrl.current = objectUrl;
      setLogoPreview(objectUrl);
      void handleUpload(file);
      event.target.value = '';
    }
  };

  const triggerLogoPicker = () => logoFileInputRef.current?.click();
  const handleLogoKeyPress = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      triggerLogoPicker();
    }
  };

  return (
    <Box position="relative" w="full" minH="full">
      <Box as="form" onSubmit={handleSubmit(onSubmit)} w="full" maxW="3xl" display="flex" flexDirection="column" gap={6} pb="25px">
        <Box mb={4} display="flex" flexDirection="column" gap={1}>
          <Text fontSize="xl" fontWeight="medium" color={inputTextColor}>
            {translatorProfileNS('company_info')}
          </Text>
          <Text fontSize="sm" color={sectionSubtextColor}>
            {translatorProfileNS('manage_and_update_your_companys_essential_information_for_a_seamless_experience')}
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
              {translatorProfileNS('brand_identity')}
            </Text>
            {/* <Text fontSize="sm" color={sectionSubtextColor}>
              {translatorProfileNS('align_your_logo_and_essentials')}
            </Text> */}
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
              onClick={triggerLogoPicker}
              onKeyDown={handleLogoKeyPress}
            >
              {logoPreview ? (
                <Box
                  as="img"
                  src={logoPreview}
                  alt={translatorProfileNS('company_logo')}
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
                align="center"
                justify="center"
                bg={logoUploadOverlay}
                opacity={0}
                transition="opacity 0.2s"
                _groupHover={{ opacity: 1 }}
              >
                <Box as={FiEdit2} color="white" fontSize="12px" />
              </Box>
            </Box>
            <Box as="input" ref={logoFileInputRef} type="file" accept="image/*" display="none" onChange={handleLogoInputChange} />
            <Box as="input" type="hidden" {...register('pictureProfile')} />

            <Flex flex={1} direction="column" gap={5}>
              <Flex direction={{ base: 'column', md: 'row' }} gap={5}>
                <FormControl isInvalid={!!errors.name}>
                  <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                    {translatorProfileNS('company_name')}
                  </FormLabel>
                  <Input
                    {...register('name')}
                    placeholder={translatorProfileNS('company_name')}
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
                  <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.website}>
                  <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                    {translatorProfileNS('website')}
                  </FormLabel>
                  <Input
                    {...register('website')}
                    type="text"
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
                    placeholder="Yourwebsite.com"
                  />
                  <FormErrorMessage>{errors.website?.message}</FormErrorMessage>
                </FormControl>
              </Flex>

              <Flex direction={{ base: 'column', md: 'row' }} gap={5}>
                <FormControl isInvalid={!!errors.email}>
                  <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                    {translatorProfileNS('company_email')}
                  </FormLabel>
                  <Input
                    {...register('email')}
                    placeholder={translatorProfileNS('company_email')}
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
                  <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.type}>
                  <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                    {translatorProfileNS('company_type')}
                  </FormLabel>
                  <ThemedSelect
                    placeholder={translatorProfileNS('select_company_type')}
                    options={companyTypeOptions}
                    value={companyTypeOptions.find((option) => option.value === watch('type'))}
                    onChange={(selectedOption: { value: any }) => setValue('type', selectedOption?.value || '', { shouldDirty: true })}
                    getOptionValue={(option: { value: any }) => option.value}
                    formatOptionLabel={(opt: any) => {
                      if (opt?.label === 'Public' || opt?.label === 'Private')
                        return translatorProfileNS(opt?.label?.toLowerCase() + '_');
                      return translatorProfileNS(opt?.label?.toLowerCase()?.replace(/-/g, '_'));
                    }}
                  />
                  <FormErrorMessage>{errors.type?.message}</FormErrorMessage>
                </FormControl>
              </Flex>

              <Flex direction={{ base: 'column', md: 'row' }} gap={5}>
                <FormControl isInvalid={!!errors.size}>
                  <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                    {translatorProfileNS('company_size')}
                  </FormLabel>
                  <Input
                    {...register('size')}
                    type="number"
                    placeholder={translatorProfileNS('company_size')}
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
                  <FormErrorMessage>{errors.size?.message}</FormErrorMessage>
                </FormControl>
              </Flex>
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
              {translatorProfileNS('location')}
            </Text>
            <Text fontSize="sm" color={sectionSubtextColor}>
              {translatorProfileNS('tell_us_where_your_organization_operates')}
            </Text>
          </Box>
          <Flex direction="column" gap={5}>
            <FormControl isInvalid={!!errors.streetAddress} w="full">
              <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
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
              <FormErrorMessage>{errors.streetAddress?.message}</FormErrorMessage>
            </FormControl>

            <Flex direction={{ base: 'column', md: 'row' }} gap={5} wrap="wrap">
              <FormControl isInvalid={!!errors.city} flex={{ base: '1', md: '0 1 calc(41.666% - 10px)' }}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                  {translatorProfileNS('city')}
                </FormLabel>
                <Input
                  {...register('city')}
                  placeholder={translatorProfileNS('city')}
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
                <FormErrorMessage>{errors.city?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.state} flex={{ base: '1', md: '0 1 calc(33.333% - 10px)' }}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                  {translatorProfileNS('stateprovince')}
                </FormLabel>
                <Input
                  {...register('state')}
                  placeholder={translatorProfileNS('stateprovince')}
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
                <FormErrorMessage>{errors.state?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.postalCode} flex={{ base: '1', md: '0 1 calc(25% - 10px)' }}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
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
                <FormErrorMessage>{errors.postalCode?.message}</FormErrorMessage>
              </FormControl>
            </Flex>

            <FormControl isInvalid={!!errors.countryCode} w="full">
              <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                {translatorProfileNS('country')}
              </FormLabel>
              <ThemedSelect
                options={countryOptions}
                value={countryOptions.find((option) => option.value === watch('countryCode'))}
                onChange={(selectedOption: { value: any }) =>
                  setValue('countryCode', selectedOption?.value || '', { shouldDirty: true })
                }
                isDisabled={isLoading}
                placeholder={isLoading ? t('common:loading') : translatorProfileNS('select_a_country')}
                getOptionValue={(option: { value: any }) => option.value}
                isSearchable={true}
              />
              <FormErrorMessage>{errors.countryCode?.message}</FormErrorMessage>
            </FormControl>
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
              {translatorProfileNS('business_and_billing')}
            </Text>
            <Text fontSize="sm" color={sectionSubtextColor}>
              {translatorProfileNS('financial_information_and_descriptions')}
            </Text>
          </Box>
          <Flex direction="column" gap={5}>
            <Flex direction={{ base: 'column', md: 'row' }} gap={5}>
              <FormControl isInvalid={!!errors.vatNumber}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                  {translatorProfileNS('vat_number')}
                </FormLabel>
                <Input
                  {...register('vatNumber')}
                  placeholder={translatorProfileNS('vat_number')}
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
                <FormErrorMessage>{errors.vatNumber?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.businessRegistrationNumber}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                  {translatorProfileNS('business_registration_number')}
                </FormLabel>
                <Input
                  {...register('businessRegistrationNumber')}
                  placeholder={translatorProfileNS('business_registration_number')}
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
                <FormErrorMessage>{errors.businessRegistrationNumber?.message}</FormErrorMessage>
              </FormControl>
            </Flex>

            <Flex direction={{ base: 'column', md: 'row' }} gap={5}>
              <FormControl isInvalid={!!errors.billingEmailAddress}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                  {translatorProfileNS('billing_email_address')}
                </FormLabel>
                <Input
                  {...register('billingEmailAddress')}
                  placeholder={translatorProfileNS('billing_email_address')}
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
                <FormErrorMessage>{errors.billingEmailAddress?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.billingContactName}>
                <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                  {translatorProfileNS('billing_contact_name')}
                </FormLabel>
                <Input
                  {...register('billingContactName')}
                  placeholder={translatorProfileNS('billing_contact_name')}
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
                <FormErrorMessage>{errors.billingContactName?.message}</FormErrorMessage>
              </FormControl>
            </Flex>

            <FormControl isInvalid={!!errors.billingAddress} w="full">
              <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                {translatorProfileNS('billing_address')}
              </FormLabel>
              <Input
                {...register('billingAddress')}
                placeholder={translatorProfileNS('billing_address')}
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
              <FormErrorMessage>{errors.billingAddress?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.companyDescription} w="full">
              <FormLabel fontSize="14px" fontWeight="medium" color={labelColor} mb={1.5} textTransform="capitalize">
                {translatorProfileNS('company_description')}
              </FormLabel>
              <Textarea
                {...register('companyDescription')}
                rows={4}
                placeholder={translatorProfileNS('enter_a_brief_description_of_your_company')}
                borderRadius="md"
                borderWidth="1px"
                borderColor={inputBorderColor}
                bg={inputBg}
                px={3}
                py={2}
                fontSize="sm"
                color={inputTextColor}
                _placeholder={{ color: inputPlaceholderColor }}
                _focus={{ outline: 'none', ring: 1, ringColor: inputFocusRing, borderColor: inputFocusBorder }}
                transition="all 0.2s"
              />
              <FormErrorMessage>{errors.companyDescription?.message}</FormErrorMessage>
            </FormControl>
          </Flex>
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
    </Box>
  );
};




