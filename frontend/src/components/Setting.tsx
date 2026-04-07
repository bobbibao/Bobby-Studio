import { Box, Flex, Text } from '@chakra-ui/react';
import React from 'react';
import ToolWrapper from './ToolWrapper';
import Button from '../shared/buttons/Button';
import DownloadIcon from '../shared/icons/DownloadIcon';
import UploadIcon from '../shared/icons/UploadIcon';
import { SUBSCRIPTION_TYPE_ENUM } from '../types';

interface SettingProps {
  position?: number;
  subscriptionType: SUBSCRIPTION_TYPE_ENUM;
  onDownload?: () => void;
  onUpload?: () => void;
}

const Setting: React.FC<SettingProps> = ({
  position,
  subscriptionType = SUBSCRIPTION_TYPE_ENUM.BASIC,
  onDownload,
  onUpload,
}) => {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    }
  };

  const handleUpload = () => {
    if (onUpload) {
      onUpload();
    }
  };

  return (
    <ToolWrapper position={position} title="Setting">
      <Flex direction="column" gap={4}>
        {/* Export Item */}
        <Flex alignItems="center" gap={2}>
          <Text className="dark:text-white" width="80px">
            Export
          </Text>
          <Button
            onClick={handleDownload}
            label="Download File"
            icon={<DownloadIcon />}
            extraClass="!bg-[transparent] !text-primary dark:!text-primaryActive border border-primary dark:border-primaryActive w-full"
          />
        </Flex>
        {/* Import Item */}
        <Flex alignItems="center" gap={2}>
          <Text className="dark:text-white" width="80px">
            Import
          </Text>
          <Button
            onClick={handleUpload}
            label="Upload File"
            icon={<UploadIcon />}
            extraClass="!bg-[transparent] !text-primary dark:!text-primaryActive border border-primary dark:border-primaryActive w-full"
          />
        </Flex>
      </Flex>
    </ToolWrapper>
  );
};

export default Setting;

