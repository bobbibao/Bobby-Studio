import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Heading,
  HStack,
  Image,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { Cpu, Gauge, Sparkles, UploadCloud, Wand2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getEnhancedPrompt } from '@/features/prompt-enhancement';
import { sdxlGenerationApiClient as SdxlGenerationAPI } from '@/features/generation';
import { useSdxlGeneration } from '@/hooks/useSdxlGeneration';
import {
  SdxlControlNetType,
  SdxlGenerationMetadata,
  SdxlGenerationMode,
  SdxlQueueStats,
} from '@/types/sdxl';
import { preprocessSketch } from '@/utils/sketchPreprocessor';
import SketchCanvas from './SketchCanvas';
import SdxlResultViewer from './SdxlResultViewer';
import ThesisShowcase from './ThesisShowcase';

const SIZE_PRESETS = [
  { label: '1:1 Square', width: 1024, height: 1024 },
  { label: '4:3 Presentation', width: 1024, height: 768 },
  { label: '3:2 Exterior', width: 1152, height: 768 },
  { label: '16:9 Wide', width: 1344, height: 768 },
];

const modeLabels: Record<SdxlGenerationMode, string> = {
  text_to_image: 'Text-to-Image',
  sketch_to_image: 'Sketch-to-Image',
  image_to_image: 'Image-to-Image',
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const stripDataUrlPrefix = (dataUrl: string) => dataUrl.replace(/^data:image\/[^;]+;base64,/, '');

interface SliderSettingProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffix?: string;
  description?: string;
}

const SliderSetting: React.FC<SliderSettingProps> = ({ label, value, min, max, step, onChange, suffix, description }) => (
  <FormControl>
    <Flex justify="space-between" mb={2}>
      <Box>
        <FormLabel m={0} fontSize="sm" color="text.primary" fontWeight="semibold">
          {label}
        </FormLabel>
        {description && (
          <Text fontSize="xs" color="text.muted" mt={0.5}>
            {description}
          </Text>
        )}
      </Box>
      <Text fontSize="sm" fontWeight="bold" minW="50px" textAlign="right">
        {value}
        {suffix}
      </Text>
    </Flex>
    <Slider value={value} min={min} max={max} step={step} onChange={onChange}>
      <SliderTrack bg="bg.muted">
        <SliderFilledTrack bg="zinc.900" _dark={{ bg: 'white' }} />
      </SliderTrack>
      <SliderThumb />
    </Slider>
  </FormControl>
);

