import React from 'react';

import { TutorialsData } from './data';
import CardAiDesign from '@/shared/card/CardAiDesign';

const TutorialsSection: React.FC = () => {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[28px] font-semibold text-textPriamry">Tutorials</p>
      <p className="text-secondary">
        Follow comprehensive tutorials to master AI tools and techniques in
        architecture
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-4 gap-4">
        {TutorialsData?.map((tutorial, index) => (
          <CardAiDesign
            key={tutorial?.id}
            imageSrc={tutorial.imageSrc}
            title={tutorial.title}
            subtitle={tutorial.subtitle}
            generationType={tutorial.generationType}
          />
        ))}
      </div>
    </div>
  );
};

export default TutorialsSection;



