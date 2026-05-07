import { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import * as teamAPI from '@/features/team';
import { JoinTeamResponse } from '@/features/team';

export default function InvitationDetail() {
  const { token } = useParams<{ token?: string }>();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    const validateToken = async () => {
      try {
        const resp: JoinTeamResponse = await teamAPI.joinTeamViaInviteLink(token);
        console.log('response', resp);

        if (resp.message) {
          //'You have successfully joined the team!'
          setMessage(resp.message);
          setIsSuccess(true);
          setTimeout(() => {
            navigate('/profile');
            window.location.hash = 'team';
          }, 2000);
        } else {
          setMessage(resp.message || 'Invalid or expired invite link');
          setIsSuccess(false);
        }
      } catch (error: any) {
        console.log('error', error);
        if (error.response && error.response.data && error.response.data.message) {
          setMessage(error.response.data.message || 'Something went wrong. Please try again later.');
        }else{
          setMessage('An unknown error occurred');
        }
        setIsSuccess(false);
      }
      onOpen();
    };

    validateToken();
  }, [token, onOpen]);


  return (
    <>
      <Modal isOpen={isOpen} onClose={() => navigate('/')}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isSuccess ? 'Success' : 'Error'}</ModalHeader>
          <ModalBody>
            <Text>{message}</Text>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme={isSuccess ? 'green' : 'red'} onClick={() => navigate('/')}>
              OK
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}




