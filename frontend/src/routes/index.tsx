import { Route, Routes as ReactRoutes } from 'react-router-dom';
import AuthLayout from '../layouts/auth';
import ProtectedRoutes from './ProtectedRoutes';
import ProtectedRoutesByPassed from './ProtectedRoutesByPassed';
import React, { useEffect } from 'react';
import OnboardingLayout from '../layouts/auth/OnboardingLayout';
import VerifyEmail from '@/features/auth/pages/auth/VerifyEmail';
import { auth } from '../configs/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

// Initialize audio context after user interaction
const initAudioContext = () => {
  try {
    const audioContext = new AudioContext();
    // Resume the audio context after creation
    audioContext.resume().then(() => {
    });
    document.removeEventListener('click', initAudioContext);
  } catch (error) {
    console.error('Failed to initialize AudioContext:', error);
  }
};
document.addEventListener('click', initAudioContext, { once: true });

export default function AppRoutes() {
  const shouldBypassAuth = !import.meta.env.VITE_FIREBASE_API_KEY;
  // const [user, loading] = useAuthState(auth);

  // const getIdToken = async () => {
  //   await user?.getIdToken().then((value) => {
  //   });
  // };

  // useEffect(() => {
  //   if (!user) return;
  //   getIdToken();
  // }, [user]);

  return (
    <ReactRoutes>
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/auth/*" element={<AuthLayout />} />
      <Route path="/onboarding/*" element={<OnboardingLayout />} />
      <Route path="/*" element={shouldBypassAuth ? <ProtectedRoutesByPassed /> : <ProtectedRoutes />} />
    </ReactRoutes>
  );
}

