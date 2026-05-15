import React from 'react';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Button,
  VStack,
  HStack,
  Badge,
  SimpleGrid,
  Card,
  CardBody,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  useDisclosure,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserImageHistoryDetail } from '@/hooks/useUserHistory';
import ChevronLeftIcon from '@/shared/icons/ChevronLeftIcon';
import { imageConstants } from '@/constants/image.constants';

const UserHistoryDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useUserImageHistoryDetail(id!);
  const textColor = useColorModeValue('zinc.900', 'white');
  const mutedTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const borderColor = useColorModeValue('zinc.200', 'zinc.700');

  // Modal state for image viewing
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedImage, setSelectedImage] = React.useState<string>('');

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    onOpen();
  };

  const getModelLabel = (value: string, inputType: string) => {
    const models = inputType === 'edit' ? imageConstants.editModel : imageConstants.generateModel;
    const model = models.find(m => m.value === value);
    return model ? model.label : value;
  };

  const getModelLabelsEdit = (values: string[] | undefined) => {
    if (!values) return '-';
    return values.map(value => getModelLabel(value, 'edit')).join(', ');
  };

  const getModelDisplay = () => {
    const models = data.selectedModels || data.selectedEditingModels;
    if (Array.isArray(models)) {
      return getModelLabelsEdit(models);
    }
    return getModelLabel(data.model, "generate");
  };

  if (!id) {
    return (
      <Box pt={4} pb={0} px={4} h="100%" overflowY="hidden" display="flex" flexDirection="column" gap={5}>
        <Box flex="1" overflowY="auto">
          <Card bg="bg.surface" borderColor={borderColor} borderRadius="lg">
          <CardBody>
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              History ID is required
            </Alert>
          </CardBody>
          </Card>
        </Box>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box pt={4} pb={0} px={4} h="100%" overflowY="hidden" display="flex" flexDirection="column" gap={5}>
        <Box flex="1" overflowY="auto">
          <Card bg="bg.surface" borderColor={borderColor} borderRadius="lg">
            <CardBody textAlign="center">
              <Spinner size="xl" color="brand.600" />
            </CardBody>
          </Card>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box pt={4} pb={0} px={4} h="100%" overflowY="hidden" display="flex" flexDirection="column" gap={5}>
        <Box flex="1" overflowY="auto">
          <Card bg="bg.surface" borderColor={borderColor} borderRadius="lg">
            <CardBody>
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                Failed to load history detail
              </Alert>
            </CardBody>
          </Card>
        </Box>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box pt={4} pb={0} px={4} h="100%" overflowY="hidden" display="flex" flexDirection="column" gap={5}>
        <Box flex="1" overflowY="auto">
          <Card bg="bg.surface" borderColor={borderColor} borderRadius="lg">
            <CardBody>
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                History item not found
              </Alert>
            </CardBody>
          </Card>
        </Box>
      </Box>
    );
  }

  return (
    <Box pt={4} pb={0} px={4} h="100%" overflowY="hidden" display="flex" flexDirection="column" gap={5}>
      {/* Header with Back Button and Title */}
      <Box position="relative">
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              borderRadius="lg"
              h={9}
              fontSize="sm"
              fontWeight="normal"
              borderColor={borderColor}
              leftIcon={<ChevronLeftIcon />}
            >
              {t('usermanagement:back')}
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Content Area */}
      <Box flex="1" overflowY="auto" pb={0}>
        <VStack spacing={6} align="stretch">
        {/* Basic Information */}
        <Card bg="bg.surface" borderColor={borderColor} borderRadius="lg">
          <CardBody>
            <Heading size="md" mb={4} color="text.primary">{t('usermanagement:basic_information')}</Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Box>
                <Text fontWeight="medium" color={mutedTextColor}>{t('usermanagement:type')}:</Text>
                <Badge colorScheme={data.inputType === 'edit' ? 'blue' : 'green'} ml={2}>
                  {t(`usermanagement:${data.inputType}`)}
                </Badge>
              </Box>
              <Box>
                <Text fontWeight="medium" color={mutedTextColor}>{t('usermanagement:method')}:</Text>
                <Text color="text.primary" ml={2}>{t(`usermanagement:${data.method}`) || data.method}</Text>
              </Box>
              <Box>
                <Text fontWeight="medium" color={mutedTextColor}>{t('usermanagement:resolution')}:</Text>
                <Text color="text.primary" ml={2}>{data.imageSize || data.resolution || '-'}</Text>
              </Box>
              <Box>
                <Text fontWeight="medium" color={mutedTextColor}>{t('usermanagement:aspect_ratio')}:</Text>
                <Text color="text.primary" ml={2}>{data.aspectRatio || '-'}</Text>
              </Box>
              <Box>
                <Text fontWeight="medium" color={mutedTextColor}>{t('usermanagement:model')}:</Text>
                <Text color="text.primary" ml={2}>{getModelDisplay()}</Text>
              </Box>
              <Box>
                <Text fontWeight="medium" color={mutedTextColor}>{t('usermanagement:created_at')}:</Text>
                <Text color="text.primary" ml={2}>{new Date(data.createdAt).toLocaleString()}</Text>
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Prompts */}
        {(data.prompt || data.enhancedPrompt) && (
          <Card bg="bg.surface" borderColor={borderColor} borderRadius="lg">
            <CardBody>
              <Heading size="md" mb={4} color="text.primary">{t('usermanagement:prompts')}</Heading>
              <VStack align="start" spacing={3}>
                {data.prompt && (
                  <Box w="full">
                    <Text fontWeight="medium" color={mutedTextColor}>Prompt:</Text>
                    <Text color="text.primary" mt={1}>{data.prompt}</Text>
                  </Box>
                )}
                {data.enhancedPrompt && (
                  <Box w="full">
                    <Text fontWeight="medium" color={mutedTextColor}>{t('usermanagement:enhanced_prompt')}:</Text>
                    <Text color="text.primary" mt={1}>{data.enhancedPrompt}</Text>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Images */}
        {(data.referenceImages || data.imagePath) && (
          <Card bg="bg.surface" borderColor={borderColor} borderRadius="lg">
            <CardBody>
              <Heading size="md" mb={4} color="text.primary">{t('usermanagement:images')}</Heading>
              <VStack align="start" spacing={4}>
                {data.referenceImages && (
                  <Box w="full">
                    <Text fontWeight="medium" color={mutedTextColor} mb={2}>{t('usermanagement:reference_images')}:</Text>
                    <HStack spacing={4} wrap="wrap">
                      {Array.isArray(data.referenceImages) ? (
                        data.referenceImages.map((image, index) => (
                          <Image 
                            key={index} 
                            src={image} 
                            alt={`Reference ${index + 1}`} 
                            maxW="200px" 
                            maxH="200px" 
                            borderRadius="md"
                            cursor="pointer"
                            onClick={() => handleImageClick(image)}
                            _hover={{ opacity: 0.8 }}
                          />
                        ))
                      ) : (
                        <Image 
                          src={data.referenceImages} 
                          alt="Reference" 
                          maxW="200px" 
                          maxH="200px" 
                          borderRadius="md"
                          cursor="pointer"
                          onClick={() => handleImageClick(data.referenceImages)}
                          _hover={{ opacity: 0.8 }}
                        />
                      )}
                    </HStack>
                  </Box>
                )}
                {data.imagePath && (
                  <Box w="full">
                    <Text fontWeight="medium" color={mutedTextColor} mb={2}>{t('usermanagement:result_images')}:</Text>
                    <HStack spacing={4} wrap="wrap">
                      {Array.isArray(data.imagePath) ? (
                        data.imagePath.map((image, index) => (
                          <Image 
                            key={index} 
                            src={image} 
                            alt={`Result ${index + 1}`} 
                            maxW="350px" 
                            maxH="350px" 
                            borderRadius="md"
                            cursor="pointer"
                            onClick={() => handleImageClick(image)}
                            _hover={{ opacity: 0.8 }}
                          />
                        ))
                      ) : (
                        <Image 
                          src={data.imagePath} 
                          alt="Result" 
                          maxW="350px" 
                          maxH="350px" 
                          borderRadius="md"
                          cursor="pointer"
                          onClick={() => handleImageClick(data.imagePath)}
                          _hover={{ opacity: 0.8 }}
                        />
                      )}
                    </HStack>
                  </Box>
                )}
              </VStack>
            </CardBody>
          </Card>
        )}
        </VStack>

        {/* Image Detail Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="full" isCentered>
          <ModalOverlay bg="blackAlpha.800" />
          <ModalContent bg="transparent" boxShadow="none" maxW="95vw" maxH="95vh">
            <ModalCloseButton color="white" size="lg" />
            <ModalBody p={0} display="flex" alignItems="center" justifyContent="center" minH="95vh">
              <Image 
                src={selectedImage} 
                alt="Full size image" 
                maxW="100%" 
                maxH="100%" 
                objectFit="contain"
                borderRadius="md"
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </Box>
  );
};

export default UserHistoryDetail;



