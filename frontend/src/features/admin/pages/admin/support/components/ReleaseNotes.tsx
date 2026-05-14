import { Box, VStack, Text, Heading } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

interface ChangelogItemProps {
  t: (key: string) => string;
  version: string;
  date: string;
  title: string;
  subTitle: string;
  changes: {
    title: string;
    logs?: {
      label: string;
      text: string;
    }[];
    items?: string[];
    text_1?: string;
    text_2?: string;
    italic?: string;
  }[];
}
const ChangelogItem = ({ version, date, title, subTitle, changes, t }: ChangelogItemProps) => (
  <Box>
    <Box mb={4}>
      <Heading className="!text-primary !text-2xl" mb={1}>
        {version} - {date} - {t(`support:${title}`)}
      </Heading>
      <Text>{t(`support:${subTitle}`)}</Text>
    </Box>

    <VStack align="stretch" spacing={6} p={4} className="bg-[#F5F5F5] rounded-md dark:!bg-[#1e1e1e]">
      {changes.map((change, idx) => (
        <Box key={idx}>
          <Heading size="md" mb={4}>
            {t(`support:${change.title}`)}
          </Heading>
          {change.text_1 && <Text className="!text-txtPrimary dark:!text-white">{t(`support:${change.text_1}`)}</Text>}
          {change?.logs?.length && (
            <Box className="flex flex-col space-y-4">
              {change?.logs?.map((log, i) => (
                <Box key={i}>
                  <Heading size="sm" mb={2}>{t(`support:${log.label}`)}</Heading>
                  <Text className="!text-txtPrimary dark:!text-white">{t(`support:${log.text}`)}</Text>
                </Box>
              ))}
            </Box>
          )}
          {change?.items?.length && (
            <VStack align="stretch" spacing={1} pl={3}>
              {change?.items?.map((item, i) => (
                <Text key={i} className="!text-txtPrimary dark:!text-white">
                  • {t(`support:${item}`)}
                </Text>
              ))}
            </VStack>
          )}
          {change.text_2 && <Text className="!text-txtPrimary dark:!text-white">{t(`support:${change.text_2}`)}</Text>}
          {change.italic && <Text className="mt-1 italic !text-txtPrimary dark:!text-white">{t(`support:${change.italic}`)}</Text>}
        </Box>
      ))}
    </VStack>
  </Box>
);

export const ReleaseNotes = () => {
  const { t } = useTranslation();

  const releases = [
    {
      version: '[Ver 1.0.0]',
      date: 'March 03, 2025',
      title: 'alpha_launch',
      subTitle: 'alpha_launch_subTitle',
      changes: [
        {
          title: 'available_features',
          logs: [
            {
              label: 'available_features_label_1',
              text: 'available_features_text_1',
            },
            {
              label: 'available_features_label_2',
              text: 'available_features_text_2',
            },
            {
              label: 'available_features_label_3',
              text: 'available_features_text_3',
            },
            {
              label: 'available_features_label_4',
              text: 'available_features_text_4',
            },
            {
              label: 'available_features_label_5',
              text: 'available_features_text_5',
            },
          ],
        },
        {
          title: 'coming_soon',
          logs: [
            {
              label: 'coming_soon_label_1',
              text: 'coming_soon_text_1',
            },
          ],
        },
        {
          title: 'known_limitations',
          items: [
            'known_limitations_items_1',
            'known_limitations_items_2',
            'known_limitations_items_3',
            'known_limitations_items_4',
            'known_limitations_items_5',
          ],
        },
        {
          title: 'feedback',
          text_1: 'feedback_text_1',
          text_2: 'feedback_text_2',
          italic: 'feedback_italic',
          items: ['feedback_items_1', 'feedback_items_2', 'feedback_items_3', 'feedback_items_4'],
        },
      ],
    },
  ];

  return (
    <Box>
      <Box mb={6}>
        <Text color="gray.600" fontSize="md" className="!text-txtPrimary dark:!text-white">
          {t('support:release_notes_description')}
        </Text>
      </Box>

      {releases.map((release, index) => (
        <ChangelogItem key={index} t={t} {...release} />
      ))}
    </Box>
  );
};



