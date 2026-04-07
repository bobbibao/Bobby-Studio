import { Button, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import React from 'react';
import ProfileIcon from '../shared/icons/ProfileIcon';
import { User } from '../types/auth';

interface UserProfileMenuProps {
  userProfile: User | null;
  handleSignout: () => void;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  userProfile,
  handleSignout,
}) => {
  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<ProfileIcon />}
        className="cursor-pointer rounded-lg bg-[#F8F9FA] dark:bg-[#2B2B2B] dark:text-white"
      >
        {userProfile?.email || userProfile?.name}
      </MenuButton>
      <MenuList>
        <MenuItem onClick={handleSignout}>Sign out</MenuItem>
      </MenuList>
    </Menu>
  );
};

export default UserProfileMenu;

