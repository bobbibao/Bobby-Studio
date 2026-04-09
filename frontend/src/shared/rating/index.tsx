import { HStack, IconButton } from '@chakra-ui/react';
import { useState } from 'react';
import { StarIcon } from '@chakra-ui/icons';
interface RatingProps {
  totalStars?: number;
  initialRating?: number;
  onChange(value: number): void;
}
const Rating = ({
  totalStars = 5,
  initialRating = 0,
  onChange,
}: RatingProps) => {
  const [rating, setRating] = useState(initialRating);

  const handleClick = (newRating: any) => {
    setRating(newRating);
    if (onChange) onChange(newRating);
  };

  return (
    <HStack spacing={1} display="flex" justifyContent="center">
      {[...Array(totalStars)].map((_, index) => (
        <IconButton
          key={index}
          icon={<StarIcon boxSize={8} />}
          variant="unstyled"
          color={index < rating ? 'yellow.500' : 'gray.300'}
          _hover={{ color: 'yellow.500' }}
          aria-label={`Rate ${index + 1} stars`}
          onClick={() => handleClick(index + 1)}
          size="sm"
          p={0}
        />
      ))}
    </HStack>
  );
};

export default Rating;

