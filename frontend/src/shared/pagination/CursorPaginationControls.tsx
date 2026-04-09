import { Flex, HStack, Text } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PaginationButton } from './PaginationButton';

interface CursorPaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  setPage: (page: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

const renderPageNumbers = (
  maxVisiblePages: number,
  page: number,
  totalPages: number
) => {
  const pages = [];
  let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    pages.push(1);
    if (startPage > 2) pages.push('...');
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  return pages;
};

export const CursorPaginationControls: React.FC<CursorPaginationControlsProps> = ({
  page,
  totalPages,
  total,
  setPage,
  hasNextPage,
  hasPreviousPage,
  onNextPage,
  onPreviousPage
}) => {
  const { t } = useTranslation();
  // Với cursor-based pagination, chúng ta không thể nhảy trực tiếp đến trang bất kỳ
  // Chỉ có thể di chuyển forward hoặc backward từ trang hiện tại
  // Vì vậy chúng ta giữ UI để người dùng biết họ đang ở trang nào
  // nhưng chỉ cho phép di chuyển tới/lui 1 trang

  return (
    <>
      <Flex justify="center" align="center" mt={6} mb={4}>
        <HStack spacing={2}>
          <PaginationButton onClick={onPreviousPage} disabled={!hasPreviousPage}>
            <ChevronLeft size={16} />
          </PaginationButton>

          {/* Chỉ hiển thị trang hiện tại và không cho phép nhảy trang */}
          <PaginationButton isActive={true} onClick={() => {}}>
            {page}
          </PaginationButton>

          <PaginationButton onClick={onNextPage} disabled={!hasNextPage}>
            <ChevronRight size={16} />
          </PaginationButton>
        </HStack>
      </Flex>

      <Flex justify="center" mt={2}>
        <Text fontSize="sm">
          {t('profile:showing_page', {
            page,
            total,
          })}
        </Text>
      </Flex>
    </>
  );
};

export { PaginationButton };

