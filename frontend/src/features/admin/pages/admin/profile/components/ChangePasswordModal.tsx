import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormLabel,
  FormControl,
  Input,
  ModalFooter,
  useToast,
  FormErrorMessage,
  Text,
  Button as ChakraButton,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';

import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { auth } from '@/configs/firebase';
import { useTranslation } from 'react-i18next';

const ChangePasswordModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);

  const toast = useToast();
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setIsGoogleUser(user.providerData[0]?.providerId === 'google.com');
    }
  }, []);

  // ✅ Schema validation (bỏ currentPassword nếu user login bằng Google)
  const schema = yup.object().shape({
    currentPassword: isGoogleUser
      ? yup.string()
      : yup.string().required('current_password_is_required'),
    newPassword: yup
      .string()
      .min(6, 'new_password_must_be_at_least_6_characters')
      .required('new_password_is_required'),
  });

  // ✅ Set up React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
  });

  // //_Abcd@1234
  //     //_Abcd@12342
  const handleChangePassword = async (data: {
    currentPassword?: string;
    newPassword: string;
  }) => {
    const user = auth.currentUser;
    if (!user) {
      toast({
        title: translatorNotificationNS('no_authenticated_user'),
        status: 'error',
        duration: 3000,
      });
      return;
    }

    try {
      if (!isGoogleUser) {
        // 🔹 User signed in with email/password → reauthenticate using EmailAuthProvider
        const credential = EmailAuthProvider.credential(
          user.email!,
          data.currentPassword!
        );
        await reauthenticateWithCredential(user, credential);
      } else {
        // 🔹 User signed in with Google → reauthenticate using GoogleAuthProvider
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await reauthenticateWithCredential(
          user,
          GoogleAuthProvider.credentialFromResult(result)!
        );
      }

      // ✅ If reauthentication is successful, update the password
      await updatePassword(user, data.newPassword);
      toast({
        title: translatorNotificationNS('password_changed_successfully'),
        status: 'success',
        duration: 3000,
      });
      reset();
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: translatorNotificationNS('failed_to_change_password'),
        description: error.message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(handleChangePassword)}>
        <ModalHeader textAlign={"center"} className="mt-2">{translatorProfileNS('change_your_password')}</ModalHeader>
        <Text fontSize="sm" textAlign={"center"}>
          {translatorProfileNS('secure_your_account_by_updating_your_password')}
        </Text>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {!isGoogleUser && (
            <FormControl isInvalid={!!errors.currentPassword}>
              <FormLabel>{translatorProfileNS('current_password')}</FormLabel>
              <Input
                type="password"
                placeholder={translatorProfileNS('enter_your_current_password')}
                {...register('currentPassword')}
              />
              <FormErrorMessage>
                {errors.currentPassword?.message ? translatorProfileNS(errors.currentPassword?.message) : errors.currentPassword?.message}
              </FormErrorMessage>
            </FormControl>
          )}

          {/* ✅ New Password */}
          <FormControl mt={4} isInvalid={!!errors.newPassword}>
            <FormLabel>{translatorProfileNS('new_password')}</FormLabel>
            <Input
              type="password"
              placeholder={translatorProfileNS('enter_your_new_password')}
              {...register('newPassword')}
            />
            <FormErrorMessage>{errors.newPassword?.message ? translatorProfileNS(errors.newPassword?.message) : errors.newPassword?.message}</FormErrorMessage>
          </FormControl>
        </ModalBody>

        <ModalFooter display="flex" justifyContent="center" gap={4}>
          <ChakraButton
            variant="secondary"
            onClick={onClose}
            flex={1}
          >
            {t("common:cancel")}
          </ChakraButton>
          <ChakraButton
            variant="solid"
            type="submit"
            isLoading={isSubmitting}
            flex={1}
          >
            {t("common:change")}
          </ChakraButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ChangePasswordModal;



