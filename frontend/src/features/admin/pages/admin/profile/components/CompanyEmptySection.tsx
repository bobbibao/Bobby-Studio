import { Box, Button, Text, VStack, useColorModeValue } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { FaBuilding } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';

interface CompanyEmptySectionProps {
  onAction: (actionType: string) => void;
}

const CompanyEmptySection: React.FC<CompanyEmptySectionProps> = ({ onAction }) => {
  const { t, i18n } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const isViet = i18n.language?.toLowerCase().startsWith('vi');

  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.8)', 'rgba(15, 17, 26, 0.7)');
  const cardBorder = useColorModeValue('rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.08)');
  
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minH="500px" py={12} px={4}>
      <Box
        maxW="540px"
        w="full"
        p={8}
        borderRadius="24px"
        bg={cardBg}
        backdropFilter="blur(20px)"
        border="1px solid"
        borderColor={cardBorder}
        boxShadow="0 24px 48px -12px rgba(0, 0, 0, 0.15)"
        textAlign="center"
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        {/* Futuristic Icon Container */}
        <Box
          p={5}
          borderRadius="2xl"
          bg={useColorModeValue('rgba(127, 86, 217, 0.08)', 'rgba(139, 92, 246, 0.15)')}
          border="1px solid"
          borderColor={useColorModeValue('rgba(127, 86, 217, 0.25)', 'rgba(168, 85, 247, 0.35)')}
          boxShadow="0 0 24px rgba(127, 86, 217, 0.25)"
          mb={5}
        >
          <Box as={FaBuilding} color="brand.400" fontSize="3xl" />
        </Box>

        <Box
          px={3}
          py={1}
          rounded="full"
          bg={useColorModeValue('rgba(127, 86, 217, 0.08)', 'rgba(139, 92, 246, 0.15)')}
          border="1px solid"
          borderColor={useColorModeValue('rgba(127, 86, 217, 0.25)', 'rgba(168, 85, 247, 0.3)')}
          fontSize="2xs"
          fontWeight="700"
          color="brand.400"
          letterSpacing="0.06em"
          textTransform="uppercase"
          mb={3}
        >
          ✦ Enterprise Organization
        </Box>

        {/* Text */}
        <Text fontSize="xl" fontWeight="700" color="text.primary" letterSpacing="-0.01em" mb={2}>
          {translatorProfileNS('you_are_using_a_personal_account')}
        </Text>
        <Text fontSize="sm" color="text.muted" maxW="400px" mb={6} lineHeight="1.6">
          {translatorProfileNS('create_a_company_account_to_unlock_business_tools')}
        </Text>

        {/* Action Button */}
        <Button
          onClick={() => onAction('CREATE_COMPANY_PROFILE')}
          background="linear-gradient(135deg, #7F56D9 0%, #6366F1 100%)"
          color="white"
          px={10}
          h="50px"
          minH="50px"
          minW="240px"
          borderRadius="full"
          fontSize="md"
          fontWeight="700"
          _hover={{
            opacity: 0.94,
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 28px -4px rgba(127, 86, 217, 0.45)',
          }}
          transition="all 0.25s ease"
        >
          {translatorProfileNS('create_company_account')}
        </Button>
      </Box>
    </Box>
  );
}
export default CompanyEmptySection;



