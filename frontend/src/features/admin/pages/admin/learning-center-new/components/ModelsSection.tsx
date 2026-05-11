import React from 'react';

import { ModelsData } from './data';
import CardAiDesign from '@/shared/card/CardAiDesign';

const ModelsSection: React.FC = () => {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[28px] font-semibold text-textPriamry">Models</p>
      <p className="text-secondary">
        Discover AI-driven models designed to transform architectural insights
        and design processes
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 2xl:grid-cols-4 gap-4">
        {ModelsData?.map((project, index) => (
          <CardAiDesign
            key={project?.id}
            imageSrc={project.imageSrc}
            title={project.title}
            subtitle={project.subtitle}
          />
        ))}
      </div>
    </div>
  );
};

export default ModelsSection;



