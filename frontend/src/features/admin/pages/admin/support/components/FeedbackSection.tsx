import {
  Text,
  Button,
  FormControl,
  FormLabel,
  Box,
  Textarea,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import Rating from '@/shared/rating';
import { useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { useTranslation } from 'react-i18next';

export function FeedbackSection() {
  const { t } = useTranslation();
  const buttonRef = useRef<any>(null);
  const [editing, setEditing] = useState(false)

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = (values: any) => {
    console.log('Values: ', values);
  };

  const handleOnChangeButton = () => {
    if (editing) {
      buttonRef.current.submit();
      return;
    }

    setEditing(!editing);
  };

  return (
    <div className="flex flex-col w-full max-w-[600px] mx-auto my-0">
      <div className="flex flex-row justify-between my-6">
        <div className="flex flex-col">
          <Text as="b" fontSize="24px">
          {t('support:share_your_thoughts')}
          </Text>
          <Text fontSize="14px" className="text-secondary">
            {t('support:share_your_thoughts_description')}
          </Text>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box margin="w-full" display="flex" flexDirection="column" gap="16px">
          <Rating onChange={(value: any) => console.log(value)} />
          <FormControl>
            <FormLabel>{t('support:what_did_you_find_helpful')}</FormLabel>
            <Textarea
              {...register('text1')}
              as={TextareaAutosize}
              w="100%"
              resize="none"
              minRows={3}
            />
          </FormControl>
          <FormControl>
            <FormLabel>{t('support:what_could_be_improved')}</FormLabel>
            <Textarea
              {...register('text2')}
              as={TextareaAutosize}
              w="100%"
              resize="none"
              minRows={3}
            />
          </FormControl>
          <FormControl>
            <FormLabel>{t('support:other_comments')}</FormLabel>
            <Textarea
              {...register('text3')}
              as={TextareaAutosize}
              w="100%"
              resize="none"
              minRows={3}
            />
          </FormControl>
          <div className="flex justify-end mt-4">
            <Button type="submit" ref={buttonRef} className="rounded-lg">
              {t('common:submit')}
            </Button>
          </div>
        </Box>
      </form>
    </div>
  );
}



