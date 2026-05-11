import React from 'react';

import { CaseStudiesData } from './data';
import CardTutorial from '@/shared/card/CardTutorial';

const CaseStudiesSection: React.FC = () => {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[28px] font-semibold text-textPriamry">Case Studies</p>
      <p className="text-secondary">
        Explore real-world applications of AI in architecture through detailed
        case studies
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-4 gap-4">
        {CaseStudiesData?.map((caseStudy, index) => (
          <CardTutorial
            key={caseStudy?.id}
            imageSrc={caseStudy.imageSrc}
            title={caseStudy.title}
            generationType={caseStudy.generationType}
          />
        ))}
      </div>
    </div>
  );
};

export default CaseStudiesSection;