const SdxlStudio: React.FC = () => {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<SdxlGenerationMode>('sketch_to_image');
  const [prompt, setPrompt] = useState('photorealistic modern wooden villa in forest, architectural visualization, natural light');
  const [negativePrompt, setNegativePrompt] = useState('low quality, blurry, distorted perspective, extra windows, deformed roof');
  const [promptEnhancementEnabled, setPromptEnhancementEnabled] = useState(true);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>('Sketch input');
  const [isDragging, setIsDragging] = useState(false);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  // Backend will auto-determine ControlNet type, but we keep scale for user control
  const [controlnetScale, setControlnetScale] = useState(0.9);
  const [loraEnabled, setLoraEnabled] = useState(true);
  const [loraScale, setLoraScale] = useState(0.85);
  const [steps, setSteps] = useState(30);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [seed, setSeed] = useState('42');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [img2imgStrength, setImg2imgStrength] = useState(0.55);
  const [queueStats, setQueueStats] = useState<SdxlQueueStats | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const { generate, cancel, latestResult, progress, submittedAt, isGenerating, error } = useSdxlGeneration();

  const panelBg = useColorModeValue('white', 'zinc.900');
  const softBg = useColorModeValue('zinc.50', 'zinc.950');
  const borderColor = useColorModeValue('zinc.200', 'zinc.800');

  useEffect(() => {
    const loadQueueStats = async () => {
      try {
        setQueueStats(await SdxlGenerationAPI.getQueueStats());
      } catch {
        setQueueStats(null);
      }
    };

    loadQueueStats();
    const timer = window.setInterval(loadQueueStats, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!submittedAt || !isGenerating) {
      if (!isGenerating) setElapsedSeconds(null);
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.max(1, Math.round((Date.now() - submittedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isGenerating, submittedAt]);

  const metadata: SdxlGenerationMetadata = useMemo(
    () => ({
      mode,
      model: 'SDXL + ControlNet + LoRA',
      // Backend auto-determines ControlNet type based on sketch
      controlnetType: mode === 'text_to_image' ? undefined : 'lineart',
      controlnetScale: mode === 'text_to_image' ? undefined : controlnetScale,
      loraEnabled,
      loraScale,
      loraPath: 'house_lora_final', // Fixed for thesis demo
      inferenceSteps: steps,
      guidanceScale,
      width,
      height,
      seed: seed.trim() ? Number(seed) : undefined,
      generationTimeMs: elapsedSeconds ? elapsedSeconds * 1000 : undefined,
    }),
    [controlnetScale, elapsedSeconds, guidanceScale, height, loraEnabled, loraScale, mode, seed, steps, width]
  );

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Unsupported file',
        description: 'Please upload a PNG, JPG, or WEBP sketch/reference image.',
        status: 'warning',
        position: 'bottom-right',
      });
      return;
    }

    setIsPreprocessing(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      // Auto-preprocess uploaded images for better ControlNet conditioning
      const processed = await preprocessSketch(dataUrl);
      setSourceImage(processed.dataUrl);
      setSourceName(file.name);
      if (mode === 'text_to_image') {
        setMode('sketch_to_image');
      }
    } catch (error) {
      console.error('Failed to preprocess uploaded image:', error);
      // Fallback: use raw image if preprocessing fails
      const dataUrl = await fileToDataUrl(file);
      setSourceImage(dataUrl);
      setSourceName(file.name);
      if (mode === 'text_to_image') {
        setMode('sketch_to_image');
      }
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Prompt required',
        description: 'Describe the house style, materials, site context, and realism target.',
        status: 'warning',
        position: 'bottom-right',
      });
      return;
    }

    if (mode !== 'text_to_image' && !sourceImage) {
      toast({
        title: 'Sketch or reference required',
        description: 'Sketch-to-image and image-to-image need an input image for conditioning.',
        status: 'warning',
        position: 'bottom-right',
      });
      return;
    }

    let finalPrompt = prompt;
    if (promptEnhancementEnabled) {
      setIsEnhancing(true);
      try {
        const enhanced = await getEnhancedPrompt({
          originalPrompt: prompt,
          inputType: mode,
          maxTokens: 500,
          temperature: 0.7,
        });
        finalPrompt = enhanced.enhancedPrompt || prompt;
        setPrompt(finalPrompt);
      } catch {
        finalPrompt = prompt;
      } finally {
        setIsEnhancing(false);
      }
    }

    try {
      await generate({
        projectId: searchParams.get('projectId'),
        folderId: searchParams.get('folderName'),
        mode,
        prompt: finalPrompt,
        negative_prompt: negativePrompt,
        image: sourceImage ? stripDataUrlPrefix(sourceImage) : undefined,
        controlnet:
          mode === 'text_to_image'
            ? undefined
            : {
                // Backend auto-determines type based on sketch preprocessing
                controlnet_type: 'canny',
                controlnet_scale: controlnetScale,
              },
        lora: {
          lora_enabled: loraEnabled,
          lora_scale: loraScale,
          lora_path: 'house_lora_final',
        },
        inference: {
          num_inference_steps: steps,
          guidance_scale: guidanceScale,
          width,
          height,
          seed: seed.trim() ? Number(seed) : undefined,
        },
        strength: mode === 'image_to_image' ? img2imgStrength : undefined,
        prompt_enhancement_enabled: promptEnhancementEnabled,
      });
    } catch (err: any) {
      toast({
        title: 'Generation failed to start',
        description:
          err?.response?.data?.message ||
          err?.message ||
          error ||
          'The queue could not accept the request. Please try again.',
        status: 'error',
        position: 'bottom-right',
      });
    }
  };

  const clearSource = () => {
    setSourceImage(null);
    setSourceName('Sketch input');
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const applySizePreset = (presetIndex: string) => {
    const preset = SIZE_PRESETS[Number(presetIndex)];
    if (!preset) return;
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const hasQueueLoad = Boolean(queueStats && (queueStats.waiting > 0 || queueStats.active > 0));
  const generationBusy = isGenerating || isEnhancing;

  return (
    <Box h="100%" overflowY="auto" bg={softBg}>
      <Box
        px={{ base: 4, xl: 6 }}
        py={{ base: 4, xl: 6 }}
        bg="radial-gradient(circle at 12% 10%, rgba(127,86,217,0.16), transparent 28%), radial-gradient(circle at 85% 0%, rgba(16,185,129,0.12), transparent 26%)"
      >
        <Flex justify="space-between" align={{ base: 'flex-start', lg: 'center' }} direction={{ base: 'column', lg: 'row' }} gap={4} mb={5}>
          <Box>
            <HStack spacing={3} mb={3} wrap="wrap">
              <Badge colorScheme="purple" borderRadius="full" px={3} py={1}>
                AI Architecture Studio
              </Badge>
              <Badge colorScheme="green" borderRadius="full" px={3} py={1}>
                Sketch to Photorealistic
              </Badge>
            </HStack>
            <Heading size="lg">Architectural Visualization Studio</Heading>
            <Text color="text.muted" mt={2} maxW="820px">
              Transform your architectural sketches into photorealistic renders. Upload or draw your design, describe the style and materials, and let our AI generate stunning photorealistic visualizations.
            </Text>
          </Box>

          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3} minW={{ lg: '440px' }}>
            <StatusPill icon={<Cpu size={16} />} label="GPU status" value={hasQueueLoad ? 'Busy' : 'Ready'} />
            <StatusPill icon={<Gauge size={16} />} label="Queue" value={`${queueStats?.waiting ?? 0} waiting`} />
            <StatusPill icon={<Sparkles size={16} />} label="Model" value="SDXL Pro" />
          </SimpleGrid>
        </Flex>

        <Grid templateColumns={{ base: '1fr', xl: '380px minmax(0, 1fr) 360px' }} gap={5} alignItems="stretch">
          <GridItem>
            <Box bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="24px" p={4} h="100%">
              <Flex justify="space-between" align="center" mb={4}>
                <Box>
                  <Heading size="sm">Sketch Input</Heading>
                  <Text fontSize="sm" color="text.muted">
                    Upload, drag and drop, or draw directly.
                  </Text>
                </Box>
                {sourceImage && (
                  <Button size="xs" variant="ghost" leftIcon={<X size={14} />} onClick={clearSource}>
                    Reset
                  </Button>
                )}
              </Flex>

              <Tabs variant="soft-rounded" colorScheme="purple" size="sm">
                <TabList>
                  <Tab>Upload</Tab>
                  <Tab>Draw</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <Flex
                      minH="300px"
                      borderRadius="20px"
                      borderWidth="1px"
                      borderStyle="dashed"
                      borderColor={isDragging ? 'brand.500' : 'border.default'}
                      bg={isDragging ? 'brand.50' : 'bg.subtle'}
                      _dark={{ bg: isDragging ? 'zinc.800' : 'zinc.950' }}
                      align="center"
                      justify="center"
                      direction="column"
                      textAlign="center"
                      p={5}
                      cursor="pointer"
                      onClick={() => uploadInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDragging(false);
                        handleFile(event.dataTransfer.files?.[0]);
                      }}
                    >
                      {sourceImage ? (
                        <Image src={sourceImage} alt={sourceName} maxH="280px" objectFit="contain" borderRadius="16px" />
                      ) : (
                        <>
                          <UploadCloud size={34} />
                          <Text fontWeight="bold" mt={3}>
                            Drop a house sketch here
                          </Text>
                          <Text fontSize="sm" color="text.muted">
                            PNG/JPG/WEBP. Line drawings work best with ControlNet lineart.
                          </Text>
                        </>
                      )}
                    </Flex>
                    <Input
                      ref={uploadInputRef}
                      type="file"
                      accept="image/*"
                      display="none"
                      onChange={(event) => handleFile(event.target.files?.[0])}
                    />
                    {sourceImage && (
                      <Text mt={3} color="text.muted" fontSize="xs" noOfLines={1}>
                        Current input: {sourceName}
                      </Text>
                    )}
                  </TabPanel>
                  <TabPanel px={0}>
                    <SketchCanvas
                      onChange={(dataUrl) => {
                        setSourceImage(dataUrl);
                        setSourceName('drawn-sketch.png');
                        if (mode === 'text_to_image') setMode('sketch_to_image');
                      }}
                    />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </GridItem>

          <GridItem>
            <Box bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="24px" p={4} h="100%">
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel fontSize="sm">Generation mode</FormLabel>
                  <SimpleGrid columns={{ base: 1, md: 3 }} spacing={2}>
                    {(Object.keys(modeLabels) as SdxlGenerationMode[]).map((item) => (
                      <Button
                        key={item}
                        variant={mode === item ? 'solid' : 'outline'}
                        bg={mode === item ? 'zinc.900' : undefined}
                        color={mode === item ? 'white' : undefined}
                        _dark={mode === item ? { bg: 'white', color: 'black' } : undefined}
                        onClick={() => setMode(item)}
                        whiteSpace="normal"
                      >
                        {modeLabels[item]}
                      </Button>
                    ))}
                  </SimpleGrid>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Prompt</FormLabel>
                  <Textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    minH="150px"
                    resize="vertical"
                    placeholder="Photorealistic modern wooden villa in forest..."
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Negative prompt</FormLabel>
                  <Textarea
                    value={negativePrompt}
                    onChange={(event) => setNegativePrompt(event.target.value)}
                    minH="96px"
                    resize="vertical"
                    placeholder="low quality, blurry, distorted geometry..."
                  />
                </FormControl>

                <Flex
                  align="center"
                  justify="space-between"
                  borderWidth="1px"
                  borderColor="border.default"
                  borderRadius="16px"
                  p={3}
                  bg="bg.subtle"
                >
                  <HStack>
                    <Wand2 size={18} />
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm">
                        Prompt enhancement
                      </Text>
                      <Text color="text.muted" fontSize="xs">
                        Expand the prompt before queueing the SDXL job.
                      </Text>
                    </Box>
                  </HStack>
                  <Switch isChecked={promptEnhancementEnabled} onChange={(event) => setPromptEnhancementEnabled(event.target.checked)} />
                </Flex>
              </Stack>
            </Box>
          </GridItem>

          <GridItem>
            <Box bg={panelBg} borderWidth="1px" borderColor={borderColor} borderRadius="24px" p={4} h="100%">
              <Heading size="sm" mb={1}>
                Generation Controls
              </Heading>
              <Text color="text.muted" fontSize="sm" mb={4}>
                Adjust how the AI interprets your sketch and prompt.
              </Text>

              <Stack spacing={4}>
                <SliderSetting 
                  label="Structure Strength" 
                  value={controlnetScale} 
                  min={0.5} 
                  max={1} 
                  step={0.05} 
                  onChange={setControlnetScale}
                  suffix=""
                  description="How strictly the AI follows your sketch structure"
                />

                <SliderSetting 
                  label="Creativity" 
                  value={guidanceScale} 
                  min={1} 
                  max={14} 
                  step={0.5} 
                  onChange={setGuidanceScale}
                  suffix=""
                  description="How closely the AI matches your prompt"
                />

                <SliderSetting 
                  label="Inference Quality" 
                  value={steps} 
                  min={10} 
                  max={60} 
                  step={1} 
                  onChange={setSteps}
                  suffix=" steps"
                  description="Higher = better quality but slower"
                />

                {mode === 'image_to_image' && (
                  <SliderSetting 
                    label="Strength" 
                    value={img2imgStrength} 
                    min={0.1} 
                    max={1} 
                    step={0.05} 
                    onChange={setImg2imgStrength}
                    suffix=""
                    description="How much to transform the input image"
                  />
                )}

                <FormControl>
                  <FormLabel fontSize="sm">Aspect Ratio</FormLabel>
                  <Select onChange={(event) => applySizePreset(event.target.value)} defaultValue="0">
                    {SIZE_PRESETS.map((preset, index) => (
                      <option key={preset.label} value={index}>
                        {preset.label} ({preset.width}x{preset.height})
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm">Seed (for reproducibility)</FormLabel>
                  <Input 
                    value={seed} 
                    onChange={(event) => setSeed(event.target.value)} 
                    placeholder="Leave empty for random" 
                    size="sm"
                  />
                  <Text fontSize="xs" color="text.muted" mt={1}>
                    Same seed + settings = same result
                  </Text>
                </FormControl>

                <Flex
                  align="center"
                  justify="space-between"
                  borderWidth="1px"
                  borderColor="border.default"
                  borderRadius="16px"
                  p={3}
                  bg="bg.subtle"
                >
                  <HStack spacing={3}>
                    <Wand2 size={18} />
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm">
                        Smart Prompt Enhancement
                      </Text>
                      <Text color="text.muted" fontSize="xs">
                        Automatically improve your prompt before generation
                      </Text>
                    </Box>
                  </HStack>
                  <Switch isChecked={promptEnhancementEnabled} onChange={(event) => setPromptEnhancementEnabled(event.target.checked)} />
                </Flex>
              </Stack>
            </Box>
          </GridItem>
        </Grid>

        <Flex
          mt={5}
          bg={panelBg}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="22px"
          p={4}
          align={{ base: 'stretch', md: 'center' }}
          justify="space-between"
          direction={{ base: 'column', md: 'row' }}
          gap={4}
        >
          <Box>
            <Text fontWeight="bold">Ready to visualize your design?</Text>
            <Text color="text.muted" fontSize="sm">
              {progress.status === 'active' || progress.status === 'progress'
                ? `Generating${elapsedSeconds ? ` for ${elapsedSeconds}s` : ''}`
                : 'Your design will be processed and ready in moments.'}
            </Text>
          </Box>
          <HStack>
            {generationBusy && (
              <Button variant="outline" onClick={cancel}>
                Cancel
              </Button>
            )}
            <Button
              size="lg"
              bg="zinc.900"
              color="white"
              _hover={{ bg: 'zinc.800' }}
              _dark={{ bg: 'white', color: 'black', _hover: { bg: 'zinc.200' } }}
              leftIcon={<Sparkles size={18} />}
              onClick={handleGenerate}
              isLoading={generationBusy}
              loadingText={isEnhancing ? 'Enhancing prompt' : 'Generating'}
              isDisabled={generationBusy}
            >
              Generate Visualization
            </Button>
          </HStack>
        </Flex>

        <Grid templateColumns={{ base: '1fr', xl: 'minmax(0, 1fr)' }} gap={5} mt={5}>
          <SdxlResultViewer
            isGenerating={isGenerating}
            result={latestResult}
            sourceImage={sourceImage}
            metadata={metadata}
            elapsedSeconds={elapsedSeconds}
            onRegenerate={handleGenerate}
          />
        </Grid>

        <ThesisShowcase />
      </Box>
    </Box>
  );
};

interface StatusPillProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ icon, label, value }) => (
  <Flex
    bg="bg.surface"
    borderWidth="1px"
    borderColor="border.default"
    borderRadius="16px"
    p={3}
    gap={3}
    align="center"
    minH="64px"
  >
    <Flex w="34px" h="34px" borderRadius="full" align="center" justify="center" bg="bg.subtle">
      {icon}
    </Flex>
    <Box>
      <Text fontSize="xs" color="text.muted">
        {label}
      </Text>
      <Text fontWeight="bold" fontSize="sm">
        {value}
      </Text>
    </Box>
  </Flex>
);

export default SdxlStudio;




