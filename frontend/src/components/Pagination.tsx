import { memo, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HStack, Button, Text, Box } from '@chakra-ui/react';
import PrevIcon from '@/shared/icons/PrevIcon';
import NextIcon from '@/shared/icons/NextIcon';

export default memo(function Pagination(props: {
    total: number,
    pages: number,
    pageSize: number,
    currentPage: number,
    className: string,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    changePage: Function
}) {
  const { t } = useTranslation();

  const [object, setObject] = useState({
    total: 0 as number,
    pageSize: 10 as number,
    currentPage: 1 as number,
    pages: 0 as number
  })

  useLayoutEffect(() => {
    object.total = props.total;
    object.pageSize = props.pageSize;
    object.currentPage = props.currentPage - 1;
    object.pages = props.pages;
    if (props.pages <= 0) {
      if (Number.isInteger(object.total / object.pageSize)) {
        object.pages = object.total / object.pageSize;
      } else {
        object.pages = Math.floor(object.total / object.pageSize) + 1;
      }
    }
    setObject({ ...object })
  }, [props])

  const changePage = (index: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    object.currentPage = index;
    setObject({ ...object })
    if (props.changePage !== undefined) {
      props.changePage(index + 1)
    }
  }

  const nextPrevPage = (mode: number) => {
    object.currentPage = object.currentPage + mode;
    setObject({ ...object })
    if (props.changePage !== undefined) {
      props.changePage(object.currentPage + 1)
    }
  }

  const calcPage = (index: number) => {
    if (object.currentPage < 4) {
      if (index < 5) {
        return (
          <Button
            key={index}
            size="sm"
            variant={index === object.currentPage ? 'solid' : 'ghost'}
            onClick={() => changePage(index)}
            color={index === object.currentPage ? undefined : 'text.muted'}
            fontWeight={400}
            _hover={{
              bg: index === object.currentPage 
                ? undefined 
                : 'bg.subtle',
            }}
            minW="40px"
          >
            {index + 1}
          </Button>
        );
      } else if (index === 5) {
        return (
          <Text key={index} color="text.muted" px={2}>
            ...
          </Text>
        );
      } else {
        return (
          <Button
            key={index}
            size="sm"
            variant={object.pages - 1 === object.currentPage ? 'solid' : 'ghost'}
            onClick={() => changePage(object.pages - 1)}
            color={object.pages - 1 === object.currentPage ? undefined : 'text.muted'}
            fontWeight={400}
            _hover={{
              bg: object.pages - 1 === object.currentPage 
                ? undefined 
                : 'bg.subtle',
            }}
            minW="40px"
          >
            {object.pages}
          </Button>
        );
      }
    } else if (object.currentPage > object.pages - 1 - 4) {
      if (index === 0) {
        return (
          <Button
            key={index}
            size="sm"
            variant={index === object.currentPage ? 'solid' : 'ghost'}
            onClick={() => changePage(index)}
            color={index === object.currentPage ? undefined : 'text.muted'}
            fontWeight={400}
            _hover={{
              bg: index === object.currentPage 
                ? undefined 
                : 'bg.subtle',
            }}
            minW="40px"
          >
            {index + 1}
          </Button>
        );
      } else if (index === 1) {
        return (
          <Text key={index} color="text.muted" px={2}>
            ...
          </Text>
        );
      } else {
        const indexReserve = object.pages - 1 - 6 + index;
        return (
          <Button
            key={index}
            size="sm"
            variant={indexReserve === object.currentPage ? 'solid' : 'ghost'}
            onClick={() => changePage(indexReserve)}
            color={indexReserve === object.currentPage ? undefined : 'text.muted'}
            fontWeight={400}
            _hover={{
              bg: indexReserve === object.currentPage 
                ? undefined 
                : 'bg.subtle',
            }}
            minW="40px"
          >
            {indexReserve + 1}
          </Button>
        );
      }
    } else {
      if (index === 0) {
        return (
          <Button
            key={index}
            size="sm"
            variant={index === object.currentPage ? 'solid' : 'ghost'}
            onClick={() => changePage(index)}
            color={index === object.currentPage ? undefined : 'text.muted'}
            fontWeight={400}
            _hover={{
              bg: index === object.currentPage 
                ? undefined 
                : 'bg.subtle',
            }}
            minW="40px"
          >
            {index + 1}
          </Button>
        );
      } else if (index === 1 || index === 5) {
        return (
          <Text key={index} color="text.muted" px={2}>
            ...
          </Text>
        );
      } else if (index === 6) {
        return (
          <Button
            key={index}
            size="sm"
            variant={object.pages - 1 === object.currentPage ? 'solid' : 'ghost'}
            onClick={() => changePage(object.pages - 1)}
            color={object.pages - 1 === object.currentPage ? undefined : 'text.muted'}
            fontWeight={400}
            _hover={{
              bg: object.pages - 1 === object.currentPage 
                ? undefined 
                : 'bg.subtle',
            }}
            minW="40px"
          >
            {object.pages}
          </Button>
        );
      } else if (index === 2) {
        return (
          <Button
            key={index}
            size="sm"
            variant="ghost"
            onClick={() => changePage(object.currentPage - 1)}
            color="text.primary"
            fontWeight={400}
            _hover={{
              bg: 'bg.subtle',
            }}
            minW="40px"
          >
            {object.currentPage}
          </Button>
        );
      } else if (index === 3) {
        return (
          <Button
            key={index}
            size="sm"
            variant="solid"
            onClick={() => changePage(object.currentPage)}
            fontWeight={400}
            minW="40px"
          >
            {object.currentPage + 1}
          </Button>
        );
      } else {
        return (
          <Button
            key={index}
            size="sm"
            variant="ghost"
            onClick={() => changePage(object.currentPage + 1)}
            color="text.primary"
            fontWeight={400}
            _hover={{
              bg: 'bg.subtle',
            }}
            minW="40px"
          >
            {object.currentPage + 2}
          </Button>
        );
      }
    }
  }

  const generatePage = () => {
    if (object.pages <= 7) {
      return Array.from({length: object.pages}, (page, index) => (
        <Button
          key={index}
          size="sm"
          variant={index === object.currentPage ? 'solid' : 'ghost'}
          onClick={() => changePage(index)}
            color={index === object.currentPage ? undefined : 'text.muted'}
          _hover={{
            bg: index === object.currentPage 
              ? undefined 
              : 'bg.subtle',
          }}
          minW="40px"
        >
          {index + 1}
        </Button>
      ));
    }
    return Array.from({length: 7}, (page, index) => calcPage(index));
  }

  if (object.pages === 0) {
    return <Box></Box>
  }
  return (
    <Box w="full">
      <HStack spacing={2} justify="space-between" align="center" w="full">
                <Button
          size="sm"
          variant="outline"
                  isDisabled={object.currentPage === 0}
                  onClick={() => nextPrevPage(-1)}
          leftIcon={<Box><PrevIcon /></Box>}
          borderColor="border.default"
          color="text.primary"
          bg="bg.surface"
          fontWeight={400}
          _hover={{
            bg: 'bg.subtle',
          }}
          _disabled={{
            opacity: 0.4,
            cursor: 'not-allowed',
          }}
        >
          {t('common:previous')}
        </Button>
        
        <HStack spacing={1}>
            {generatePage()}
        </HStack>
        
                <Button
          size="sm"
          variant="outline"
                  isDisabled={object.currentPage === object.pages - 1}
                  onClick={() => nextPrevPage(1)}
          rightIcon={<Box><NextIcon /></Box>}
          borderColor="border.default"
          color="text.primary"
          bg="bg.surface"
          fontWeight={400}
          _hover={{
            bg: 'bg.subtle',
          }}
          _disabled={{
            opacity: 0.4,
            cursor: 'not-allowed',
          }}
        >
          {t('common:next')}
        </Button>
      </HStack>
    </Box>
  )
})

