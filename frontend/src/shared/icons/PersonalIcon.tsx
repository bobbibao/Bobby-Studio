import React from 'react';
import person from '../../assets/svg/icons/person.svg';

const PersonalIcon = () => {
  
  return <img src={person} alt="personal" />
};

export default React.memo(PersonalIcon);

