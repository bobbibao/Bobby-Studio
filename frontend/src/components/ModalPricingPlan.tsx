// PricingModal.tsx
import { Modal, ModalBody, ModalContent, ModalOverlay } from '@chakra-ui/react';
import React, { useState } from 'react';
import PricingTabsGroup from './PricingTabsGroup';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <ModalOverlay />
      <ModalContent>
        <div className="flex flex-col items-center my-6">
          <h1 className="text-primary dark:text-white font-semibold text-[40px]">
            Become a Pro member today!
          </h1>

          <span className="text-base text-[#6C757D]">
            Explore unlimited access to advanced features, unique content, and
            fast priority support
          </span>
        </div>
        <ModalBody>
          <PricingTabsGroup
            tabPanelClass="!mt-8"
            selectedTabIndex={selectedTabIndex}
            setSelectedTabIndex={setSelectedTabIndex}
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PricingModal;

