import { Route, Routes as ReactRoutes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '@/layouts/admin';
import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { fetchCurrentUser, FETCHING_STATUS_FAILED, FETCHING_STATUS_SUCCEEDED } from '@/slices/currentUserSlice';
import { useToast } from '@chakra-ui/react';
import { RootState } from '../store';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/configs/firebase';
import SurveyForm from '@/components/organisms/survey/SurveyForm';
import LoadingPage from '@/components/LoadingPage';
import { selectCurrentUser } from '@/selectors/user';
import { useAppDispatch } from '@/store';
import { fetchCMSArticles, fetchCMSGalleries } from '@/slices/cms';
import { getUserProjects } from '@/actions/project';
import { useTranslation } from 'react-i18next';

const ProtectedRoutes: React.FC = () => {
  const { t } = useTranslation();
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  const dispatch = useAppDispatch();
  const [firebaseUser, firebaseLoading] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const { user: currentUser, fetchingStatus } = useSelector(selectCurrentUser);

  useEffect(() => {
    if (firebaseUser) {
      dispatch(fetchCurrentUser());
    }
  }, [firebaseUser, dispatch]);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([dispatch(fetchCMSGalleries()).unwrap(), dispatch(fetchCMSArticles()).unwrap()]);
      } catch (error) {
        toast({
          title: translatorNotificationNS('error'),
          description: translatorNotificationNS('failed_to_load_data'),
          status: 'error',
          isClosable: true,
        });
      }
    };

    // loadData();
  }, []);

  // const dispatch = useAppDispatch();
  const { user } = useSelector((state: RootState) => state.currentUser);
  const userId = user?.id;

  useEffect(() => {
    if (userId) {
      dispatch(getUserProjects({ userId: userId, orderBy: 'desc', inputType: [], creationType: '' }));
    }
  }, [dispatch, userId]);
  const hasInitialFetchRef = useRef(false);
  const userAssignedImageIdsSelector = useSelector((state: RootState) => {
    const nestedArray = state.projectManagement.projects.map((project) =>
      project.value?.folders?.map((folder) => folder.images.map((i) => i.id))
    );

    const flatIds: string[] = nestedArray.flat(Infinity).filter((id) => typeof id === 'string');
    return flatIds;
  });

  // useEffect(() => {
  //   if (
  //     !hasInitialFetchRef.current &&
  //     userAssignedImageIdsSelector.length > 0
  //   ) {
  //     const getUserImagesAction: GetUserImagesAction = {
  //       userId: currentUser?.id ?? '',
  //       images: userAssignedImageIdsSelector,
  //       page: 1,
  //       limit: 100,
  //     };
  //     dispatch(getUserAssignedImages(getUserImagesAction));
  //     hasInitialFetchRef.current = true;
  //   }
  // }, [dispatch, userAssignedImageIdsSelector, currentUser]);

  // useEffect(() => {
  //   const [page, limit] = [1, 100];
  //   const getUnassignedUserImagesAction: GetUnassignedUserImagesAction = {
  //     userId: currentUser?.id ?? '',
  //     page,
  //     limit,
  //   };
  //   dispatch(getUnassignedAttributes(getUnassignedUserImagesAction));
  //   // onFiltersChange?.(formValue);
  // }, [currentUser]);

  const userLoaded = fetchingStatus === FETCHING_STATUS_SUCCEEDED;

  const handleLogout = (redirectUrl: string) => {
    auth.signOut();
    navigate('/auth/sign-in');
  };

  if (firebaseLoading) {
    return <LoadingPage />;
  }

  if (!firebaseUser) {
    navigate('/auth/sign-in');
  }

  if (fetchingStatus === FETCHING_STATUS_FAILED || fetchingStatus === FETCHING_STATUS_SUCCEEDED) {
    if (!currentUser) {
      toast({
        title: translatorNotificationNS('user_identification_error'),
        description: translatorNotificationNS('unable_to_recognize_the_user_please_log_in_again'),
        status: 'error',
        duration: 5000,
        position: 'bottom-right',
        isClosable: true,
      });
      handleLogout('/auth/sign-in');
    }
  }

  if (!currentUser) {
    return <LoadingPage />;
  }

  // Redirect users to the survey page if they haven't completed it yet
  // if (currentUser && !currentUser.hasCompletedSurvey) {
  //   if (location.pathname !== '/survey') {
  //     navigate('/survey');
  //   }
  // }

  // Redirect users to the home page if they have already completed the survey
  if (currentUser && currentUser.hasCompletedSurvey) {
    if (location.pathname === '/survey') {
      navigate('/');
    }
  }

  const redirectPath = '/auth/sign-in';

  return firebaseUser && currentUser && currentUser.emailVerified && currentUser.isActive ? (
    <ReactRoutes>
      <Route path="/*" element={<AdminLayout />} />
      <Route path="/survey" element={<SurveyForm />} />
    </ReactRoutes>
  ) : (
    <Navigate to={redirectPath} replace />
  );
};

export default ProtectedRoutes;

