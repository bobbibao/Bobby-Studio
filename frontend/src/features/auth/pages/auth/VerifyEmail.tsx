import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast,Switch, useColorMode, Text, Flex } from '@chakra-ui/react';
import { applyActionCode } from 'firebase/auth';
import { auth } from '@/configs/firebase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { verifyEmail } from '@/features/auth';
export default function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const navigate = useNavigate();
  
  const { t, i18n } = useTranslation();
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  useEffect(() => {
    const oobCode = searchParams.get('oobCode');
    
    if (!oobCode) {
      setStatus('error');
      return;
    }
    applyActionCode(auth, oobCode)
      .then(() => {
        setStatus('success');
        toast({
          title: translatorNotificationNS('email_verify_successful'),
          description: translatorNotificationNS('you_have_successfully_verified_your_email_login_again'),
          status: 'success',
          position: 'top-right',
          duration: 3000,
        })
        navigate("/");
      })
      .catch(() => setStatus('error'));
  }, [searchParams]);

  const toggleTheme = () => toggleColorMode();

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`max-w-md w-full mx-4 p-8 rounded-2xl shadow-2xl transition-colors duration-300 ${
        isDark ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Theme Toggle */}
        <Flex position="absolute" right="12px" top="12px" align="center" gap={2}>
          <Text as="label" htmlFor="darkmode" fontSize="sm" className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`} fontWeight="normal" cursor="pointer">
            {t('common:dark_mode')}
          </Text>
          <Switch
            id="darkmode"
            isChecked={isDark}
            ml={1}
            colorScheme="whiteAlpha"
            onChange={toggleTheme}
          />
        </Flex>

        {/* Content */}
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-4">
                <Loader2 
                  size={64} 
                  className={`animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                />
              </div>
              <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('common:verify_verifying')}
              </h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('common:verify_wait')}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle 
                  size={64} 
                  className={`${isDark ? 'text-green-400' : 'text-green-600'}`}
                />
              </div>
              <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('common:verify_success_title')}
              </h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('common:verify_success_message')}
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <XCircle 
                  size={64} 
                  className={`${isDark ? 'text-red-400' : 'text-red-600'}`}
                />
              </div>
              <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('common:verify_error_title')}
              </h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('common:verify_error_message')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}



