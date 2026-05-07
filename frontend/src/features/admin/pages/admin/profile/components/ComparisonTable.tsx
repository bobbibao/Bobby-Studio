import React from 'react';
import {
  Box,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

// Green checkmark icon
const CheckIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#22c55e"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Gray X icon
const XIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-zinc-500"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface ComparisonTableProps {
  intervalLabel: 'monthly' | 'yearly';
  prices?: any[];
}

// Comparison data matching the screenshot exactly
const COMPARISON_DATA = [
  { key: 'credits', basic: "4'000", pro: "10'000", team: "30'000" },
  { key: 'images', basic: '200-800 (je nach KI Modell)', pro: '500-2\'000 (je nach KI Modell)', team: "1'500-6'000 (je nach KI Modell)" },
  { key: 'videos', basic: 'Ca. 11 (je nach Länge)', pro: 'Ca. 29 (je nach Länge)', team: 'Ca. 86 (je nach Länge)' },
  { key: 'speed', basic: 'Max 4 parallele Generierungen', pro: 'Max 8 parallele Generierungen', team: 'Max 8 parallele Generierungen' },
  { key: 'resolution', basic: '1-2K (4K mit Upscale)', pro: '4K Nativ (8K mit Upscale)', team: '4K Nativ (8K mit Upscale)' },
  { key: 'shared_pool', basic: false, pro: false, team: true },
  { key: 'early_access', basic: false, pro: true, team: true },
  { key: 'projects', basic: '5', pro: 'Unlimitiert', team: 'Unlimitiert' },
  { key: 'backup', basic: '2 Monate', pro: 'Unlimitiert', team: 'Unlimitiert' },
  { key: 'support', basic: false, pro: 'Ja, Chat', team: 'Ja, Chat' },
  { key: 'credit_discount', basic: '—', pro: '10%', team: '20%' },
  { key: 'monthly_course', basic: false, pro: true, team: true },
  { key: 'onboarding_course', basic: false, pro: false, team: true },
  { key: 'archicad_plugin', basic: false, pro: true, team: true },
  { key: 'templates', basic: true, pro: true, team: true },
];

const ROW_LABELS: Record<string, string> = {
  credits: 'Credits',
  images: 'Bilder',
  videos: 'Videos',
  speed: 'Speed',
  resolution: 'Auflösung',
  shared_pool: 'Geteilter Credit-Pool',
  early_access: 'Neue Features testen',
  projects: 'Projekte',
  backup: 'Verlauf - Backup',
  support: 'Prioritäts-Support',
  credit_discount: 'Rabatt bei Credit-Kauf',
  monthly_course: 'Monatlicher Online-Kurs',
  onboarding_course: 'Onboarding Einsteiger-Kurs',
  archicad_plugin: 'Archicad Plugin (Q1-Q2 2026)',
  templates: 'Vorlagen (Q1 2026)',
};

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ intervalLabel, prices = [] }) => {
  const { t } = useTranslation();

  // Color mode values
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const borderColor = useColorModeValue('zinc.200', 'zinc.700');
  const tableBg = useColorModeValue('white', 'transparent');
  const proBg = useColorModeValue('zinc.50', 'zinc.800');
  const proBorderColor = useColorModeValue('zinc.300', 'zinc.600');

  // Render cell content based on value type
  const renderCellContent = (value: any, isPro: boolean = false) => {
    if (typeof value === 'boolean') {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" w="full">
          {value ? <CheckIcon /> : <XIcon />}
        </Box>
      );
    }
    return (
      <Text
        fontWeight={isPro ? 'semibold' : 'normal'}
        color={isPro ? textColor : mutedTextColor}
        fontSize="sm"
        textAlign="center"
      >
        {value}
      </Text>
    );
  };

  return (
    <Box mt={4}>
      <TableContainer bg={tableBg}>
        <Table variant="simple" size="md">
          <Thead>
            <Tr>
              <Th
                w="25%"
                borderColor={borderColor}
                borderBottomWidth="1px"
                textTransform="none"
                fontSize="sm"
                fontWeight="normal"
                color={mutedTextColor}
                py={4}
                px={4}
              >
                Funktion
              </Th>
              <Th
                w="25%"
                textTransform="none"
                fontSize="sm"
                textAlign="center"
                borderColor={borderColor}
                borderBottomWidth="1px"
                fontWeight="normal"
                color={mutedTextColor}
                py={4}
              >
                Basic
              </Th>
              <Th
                w="25%"
                textTransform="none"
                fontSize="sm"
                textAlign="center"
                bg={proBg}
                borderColor={proBorderColor}
                borderWidth="1px"
                borderTopRadius="lg"
                borderBottomWidth="1px"
                fontWeight="semibold"
                color={textColor}
                py={4}
              >
                Pro
              </Th>
              <Th
                w="25%"
                textTransform="none"
                fontSize="sm"
                textAlign="center"
                borderColor={borderColor}
                borderBottomWidth="1px"
                fontWeight="normal"
                color={mutedTextColor}
                py={4}
              >
                Team (3 User)
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {COMPARISON_DATA.map((row, index) => {
              const isLastRow = index === COMPARISON_DATA.length - 1;
              return (
                <Tr key={index}>
                  <Td
                    fontWeight="medium"
                    textAlign="left"
                    fontSize="sm"
                    color={textColor}
                    borderColor={borderColor}
                    borderBottomWidth={isLastRow ? '0' : '1px'}
                    py={4}
                    px={4}
                  >
                    {ROW_LABELS[row.key]}
                  </Td>
                  <Td 
                    borderColor={borderColor} 
                    borderBottomWidth={isLastRow ? '0' : '1px'}
                    py={4} 
                    textAlign="center"
                  >
                    {renderCellContent(row.basic)}
                  </Td>
                  <Td
                    bg={proBg}
                    borderColor={proBorderColor}
                    borderLeftWidth="1px"
                    borderRightWidth="1px"
                    borderBottomWidth={isLastRow ? '1px' : '1px'}
                    borderBottomRadius={isLastRow ? 'lg' : '0'}
                    py={4}
                    textAlign="center"
                  >
                    {renderCellContent(row.pro, true)}
                  </Td>
                  <Td 
                    borderColor={borderColor} 
                    borderBottomWidth={isLastRow ? '0' : '1px'}
                    py={4} 
                    textAlign="center"
                  >
                    {renderCellContent(row.team)}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};



