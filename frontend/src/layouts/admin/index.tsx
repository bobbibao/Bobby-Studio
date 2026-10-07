import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import routes from '@/routes';
import Navbar from '@/shared/navbar';
import Sidebar from '@/shared/sidebar';
import { RouteConfig } from '@/types';
import { useDispatch, useSelector } from 'react-redux';
import { setNavbarHeading } from '../../slices/navbar';
import { Box, Text, useBreakpointValue, useColorModeValue } from '@chakra-ui/react';
// import { setNavbarHeading } from '@/slices/navbar';
import Generate from '@/features/generation';
import { useUserMode } from '@/common/context/useUserModeContext';
import { selectCurrentUser } from '@/selectors/user';
import MorphIcon from '@/components/common/MorphIcon';

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
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  // Below the md breakpoint the sidebar is an overlay opened from the navbar, not a permanent rail.
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  useEffect(() => {
    const handleZenKey = (e: KeyboardEvent) => {
      if ((e.key === 'z' || e.key === 'Z') && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        setIsZenMode((prev) => !prev);
      }
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
    };
    window.addEventListener('keydown', handleZenKey);
    return () => window.removeEventListener('keydown', handleZenKey);
  }, [isZenMode]);

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
    <Box bg="bg.canvas" className="aurora-bg" display="flex" h="100vh" overflow="hidden">
      {/* Floating Exit Zen Mode capsule pill */}
      {isZenMode && (
        <Box
          position="fixed"
          top={4}
          right={6}
          zIndex={100}
          display="flex"
          alignItems="center"
          gap={2}
          px={3.5}
          py={1.5}
          borderRadius="full"
          bg="rgba(15, 17, 26, 0.85)"
          backdropFilter="blur(12px)"
          border="1px solid"
          borderColor="rgba(255, 255, 255, 0.15)"
          color="white"
          boxShadow="0 10px 25px -5px rgba(0, 0, 0, 0.5)"
          cursor="pointer"
          onClick={() => setIsZenMode(false)}
          _hover={{ bg: 'rgba(127, 86, 217, 0.4)', borderColor: 'brand.400' }}
          transition="all 0.2s"
        >
          <MorphIcon type="zen" size={15} />
          <Text fontSize="xs" fontWeight="semibold">
            Exit Zen Mode
          </Text>
          <Box as="span" px={1.5} py={0.5} borderRadius="md" bg="rgba(255, 255, 255, 0.1)" fontSize="10px">
            Z / Esc
          </Box>
        </Box>
      )}

      {/* Sidebar - hidden in workspace or zen mode */}
      {!isZenMode && !isWorkspace && isMobile && open && (
        <Box position="fixed" inset={0} zIndex={55} bg="blackAlpha.600" backdropFilter="blur(4px)" onClick={() => setOpen(false)} aria-hidden />
      )}
      {!isZenMode && !isWorkspace && (
        <Sidebar open={open} mobile={isMobile} onOpen={() => setOpen(true)} onClose={() => setOpen(false)} />
      )}

      <Box 
        display="flex" 
        flexDirection="column" 
        flex="1" 
        h="100vh" 
        transition="all 0.3s cubic-bezier(0.16, 1, 0.3, 1)" 
        overflow="hidden" 
        ml={isZenMode || isWorkspace || isMobile ? 0 : open ? '280px' : '96px'}
      >
        {/* Navbar - hidden in workspace or zen mode */}
        {!isZenMode && !isWorkspace && <Navbar onOpenSidenav={() => setOpen(true)} {...props} />}

        <Box
          as="main"
          flex="1"
          minH={0}
          h={isZenMode || isWorkspace ? '100vh' : undefined}
          mx={isZenMode || isWorkspace ? 0 : 3}
          mb={isZenMode || isWorkspace ? 0 : 2}
          borderRadius={isZenMode || isWorkspace ? 0 : '18px'}
          border="1px solid"
          borderColor={useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)')}
          boxShadow={isZenMode || isWorkspace ? 'none' : useColorModeValue('0 4px 20px -5px rgba(0,0,0,0.05)', '0 4px 20px -5px rgba(0,0,0,0.5)')}
          bg="bg.surface"
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Box flex="1" minH={0} h="full" w="full" overflow="auto">
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

