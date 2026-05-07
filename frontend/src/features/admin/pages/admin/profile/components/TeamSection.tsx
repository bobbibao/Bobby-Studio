import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Avatar,
  Box,
  Text,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  TabList,
  Tab,
  Tabs,
  useColorMode,
  useColorModeValue,
  useToast,
  Button as ChakraButton,
  useDisclosure,
  Flex,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import ThreeDotIconVertical from '@/shared/icons/ThreeDotIconVertical';
import AddIconOutline from '@/shared/icons/AddIconOutline';
import {
  createTeamIfNotExist,
  getMyTeams,
  getTeamById,
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  generateInviteLink,
} from '@/features/team';
import * as teamAPI from '@/features/team';

import { MemberRole, TeamMember } from '@/types/team';
import InviteTeamModal from '@/features/admin/pages/admin/profile/components/InviteTeamModal';
import InviteCollaboratorsModal from '@/features/admin/pages/admin/profile/components/InviteCollaboratorsModal';
import InviteQRCodeModal from '@/features/admin/pages/admin/profile/components/InviteQRCodeModal';
import { FaPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const getTeamTabs = (t: (key: string) => string) => [
  { label: t('profile:all'), value: 'ALL' },
  { label: t('profile:admin_users'), value: 'ADMIN' },
  { label: t('profile:other_users'), value: 'MEMBER' },
];

interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  profileType: string | null;
  role: string;
  surveyCompletedAt: string | null;
  credit: number;
  language: string;
  passwordUpdatedAt: string | null;
}

interface Member {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  teamId: string;
  role: string;
  credit: number;
  usedCredit: number;
  user: User;
}

interface Team {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  members: Member[];
}

const useInviteModal = () => {
  return useDisclosure();
};

