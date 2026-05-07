import React, { useEffect, useRef } from 'react';
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Button,
  Heading,
  Input,
  Stack,
  Text,
  InputGroup,
  InputLeftElement,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormErrorMessage,
  useToast
} from "@chakra-ui/react";
import { EmailIcon, AddIcon, CloseIcon } from "@chakra-ui/icons";
import { useTranslation } from 'react-i18next';


const MAX_EMAIL_VALUES = 3;
const schema = yup.object().shape({
  emails: yup
    .array()
    .of(
      yup.string().email('invalid_email_address').required('email_is_required')
    )
    .min(1, 'at_least_one_email_is_required')
    .max(MAX_EMAIL_VALUES, 'you_can_only_add_up_to_3_emails'),
});

const InviteCollaboratorsModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const toast = useToast();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { emails: [""] }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "emails"
  });

  useEffect(() => {
    if (isOpen && fields.length === 0) {
      append(""); // Chỉ thêm nếu chưa có input
    }
    setTimeout(() => firstInputRef.current?.focus(), 0); // Đảm bảo focus chạy sau khi render
  }, [isOpen]);


  const addEmail = () => {
    if (fields.length < MAX_EMAIL_VALUES) {
      append("");
    } else {
      toast({
        title: t('notification:limit_reached'),
        description: t('notification:you_can_only_add_up_to_3_emails'),
        status: "warning",
        duration: 3000
      });
    }
  };


  const handleClose = () => {
    reset({ emails: [""] });
    onClose();
  };

  const onSubmit = async (data) => {
    try {
      // Simulate API call
      // await onSubmitProp(data);
      toast({
        title: t('notification:invitations_sent_successfully'),
        status: "success",
        duration: 3000
      });
      handleClose();
    } catch (error) {
      toast({
        title: t('notification:failed_to_send_invitations'),
        description: error.message,
        status: "error",
        duration: 3000
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered>
      <ModalOverlay />
      <ModalContent w="400px" overflow="hidden">
        <ModalHeader p={6}>
          <Heading size="md" mb={3}> {/* Updated heading style */}
            {translatorProfileNS('invite_collaborators')}
          </Heading>
        </ModalHeader>

        <ModalBody px={6}>
          <Text fontSize="sm" color="gray.500" mb={6}> {/* Updated text style */}
            {translatorProfileNS('enter_the_email_addresses_of_colleagues_youd_like_to_invite')}
          </Text>

          <form onSubmit={handleSubmit(onSubmit)} id="invite-form">
            <Stack spacing={4}>
              {fields.map((field, index) => (
                <FormControl key={field.id} isInvalid={!!errors.emails?.[index]}>
                  <InputGroup>
                    <InputLeftElement h="full">
                      <EmailIcon color="gray.400" />
                    </InputLeftElement>
                    <Controller
                      name={`emails.${index}`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          ref={index === 0 ? firstInputRef : null}
                          placeholder="colleague@company.com"
                          pl={10}
                          py={5}
                          borderColor="purple.400"
                        />
                      )}
                    />
                    {fields.length > 1 && (
                      <Button
                        size="sm"
                        position="absolute"
                        right={2}
                        top="50%"
                        transform="translateY(-50%)"
                        onClick={() => remove(index)}
                      >
                        <CloseIcon boxSize={3} />
                      </Button>
                    )}
                  </InputGroup>
                  <FormErrorMessage fontSize="sm">
                    {errors.emails?.[index]?.message ? translatorProfileNS(errors.emails?.[index]?.message) : errors.emails?.[index]?.message}
                  </FormErrorMessage>
                </FormControl>
              ))}
            </Stack>

            <Button
              variant="link"
              leftIcon={<AddIcon />}
              onClick={addEmail}
              mt={4}
              color="#2E2E2E"
              fontSize="md"
              isDisabled={fields.length >= MAX_EMAIL_VALUES}
            >
              {translatorProfileNS('add_another')}
            </Button>
          </form>
        </ModalBody>

        <ModalFooter p={6}>
          <Flex w="full" gap={3}>
            <Button
              flex={1}
              className="rounded-lg dark:!bg-[transparent]"
              variant="outline"
              h={9}
              onClick={handleClose}
            >
              {translatorProfileNS('cancel')}
            </Button>
            <Button
              type="submit"
              form="invite-form"
              flex={1}
              h={9}
              colorScheme="blue"
              isLoading={isSubmitting}
            >
              {translatorProfileNS('send_invites')}
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InviteCollaboratorsModal;



