import { CardDataProps } from '@/shared/card/CardProject';
import { Box, Image, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import React from 'react';
import imagePlaceholder from '@/assets/img/layout/image-placeholder.png';
// import {
//   ActionEntity,
//   GeneratedImageAttributeEntity,
//   OriginalImageAttributeEntity,
// } from 'apps/bobby-api/src/attribute/dto/common.dto';
// import { UserAttributeEntity } from 'apps/bobby-api/src/attribute/dto/user-attribute.dto';
import { relativeTimeFormat } from '@/utils/time';
import { BadgeGenerationType } from '@/components/BadgeGenerationType';
import { IProject } from '@/types/project';
import { useTranslation } from 'react-i18next';
import imageUtils from '@/utils/image';
import { useAuth } from '@/common/context/useAuthContext';

const ListView: React.FC<{
  data: CardDataProps[];
  onSelectProject?: (project: IProject) => void;
}> = ({ data, onSelectProject }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const translatorCommonNS = (key: string) => t(`common:${key}`);
  
  return (
    <Box w="full">
      <Box maxH="calc(100vh - 200px)" overflowY="auto">
        <Table variant="simple">
          <Thead bg="bg.subtle">
            <Tr>
              <Th 
                textTransform="capitalize" 
                fontSize="sm" 
                color="text.primary" 
                fontWeight="normal" 
                borderColor="border.default"
                borderTopLeftRadius="lg"
              >
                {translatorCommonNS('project_name')}
              </Th>
              <Th textTransform="capitalize" fontSize="sm" color="text.primary" fontWeight="normal" borderColor="border.default">
                {translatorCommonNS('image')}
              </Th>
              <Th textTransform="capitalize" fontSize="sm" color="text.primary" fontWeight="normal" borderColor="border.default">
                {translatorCommonNS('models_used')}
              </Th>
              <Th 
                textTransform="capitalize" 
                fontSize="sm" 
                color="text.primary" 
                fontWeight="normal" 
                borderColor="border.default"
                borderTopRightRadius="lg"
              >
                {translatorCommonNS('updated')}
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {data?.map((uP, index) => {
              // const [firstFolder] = uP.value.folders
              // const [firstImage] = firstFolder.images
              return (
                <Tr 
                  key={index} 
                  cursor="pointer" 
                  onClick={() => onSelectProject?.(uP as any)}
                  _hover={{ bg: 'bg.subtle' }}
                  borderColor="border.default"
                >
                  <Td color="text.primary" borderColor="border.default">
                    {uP.projectTitle ? uP.projectTitle : 'N/A'}
                  </Td>
                  <Td borderColor="border.default">
                    <Image
                      src={imageUtils.getImageUrl(uP.imageId, true, 'webp') || imagePlaceholder}
                      alt={uP.projectTitle ? uP.projectTitle : 'N/A'}
                      w="80px"
                      h="40px"
                      objectFit="cover"
                      rounded="lg"
                      objectPosition="top"
                      loading="lazy"
                    />
                  </Td>
                  <Td borderColor="border.default">
                    {uP.type && <BadgeGenerationType generationType={uP.type} />}
                  </Td>
                  <Td color="text.primary" borderColor="border.default">
                    {uP.updatedAt ? relativeTimeFormat(uP.updatedAt, 0, i18n.language) : '-/-'}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default ListView;



