import { Route, Routes as ReactRoutes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '@/layouts/admin';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { fetchCurrentUser, FETCHING_STATUS_FAILED, FETCHING_STATUS_SUCCEEDED } from '@/slices/currentUserSlice';
import { useToast } from '@chakra-ui/react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/configs/firebase';
import SurveyForm from '@/components/organisms/survey/SurveyForm';
import LoadingPage from '@/components/LoadingPage';
import { selectCurrentUser } from '@/selectors/user';
import { useAppDispatch } from '@/store';
import { getUserProjects } from '@/actions/project';
import { useTranslation } from 'react-i18next';

const SIGN_IN_PATH = '/auth/sign-in';

/** Gate for the authenticated application: requires a signed-in, verified, active account. */
const ProtectedRoutes: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [firebaseUser, firebaseLoading] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const { user: currentUser, fetchingStatus } = useSelector(selectCurrentUser);
  const userId = currentUser?.id;

  useEffect(() => {
    if (firebaseUser) {
      dispatch(fetchCurrentUser());
    }
  }, [firebaseUser, dispatch]);

  useEffect(() => {
    if (userId) {
      dispatch(getUserProjects({ userId, orderBy: 'desc', inputType: [], creationType: '' }));
    }
  }, [dispatch, userId]);

  // The account could not be resolved by the API: end the session instead of showing a broken app.
  const accountUnresolved =
    !currentUser && (fetchingStatus === FETCHING_STATUS_FAILED || fetchingStatus === FETCHING_STATUS_SUCCEEDED);
  useEffect(() => {
    if (!accountUnresolved) return;
    toast({
      title: t('notification:user_identification_error'),
      description: t('notification:unable_to_recognize_the_user_please_log_in_again'),
      status: 'error',
      duration: 5000,
      position: 'bottom-right',
      isClosable: true,
    });
    void auth.signOut().finally(() => navigate(SIGN_IN_PATH));
  }, [accountUnresolved, navigate, t, toast]);

  const surveyDone = Boolean(currentUser?.hasCompletedSurvey);
  useEffect(() => {
    if (surveyDone && location.pathname === '/survey') {
      navigate('/');
    }
  }, [surveyDone, location.pathname, navigate]);

  if (firebaseLoading) {
    return <LoadingPage />;
  }

  if (!firebaseUser) {
    return <Navigate to={SIGN_IN_PATH} replace />;
  }

  if (!currentUser) {
    return <LoadingPage />;
  }

  return currentUser.emailVerified && currentUser.isActive ? (
    <ReactRoutes>
      <Route path="/*" element={<AdminLayout />} />
      <Route path="/survey" element={<SurveyForm />} />
    </ReactRoutes>
  ) : (
    <Navigate to={SIGN_IN_PATH} replace />
  );
};

export default ProtectedRoutes;
