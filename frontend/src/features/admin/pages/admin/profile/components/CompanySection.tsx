import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCompanyProfile,
  getProfile,
  updateCompanyProfile,
} from '@/features/user';
import CompanyEmptySection from '@/features/admin/pages/admin/profile/components/CompanyEmptySection';
import { CompanyUpdate } from '@/features/admin/pages/admin/profile/components/CompanyUpdate';
import CompanyUpdateLoader from '@/features/admin/pages/admin/profile/components/CompanyUpdateLoader';
import { useTranslation } from 'react-i18next';

const CREATE_COMPANY_PROFILE = 'CREATE_COMPANY_PROFILE';

export const CompanySection: React.FC = () => {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);

  const [company, setCompany] = useState<any>(null);
  const [action, setAction] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    const companyResp: any = await getCompanyProfile();
    setCompany(companyResp || null);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleOCompanyEmptySectionButton = (actionType: string) => {
    setAction(CREATE_COMPANY_PROFILE);
  };

  if (isLoading){
    return <CompanyUpdateLoader/>
  }

  if (!company && action !== CREATE_COMPANY_PROFILE) {
    return <CompanyEmptySection onAction={handleOCompanyEmptySectionButton} />;
  }

  if (!company && action === CREATE_COMPANY_PROFILE) {
    return <CompanyUpdate company={undefined} refreshData={fetchProfile} />;
  }
  return <CompanyUpdate company={company} refreshData={fetchProfile} />;
};




