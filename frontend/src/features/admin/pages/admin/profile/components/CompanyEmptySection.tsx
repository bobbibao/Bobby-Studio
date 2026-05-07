import { Box, Button, Text, VStack, useColorModeValue } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { FaBuilding } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

interface CompanyEmptySectionProps {
  onAction: (actionType: string) => void;
}

const CompanyEmptySection: React.FC<CompanyEmptySectionProps> = ({ onAction }) => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const navigate = useNavigate();
  const iconBg = useColorModeValue('zinc.100', 'zinc.800');
  const iconColor = useColorModeValue('zinc.600', 'zinc.400');
  const buttonBg = useColorModeValue('black', 'white');
  const buttonColor = useColorModeValue('white', 'black');
  const buttonHoverBg = useColorModeValue('zinc.800', 'zinc.100');
  
  return (
    <Box display="flex" flexDirection="column" align="center" justify="center" h="calc(100vh - 210px)">
      <VStack spacing={4} textAlign="center">
        {/* Icon */}
        <Box p={4} bg={iconBg} borderRadius="xl">
          <Box as={FaBuilding} color={iconColor} fontSize="4xl" />
        </Box>

        {/* Text */}
        <Text fontSize="xl" fontWeight="semibold" color={useColorModeValue('zinc.900', 'white')}>
          {translatorProfileNS('you_are_using_a_personal_account')}
        </Text>
        <Text color={useColorModeValue('zinc.600', 'zinc.400')}>
          {translatorProfileNS('create_a_company_account_to_unlock_business_tools')}
        </Text>

        {/* Button */}
        <Button
          onClick={() => onAction('CREATE_COMPANY_PROFILE')}
          bg={buttonBg}
          color={buttonColor}
          px={6}
          py={2}
          borderRadius="md"
          _hover={{ bg: buttonHoverBg }}
        >
          {translatorProfileNS('create_company_account')}
        </Button>
      </VStack>
    </Box>
  );
}
export default CompanyEmptySection;



