import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WorkspaceRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/generate?tab=workspace', { replace: true });
  }, [navigate]);

  return null;
};

export default WorkspaceRedirect;




