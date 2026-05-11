import image1 from '@/assets/img/ai-design/image1.webp';
import image2 from '@/assets/img/ai-design/image2.webp';
import image3 from '@/assets/img/ai-design/image3.webp';
import image4 from '@/assets/img/ai-design/image4.webp';

import videoBg1 from '@/assets/img/learning/video-bg1.png';
import videoBg2 from '@/assets/img/learning/video-bg2.png';
import videoBg3 from '@/assets/img/learning/video-bg3.png';

import tutorial1 from '@/assets/img/learning/tutorial1.png';
import tutorial2 from '@/assets/img/learning/tutorial2.png';
import tutorial3 from '@/assets/img/learning/tutorial3.png';
import tutorial4 from '@/assets/img/learning/tutorial4.png';

import caseStudy1 from '@/assets/img/learning/case-study1.png';

import { v4 as uuid } from 'uuid';

export const ModelsData = [
  {
    id: uuid(),
    imageSrc: image1,
    title: 'Line Drawing to Image',
    subtitle:
      'Bring sketches to life. Our AI transforms simple line drawings into fully fleshed out, photorealistic architectural visualizations.',
  },
  {
    id: uuid(),
    imageSrc: image2,
    title: 'Text to Image',
    subtitle:
      'Transform architectural descriptions into photorealistic representations. Our AI interprets your words and generates detailed visualizations of your concepts.',
  },
  {
    id: uuid(),
    imageSrc: image3,
    title: 'Image Upscaling',
    subtitle:
      'Use architectural photos as a source of inspiration. Our AI analyzes images and generates new, unique designs in the style of the original.',
  },
  {
    id: uuid(),
    imageSrc: image4,
    title: 'Image to Image',
    subtitle:
      'Optimize your 3D models. Our system transforms CAD files and renderings into stunning representations with realistic environments.',
  },
];

export const VideosData = [
  {
    id: uuid(),
    title: 'Creating Architectural Visuals from Text Descriptions',
    generationType: 'Text to Image',
    imageSrc: videoBg1,
  },
  {
    id: uuid(),
    title: 'Transforming Line Drawings into Realistic Images with AI',
    generationType: 'Line Drawing to Image',
    imageSrc: videoBg2,
  },
  {
    id: uuid(),
    title: 'Transforming Building Exteriors Across Seasons with AI',
    generationType: 'Image to Image',
    imageSrc: videoBg3,
  },
];

export const TutorialsData = [
  {
    id: uuid(),
    imageSrc: tutorial1,
    title: 'Transforming Line Drawings into Realistic Images with AI',
    generationType: 'Line Drawing to Image',
    subtitle: '',
  },
  {
    id: uuid(),
    imageSrc: tutorial2,
    title: 'Creating Architectural Visuals from Text Descriptions',
    generationType: 'Text to Image',
    subtitle: '',
  },
  {
    id: uuid(),
    imageSrc: tutorial3,
    title: 'Enhancing Low-Resolution Images with AI for Architecture',
    generationType: 'Image Upscaling',
    subtitle: '',
  },
  {
    id: uuid(),
    imageSrc: tutorial4,
    title: 'Transforming Building Exteriors Across Seasons with AI',
    generationType: 'Image to Image',
    subtitle: '',
  },
];

export const CaseStudiesData = [
  {
    id: uuid(),
    imageSrc: caseStudy1,
    title: 'Transforming Line Drawings into Realistic Images with AI',
    generationType: 'Line Drawing to Image',
  },
  {
    id: uuid(),
    imageSrc: caseStudy1,
    title: 'Creating Architectural Visuals from Text Descriptions',
    generationType: 'Text to Image',
  },
  {
    id: uuid(),
    imageSrc: caseStudy1,
    title: 'Enhancing Low-Resolution Images with AI for Architecture',
    generationType: 'Image Upscaling',
  },
  {
    id: uuid(),
    imageSrc: caseStudy1,
    title: 'Transforming Building Exteriors Across Seasons with AI',
    generationType: 'Image to Image',
  },
];



