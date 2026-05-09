import React, { useRef } from 'react';
import { Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { Image, Container } from '@chakra-ui/react';
import { Swiper as SwiperType } from 'swiper/types';
import ChevronLeftIcon from '@/shared/icons/ChevronLeftIcon';
import ChevronRightIcon from '@/shared/icons/ChevronRightIcon';

const AiDesignSliderSwiper: React.FC<{
  data: any[];
}> = ({ data }) => {
  const refSwipper = useRef<SwiperType>();

  const onNext = () => {
    refSwipper.current?.slideNext();
  };
  const onPrev = () => {
    refSwipper.current?.slidePrev();
  };

  return (
    <div className="relative w-full">
      <Container maxWidth={'100%'}>
        <Swiper
          onSwiper={(swiper) => {
            refSwipper.current = swiper;
          }}
          pagination={{ clickable: true }}
          modules={[Navigation, Pagination]}
          className="!-mx-4"
        >
          {data?.map((banner, index) => (
            <SwiperSlide key={banner.id}>
              <Image
                src={banner.imageSrc}
                className="w-full min-h-[447px] object-cover rounded-lg mt-4"
                alt={'image 1'}
                loading="lazy"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </Container>
      <button
        className="absolute z-[1] size-10 flex items-center justify-center bg-[#F8F9FA] dark:bg-borderPrimary rounded-full top-1/2 -left-[20px] -translate-y-1/2"
        onClick={onPrev}
      >
        <ChevronLeftIcon />
      </button>
      <button
        className="absolute z-[1] size-10 flex items-center justify-center bg-[#F8F9FA] dark:bg-borderPrimary rounded-full top-1/2 -right-[20px] -translate-y-1/2"
        onClick={onNext}
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
};

export default AiDesignSliderSwiper;



