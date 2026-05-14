import { SimpleGrid, Box, Text, Icon } from '@chakra-ui/react';
import UserIconPurple from '@/shared/icons/UserIconPurple';
import QuestionIconPurple from '@/shared/icons/QuestionIconPurple';
import GuideIconPurple from '@/shared/icons/GuideIconPurple';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GettingStartQA = [
  {
    id: 1,
    question: 'qa_1',
    answer: '',
    link: '',
  },
  {
    id: 2,
    question: 'qa_2',
    answer: '',
    link: '',
  },
  {
    id: 3,
    question: 'qa_3',
    answer: '',
    link: '',
  },
  {
    id: 4,
    question: 'qa_4',
    answer: '',
    link: '',
  },
];

const RecommendedTopics = [
  {
    id: 1,
    title: 'account_management',
    content: 'topic_1',
    icon: UserIconPurple,
    link: '',
  },
  {
    id: 2,
    title: 'FAQ',
    content: 'topic_2',
    icon: QuestionIconPurple,
    link: '',
  },
  {
    id: 3,
    title: 'help_guides',
    content: 'topic_3',
    icon: GuideIconPurple,
    link: '',
  },
];
export function HelperCenter() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <Text as="b" fontSize="20px">
        {t('support:getting_started_with_bobby')}
      </Text>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        {GettingStartQA.map((item) => (
          <Link to={'#'} key={item.id}>
            <Box
              display="flex"
              flexDirection="column"
              rounded="md"
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              p="3"
              gap="4"
            >
              <Text>{t(`support:${item.question}`)}</Text>
            </Box>
          </Link>
        ))}
      </SimpleGrid>

      <Text as="b" fontSize="20px" className="mt-6">
        {t('support:recommended_topics')}
      </Text>
      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
        {RecommendedTopics.map((item) => (
          <Link to={'#'} key={item.id}>
            <Box
              display="flex"
              flexDirection="column"
              rounded="md"
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              p="6"
              gap="4"
            >
              <div className="flex flex-row justify-between">
                <Text as="b" fontSize="20px">
                  {t(`support:${item.title}`)}
                </Text>
                <Box borderRadius="lg" position="relative" zIndex={2}>
                  <Icon as={item.icon} />
                </Box>
              </div>
              <Text className='text-secondary'>{t(`support:${item.content}`)}</Text>
            </Box>
          </Link>
        ))}
      </SimpleGrid>
    </div>
  );
}



