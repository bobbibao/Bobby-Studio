import { Box, Flex, Text } from '@chakra-ui/react';
import React, { useState } from 'react';
import AddIcon from '../shared/icons/AddIcon';
import CloseIcon from '../shared/icons/CloseIcon2';
import RemoveIcon from '../shared/icons/RemoveIcon';
import { OptionType } from '../types';
import Button from '../shared/buttons/Button';

interface TagListProps {
  title: string;
  tags: OptionType[];
  activeTags: OptionType[];
  onTagChange?: (activeTags: OptionType[]) => void;
}

const TagList: React.FC<TagListProps> = ({
  title,
  tags,
  activeTags,
  onTagChange,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleTagClick = (tag: OptionType) => {
    const isActive = activeTags.some((t) => t.value === tag.value);
    const newActiveTags = isActive
      ? activeTags.filter((t) => t.value !== tag.value)
      : [...activeTags, tag];
    if (onTagChange) {
      onTagChange(newActiveTags);
    }
  };

  const handleToggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return isVisible ? (
    <Box
      mb={4}
      className="absolute h-full top-0 z-1 bg-white w-[260px] px-4 py-6 shadow-md dark:bg-black dark:ml-5 dark:my-4 rounded-lg"
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Text fontSize="lg" fontWeight="bold" className="dark:text-white">
          {title}
        </Text>
        <div className="cursor-pointer" onClick={handleToggleVisibility}>
          <CloseIcon />
        </div>
      </Flex>
      <Flex mt={5} flexWrap="wrap" gap={2}>
        {tags.map((tag) => (
          <Box
            key={tag.value}
            display="flex"
            alignItems="center"
            className={`rounded-md border border-[#E0E0E0] dark:border-borderPrimary bg-[#F8F9FA] px-2 py-1 text-black ${
              activeTags.some((t) => t.value === tag.value)
                ? 'bg-primary text-white'
                : 'dark:bg-[#2E2E2E]'
            }`}
          >
            <Text
              mr={2}
              className={
                activeTags.some((t) => t.value === tag.value)
                  ? 'text-white'
                  : 'dark:text-white'
              }
            >
              {tag.label}
            </Text>
            <div
              className="cursor-pointer"
              onClick={() => handleTagClick(tag)}
              aria-label={
                activeTags.some((t) => t.value === tag.value)
                  ? 'Remove tag'
                  : 'Add tag'
              }
            >
              {activeTags.some((t) => t.value === tag.value) ? (
                <RemoveIcon />
              ) : (
                <AddIcon />
              )}
            </div>
          </Box>
        ))}
      </Flex>
    </Box>
  ) : (
    <Box
      mb={4}
      className="absolute top-0 z-1 text-black dark:text-white ml-5 my-4 rounded-lg cursor-pointer"
    >
      <Button label="Open tags list" onClick={handleToggleVisibility}></Button>
    </Box>
  );
};

export default TagList;

