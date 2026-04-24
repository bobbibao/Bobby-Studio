import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import Card from '@/shared/card';
import { setNavbarAllowBack, setNavbarHeading } from '@/slices/navbar';

import SdxlStudio from './components/SdxlStudio/SdxlStudio';

const   Generate: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type');

    dispatch(setNavbarAllowBack(!!typeParam));
    dispatch(setNavbarHeading(typeParam || 'Workspace'));

    return () => {
      dispatch(setNavbarAllowBack(false));
    };
  }, [dispatch, location.search]);

  return (
    <Card className="bg-white dark:bg-black rounded-t-lg w-full h-full">
      <SdxlStudio />
    </Card>
  );
};

export default Generate;



