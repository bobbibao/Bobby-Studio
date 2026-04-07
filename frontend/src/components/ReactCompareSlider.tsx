import React from 'react';
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from 'react-compare-slider';
import CompareIcon from '../shared/icons/CompareIcon';

interface ReactCompareSliderProps {
  originalSrc: string;
  compareSrc: string;
}

const CustomHandle: React.FC = () => {
  return (
    <div className="relative w-full h-full">
      <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white transform -translate-x-1/2" />

      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full">
        <CompareIcon />
      </div>
    </div>
  );
};

const ReactCompareSliderComp: React.FC<ReactCompareSliderProps> = ({
  originalSrc,
  compareSrc,
}) => {
  return (
    <ReactCompareSlider
      className="rounded-lg"
      onlyHandleDraggable
      itemOne={
        <ReactCompareSliderImage
          src={originalSrc}
          srcSet={originalSrc}
          alt="original_src"
        />
      }
      itemTwo={
        <ReactCompareSliderImage
          className="rounded-lg"
          src={compareSrc}
          srcSet={compareSrc}
          alt="compare_src"
        />
      }
      handle={<CustomHandle />}
    />
  );
};

export default ReactCompareSliderComp;

