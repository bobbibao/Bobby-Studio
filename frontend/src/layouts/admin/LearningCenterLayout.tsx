import { setNavbarAllowBack, setNavbarHeading } from '@/slices/navbar';
import { RouteConfig } from '@/types';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Outlet, useLocation } from 'react-router-dom';

type LearningCenterLayoutProps = {
  route: RouteConfig;
};
const LearningCenterLayout: React.FC<LearningCenterLayoutProps> = ({
  route,
}) => {
  const dispatch = useDispatch();
  const location = useLocation();

  useEffect(() => {
    getActiveRoute(route);
  }, [location.pathname]);

  const getActiveRoute = (route: RouteConfig) => {
    // Only proceed if there are no search parameters in the URL
    if (route?.children && route?.children?.length > 0 && window.location.search === '') {
      const children = route.children;
      for (let i = 0; i < children.length; i++) {
        const path = [route.path, children[i].path].filter(Boolean).join('/');
        if (location.pathname === `/${path}`) {
          dispatch(setNavbarHeading(children[i].navbarHeading || ''));
          dispatch(setNavbarAllowBack(!!children[i].path));
          break; // Exit loop after finding active route
        }
      }
    }
  };
  return <Outlet />;
};

export default LearningCenterLayout;

