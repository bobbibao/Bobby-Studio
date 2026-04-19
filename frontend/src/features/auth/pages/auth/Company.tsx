import React, { useState } from 'react';
import { Box, FormControl, FormLabel, Input, Button, Text, HStack, Avatar } from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import ImageIcon from '@/shared/icons/ImageIcon';
import ThemedSelect from '@/components/ThemedSelect';
import { useTranslation } from 'react-i18next';

const validationSchema = yup.object({
  companyName: yup.string().required('company_name_is_required'),
  companyType: yup.string().required('company_type_is_required'),
  companySize: yup.string().required('company_size_is_required'),
  companyEmail: yup.string().email('invalid_email_address').required('company_email_is_required'),
  website: yup.string().url('invalid_url').notRequired(),
  country: yup.string().required('country_is_required'),
  postalCode: yup.string().required('postal_code_is_required'),
  city: yup.string().required('city_is_required'),
  stateProvince: yup.string().required('stateprovince_is_required'),
  streetAddress: yup.string().required('street_address_is_required'),
});

export const COMPANY_TYPES = [
  { label: 'Private', value: 'private' },
  { label: 'Public', value: 'public' },
  { label: 'Non-Profit', value: 'non_profit' },
];

export const COMPANY_SIZES = [
  { label: '1-10', value: '1-10' },
  { label: '11-50', value: '11-50' },
  { label: '51-200', value: '51-200' },
  { label: '200+', value: '200+' },
];

