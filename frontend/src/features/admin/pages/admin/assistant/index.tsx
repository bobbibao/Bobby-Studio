import React from 'react';
import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import ConversationIcon from '@/shared/icons/ConversationIcon';
import { useTranslation } from 'react-i18next';

const Assistant: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Flex 
      direction="column" 
      h="full" 
      justify="center" 
      align="center"
      bg="bg.canvas"
    >
      <VStack spacing={4}>
        <Box>
      <ConversationIcon />
        </Box>
        <Text 
          color="text.primary" 
          fontWeight="semibold" 
          fontSize="xl"
        >
          {t('common:coming_soon')}
        </Text>
        <Text 
          color="text.muted" 
          fontSize="base"
        >
        {t('notification:were_working_hard_to_bring_you_this_feature__coming_your_way_soon')}
      </Text>
      </VStack>
    </Flex>
  );
};

export default Assistant;



