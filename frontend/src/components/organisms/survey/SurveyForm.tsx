import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setStep, updateFormData, setCompleted } from '@/slices/formSlice';
import { useForm, FormProvider } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSearchParams } from 'react-router-dom';
import * as surveyAPI from '@/features/surveys';
import Step1 from './SignUpSteps/Step1';
import Step2 from './SignUpSteps/Step2';
import Step3 from './SignUpSteps/Step3';
import Step4 from './SignUpSteps/Step4';
import Step5 from './SignUpSteps/Step5';
import Step6 from './SignUpSteps/Step6';
import { RootState } from '@/store';
import { submitSurvey } from '@/features/surveys';
import './style.scss';
import {
  Button,
  Text,
  Step,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  Flex,
  useColorModeValue,
  Box,
  Stepper,
  Container,
  Image,
  // Stepper,
} from '@chakra-ui/react';
import BobbyLogoIcon from '@/shared/icons/BobbyLogoIcon';
import BobbyTextIcon from '@/shared/icons/BobbyTextIcon';
import survey_image from '@/assets/img/survey/survey-1.png';
import { setHasCompletedSurvey } from '@/slices/currentUserSlice';
import { useNavigate } from 'react-router-dom';
import VizStepper from './VizStepper';
import ChevronLeftIcon from '@/shared/icons/ChevronLeftIcon';
import ChevronRightIcon from '@/shared/icons/ChevronRightIcon';
import { useTranslation } from 'react-i18next';
import { LogoBobbyFull } from '@/shared/logo';
import ThemedSelect from '@/components/ThemedSelect';
import { languageOptions } from '@/constants';
import { changeLanguage } from 'i18next';

const yupSchemas = [
  yup.object().shape({
    // name: yup.string().required('Name is required'),
    // phone: yup.string().required('Phone is required'),
  }),
  yup.object().shape({
    // email: yup
    //   .string()
    //   .email('Invalid email format')
    //   .required('Email is required'),
  }),
  yup.object().shape({}),
  yup.object().shape({}),
  yup.object().shape({}),
  yup.object().shape({}),
];

interface SignUpProps {
  initialStep?: number;
}