export default function CompanyForm() {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
  });

  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  const handleSubmitForm = (data: any) => {
    console.log('Form data:', data);
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setProfilePicture(e.target.files[0]);
    }
  };

  const companyTypeOptions = COMPANY_TYPES.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  const companySizeOptions = COMPANY_SIZES.map((option) => ({
    value: option.value,
    label: option.label,
  }));

  return (
    <div className="p-4 h-full">
      <h2 className="text-2xl font-semibold text-white mb-6">{translatorProfileNS('company_information')}</h2>

      <form onSubmit={handleSubmit(handleSubmitForm)} className='pb-4'>
        <FormControl isInvalid={!!errors.companyName} mb={4}>
          <FormLabel htmlFor="companyName" className="text-white">
            {translatorProfileNS('company_name')}
          </FormLabel>
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => <Input {...field} id="companyName" className="text-secondary !bg-dark border !border-gray-700" />}
          />
          {errors.companyName?.message && <Text color="red.500">{translatorProfileNS(errors.companyName.message)}</Text>}
        </FormControl>

        {/* Company Type */}
        <FormControl isInvalid={!!errors.companyType} mb={4}>
          <FormLabel htmlFor="companyType" className="text-white">
            {translatorProfileNS('company_type')}
          </FormLabel>
          <Controller
            name="companyType"
            control={control}
            render={({ field }) => (
              <ThemedSelect
                {...field}
                id="companyType"
                options={companyTypeOptions}
                value={companyTypeOptions.find((opt) => opt.value === field.value)}
                onChange={(selectedOption: { value: any }) => field.onChange(selectedOption?.value || '')}
                className="text-secondary !bg-dark border !border-gray-700"
                getOptionValue={(option: { value: any }) => option.value}
                formatOptionLabel={(opt: any) => {
                  if (opt?.label === 'Public' || opt?.label === 'Private') return translatorProfileNS(opt?.label?.toLowerCase() + '_');
                  return translatorProfileNS(opt?.label?.toLowerCase()?.replace(/-/g, '_'));
                }}
              />
            )}
          />
          {errors.companyType?.message && <Text color="red.500">{translatorProfileNS(errors.companyType.message)}</Text>}
        </FormControl>

        <FormControl isInvalid={!!errors.companySize} mb={4}>
          <FormLabel htmlFor="companySize" className="text-white">
            {translatorProfileNS('company_size')}
          </FormLabel>
          <Controller
            name="companySize"
            control={control}
            render={({ field }) => (
              <ThemedSelect
                {...field}
                id="companySize"
                options={companySizeOptions}
                value={companySizeOptions.find((opt) => opt.value === field.value)}
                onChange={(selectedOption: { value: any }) => field.onChange(selectedOption?.value || '')}
                className="text-secondary !bg-dark border !border-gray-700"
                getOptionValue={(option: { value: any }) => option.value}
              />
            )}
          />
          {errors.companySize?.message && <Text color="red.500">{translatorProfileNS(errors.companySize.message)}</Text>}
        </FormControl>

        <FormControl isInvalid={!!errors.companyEmail} mb={4}>
          <FormLabel htmlFor="companyEmail" className="text-white">
            {translatorProfileNS('company_email')}
          </FormLabel>
          <Controller
            name="companyEmail"
            control={control}
            render={({ field }) => <Input {...field} id="companyEmail" className="text-secondary !bg-dark border !border-gray-700" />}
          />
          {errors.companyEmail?.message && <Text color="red.500">{translatorProfileNS(errors.companyEmail.message)}</Text>}
        </FormControl>

        <FormControl isInvalid={!!errors.website} mb={4}>
          <FormLabel htmlFor="website" className="text-white">
            {translatorProfileNS('website')}
          </FormLabel>
          <Controller
            name="website"
            control={control}
            render={({ field }) => (
              <Input value={field.value || ''} id="website" className="text-secondary !bg-dark border !border-gray-700" />
            )}
          />
          {errors.website?.message && <Text color="red.500">{translatorProfileNS(errors.website.message)}</Text>}
        </FormControl>

        <HStack spacing={4}>
          <FormControl isInvalid={!!errors.country} mb={4}>
            <FormLabel htmlFor="country" className="text-white">
              {translatorProfileNS('country')}
            </FormLabel>
            <Controller
              name="country"
              control={control}
              render={({ field }) => <Input {...field} id="country" className="text-secondary !bg-dark border !border-gray-700" />}
            />
            {errors.country?.message && <Text color="red.500">{translatorProfileNS(errors.country.message)}</Text>}
          </FormControl>

          <FormControl isInvalid={!!errors.postalCode} mb={4}>
            <FormLabel htmlFor="postalCode" className="text-white">
              {translatorProfileNS('postal_code')}
            </FormLabel>
            <Controller
              name="postalCode"
              control={control}
              render={({ field }) => <Input {...field} id="postalCode" className="text-secondary !bg-dark border !border-gray-700" />}
            />
            {errors.postalCode?.message && <Text color="red.500">{translatorProfileNS(errors.postalCode.message)}</Text>}
          </FormControl>
        </HStack>

        <HStack spacing={4}>
          <FormControl isInvalid={!!errors.city} mb={4}>
            <FormLabel htmlFor="city" className="text-white">
              {translatorProfileNS('city')}
            </FormLabel>
            <Controller
              name="city"
              control={control}
              render={({ field }) => <Input {...field} id="city" className="text-secondary !bg-dark border !border-gray-700" />}
            />
            {errors.city?.message && <Text color="red.500">{translatorProfileNS(errors.city.message)}</Text>}
          </FormControl>

          <FormControl isInvalid={!!errors.stateProvince} mb={4}>
            <FormLabel htmlFor="stateProvince" className="text-white">
              {translatorProfileNS('stateprovince')}
            </FormLabel>
            <Controller
              name="stateProvince"
              control={control}
              render={({ field }) => (
                <Input {...field} id="stateProvince" className="text-secondary !bg-dark border !border-gray-700" />
              )}
            />
            {errors.stateProvince?.message && <Text color="red.500">{translatorProfileNS(errors.stateProvince.message)}</Text>}
          </FormControl>
        </HStack>

        {/* Street Address */}
        <FormControl isInvalid={!!errors.streetAddress} mb={4}>
          <FormLabel htmlFor="streetAddress" className="text-white">
            {translatorProfileNS('street_address')}
          </FormLabel>
          <Controller
            name="streetAddress"
            control={control}
            render={({ field }) => <Input {...field} id="streetAddress" className="text-secondary !bg-dark border !border-gray-700" />}
          />
          {errors.streetAddress?.message && <Text color="red.500">{translatorProfileNS(errors.streetAddress.message)}</Text>}
        </FormControl>

        <FormControl mt={6}>
          <FormLabel htmlFor="profilePicture" className="text-white">
            {translatorProfileNS('profile_picture')}
          </FormLabel>
          <Box display="flex" alignItems="flex-start" gap={6}>
            <Avatar size="md" bg="gray.500" />
            <Box
              height="126px"
              width="532px"
              borderRadius="lg"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              className="bg-dark border border-gray-700"
              p={4}
            >
              <ImageIcon />
              <Text color="white" fontSize="sm" mb={1} mt={2}>
                {t('common:upload_image_help_text')}
              </Text>
              <Text color="gray.400" fontSize="xs">
                {t('common:supports_jpg_jpeg2000_png')}
              </Text>
              <input
                title={''}
                type="file"
                id="profilePicture"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="absolute top-0 left-0 opacity-0 w-full h-full cursor-pointer"
              />
            </Box>
          </Box>
        </FormControl>
      </form>
    </div>
  );
}



