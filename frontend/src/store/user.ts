import { createSlice } from '@reduxjs/toolkit';
import { UserState, PersonalProfile, CompanyProfile } from '@/common/dtos/attribute/common.dto';
import { defaultConfiguration } from '@/constants/defaultConfiguration';
const defaultUserProfile: PersonalProfile = {
  firstName: '',
  lastName: '',
  jobTitle: '',
  phoneNumber: '',
  pictureProfile: ''
}
const initialUserState: UserState<PersonalProfile|CompanyProfile> = {
    userId: '',
    userConfiguration: defaultConfiguration,
    userProfile: defaultUserProfile
}   



// Create a slice
const userSlice = createSlice({
  name: 'user',
  initialState: initialUserState,
  reducers: {
    updateUserId: (state, action) => {
      
    },
    updateUserConfig: (state, action) => {
      
    },
    updateUserProfile: (state, action) => {
      
    },
  },
});

// Export actions
export const { updateUserId, updateUserConfig, updateUserProfile } = userSlice.actions;

// Export selector
// export const selectCount = (state) => state.counter.count;

// Export reducer
export default userSlice.reducer;

