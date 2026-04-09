import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import routes from '@/routes';
import Navbar from '@/shared/navbar';
import Sidebar from '@/shared/sidebar';
import { RouteConfig } from '@/types';
import { useDispatch, useSelector } from 'react-redux';
import { setNavbarHeading } from '../../slices/navbar';
import { Box } from '@chakra-ui/react';
// import { setNavbarHeading } from '@/slices/navbar';
import Generate from '@/features/generation';
import { useUserMode } from '@/common/context/useUserModeContext';
import { selectCurrentUser } from '@/selectors/user';

// navbarHeadingConfig.ts

interface AdminProps {
  [key: string]: any;
}

// Admin component
const Admin: React.FC<AdminProps> = (props) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { mode } = useUserMode();
  const isWorkspace = mode === 'workspace';
  const { user } = useSelector(selectCurrentUser);

  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 700) {
        setOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    getActiveRoute(routes);
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const getActiveRoute = (routes: RouteConfig[]) => {
    // Only proceed if there are no search parameters in the URL
    if (window.location.search === '') {
      for (let i = 0; i < routes.length; i++) {
        const currentRoute = routes[i];
        if (currentRoute.isDisabled) {
          continue;
        }

        if (location.pathname === `/${currentRoute.path}` && !currentRoute.children?.length) {
          dispatch(setNavbarHeading(currentRoute.navbarHeading || ''));
          break; // Exit loop after finding active route
        }
      }
    }
  };

  const getRoutes = (routes: RouteConfig[], parent?: RouteConfig): React.ReactElement[] => {
    return routes
      .filter((prop) => prop.component !== undefined)
      .map((prop, key) => {
        const routePath = parent ? `/${parent.path}/${prop.path}` : `/${prop.path}`;

        // Check admin-only routes
        if (prop.adminOnly && !user?.isAdmin) {
          return (
            <Route
              key={`admin-only-${parent ? parent.path + '-' : ''}${prop.path}-${key}`}
              path={routePath}
              element={<Navigate to="/" replace />}
            />
          );
        }

        if (prop.isDisabled) {
          const redirectTo = prop.disabledRedirectPath || '/';
          return (
            <Route
              key={`disabled-${parent ? parent.path + '-' : ''}${prop.path}-${key}`}
              path={routePath}
              element={<Navigate to={redirectTo} replace />}
            />
          );
        }

        if (prop.children && prop.children.length > 0) {
          return (
          <Route key={`parent-${prop.path}-${key}`} path={`/${prop.path}`} element={<prop.component route={prop} />}>
            {getRoutes(prop.children, prop)}
          </Route>
          );
        }

        if (prop.path === '') {
          return <Route key={`index-${key}`} index element={<prop.component />} />;
        }

        return (
          <Route
            key={`route-${parent ? parent.path + '-' : ''}${prop.path}-${key}`}
            path={routePath}
            element={<prop.component />}
          />
      );
      });
  };

  return (
    <Box bg="bg.subtle" display="flex" h="100vh" overflow="hidden">
      {/* Sidebar - hidden in workspace mode */}
      {!isWorkspace && <Sidebar open={open} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} />}

      <Box 
        display="flex" 
        flexDirection="column" 
        flex="1" 
        h="100vh" 
        transition="all 0.3s" 
        overflow="hidden" 
        ml={isWorkspace ? 0 : open ? '200px' : '64px'}
      >
        {/* Navbar - hidden in workspace mode */}
        {!isWorkspace && <Navbar onOpenSidenav={() => setOpen(true)} {...props} />}

        <Box
          as="main"
          flex="1"
          h={isWorkspace ? '100vh' : 'calc(100vh - 64px)'}
          mx={isWorkspace ? 0 : 2}
          borderTopRadius={isWorkspace ? 0 : 'lg'}
          transition="all 0.3s"
          bg="bg.canvas"
          overflow="hidden"
        >
          <Box className="h-full w-full overflow-auto">
            <Routes>
              {getRoutes(routes)}
              <Route path="/" element={<Navigate to="/inspiration" replace />} />
              <Route path="/generate" element={<Generate />} />
            </Routes>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Admin;

