import React, { useState } from 'react'
import { useToast, Button, Text, VStack, Spinner, Alert, AlertIcon, Center, Box, HStack } from '@chakra-ui/react'
import { sendEmailVerification, verifyEmail } from '@/features/auth'
import { EmailIcon } from '@chakra-ui/icons'
import { ModalCommon } from '@/shared/modal'
import { auth, googleProvider } from '@/configs/firebase';
import i18n from '@/translations'
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
type Props = {
  isOpen: boolean
  onClose: () => void
  userEmail?: string
}

export default function ModalEmailVerify({ isOpen, onClose, userEmail}: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const handleResend = async () => {
    if (isResending || cooldownSeconds > 0) return;
    
    setIsResending(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      await sendEmailVerification(i18n.language || 'en');
      
      // Start cooldown period (40 seconds)
      setCooldownSeconds(40);
      const countdown = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast({
        title: translatorProfileNS('verification_email_resent'),
        description: translatorProfileNS('please_check_inbox_for_verification_link'),
        status: 'success',
        position: 'top-right',
        duration: 3000,
      });
    } catch (err: any) {
      toast({
        title: translatorProfileNS('failed_to_resend_verification_email'),
        description: err?.message || translatorProfileNS('failed_to_resend_verification_email_message'),
        status: 'error',
        position: 'top-right',
        duration: 3000,
      });
    } finally {
      setIsResending(false);
    }
  }
  const handleCheckVerified = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      await user.reload();
      if (!user.emailVerified) {
        toast({
          title: translatorProfileNS('email_not_verified_yet'),
          description: translatorProfileNS('please_check_email_and_click_verification_link'),
          status: 'warning',
          position: 'top-right',
          duration: 3000,
        });
        return;
      }
      const token = await user.getIdToken(true);
      sessionStorage.setItem('authToken', token);
      verifyEmail();
      navigate('/');
      onClose();
      
      toast({
          title: translatorNotificationNS('signup_successful'),
          description: translatorNotificationNS('you_have_successfully_signed_up'),
          status: 'success',
          position: 'top-right',
          duration: 3000,
        });
      
    } catch (err: any) {
      toast({
          title: translatorProfileNS('failed_to_check_verification'),
          description: err?.message || translatorProfileNS('failed_to_check_verification_message'),
          status: 'error',
          position: 'top-right',
          duration: 3000,
        });
    } 
  }
  return (
    <ModalCommon
      isOpen={isOpen}
      showClose={true}
      closeOnOverlayClick={true}
      size="md"
      showFooter={false}
      classNameFooter="mt-8"
      onClose={onClose}
      
      labelSubmit={"I'm Verified"}
      labelCancel={'Resend Email'}
    >
      <div className="flex justify-center">
        <Box bg="purple.50" rounded="full" p={4} display="inline-flex" alignItems="center" justifyContent="center">
          <EmailIcon boxSize={6} color="purple.600" />
        </Box>
      </div>
      
      <h1 className='text-txtPrimary dark:text-white mt-5 text-xl font-semibold text-center'>
        <strong className="text-xl">{translatorProfileNS('verify_your_email_address')}</strong>
      </h1>

      <p className="text-secondary mt-2 text-sm text-center whitespace-pre-line">
        {translatorProfileNS('we_sent_verification_link_to')} <strong>{userEmail ?? 'your email'}</strong>. {translatorProfileNS('you_must_verify_email_to_continue')}
      </p>

      <HStack mt={6} gap={5}>
        <Button 
          className='flex-1' 
          variant="outline" 
          onClick={handleResend}
          isLoading={isResending}
          isDisabled={isResending || cooldownSeconds > 0}
          loadingText={translatorProfileNS('sending')}
        >
          {cooldownSeconds > 0 ? `${translatorProfileNS('resend')} (${cooldownSeconds}s)` : translatorProfileNS('resend')}
        </Button>
        {/* <Button className='flex-1' colorScheme="purple" onClick={handleCheckVerified}>
          {translatorProfileNS('im_verified')}
        </Button> */}
      </HStack>
      
    </ModalCommon>
  )
}



