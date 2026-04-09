import React from 'react';
import paypal from '../../assets/svg/icons/paypal.svg';

const PaypalIcon = () => {
  //TODO handle dark mode

  return <img src={paypal} alt="paypal_icon" />;
};

export default React.memo(PaypalIcon);

