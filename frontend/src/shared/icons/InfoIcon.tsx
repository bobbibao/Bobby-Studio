import React from 'react';
import info from '../../assets/svg/icons/info.svg';

const InfoIcon = () => {
  //TODO handle dark mode

  return <img src={info} alt="pen_icon" />
};

export default React.memo(InfoIcon);

