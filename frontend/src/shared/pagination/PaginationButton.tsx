import { Button, Flex, HStack, Text, useColorModeValue } from '@chakra-ui/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  setPage: (page: number) => void;
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

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalPages,
  total,
  setPage,
}) => {
  return (
    <>
      <Flex justify="center" align="center" mt={6} mb={4}>
        <HStack spacing={2}>
          <PaginationButton
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
          </PaginationButton>

          {renderPageNumbers(5, page, totalPages).map((pageNum, idx) => (
            <PaginationButton
              key={idx}
              isActive={pageNum === page}
              onClick={() => typeof pageNum === 'number' && setPage(pageNum)}
              disabled={typeof pageNum !== 'number'}
            >
              {pageNum}
            </PaginationButton>
          ))}

          <PaginationButton
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight size={16} />
          </PaginationButton>
        </HStack>
      </Flex>

      <Flex justify="center" mt={2}>
        <Text fontSize="sm">
          Showing page {page} of {totalPages} ({total} items)
        </Text>
      </Flex>
    </>
  );
};

interface PaginationButtonProps {
  children: React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const PaginationButton: React.FC<PaginationButtonProps> = ({
  children,
  isActive = false,
  disabled = false,
  onClick,
}) => {
  const buttonColor = useColorModeValue('#111113', '#B7B7B7');
  const activeBg = useColorModeValue('#111113', '#F5F5F5');
  const activeColor = useColorModeValue('#FFFFFF', '#111113');
  const hoverBg = useColorModeValue('#F1F1F1', '#2B2B2B');
  const disabledColor = useColorModeValue('#A0AEC0', '#4A5568');

  return (
    <Button
      size="sm"
      variant={isActive ? 'solid' : 'ghost'}
      disabled={disabled}
      onClick={onClick}
      color={disabled ? disabledColor : isActive ? activeColor : buttonColor}
      bg={isActive ? activeBg : 'transparent'}
      _hover={{
        bg: disabled ? 'transparent' : isActive ? activeBg : hoverBg,
      }}
      _active={{
        bg: disabled ? 'transparent' : isActive ? activeBg : hoverBg,
      }}
      _focus={{ boxShadow: 'none' }}
    >
      {children}
    </Button>
  );
};

export { PaginationButton };

