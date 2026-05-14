import { Box, VStack, HStack, Text, Flex, Grid, GridItem, Icon } from '@chakra-ui/react';

import RoadmapIcon1 from '@/shared/icons/RoadmapIcon4';
import RoadmapIcon2 from '@/shared/icons/RoadmapIcon3';
import RoadmapIcon3 from '@/shared/icons/RoadmapIcon2';
import RoadmapIcon4 from '@/shared/icons/RoadmapIcon1';
import { classNames } from '@/utils';
import { useTranslation } from 'react-i18next';

interface TimelineItemProps {
  title: string;
  description: string;
  date: string;
  icon: any;
  lastItem: boolean;
  details: {
    title: string;
    descriptions: string[];
  }[];
}
const TimelineItem = ({ date, title, description, icon, lastItem, details }: TimelineItemProps) => {
  const { t } = useTranslation();

  return (
    <Grid gap={4} className="timeline-item min-h-[150px] grid-cols-7">
      {/* Date and Title Column */}
      <GridItem colSpan={2}>
        <Flex direction="column" align="flex-start">
          <Text color="gray.700" fontWeight="semibold" fontSize="md" className="dark:!text-primaryActive">
            {date}
          </Text>
          {details?.map((el, i) => (
            <Text
              key={i}
              fontSize="sm"
              mt={1}
              className={classNames('!text-txtPrimary dark:!text-white pb-[60px]', title === '3' && i === 0 ? '!pb-0' : '')}
            >
              {t(`support:${el.title}`)}
            </Text>
          ))}
        </Flex>
      </GridItem>

      {/* Icon and Line Column */}
      <GridItem position="relative" colSpan={1}>
        <Flex direction="column" align="center" position="relative" height="100%">
          <Box className="bg-[#E5E5E5] dark:bg-[#1a1a1a]" borderRadius="lg" position="relative" zIndex={2} p="2">
            <Icon as={icon} boxSize={5} />
          </Box>

          {/* Vertical Line */}
          {!lastItem && (
            <Box
              position="absolute"
              top="46px"
              left="50%"
              transform="translateX(-50%)"
              width="2px"
              height="148px"
              bg="gray.100"
              zIndex={1}
            />
          )}
        </Flex>
      </GridItem>

      {/* Description Column */}
      <GridItem alignSelf="self-start" colSpan={4} className="flex flex-col space-y-2 pt-6">
        {details?.map((el, i) => {
          return (
            <Box className={title === '3' && i === 0 ? 'h-4' : ''}>
              {el?.descriptions?.map((elm, j) => (
                <Text key={j} fontSize="sm" mt={1} className="!text-txtPrimary dark:!text-white">
                  • {t(`support:${elm}`)}
                </Text>
              ))}
            </Box>
          );
        })}
      </GridItem>
    </Grid>
  );
};

export const Roadmap = () => {
  const items = [
    // {
    //   date: '05/2027',
    //   title: 'Eco-Friendly Design Insights',
    //   description: 'Introducing tools for evaluating environmental impacts, helping designers prioritize sustainable solutions',
    //   icon: RoadmapIcon1,
    // },
    {
      date: '5/2025',
      title: '1',
      description: '',
      details: [
        {
          title: 'enhanced_ai_model_training',
          descriptions: [
            'enhanced_ai_model_training_description_1',
            'enhanced_ai_model_training_description_2',
            'enhanced_ai_model_training_description_3',
          ],
        },
        {
          title: 'ui_version_2_for_image_generation',
          descriptions: [
            'ui_version_2_for_image_generation_description_1',
            'ui_version_2_for_image_generation_description_2',
            'ui_version_2_for_image_generation_description_3',
          ],
        },
      ],
      icon: RoadmapIcon1,
    },
    {
      date: '07/2025',
      title: '2',
      description: '',
      details: [
        {
          title: 'performance_improvements',
          descriptions: [
            'performance_improvements_description_1',
            'performance_improvements_description_2',
            'performance_improvements_description_3',
          ],
        },
        {
          title: 'enhanced_image_editing',
          descriptions: [
            'enhanced_image_editing_description_1',
            'enhanced_image_editing_description_2',
            'enhanced_image_editing_description_3',
          ],
        },
      ],
      icon: RoadmapIcon2,
    },
    {
      date: '09/2025',
      title: '3',
      description: '',
      details: [
        {
          title: 'tiered_user_experience',
          descriptions: [],
        },
        {
          title: 'beginners_simplified_interface',
          descriptions: [
            'beginners_simplified_interface_description_1',
            'beginners_simplified_interface_description_2',
            'beginners_simplified_interface_description_3',
          ],
        },
        {
          title: 'advanced_users_detailed_controls',
          descriptions: [
            'advanced_users_detailed_controls_description_1',
            'advanced_users_detailed_controls_description_2',
            'advanced_users_detailed_controls_description_3',
          ],
        },
        {
          title: 'pro_users_direct_ai_integration',
          descriptions: [
            'pro_users_direct_ai_integration_description_1',
            'pro_users_direct_ai_integration_description_2',
            'pro_users_direct_ai_integration_description_3',
          ],
        },
      ],
      icon: RoadmapIcon3,
    },
  ];

  return (
    <Box>
      <VStack align="stretch" spacing={2} className="max-w-5xl mx-auto">
        {items.map((item, index) => (
          <TimelineItem key={index} lastItem={index === items.length - 1} {...item} />
        ))}
      </VStack>
    </Box>
  );
};



