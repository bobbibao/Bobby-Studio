import React, { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { Navigation } from 'swiper/modules';
import { Swiper as SwiperType } from 'swiper/types';
import CardImageGenerated, {
  CardImageGeneratedProps,
} from './CardImageGenerated';
import ChevronLeftIcon from '@/shared/icons/ChevronLeftIcon';
import ChevronRightIcon from '@/shared/icons/ChevronRightIcon';
import { AspectRatio } from '@chakra-ui/react';

interface CarouselImageGeneratedProps {
  generatedImages: CardImageGeneratedProps[];
  className?: string;
}

const CarouselImageGenerated: React.FC<CarouselImageGeneratedProps> = ({
  generatedImages,
  className = '',
}) => {
  const refSwiper = useRef<SwiperType>();
  const onNext = () => {
    refSwiper.current?.slideNext();
  };
  const onPrev = () => {
    refSwiper.current?.slidePrev();
  };
  return (
    <div className={`relative ${className}`}>
      <Swiper
        onSwiper={(swiper) => {
          refSwiper.current = swiper;
        }}
        slidesPerView={1}
        spaceBetween={16}
        loop={true}
        modules={[Navigation]}
        className="mySwiper"
        breakpoints={{
          1450: {
            slidesPerView: 4,
          },
          1280: {
            slidesPerView: 3,
          },
          768: {
            slidesPerView: 2,
          },
          480: {
            slidesPerView: 1,
          },
        }}
      >
        {generatedImages.map((generatedImage, index) => (
          <SwiperSlide key={index}>
            <AspectRatio ratio={365 / 486}>
              <CardImageGenerated {...generatedImage} />
            </AspectRatio>
          </SwiperSlide>
        ))}
      </Swiper>
      <button
        title={''}
        className="disabled:cursor-not-allowed absolute z-[1] size-10 flex items-center justify-center bg-[#F8F9FA] dark:bg-borderPrimary rounded-full top-1/2 left-1 -translate-y-1/2"
        onClick={onPrev}
        disabled
      >
        <ChevronLeftIcon />
      </button>
      <button
        title={''}
        className="disabled:cursor-not-allowed absolute z-[1] size-10 flex items-center justify-center bg-[#F8F9FA] dark:bg-borderPrimary rounded-full top-1/2 right-1 -translate-y-1/2"
        onClick={onNext}
        disabled
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
};

export default CarouselImageGenerated;