export function TeamSection() {
  const { t } = useTranslation();
  const translatorProfileNS = (key: string) => t(`profile:${key}`);
  const translatorNotificationNS = (key: string) => t(`notification:${key}`);
  const { colorMode } = useColorMode();
  const toast = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0); // Start with -1 (no tab selected)
  const handleTabChange = (index: number) => {
    setSelectedTabIndex(index);
  };

  const TEAM_TABS = getTeamTabs(t);

  const borderColor = useColorModeValue('zinc.200', 'whiteAlpha.300');
  const tabBg = useColorModeValue('zinc.50', 'zinc.900');
  const tabBorderColor = useColorModeValue('zinc.200', 'transparent');
  const headerBg = useColorModeValue('zinc.50', 'zinc.700');
  const headerTextColor = useColorModeValue('zinc.900', 'white');
  const emptyTextColor = useColorModeValue('zinc.500', 'zinc.400');
  const activeTabBg = useColorModeValue('black', 'white');
  const activeTabColor = useColorModeValue('white', 'black');
  const inactiveTabColor = useColorModeValue('zinc.700', 'zinc.400');
  const buttonBorderColor = useColorModeValue('black', 'white');
  const buttonTextColor = useColorModeValue('black', 'white');
  const buttonHoverBg = useColorModeValue('black', 'white');
  const buttonHoverColor = useColorModeValue('white', 'black');

  // Fetch teams on component mount
  useEffect(() => {
    const tabValue = TEAM_TABS[selectedTabIndex].value;
    fetchMyTeams(tabValue === 'ALL' ? undefined : tabValue);
  }, [selectedTabIndex]);

  // check and create team
  useEffect(() => {
    handleCreateTeam();
    handleGenerateInviteLink();
    // const link = await teamAPI.generateInviteLink();
    // alert(link);
  }, []);

  const handleGenerateInviteLink = async () => {
    const link = await teamAPI.generateInviteLink();
    console.log('link', link);
  };

  // API handlers
  const fetchMyTeams = async (userType?: string) => {
    try {
      console.log('fetchMyTeams');
      const response = await getMyTeams(userType);
      console.log(response);
      setTeams(response.data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: translatorNotificationNS('error_fetching_teams'),
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      console.log('fetchTeamMembers');
      const response = await getTeamMembers(teamId);
      console.log('response', response);
      // setTeamMembers(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: translatorNotificationNS('error_fetching_team_members'),
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleCreateTeam = async () => {
    try {
      console.log('createTeam');
      const response = await createTeamIfNotExist({ name: 'New Team' });
      console.log('response', response);
      toast({
        title: translatorNotificationNS('team_created_successfully'),
        status: 'success',
        duration: 3000,
      });
      fetchMyTeams(); // Refresh teams list
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      console.log(errorMessage || 'An error occurred while creating the team.');
      // toast({
      //   title: translatorNotificationNS('error'),
      //   description: errorMessage || translatorNotificationNS('an_error_occurred_while_creating_the_team'),
      //   status: 'error',
      //   duration: 5000,
      //   isClosable: true,
      // });
    }
  };

  const handleAddMember = async (teamId: string, userId: string) => {
    try {
      await addTeamMember(teamId, {
        userId,
        role: selectedTabIndex === 0 ? MemberRole.ADMIN : MemberRole.MEMBER,
      });
      toast({
        title: translatorNotificationNS('member_added_successfully'),
        status: 'success',
        duration: 3000,
      });
      fetchTeamMembers(teamId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: translatorNotificationNS('error_adding_member'),
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    try {
      await removeTeamMember(teamId, userId);
      toast({
        title: translatorNotificationNS('member_removed_successfully'),
        status: 'success',
        duration: 3000,
      });
      fetchTeamMembers(teamId);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: translatorNotificationNS('error_removing_member'),
        description: errorMessage,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const inviteModal = useInviteModal();
  const inviteCollaboratorsModal = useInviteModal();
  const inviteQRCodeModal = useInviteModal();

  return (
    <Box>
      <Tabs variant="unstyled" mb={6} index={selectedTabIndex} onChange={handleTabChange}>
        <Flex w="full" align="center" justify="space-between" mb={4}>
          <Box
            bg={tabBg}
            borderWidth="1px"
            borderColor={tabBorderColor}
            borderRadius="lg"
            h={12}
            _dark={{ border: tabBorderColor === 'transparent' ? 'none' : '1px solid' }}
          >
            <TabList p={1} display="flex" gap={2}>
              {TEAM_TABS.map((tab, index) => (
                <Tab
                  key={index}
                  display="inline-flex"
                  borderRadius="lg"
                  py={2}
                  px={4}
                  textAlign="center"
                  fontSize="14px"
                  fontWeight="normal"
                  color={selectedTabIndex === index ? activeTabColor : inactiveTabColor}
                  bg={selectedTabIndex === index ? activeTabBg : 'transparent'}
                  transition="colors 0.3s"
                >
                  {tab.label}
                </Tab>
              ))}
            </TabList>
          </Box>
          {/*<Button
            extraClass="!bg-[transparent] !text-primary border border-primary max-h-[38px] dark:!text-primaryActive dark:border-primaryActive"
            icon={<AddIconOutline />}
            label="Create User"
            iconPosition="before"
          />*/}
          <InviteCollaboratorsModal isOpen={inviteCollaboratorsModal.isOpen} onClose={inviteCollaboratorsModal.onClose} />
          <InviteTeamModal isOpen={inviteModal.isOpen} onClose={inviteModal.onClose} />
          <InviteQRCodeModal isOpen={inviteQRCodeModal.isOpen} onClose={inviteQRCodeModal.onClose} />
          <Menu>
            <MenuButton
              as={ChakraButton}
              leftIcon={<AddIconOutline />}
              minW="120px"
              borderRadius="lg"
              borderWidth="1px"
              borderColor={buttonBorderColor}
              color={buttonTextColor}
              fontWeight="normal"
              bg="transparent"
              variant="outline"
              _hover={{
                bg: buttonHoverBg,
                color: buttonHoverColor,
              }}
              transition="all 0.2s"
            >
              {translatorProfileNS('add_user')}
            </MenuButton>
            <MenuList>
              <MenuItem onClick={inviteQRCodeModal.onOpen}>{translatorProfileNS('create_qr_code')}</MenuItem>
              <MenuItem onClick={inviteModal.onOpen}>{translatorProfileNS('create_invite_link')}</MenuItem>
              <MenuItem onClick={inviteCollaboratorsModal.onOpen}>{translatorProfileNS('send_email_invitation')}</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Tabs>

      <Box overflowX="auto" mx={-6} fontSize="14px">
        <Table variant="simple">
          <Thead bg={headerBg} borderBottomWidth="1px" borderColor={borderColor}>
            <Tr>
              <Th px={4} py={4} borderColor={borderColor}>
                <Checkbox colorScheme="purple" />
              </Th>
              <Th textTransform="capitalize" fontWeight="normal" color={headerTextColor} borderColor={borderColor}>
                {translatorProfileNS('name')}
              </Th>
              <Th textTransform="capitalize" fontWeight="normal" color={headerTextColor} borderColor={borderColor}>
                {translatorProfileNS('email')}
              </Th>
              <Th textTransform="capitalize" fontWeight="normal" color={headerTextColor} borderColor={borderColor}>
                {translatorProfileNS('credits')}
              </Th>
              <Th textTransform="capitalize" fontWeight="normal" color={headerTextColor} borderColor={borderColor}>
                {translatorProfileNS('subscription')}
              </Th>
              <Th textTransform="capitalize" fontWeight="normal" color={headerTextColor} borderColor={borderColor}>
                {translatorProfileNS('date_added')}
              </Th>
              <Th textTransform="capitalize" fontWeight="normal" color={headerTextColor} borderColor={borderColor}>
                {translatorProfileNS('last_active')}
              </Th>
              <Th borderColor={borderColor}></Th>
            </Tr>
          </Thead>
          <Tbody>
            {teams.length > 0 && teams[0]?.members?.length > 0 ? (
              teams[0].members.map((member) => (
                <Tr key={member.id} borderBottomWidth="1px" borderColor={borderColor}>
                  <Td px={4} borderColor={borderColor}>
                    <Checkbox colorScheme="purple" />
                  </Td>
                  <Td borderColor={borderColor}>
                    <Box display="flex" alignItems="center">
                      <Avatar size="sm" name={member.user.email} src={'https://bit.ly/placeholder-avatar'} mr={2} />
                      <Text fontWeight="medium">{member.user.email}</Text>
                    </Box>
                  </Td>
                  <Td borderColor={borderColor}>
                    <Text fontWeight="bold">{member.user.email}</Text>
                  </Td>
                  <Td borderColor={borderColor}>
                    {member?.usedCredit ?? 0} / {member?.credit ?? 0}
                  </Td>
                  <Td borderColor={borderColor}>
                    <Badge colorScheme={'green'} px={2} py={1} borderRadius="full">
                      {translatorProfileNS('active')}
                    </Badge>
                  </Td>
                  <Td borderColor={borderColor}>{new Date(member.user.createdAt).toLocaleString()}</Td>
                  <Td borderColor={borderColor}>{new Date(member.user.createdAt).toLocaleString()}</Td>
                  <Td borderColor={borderColor}>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<ThreeDotIconVertical color={colorMode === 'dark' ? 'white' : 'black'} />}
                        variant="ghost"
                        size="sm"
                        bg="transparent"
                      />
                      <MenuList>
                        <MenuItem onClick={() => alert(1)}>{translatorProfileNS('edit')}</MenuItem>
                        <MenuItem onClick={() => alert(2)}>{translatorProfileNS('delete_')}</MenuItem>
                        <MenuItem onClick={() => alert(3)}>{translatorProfileNS('change_to_account_users')}</MenuItem>
                      </MenuList>
                    </Menu>
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr borderBottomWidth="1px" borderColor={borderColor}>
                <Td colSpan={8} textAlign="center" borderColor={borderColor}>
                  <Text color={emptyTextColor}>{translatorProfileNS('no_members_found')}</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}




