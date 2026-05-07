import React, { useState, useEffect } from 'react';
import { Button, FormControl, Switch, useToast, Box, Flex, Text, useColorModeValue, Link } from '@chakra-ui/react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { getPrivacySettings, updatePrivacySettings } from '@/features/privacy';
import { PrivacySettingsDto } from '@/types/privacy';
import PrivacySectionContentLoader from '@/features/admin/pages/admin/profile/components/PrivacySectionContentLoader';
import { useTranslation } from 'react-i18next';

type FormValues = PrivacySettingsDto;

const schema = yup.object({
  dataProcessing: yup.boolean(),
  newsletter: yup.boolean(),
  termsAccepted: yup.boolean(),
  privacyAccepted: yup.boolean(),
}).required();


export function PrivacySection() {
  const { t, i18n } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);

  // Get language prefix for links (de, en, vn)
  const getLanguagePrefix = () => {
    const lang = i18n.language?.toLowerCase() || 'en';
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('vi')) return 'vn';
    return 'en';
  };
  const langPrefix = getLanguagePrefix();
  
  // Chakra color values
  const cardBg = useColorModeValue('white', 'zinc.950');
  const cardBorderColor = useColorModeValue('zinc.200', 'zinc.700');
  const cardShadow = useColorModeValue('none', '0 20px 60px rgba(17,17,19,0.08)');
  const rowBg = useColorModeValue('white', 'zinc.800');
  const rowBorderColor = useColorModeValue('zinc.200', 'whiteAlpha.100');
  const titleColor = useColorModeValue('zinc.900', 'white');
  const descriptionColor = useColorModeValue('zinc.600', 'zinc.400');
  const sectionSubtextColor = useColorModeValue('zinc.600', 'zinc.400');

  const [editing, setEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [initialValues, setInitialValues] = useState<any>(null);
  const toast = useToast();
  const settingsList: Array<{
    key: keyof FormValues;
    title: string;
    description: string;
    link?: string;
  }> = [
    {
      key: 'dataProcessing',
      title: translatorProfileNS('data_processing_consent'),
      description: translatorProfileNS('i_consent_to_the_processing_of_my_personal_data_for_service_improvement_and_analytics'),
      link: `/${langPrefix}/privacy-policy`,
    },
    {
      key: 'newsletter',
      title: translatorProfileNS('newsletter_subscription'),
      description: translatorProfileNS('subscribe_to_receive_our_newsletter_and_promotional_emails'),
    },
  ];

  const {
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      dataProcessing: false,
      newsletter: false,
      termsAccepted: false,
      privacyAccepted: false,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await getPrivacySettings();
        setInitialValues(response); // Lưu giá trị ban đầu
        reset(response);
      } catch (error) {
        toast({
          title: translatorNotificationNS('failed_to_load_privacy_settings'),
          status: 'error',
          duration: 3000,
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchSettings();
  }, [reset, toast]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await updatePrivacySettings(values);
      toast({ title: translatorNotificationNS('privacy_settings_updated_successfully'), status: 'success', duration: 3000 });
      setEditing(false);
      setInitialValues(values);
      reset(values); // Reset form state to new values (isDirty becomes false)
    } catch (error) {
      toast({ title: translatorNotificationNS('failed_to_update_privacy_settings'), status: 'error', duration: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  // const handleOnChangeButton = () => {
  //   if (editing) {
  //     handleSubmit(onSubmit)();
  //   } else {
  //     setEditing(true);
  //   }
  // };

  return (
    <Box position="relative" display="flex" flexDirection="column" h="full" w="full">
      <Box w="full" maxW="3xl" display="flex" flexDirection="column" gap={6} pb="25px" flexGrow={1}>
        <Box mb={4} display="flex" flexDirection="column" gap={1}>
          <Text fontSize="xl" fontWeight="medium" color={titleColor}>
            {translatorProfileNS('privacy__data')}
          </Text>
          <Text fontSize="sm" color={sectionSubtextColor}>
            {translatorProfileNS('manage_your_data_preferences_and_understand_our_commitment_to_privacy')}
          </Text>
        </Box>

        {isFetching ? (
          <PrivacySectionContentLoader />
        ) : (
          <Box as="form" onSubmit={handleSubmit(onSubmit)} w="full">
            <Box mb={6} w="full" borderRadius="xl" borderWidth="1px" borderColor={cardBorderColor} bg={cardBg} p={6} boxShadow={cardShadow}>
              <Flex direction="column" gap={4}>
                {settingsList.map((setting) => {
                  const fieldError = errors[setting.key];
                  const rawMessage = fieldError?.message as string | undefined;
                  const errorMessage = rawMessage ? translatorProfileNS(rawMessage) : undefined;

                  return (
                    <FormControl key={setting.key} isInvalid={!!fieldError}>
                      <Flex
                        direction={{ base: 'column', sm: 'row' }}
                        gap={3}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor={rowBorderColor}
                        bg={rowBg}
                        px={5}
                        py={4}
                        boxShadow="none"
                        align={{ sm: 'center' }}
                        justify={{ sm: 'space-between' }}
                      >
                        <Box flex={1}>
                          {setting.link ? (
                            <Link href={setting.link} isExternal fontSize="base" fontWeight="medium" color={titleColor} _hover={{ textDecoration: 'underline', color: 'purple.500' }}>
                              {setting.title}
                            </Link>
                          ) : (
                            <Text fontSize="base" fontWeight="medium" color={titleColor}>{setting.title}</Text>
                          )}
                          <Text fontSize="sm" color={descriptionColor}>{setting.description}</Text>
                          {errorMessage && <Text mt={2} fontSize="xs" color="red.400">{errorMessage}</Text>}
                        </Box>
                        <Controller
                          control={control}
                          name={setting.key}
                          render={({ field }) => (
                            <Switch
                              {...field}
                              isChecked={!!field.value}
                              onChange={(event) => field.onChange(event.target.checked)}
                              // isDisabled={!editing}
                              colorScheme="purple"
                              size="lg"
                            />
                          )}
                        />
                      </Flex>
                    </FormControl>
                  );
                })}
              </Flex>
            </Box>
          </Box>
        )}
      </Box>

      <Box 
        position="sticky" 
        bottom={0} 
        mx={-4} 
        mb={-4} 
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
}




