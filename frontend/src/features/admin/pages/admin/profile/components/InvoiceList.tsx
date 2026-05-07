import { Table, Tbody, Tr, Td, Box, Badge, Text, Button, Thead, Th, Link, useColorModeValue } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import * as subscriptionAPI from '@/features/user';
import { BillingHistoryItem } from '@/types/billing';
import { InvoiceListContentLoader } from '@/features/admin/pages/admin/profile/components/InvoiceListContentLoader';
import { CursorPaginationControls } from '@/shared/pagination/CursorPaginationControls';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

const EmptyRecord = () => {
  const { t } = useTranslation();
  return (
    <Tr>
      <Td colSpan={5}>
        <Box textAlign="center" py={8}>
          <Text color="zinc.500" fontSize="md" _dark={{ color: 'zinc.400' }}>
            {t('profile:no_invoices_available')}
          </Text>
        </Box>
      </Td>
    </Tr>
  );
};

export const InvoiceList = () => {
  const { t } = useTranslation();

  const [invoices, setInvoices] = useState<BillingHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursor, setPreviousCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]); // null represents first page

  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const borderColor = useColorModeValue('zinc.200', 'whiteAlpha.300');
  const headerColor = useColorModeValue('zinc.600', 'zinc.400');
  const rowHoverBg = useColorModeValue('zinc.50', 'whiteAlpha.50');
  const downloadHoverBg = useColorModeValue('black', 'white');
  const downloadHoverColor = useColorModeValue('white', 'black');

  useEffect(() => {
    const fetchBillingHistory = async () => {
      setLoading(true);
      try {
        const startingAfter = cursorStack[page - 1] || undefined;

        const response = await subscriptionAPI.getBillingHistory({
          page,
          pageSize,
          startingAfter,
        });

        setInvoices(response.data);
        setTotal(response.total);
        setNextCursor(response.nextCursor);
        setPreviousCursor(response.previousCursor);

        if (page === cursorStack.length && response.nextCursor) {
          setCursorStack([...cursorStack, response.nextCursor]);
        }
      } catch (error) {
        console.error('Error fetching billing history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingHistory();
  }, [page, pageSize]);

  const totalPages = Math.ceil(total / pageSize);

  const handleNextPage = () => {
    if (nextCursor) {
      setPage(page + 1);
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  return (
    <Box
      overflowX="auto"
      className="w-full"
    >
      <Table variant="simple">
        <Thead borderBottomWidth="1px" borderColor={borderColor}>
          <Tr>
            <Th textTransform="uppercase" fontSize="xs" letterSpacing="wider" color={headerColor} fontWeight="bold" borderColor={borderColor}>
              {translatorProfileNS('invoice')}
            </Th>
            <Th textTransform="uppercase" fontSize="xs" letterSpacing="wider" color={headerColor} fontWeight="bold" borderColor={borderColor}>
              {translatorProfileNS('date')}
            </Th>
            <Th textTransform="uppercase" fontSize="xs" letterSpacing="wider" color={headerColor} fontWeight="bold" borderColor={borderColor}>
              {translatorProfileNS('amount')}
            </Th>
            <Th textTransform="uppercase" fontSize="xs" letterSpacing="wider" color={headerColor} fontWeight="bold" borderColor={borderColor}>
              {translatorProfileNS('payment_status')}
            </Th>
            <Th textAlign="right" borderColor={borderColor}></Th>
          </Tr>
        </Thead>
        <Tbody>
          {loading ? (
            <InvoiceListContentLoader />
          ) : invoices.length === 0 ? (
            <EmptyRecord />
          ) : (
            invoices.map((invoice) => (
              <Tr 
                key={invoice.id} 
                borderBottomWidth="1px" 
                borderColor={borderColor}
                _hover={{ bg: rowHoverBg }}
                transition="background-color 0.2s"
              >
                <Td fontWeight="medium" borderColor={borderColor}>
                  {invoice.plan || 'Invoice'} #{invoice.id.substring(invoice.id.length - 6).toUpperCase()}
                </Td>
                <Td color="zinc.500" _dark={{ color: 'zinc.400' }} borderColor={borderColor}>
                  {format(new Date(invoice.startDate), 'MMM dd, yyyy')}
                </Td>
                <Td fontWeight="medium" borderColor={borderColor}>
                  {invoice.amount > 0 ? (invoice.amount / 100).toFixed(2) : invoice.amount} {invoice.currency.toUpperCase()}
                </Td>
                <Td borderColor={borderColor}>
                  <Badge 
                    colorScheme="green" 
                    variant="subtle" 
                    px={2} 
                    py={1} 
                    borderRadius="full"
                    textTransform="capitalize"
                  >
                    Paid
                  </Badge>
                </Td>
                <Td textAlign="right" borderColor={borderColor}>
                  <Button
                    as={Link}
                    href={invoice.invoicePdf}
                    isExternal
                    variant="ghost"
                    size="sm"
                    colorScheme="purple"
                    fontWeight="medium"
                    className="dark:!text-white hover:dark:!text-black"
                    _hover={{ 
                      textDecoration: 'none', 
                      bg: downloadHoverBg, 
                      color: downloadHoverColor 
                    }}
                  >
                    Download
                  </Button>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>

      <Box mt={4}>
        <CursorPaginationControls
          page={page}
          totalPages={totalPages}
          total={total}
          setPage={setPage}
          hasNextPage={!!nextCursor}
          hasPreviousPage={page > 1}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
        />
      </Box>
    </Box>
  );
};

export default InvoiceList;




