import React from 'react';

import { VideosData } from './data';
import CardVideo from '@/shared/card/CardVideo';
import ArrowRightCircleIcon from '@/shared/icons/ArrowRightCircleIcon';
import { Flex, Grid, GridItem, Text } from '@chakra-ui/react';

const VideosSection: React.FC = () => {
  return (
    <Flex width={'full'} direction={'column'} gap={2}>
      <Flex width={'full'} direction={'column'} gap={1}>
        <Flex width={'full'} justifyContent={'space-between'}>
          <Text fontSize={'1.75rem'} fontWeight={'semibold'}>
            Videos
          </Text>
          <Flex alignItems={'center'} cursor={'pointer'} gap={2} padding={2}>
            <p className="text-sm text-primary">See All</p>
            <ArrowRightCircleIcon />
          </Flex>
        </Flex>
      </Flex>
      <p className="text-secondary">
        Learn with step-by-step video guides on AI applications in architecture
      </p>
      <Grid
        templateRows="repeat(2, 1fr)"
        templateColumns={{
          base: '1fr',
          xl: 'repeat(2, 1fr)',
        }}
        gap={4}
      >
        <GridItem rowSpan={2} colSpan={1}>
          <CardVideo
            title={VideosData[0].title}
            generationType={VideosData[0].generationType}
            imageSrc={VideosData[0].imageSrc}
          />
        </GridItem>
        <GridItem rowSpan={2} colSpan={1}>
          <Flex direction="column" height="100%" gap={4}>
            <CardVideo
              title={VideosData[1].title}
              generationType={VideosData[1].generationType}
              imageSrc={VideosData[1].imageSrc}
            />
            <CardVideo
              title={VideosData[2].title}
              generationType={VideosData[2].generationType}
              imageSrc={VideosData[2].imageSrc}
            />
          </Flex>
        </GridItem>
      </Grid>
    </Flex>
  );
};

export default VideosSection;



