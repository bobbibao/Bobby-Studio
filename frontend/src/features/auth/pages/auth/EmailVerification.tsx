import { useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Input } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

export default function EmailVerification({handleVerificationCode}: any) {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const [verificationCode, setVerificationCode] = useState<string[]>(['', '', '', '', '', '']);
  const [email, setEmail] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setEmail(params.get('email'));
  }, [location]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newCode = [...verificationCode];
    newCode[index] = e.target.value;
    setVerificationCode(newCode);
    handleVerificationCode(newCode ? newCode.join('') : '');

    if (e.target.value && index < 5) {
      const nextInput = document.getElementById(`input-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    } else if (e.target.value === '' && index > 0) {
      const prevInput = document.getElementById(`input-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const pastedValue = e.clipboardData.getData('text').slice(0, 6);
    const newCode = [...verificationCode];
    const newCodeArray = pastedValue.split('');

    for (let i = 0; i < newCodeArray.length; i++) {
      newCode[i] = newCodeArray[i];
    }

    setVerificationCode(newCode);
    handleVerificationCode(newCode);
    // Focus the last input in the pasted value range
    const lastFilledIndex = Math.min(newCodeArray.length - 1, 5);
    const nextInput = document.getElementById(`input-${lastFilledIndex}`) as HTMLInputElement;
    nextInput?.focus();
  };

  const handleSubmit = () => {
    const code = verificationCode.join('');
    if (code.length === 6) {
      alert(t('profile:verifying_code_for_email', { code, email }))
    } else {
      alert(translatorProfileNS('please_enter_a_valid_6digit_verification_code'));
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationCode.join('');


    try {
      // Use the code the user provided to attempt verification
      // const signUpAttempt = await signUp.attemptEmailAddressVerification({
      //   code,
      // });

      // if (signUpAttempt.status === 'complete') {
      //   // await setActive({ session: signUpAttempt.createdSessionId });
      //
      // } else {
      //   // If the status is not complete, check why. User may need to
      //   // complete further steps.
      //   console.error(JSON.stringify(signUpAttempt, null, 2));
      //   // onNext(false);
      //
      // }
    } catch (err: any) {
      console.error('Error:', JSON.stringify(err, null, 2));
    }
  };

  return (
    <div className="flex flex-col bg-gray-900 items-center justify-center">
      <main className="flex-grow flex justify-center items-center p-4">
        <div className="w-full max-w-md p-4 pt-0 mt-0 rounded-lg bg-gray-900">
          <h2 className="text-2xl font-semibold text-start text-white mb-6">
            {translatorProfileNS('check_your_email_for_verification')}
          </h2>
          <p className="text-start text-gray-400 mb-6">
            {translatorProfileNS('weve_sent_a_verification_code_to')}{' '}
            <span className="text-white">{email}</span>. {translatorProfileNS('please_check_your_inbox_and_enter_the_code_below_to_proceed')}
          </p>

          <div className="flex text-start justify-center mb-4">
            {verificationCode.map((digit, index) => (
              <Input
                key={index}
                id={`input-${index}`}
                type="text"
                maxLength={1}
                width="5rem"
                height="5rem"
                minWidth="5rem"
                textAlign="center"
                fontSize="2xl"
                borderColor="#2E2E2E"
                borderRadius="lg"
                backgroundColor="#0E0E0E"
                focusBorderColor="#111113"
                value={digit}
                onChange={(e) => handleChange(e, index)}
                onPaste={(e) => handlePaste(e, index)}
                border="0.5px"
                className="me-3 text-2xl text-center border"
                textColor="#111113"
              />
            ))}
          </div>

          <span className="text-secondary sm">{translatorProfileNS('didnt_receive_the_email_check_your_spam_folder_or_click')}</span>
        </div>
      </main>
    </div>
  );
}



