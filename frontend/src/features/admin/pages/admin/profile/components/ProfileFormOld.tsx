import React, { useState, useEffect } from 'react';
import { Box, FormControl, FormLabel, Input, Select, Stack } from '@chakra-ui/react';
import user_avt from '@/assets/img/auth/avatar.png';
import Card from '@/shared/card';
import Button from '@/shared/buttons/Button';
import { useSelector } from 'react-redux';
import { RootState } from '../@/store';
import { apiClient } from '@/services/api/client';
import { auth } from '../@/configs/firebase';
import { useNavigate } from 'react-router-dom';

import { selectCurrentUser } from '@/selectors/user';
import ThemedSelect from '@/components/ThemedSelect';

interface GenderOption {
  value: string;
  label: string;
}

const ProfileFormOld: React.FC = () => {
  const userProfile = useSelector((state: RootState) => state.user.userProfile);
  const navigate = useNavigate();

  const handleLogout = (redirectUrl: string) => {
    auth.signOut();
    navigate('/auth/sign-in');
  };

  const { user: currentUser, fetchingStatus } = useSelector(selectCurrentUser);

  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    address: '',
    email: '',
    country: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        gender: userProfile.gender || '',
        address: userProfile.address || '',
        email: userProfile.email || '',
        country: userProfile.country || '',
        phoneNumber: userProfile.phoneNumber || '',
      });
    }
  }, [userProfile]);

  const testAxiosAuth = async () => {
    const { data } = await apiClient.get('/role/me');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const genderOptions: GenderOption[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ];

  const handleGenderChange = (selectedOption: GenderOption | null) => {
    setFormData(prev => ({
      ...prev,
      gender: selectedOption?.value || ''
    }));
  };

  return (
    <Card extra="!z-5 overflow-hidden bg-white !rounded-lg my-4 h-screen">
      <div className="w-full h-[100px] bg-custom-gradient dark:bg-custom-gradient1"></div>
      <div className="flex justify-between items-center p-6">
        <div className="flex items-center gap-4">
          <img src={user_avt} alt="user_avt" className="w-[104px] h-[104px] rounded-full" />
          <div className="flex flex-col">
            <span className="text-txtPrimary text-xl font-bold dark:text-white">{formData.name}</span>
            <span className="text-base text-[#6C757D]">{formData.email}</span>
          </div>
        </div>
        <Button label="Edit" onClick={() => console.log(formData)} />
      </div>
      <Box className="px-6 pb-6">
        <Stack direction={{ base: 'column', md: 'row' }} spacing={6}>
          <Stack spacing={4} flex={1}>
            <FormControl>
              <FormLabel>Name</FormLabel>
              <Input name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" />
            </FormControl>
            <FormControl>
              <FormLabel>Gender</FormLabel>
              <ThemedSelect
                name="gender"
                options={genderOptions}
                value={genderOptions.find((opt) => opt.value === formData.gender)}
                onChange={handleGenderChange}
                placeholder="Select gender"
                getOptionValue={(option: { value: any; }) => option.value}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Address</FormLabel>
              <Input name="address" value={formData.address} onChange={handleChange} placeholder="Enter your address" />
            </FormControl>
          </Stack>
          {/* Right Side */}
          <Stack spacing={4} flex={1}>
            <FormControl>
              <FormLabel>Email</FormLabel>
              <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" />
            </FormControl>
            <FormControl>
              <FormLabel>Country</FormLabel>
              {/* <Select
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Select country"
              >
                <option value="vietnam">Vietnam</option>
                <option value="usa">USA</option>
                <option value="uk">UK</option>
              </Select> */}
              <Input name="name" value={formData.country} onChange={handleChange} placeholder="Enter your name" />
            </FormControl>
            <FormControl>
              <FormLabel>Phone Number</FormLabel>
              <Input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Enter your phone number" />
            </FormControl>
          </Stack>
        </Stack>
      </Box>
      <Button label="Logout" onClick={() => handleLogout('/auth/sign-in')} />
      <Button extraClass="w-full justify-center mt-2" label="Test Axios Authentication" onClick={() => testAxiosAuth()} />
      <p>userId: {currentUser?.id}</p>
      <p>userId: {currentUser?.email}</p>
      <p>roles: {currentUser?.role}</p>
    </Card>
  );
};

export default ProfileFormOld;



