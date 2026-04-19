import { useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Box, Radio, RadioGroup, HStack, Text } from '@chakra-ui/react';
import PersonalIcon from '@/shared/icons/PersonalIcon';
import CompanyIcon from '@/shared/icons/CompanyIcon';
import PersonIcon from '@/shared/icons/PersonIcon';
import { useTranslation } from 'react-i18next';

interface ChooseAccountProps {
  onAccountChoice: (accountType: string) => void;
}

const ChooseAccount: React.FC<ChooseAccountProps> = ({ onAccountChoice }) => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const [accountType, setAccountType] = useState<string>('personal');
  const [email, setEmail] = useState<string | null>(null);
  const location = useLocation();

  const handleAccountSelection = (value: string) => {
    setAccountType(value);
    onAccountChoice(value);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setEmail(params.get('email'));
  }, [location]);

  return (
    <div className="flex flex-col bg-gray-900 items-center justify-center p-0">
      <main className="w-full max-w-xl  flex-grow flex justify-center items-center">
        <div className="">
          <h2 className="text-2xl font-semibold text-white mb-2 text-start">
            <HStack spacing={2}>
              <PersonIcon />
              <Text>{translatorProfileNS('choose_your_account_type')}</Text>
            </HStack>
          </h2>
          <p className="text-start text-gray-400 mb-7">
            {translatorProfileNS('select_between_a_personal_account_for_individual_use_or_a_company_account_to_manage_team_access_and_resources')}
          </p>
          <RadioGroup onChange={handleAccountSelection} value={accountType}>
            <HStack spacing={6} justify="center" align="center">
              <Box
                display="flex"
                alignItems="center"
                className="bg-dark"
                justifyContent="space-between"
                p={4}
                borderRadius="lg"
                h="60px"
                w="292px"
              >
                <HStack spacing={4}>
                  <PersonalIcon />
                  <Text color="white">{translatorProfileNS('myself_only')}</Text>
                </HStack>
                <Radio value="personal" colorScheme="bg-primary" className='bg-primary'/>
              </Box>

              <Box
                display="flex"
                alignItems="center"
                className="bg-dark"
                justifyContent="space-between"
                p={4}
                borderRadius="lg"
                h="60px"
                w="292px"
              >
                <HStack spacing={4}>
                  <CompanyIcon />
                  <Text color="white">{translatorProfileNS('company')}</Text>
                </HStack>
                <Radio value="company" colorScheme="bg-primary" className='bg-primary'/>
              </Box>
            </HStack>
          </RadioGroup>
        </div>
      </main>
    </div>
  );
}

export default ChooseAccount;