const SurveyForm: React.FC<SignUpProps> = ({ initialStep = 0 }) => {
  const { t } = useTranslation();
  const { step, data, completed } = useSelector((state: RootState) => state.survey);
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<any>(languageOptions[0]);

  useEffect(() => {
    const langLocalStorage = localStorage.getItem('i18nextLng') || languageOptions[0]?.value;
    changeLanguage(langLocalStorage);
  }, []);

  useEffect(() => {
    if (language) changeLanguage(language.value);
  }, [language]);

  const methods = useForm({
    mode: 'onChange',
    resolver: yupResolver(yupSchemas[step]),
    defaultValues: data,
  });

  const CurrentStepComponent = [Step1, Step2, Step3, Step4, Step5, Step6][step];
  useEffect(() => {
    if (initialStep < 0 || initialStep >= yupSchemas.length) {
      dispatch(setStep(0));
    } else {
      dispatch(setStep(initialStep));
    }
  }, [dispatch, initialStep]);

  useEffect(() => {
    if (completed) {
    }
  }, [completed]);

  useEffect(() => {
    const action = searchParams.get('action');

    if (action === 'clear') {
      const clearSurvey = async () => {
        await surveyAPI.clear();
        window.location.href = '/survey';
      };
      clearSurvey();
    }
  }, [searchParams, navigate]);

  const nextStep = async () => {
    const isValid = await methods.trigger();
    if (isValid) {
      const formData = methods.getValues();
      dispatch(updateFormData(methods.getValues()));
      dispatch(setStep(step + 1));
    }
  };

  const prevStep = () => {
    dispatch(setStep(Math.max(0, step - 1)));
  };

  const handleSkip = async () => {
    const isValid = await methods.trigger();
    if (isValid) {
      dispatch(updateFormData(methods.getValues()));
      const formData = methods.getValues();
      await submitSurvey(formData);
      dispatch(setHasCompletedSurvey(true));
      navigate('/home');
    }
  };

  const onSubmit = async (data: Record<string, any>) => {
    dispatch(updateFormData(data));
    dispatch(setCompleted(true));

    await submitSurvey(data);
    dispatch(setHasCompletedSurvey(true));
    navigate('/home');
  };

  const steps = [
    {
      title: 'welcome_to_bobby',
      description: 'lets_get_started_by_setting_up_your_account_and_preferences',
    },
    { title: 'next_up', description: 'just_a_few_more_steps' },
    { title: 'almost_there', description: 'were_setting_things_up_for_you' },
    { title: 'customize', description: 'make_it_yours' },
    { title: 'explore_features', description: 'unlock_the_power_of_bobby' },
    { title: 'youre_all_set', description: 'get_started_and_enjoy' },
  ];

  return (
    <div className="survey-form">
      <FormProvider {...methods}>
        <div>
          {/* Simplified Top Header */}
          <Flex
            position="fixed"
            top="0"
            left="0"
            right="0"
            bg={useColorModeValue('white', 'gray.900')}
            alignItems="center"
            justifyContent="space-between"
            shadow="md"
            p={4}
            zIndex="10"
          >
            <LogoBobbyFull />
            <ThemedSelect
              options={languageOptions}
              className="!max-w-24"
              value={languageOptions.find((opt) => opt.value === language?.value)}
              onChange={(selected: any) => setLanguage(selected)}
              formatOptionLabel={(opt: any) => opt?.shortLabel}
              customStyles={{
                control: (base: any) => ({
                  ...base,
                  backgroundColor: 'transparent',
                  border: 'none',
                }),
              }}
            />
          </Flex>

          {/* Form Content (keep your existing form content) */}
          <form id="survey-form" onSubmit={methods.handleSubmit(onSubmit)} className="pt-14">
            <Container
              maxW="container.xl"
              p={0}
              pb={{ base: '76px', lg: 0 }} // Add bottom padding equal to footer height
              minH="calc(100vh - 132px)" // Adjust for header height
            >
              <Flex
                direction={{ base: 'column', lg: 'row' }}
                gap={4}
                minH="inherit" // Inherit container height
              >
                {/* Step Content */}
                <Box
                  flex="1"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  // overflowY="auto" // Enable scrolling if content is too long
                >
                  <Box
                    py={10}
                    width="full"
                    maxW="3xl"
                    textAlign={{ base: 'center', md: 'left' }}
                    px={4} // Add side padding for mobile
                  >
                    <Text fontSize="3xl" fontWeight="bold" mb={4}>
                      {t('profile:' + steps[step].title)}
                    </Text>
                    <Text fontSize="xl" mb={8}>
                      {t('profile:' + steps[step].description)}
                    </Text>
                    <div className="overflow-auto h-[calc(100vh-334px)]">
                      <CurrentStepComponent />
                    </div>
                  </Box>
                </Box>

                {/* Survey Image - Hidden on small screens */}
                <Box
                  flex="1"
                  width={{ lg: '33.333%' }}
                  display={{ base: 'none', lg: 'flex' }}
                  justifyContent="center"
                  alignItems="center"
                  p={4}
                >
                  <Image
                    src={survey_image}
                    alt="Survey"
                    maxW="300px"
                    maxH="500px"
                    objectFit="contain"
                    borderRadius="md"
                    boxShadow="lg"
                  />
                </Box>
              </Flex>
            </Container>
          </form>
        </div>
      </FormProvider>

      {/* Fixed Bottom Navigation */}
      <Flex
        position="fixed"
        bottom="0"
        left="0"
        right="0"
        h="76px" // Explicit height
        bg={useColorModeValue('white', '#1E1E1E')}
        p={4}
        borderTopWidth="1px"
        borderTopColor={useColorModeValue('gray.200', 'gray.700')}
        zIndex="10"
        gap={4}
        justifyContent="space-between"
        alignItems="center"
      >
        {/* Left Section - Previous Button */}
        <Box flex="1">
          {step > 0 && (
            <Button
              onClick={prevStep}
              variant="ghost"
              leftIcon={<ChevronLeftIcon />}
              // color={useColorModeValue('gray.600', 'gray.300')}
              // bg={useColorModeValue('white', '#1E1E1E')}
              // _hover={{ bg: useColorModeValue('gray.100', 'gray.700') }}
            >
              {t('common:back')}
            </Button>
          )}
        </Box>

        {/* Centered Stepper Section */}
        <Box flex="2" maxW="400px" mx={4} display="flex" justifyContent="center">
          <VizStepper numberOfSteps={steps.length} currentStep={step + 1} />
        </Box>

        {/* Right Section - Navigation Buttons */}
        <Flex flex="1" justifyContent="flex-end" gap={2}>
          <Button
            onClick={handleSkip}
            variant="outline"
            color={useColorModeValue('#111113', '#2E2E2E')}
            borderColor={useColorModeValue('#111113', '#2E2E2E')}
            bg={useColorModeValue('white', '#1E1E1E')}
          >
            {t('common:skip')}
          </Button>

          {step < steps.length - 1 ? (
            <Button
              onClick={nextStep}
              colorScheme="primary"
              rightIcon={<ChevronRightIcon color="white" />}
              color="white"
              _dark={{ color: 'gray.100' }}
            >
              {t('common:next')}
            </Button>
          ) : (
            <Button onClick={methods.handleSubmit(onSubmit)} colorScheme="primary" color="white" _dark={{ color: 'gray.100' }}>
              {t('common:submit')}
            </Button>
          )}
        </Flex>
      </Flex>
    </div>
  );
};

export default SurveyForm;

