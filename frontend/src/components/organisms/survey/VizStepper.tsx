import { Flex, Box } from "@chakra-ui/react";

interface StepperProps {
  numberOfSteps: number;
  currentStep: number;
}

const VizStepper = ({ numberOfSteps, currentStep }: StepperProps) => {
  return (
    <Flex gap={2}>
      {Array.from({ length: numberOfSteps }).map((_, index) => {
        const isVisited = index < currentStep - 1;
        const isCurrent = index === currentStep - 1;
        
        let bgColor = "#E0E0E0"; // Default (not visited)
        if (isCurrent) bgColor = "#2E2E2E";
        if (isVisited) bgColor = "#111113";

        return (
          <Box
            key={index}
            width="24px"
            height="4px"
            borderRadius="8px"
            bgColor={bgColor}
            transition="background-color 0.3s ease"
          />
        );
      })}
    </Flex>
  );
};

export default VizStepper
// Usage example:
// <VizStepper numberOfSteps={5} currentStep={3} />
