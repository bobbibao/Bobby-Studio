import React, { useState } from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  Avatar,
  HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import ImageIcon from '@/shared/icons/ImageIcon';
import PersonIcon from '@/shared/icons/PersonIcon';
import { uploadImage } from '@/features/upload';
import { useTranslation } from 'react-i18next';

const Personal: React.FC = () => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  const handleSubmit = () => {
    console.log({ firstName, lastName, jobTitle, phoneNumber, profilePicture });
    navigate('/dashboard');
  };

  const handleProfilePictureChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    console.log('handleProfilePictureChange', e.target.files);
    if (e.target.files) {
      const file = e.target.files[0];
      await uploadImage(file);
      setProfilePicture(file);
    }
  };

  return (
    <div className="flex bg-gray-900 items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-gray-900 rounded-lg p-8">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2 text-start">
            <HStack spacing={2}>
              <PersonIcon />
              <Text>{translatorProfileNS('personal_information')}</Text>
            </HStack>

          </h2>
          <p className=" text-gray-400 mb-7 text-start">
            {translatorProfileNS('provide_your_details_to_personalize_your_account_and_enhance_security')}
          </p>
        </div>
        <Box display="flex" gap={4} mt={6}>
          <FormControl isRequired>
            <FormLabel htmlFor="firstName" className="text-white">
              {translatorProfileNS('first_name')}
            </FormLabel>
            <Input
              id="firstName"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-[#2E2E2E] text-secondary border-1 !border-gray-700"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel htmlFor="lastName" className="text-white">
              {translatorProfileNS('last_name')}
            </FormLabel>
            <Input
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-[#2E2E2E] text-secondary border-1 !border-gray-700"
            />
          </FormControl>
        </Box>

        <Box display="flex" gap={4}>
          <FormControl isRequired mt={4}>
            <FormLabel htmlFor="jobTitle" className="text-white">
              {translatorProfileNS('job_title')}
            </FormLabel>
            <Input
              id="jobTitle"
              placeholder={translatorProfileNS('software_engineer')}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="bg-[#2E2E2E] text-secondary border-1 !border-gray-700"
            />
          </FormControl>

          <FormControl mt={4}>
            <FormLabel htmlFor="phoneNumber" className="text-white">
              {translatorProfileNS('phone_number')}
            </FormLabel>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="123-456-7890"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="bg-[#2E2E2E] text-secondary border-1 !border-gray-700"
            />
          </FormControl>
        </Box>

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

      </div>
    </div>
  );
};

export default Personal;



