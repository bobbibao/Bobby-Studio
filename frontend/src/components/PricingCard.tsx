import { Box, List, ListItem, Text } from '@chakra-ui/react';
import React from 'react';
import Button from '../shared/buttons/Button';
import { SUBSCRIPTION_TYPE_ENUM } from '../types';
import CheckIcon from '../shared/icons/CheckIcon';

interface PricingCardProps {
  tag?: string;
  type?: 'month' | 'year';
  subscriptionType?: SUBSCRIPTION_TYPE_ENUM;
  description?: string;
  price?: string;
  terms?: string[];
  onClick?: (subscriptionPlan?: 'month' | 'year') => void;
}

const PricingCard: React.FC<PricingCardProps> = ({ type, subscriptionType, tag, description, price, terms, onClick }) => {
  const priceTextClass = 'text-[32px] font-bold leading-[1.1] tracking-[0.03em]';

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      p={5}
      position="relative"
      className="max-w-[352px] min-h-[500px] flex flex-col justify-between !p-4 bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-md hover:shadow-lg transition-shadow duration-300 border-borderLight dark:border-borderDark hover:bg-[#F3E8FF]/50 dark:hover:bg-[#1E1E1E]/90"
    >
      {/* Tag */}
      <div className="bg-primary w-max px-4 py-1 font-semibold text-white rounded-lg">{tag}</div>

      {/* Description */}
      <Text fontSize="md" mt={2} mb={3} className="text-[#6C757D]">
        {description}
      </Text>

      {/* Price */}
      <div className="flex items-end">
        <span className={`${priceTextClass} text-black dark:text-white mr-1`}>{price}</span>/
        <span className="text-[#6C757D] text-sm font-medium leading-5 uppercase tracking-wide">
          {type === 'month' ? 'month' : 'year'}
        </span>
      </div>

      <div className="h-px w-full bg-[#E0E0E0] dark:bg-[#2E2E2E] my-4"></div>

      {/* Terms List */}
      <List spacing={3}>
        {terms?.map((term, index) => (
          <ListItem key={index} display="flex" alignItems="center" gap={2}>
            <CheckIcon />
            <Text className="dark:text-white">{term}</Text>
          </ListItem>
        ))}
      </List>

      <div className="mt-auto"></div>

      <div className="h-px w-full bg-[#E0E0E0] dark:bg-[#2E2E2E] mb-4"></div>

      {/* Button */}
      <Button
        label={subscriptionType === SUBSCRIPTION_TYPE_ENUM.BASIC ? 'Current plan' : 'Purchase'}
        extraClass="w-full flex justify-center"
        onClick={() => onClick?.(type)}
      />
    </Box>
  );
};

export default PricingCard;

