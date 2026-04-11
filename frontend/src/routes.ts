import GenerateIcon from './shared/icons/GenerateIcon';
import BulbIcon2 from './shared/icons/BulbIcon2';
import AssistantIcon from './shared/icons/AssistantIcon';
import HeartIcon from './shared/icons/HeartIcon';
import HomeIcon from './shared/icons/HomeIcon';
import PhotoIcon from './shared/icons/PhotoIcon';
import MoonIcon2 from './shared/icons/MoonIcon2';
import FolderIcon from './shared/icons/FolderIcon';
import QuestionIcon2 from './shared/icons/QuestionIcon2';
import UserIcon from './shared/icons/UserIcon2';
import { RouteConfig } from './types';
import Home from './features/admin/pages/admin/home';
import Inspiration from './features/admin/pages/admin/inspiration';
import Profile from './features/admin/pages/admin/profile';
import Projects from './features/admin/pages/admin/project';
import SignIn from './features/auth/pages/auth/SignIn';
import SignUp from './features/auth/pages/auth/SignUp';
import Support from './features/admin/pages/admin/support';
import Favorite from './features/admin/pages/admin/favorite';
import Assistant from './features/admin/pages/admin/assistant';
import PaymentDetail from '@/features/admin/pages/admin/payment/payment-detail';
import InvitationDetail from '@/features/admin/pages/admin/profile/components/InvitationDetail';
import WorkspaceRedirect from '@/features/admin/pages/admin/workspace';
import UserManagement from './features/admin/pages/admin/user-management';
import UserHistory from './features/admin/pages/admin/user-management/history';
import UserHistoryDetail from './features/admin/pages/admin/user-management/historyDetail';
import UserManagementIcon from './shared/icons/UserManagementIcon';
const routes = [
  {
    name: 'Home',
    navbarHeading: 'Home',
    layout: '/home',
    path: '',
    icon: HomeIcon,
    component: Home,
    position: 'top',
    group: '',
  },
  {
    name: 'Inspiration',
    navbarHeading: 'Inspiration',
    layout: '/home',
    path: 'inspiration',
    icon: PhotoIcon,
    component: Inspiration,
    position: 'top',
    group: '',
    isPublic: true,
  },
  {
    name: 'Inspiration Admin',
    navbarHeading: 'Inspiration Admin',
    layout: '/home',
    path: 'inspiration-admin',
    icon: PhotoIcon,
    component: Inspiration,
    position: 'top',
    group: '',
    adminOnly: true,
  },
  // Disabled — re-enable when needed
  // {
  //   name: 'AI Design',
  //   navbarHeading: 'AI Design',
  //   layout: '/home',
  //   path: 'ai-design',
  //   icon: AIDesignIcon,
  //   component: AiDesign,
  //   position: 'top',
  //   // isLinkDisabled: true,
  //   group: 'tools',
  // },
  // {
  //   name: 'Edit Prototype',
  //   navbarHeading: 'Edit Prototype',
  //   layout: '/edit-prototype',
  //   path: 'edit-prototype',
  //   icon: StarIcon,
  //   component: EditPrototype,
  //   position: 'top',
  //   group: 'tools',
  // },
  {
    name: 'Assistant',
    navbarHeading: 'Assistant',
    layout: '/home',
    path: 'assistant',
    icon: AssistantIcon,
    component: Assistant,
    position: 'top',
    group: 'tools',
    hideFromSidebar: true,
  },
  {
    name: 'User Management',
    navbarHeading: 'User Management',
    layout: '/user-management',
    path: 'user-management',
    icon: UserManagementIcon,
    component: UserManagement,
    position: 'bottom',
    group: 'manage',
    adminOnly: true,
  },
  {
    name: 'User History',
    navbarHeading: 'User History',
    layout: '/user-management',
    path: 'user-management/history/:userId',
    icon: UserManagementIcon,
    component: UserHistory,
    position: 'bottom',
    group: 'manage',
    adminOnly: true,
    hideFromSidebar: true,
  },
  {
    name: 'User History Detail',
    navbarHeading: 'User History Detail',
    layout: '/user-management',
    path: 'user-management/history-detail/:id',
    icon: UserManagementIcon,
    component: UserHistoryDetail,
    position: 'bottom',
    group: 'manage',
    adminOnly: true,
    hideFromSidebar: true,
  },
  // {
  //   name: 'Style Guide',
  //   navbarHeading: 'Style Guide',
  //   layout: '/home',
  //   path: 'style-guide',
  //   icon: BulbIcon2,
  //   component: StyleGuide,
  //   position: 'top',
  //   group: 'tools',
  // },
  {
    name: 'Projects',
    navbarHeading: 'Projects',
    layout: '/home',
    path: 'projects',
    icon: FolderIcon,
    component: Projects,
    position: 'top',
    group: 'workspace',
  },
  {
    name: 'Workspace',
    navbarHeading: 'Workspace',
    layout: '/workspace',
    path: 'workspace',
    icon: GenerateIcon,
    component: WorkspaceRedirect,
    position: 'top',
    group: 'workspace',
  },
  {
    name: 'Favorite',
    navbarHeading: 'Favorite',
    layout: '/favorite',
    path: 'favorite',
    icon: HeartIcon,
    component: Favorite,
    position: 'top',
    group: 'workspace',
  },
  {
    name: 'Profile',
    navbarHeading: 'Profile',
    layout: '/home',
    path: 'profile',
    icon: UserIcon,
    component: Profile,
    position: 'bottom',
    group: 'manage',
  },
  // {
  //   name: 'Learning Center',
  //   navbarHeading: 'Learning Center',
  //   layout: '/home',
  //   path: 'learning-center',
  //   icon: BulbIcon2,
  //   isLinkDisabled: false,
  //   component: LearningCenterLayout,
  //   position: 'bottom',
  //   group: '',
  //   children: [
  //     {
  //       name: 'Learning Center',
  //       navbarHeading: 'Learning Center',
  //       path: '',
  //       component: LearningCenter,
  //     },
  //     {
  //       name: 'Tutorials',
  //       navbarHeading: 'Tutorials',
  //       path: 'tutorials',
  //       component: Tutorials,
  //     },
  //     {
  //       name: 'Tutorial Details',
  //       navbarHeading: 'Tutorial Details',
  //       path: 'tutorials/:tutorialId',
  //       component: Tutorial,
  //     },
  //     {
  //       name: 'Videos',
  //       navbarHeading: 'Videos',
  //       path: 'videos',
  //       component: Videos,
  //     },
  //     {
  //       name: 'Video Details',
  //       navbarHeading: 'Video Details',
  //       path: 'videos/:videoId',
  //       component: Video,
  //     },
  //     {
  //       name: 'Case Studies',
  //       navbarHeading: 'Case Studies',
  //       path: 'case-studies',
  //       component: CaseStudies,
  //     },
  //     {
  //       name: 'Case Study Details',
  //       navbarHeading: 'Case Study Details',
  //       path: 'case-studies/:caseStudyId',
  //       component: CaseStudy,
  //     },
  //   ],
  // },
  {
    name: 'Support',
    navbarHeading: 'Support',
    layout: '/home',
    path: 'support',
    icon: QuestionIcon2,
    component: Support,
    position: 'bottom',
    group: '',
    externalUrl: 'https://bobby.ai/en/help-center',
  },
  {
    name: 'Dark Mode',
    layout: '/home',
    // path: 'dark-mode',
    icon: MoonIcon2,
    isLinkDisabled: true,
    // component: PricingPlan,
    extraComponent: 'switch',
    position: 'bottom',
    group: '',
  },
  {
    name: 'Sign In',
    layout: '/auth',
    path: 'sign-in',
    component: SignIn,
  },
  {
    name: 'Sign Up',
    layout: '/auth',
    path: 'sign-up',
    component: SignUp,
  },
  {
    name: 'Payment detail',
    layout: '/home',
    path: 'payment-details/:priceId',
    component: PaymentDetail,
  },
  {
    // http://localhost:4200/team/invite/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZWFtSWQiOiJjYjliMjI0Yy1hNWE2LTQyYmMtOGJkYy1hMGU2NTVlZGVhNDciLCJpbnZpdGVySWQiOiIwdXRLQXFLZml3WFFTcG1iUUNrS1BGemtRRWEyIiwiZXhwIjoxNzQxMDY1MzQ1LCJpYXQiOjE3NDEwNjE3NDV9.NoXL5UJMrCaPLAAB31eoBC38YCfFXg2Mn75TCkYkQRg
    name: 'Invitation detail',
    layout: '/home',
    path: 'team/invite/:token',
    component: InvitationDetail,
  },
] as RouteConfig[];

export default routes;

