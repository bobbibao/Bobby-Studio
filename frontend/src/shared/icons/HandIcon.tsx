import React, { useEffect, useState } from 'react';
import hand from '../../assets/svg/icons/hand.svg';
import { useColorMode } from '@chakra-ui/react';

const HandIcon = ({ active }: { active: boolean }) => {
  const { colorMode } = useColorMode();
  const isToggleDarkMode = colorMode === 'dark';

  //no darkmode icon atm
  return !isToggleDarkMode ? (<img src={hand} alt="personal" />) : (<img src={hand} alt="personal" />);
};

export default React.memo(HandIcon);

