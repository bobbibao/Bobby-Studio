import FullScreenIcon from '@/shared/icons/FullScreenIcon';
import NextIcon from '@/shared/icons/NextIcon';
import PauseIcon from '@/shared/icons/PauseIcon';
import PlayIcon from '@/shared/icons/PlayIcon';
import SettingIcon from '@/shared/icons/SettingIcon';
import VolumeIcon from '@/shared/icons/VolumeIcon';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Progress,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
} from '@chakra-ui/react';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player';

type VideoPlayerProps = {
  source?: string;
};
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  source = 'https://www.sample-videos.com/video321/mp4/720/big_buck_bunny_720p_30mb.mp4',
}) => {
  const playerRef = useRef<ReactPlayer>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [played, setPlayed] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const handlePlayPause = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const seekForward = useCallback(() => {
    playerRef.current &&
      playerRef.current.seekTo(playerRef.current.getCurrentTime() + 10);
  }, []);

  const seekBackward = useCallback(() => {
    playerRef.current &&
      playerRef.current.seekTo(playerRef.current.getCurrentTime() - 10);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      videoRef.current && videoRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case ' ':
          handlePlayPause();
          event.preventDefault();
          break;
        case 'ArrowRight':
          seekForward();
          break;
        case 'ArrowLeft':
          seekBackward();
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayPause, seekForward, seekBackward, toggleFullscreen]);

  return (
    <Box ref={videoRef} w="100%" position={'relative'} borderRadius={"lg"}>
      <ReactPlayer
        ref={playerRef}
        url={source}
        playing={playing}
        volume={volume}
        onProgress={({ played }) => setPlayed(played)}
        controls={false}
        width="100%"
        height="100%"
      />
      <Flex
        position={'absolute'}
        direction={'column'}
        bottom={0}
        zIndex={1}
        w={'full'}
        className="bg-black/35"
      >
        <Slider
          w={'full'}
          min={0}
          max={1}
          step={0.1}
          value={played}
          onChange={(val) => {
            const newValue = val;
            setPlayed(newValue);
            playerRef.current && playerRef.current.seekTo(newValue);
          }}
          p={0}
          h={'4px'}
        >
          <SliderTrack bg={'rgba(255, 255, 255, 0.35)'} h={'4px'}>
            <SliderFilledTrack bg="#111113" h={'4px'} />
          </SliderTrack>
          <SliderThumb bg={'transparent'} visibility={'hidden'} />
        </Slider>
        <Flex
          justifyContent={'space-between'}
          alignItems={'center'}
          paddingBlock={2}
          paddingInline={4}
        >
          <Flex flex={1} gap={1}>
            <IconButton
              className="!flex justify-center items-center"
              variant={'unstyled'}
              aria-label="Pause"
              onClick={handlePlayPause}
              icon={playing ? <PauseIcon /> : <PlayIcon w={5} h={5} />}
            />
            <IconButton
              className="!flex justify-center items-center"
              variant={'unstyled'}
              aria-label="Next"
              icon={<NextIcon />}
            />
            <Box position={'relative'} className="group">
              <IconButton
                className="!flex justify-center items-center"
                variant={'unstyled'}
                aria-label="Volume"
                icon={<VolumeIcon />}
              />
              <Slider
                orientation="vertical"
                w={'100%'}
                className="!absolute -top-[80px] !left-1/2 !-translate-x-1/2 !hidden group-hover:!block"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(val) => {
                  setVolume(val);
                }}
                p={0}
                h={'80px'}
              >
                <SliderTrack bg={'rgba(255, 255, 255, 0.35)'} h={'6px'}>
                  <SliderFilledTrack bg="#111113" h={'6px'} />
                </SliderTrack>
                <SliderThumb />
              </Slider>
            </Box>
          </Flex>
          <Flex flex={1} justifyContent={'flex-end'}>
            <IconButton
              className="!flex justify-center items-center"
              variant={'unstyled'}
              aria-label="Setting"
              icon={<SettingIcon />}
            />
            <IconButton
              className="!flex justify-center items-center"
              variant={'unstyled'}
              aria-label="Full Screen"
              onClick={toggleFullscreen}
              icon={<FullScreenIcon />}
            />
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

