import React, { useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import EmailVerification from '../../features/auth/pages/auth/EmailVerification';
import { Button } from '@chakra-ui/react';
import ChooseAccount from '../../features/auth/pages/auth/ChooseAccount';
import Personal from '../../features/auth/pages/auth/Personal';
import Company from '../../features/auth/pages/auth/Company';
import { LogoBobbyFull } from '@/shared/logo';
import ThemedSelect from '@/components/ThemedSelect';
import { languageOptions } from '@/constants';
import { changeLanguage } from 'i18next';
import { useTranslation } from 'react-i18next';

const OnboardingLayout: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<string>('personal');
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<any>(languageOptions[0]);

  useEffect(() => {
    const langLocalStorage = localStorage.getItem('i18nextLng') || languageOptions[0]?.value;
    changeLanguage(langLocalStorage)
  }, []);

  useEffect(() => {
    if (language) changeLanguage(language.value);
  }, [language]);

  const handleContinue = async (allowed = false) => {
    switch (true) {
      case location.pathname.includes('/onboarding/verification'):
        await handleVerify();
        navigate('/onboarding/account');
        break;
      case location.pathname.includes('/onboarding/account'):
        switch (accountType) {
          case 'personal':
            navigate('/onboarding/personal');
            break;
          case 'company':
            navigate('/onboarding/company');
            break;
          default:
            console.error('Invalid account type');
        }
        break;
      // case location.pathname.includes('/onboarding/personal'):
      // case location.pathname.includes('/onboarding/company'):
      //   navigate('/onboarding/pricing');
      //   break;
      default:
        navigate('/');
        console.error('Unknown route');
    }

    // if (location.pathname.includes('/onboarding/verification')) {
    //   navigate('/onboarding/account');
    // } else if (location.pathname.includes('/onboarding/account')) {
    //     if (accountType === 'personal') {
    //       navigate('/onboarding/personal');
    //     } else if (accountType === 'company') {
    //       navigate('/onboarding/company');
    //     }
    // }
  };

  const handleAccountChoice = (accountType: string) => {
    setAccountType(accountType);
  };

  const handleVerificationCode = (code: string) => {
    setCode(code);
  };

  const handleVerify = async () => {
    try {
      // // Use the code the user provided to attempt verification
      // const signUpAttempt = await signUp.attemptEmailAddressVerification({
      //   code,
      // });
      //
      // if (signUpAttempt.status === 'complete') {
      //   await setActive({ session: signUpAttempt.createdSessionId });
      // } else {
      //   console.error(JSON.stringify(signUpAttempt, null, 2));
      //   // onNext(false);
      //
      // }
    } catch (err: any) {
      console.error('Error:', JSON.stringify(err, null, 2));
    }
  };

  return (
    <div className="flex flex-col min-screen bg-gray-900">
      <header className="py-6 px-4 w-full flex justify-between items-center bg-dark">
        <LogoBobbyFull className='text-white' />
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
          isDarkMode
        />
      </header>

      <main className="flex justify-center items-center h-[calc(100vh-166px)] overflow-auto">
        <Routes>
          <Route path="/verification" element={<EmailVerification handleVerificationCode={handleVerificationCode} />} />
          <Route path="/account" element={<ChooseAccount onAccountChoice={handleAccountChoice} />} />
          <Route path="/personal" element={<Personal />} />
          <Route path="/company" element={<Company />} />
        </Routes>
      </main>

      <footer className="w-full flex justify-end items-center px-4 py-6 bg-dark">
        <Button onClick={() => handleContinue()} size="sm" className=" px-4 bg-primary" variant="solid" colorScheme="primary">
          {t('common:continue_')}
        </Button>
      </footer>
    </div>
  );
};

export default OnboardingLayout;

