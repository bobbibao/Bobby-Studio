import React, { useState } from 'react';
import { TabsCommon } from '@/shared/tabs';
import { HelperCenter } from '@/features/admin/pages/admin/support/components/HelperCenter';
import { ReleaseNotes } from '@/features/admin/pages/admin/support/components/ReleaseNotes';
import { Roadmap } from '@/features/admin/pages/admin/support/components/Roadmap';
import { FeedbackSection } from '@/features/admin/pages/admin/support/components/FeedbackSection';
import { useTranslation } from 'react-i18next';

const Support: React.FC = () => {
  const { t } = useTranslation();

  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);

  return (
    <TabsCommon
      selected={selectedTabIndex}
      onSelect={setSelectedTabIndex}
      className="px-4 py-4"
      classNamePanels="h-[calc(100vh-176px)] overflow-auto"
      tabs={[
        {
          name: t('support:help_center'),
          component: <HelperCenter />,
        },
        {
          name: t('support:release_notes'),
          component: <ReleaseNotes />,
        },
        {
          name: t('support:roadmap'),
          component: <Roadmap />,
        },
        {
          name: t('support:feedback'),
          component: <FeedbackSection />,
        },
      ]}
    />
  );
};

export default Support;



