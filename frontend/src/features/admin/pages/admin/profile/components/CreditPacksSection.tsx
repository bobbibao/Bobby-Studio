import React from 'react';
import {
  Box,
  Flex,
  Text,
  Badge,
  Table,
  TableContainer,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { CREDIT_PACKS } from '@/features/admin/pages/admin/profile/constants/subscriptionPlans';

// Coin icon
const CoinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-zinc-400">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const CreditPacksSection: React.FC = () => {
  const { t } = useTranslation();

  // Color mode values
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const borderColor = useColorModeValue('zinc.200', 'zinc.700');
  const tableBg = useColorModeValue('white', 'transparent');
  const proBg = useColorModeValue('zinc.50', 'zinc.800');
  const proBorderColor = useColorModeValue('zinc.300', 'zinc.600');

  // Format credits with apostrophes
  const formatCredits = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  };

  return (
    <Box w="full" mt={12}>
      {/* Section Header */}
      <Box mb={8}>
        {/* Badge */}
        <Badge
          bg="transparent"
          color={mutedTextColor}
          px={3}
          py={1.5}
          borderRadius="full"
          fontSize="xs"
          fontWeight="medium"
          textTransform="uppercase"
          letterSpacing="wider"
          mb={4}
          display="inline-flex"
          alignItems="center"
          gap={2}
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Box color={mutedTextColor}>
            <CoinIcon />
          </Box>
          {t('profile:credit_packs')}
        </Badge>

        {/* Title */}
        <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="semibold" color={textColor} mb={3}>
          {t('profile:buy_additional_credits')}
        </Text>

        {/* Subtitle */}
        <Text fontSize="md" color={mutedTextColor} maxW="600px" lineHeight="tall">
          {t('profile:credit_packs_description')}
        </Text>
      </Box>

      {/* Credit Packs Table */}
      <TableContainer bg={tableBg}>
        <Table variant="simple" size="md">
          <Thead>
            <Tr>
              <Th
                borderColor={borderColor}
                borderBottomWidth="1px"
                textTransform="none"
                fontSize="sm"
                fontWeight="normal"
                color={mutedTextColor}
                py={4}
                px={4}
                w="25%"
              >
                Credits
              </Th>
              <Th
                borderColor={borderColor}
                borderBottomWidth="1px"
                textTransform="none"
                fontSize="sm"
                textAlign="center"
                py={4}
                w="25%"
              >
                <Text fontWeight="normal" color={mutedTextColor}>
                  Basic
                </Text>
                <Text fontSize="xs" color={mutedTextColor} fontWeight="normal" mt={0.5}>
                  {t('profile:no_discount')}
                </Text>
              </Th>
              <Th
                borderColor={proBorderColor}
                borderWidth="1px"
                borderTopRadius="lg"
                borderBottomWidth="1px"
                textTransform="none"
                fontSize="sm"
                textAlign="center"
                bg={proBg}
                py={4}
                w="25%"
              >
                <Text fontWeight="semibold" color={textColor}>
                  Pro
                </Text>
                <Text fontSize="xs" color="green.500" fontWeight="medium" mt={0.5}>
                  10% Rabatt
                </Text>
              </Th>
              <Th
                borderColor={borderColor}
                borderBottomWidth="1px"
                textTransform="none"
                fontSize="sm"
                textAlign="center"
                py={4}
                w="25%"
              >
                <Text fontWeight="normal" color={mutedTextColor}>
                  Team
                </Text>
                <Text fontSize="xs" color="green.500" fontWeight="medium" mt={0.5}>
                  20% Rabatt
                </Text>
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {CREDIT_PACKS.map((pack, index) => {
              const isLastRow = index === CREDIT_PACKS.length - 1;
              return (
                <Tr key={index}>
                  <Td 
                    borderColor={borderColor} 
                    borderBottomWidth={isLastRow ? '0' : '1px'}
                    py={4} 
                    px={4}
                  >
                    <Flex align="center" gap={2}>
                      <Box color={mutedTextColor}>
                        <CoinIcon />
                      </Box>
                      <Text fontWeight="semibold" color={textColor} fontSize="sm">
                        {formatCredits(pack.credits)}
                      </Text>
                      <Text color={mutedTextColor} fontSize="sm">
                        Credits
                      </Text>
                    </Flex>
                  </Td>
                  <Td 
                    borderColor={borderColor} 
                    borderBottomWidth={isLastRow ? '0' : '1px'}
                    textAlign="center" 
                    py={4}
                  >
                    <Text color={mutedTextColor} fontSize="sm">
                      CHF {pack.prices.basic}
                    </Text>
                  </Td>
                  <Td
                    bg={proBg}
                    borderColor={proBorderColor}
                    borderLeftWidth="1px"
                    borderRightWidth="1px"
                    borderBottomWidth={isLastRow ? '1px' : '1px'}
                    borderBottomRadius={isLastRow ? 'lg' : '0'}
                    textAlign="center"
                    py={4}
                  >
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      CHF {pack.prices.pro}
                    </Text>
                  </Td>
                  <Td 
                    borderColor={borderColor} 
                    borderBottomWidth={isLastRow ? '0' : '1px'}
                    textAlign="center" 
                    py={4}
                  >
                    <Text color={mutedTextColor} fontSize="sm">
                      CHF {pack.prices.team}
                    </Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>

      {/* Footer Note */}
      <Text fontSize="xs" color={mutedTextColor} mt={4} opacity={0.8}>
        {t('profile:credit_packs_note')}
      </Text>
    </Box>
  );
};



