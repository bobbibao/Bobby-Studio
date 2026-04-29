import React from 'react';
import CardProject, { CardDataProps } from '@/shared/card/CardProject';
import { ActionEntity, ProjectAttributeEntity } from '@/common/dtos/attribute/common.dto';
import { UserAttributeEntity } from '@/common/dtos/attribute/userAttribute.dto';
import { UserProjectManagement } from '@/hooks/project';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { IProject } from '@/types/project';
import { Box, SimpleGrid } from '@chakra-ui/react';
import { getUserProjects } from '@/actions/project';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

const GridView: React.FC<{
  data: CardDataProps[];
  onEdit?: (project: UserAttributeEntity<ProjectAttributeEntity, ActionEntity>) => void;
  onSelectProject?: (project: IProject) => void;
  handleDeleterojects?: (id: string) => void;
  onDelete?: (projectId: string) => void;
}> = ({ data = [], onEdit, onSelectProject, onDelete }) => {
  const { deleteProject } = UserProjectManagement();
  const dispatch = useAppDispatch();
  const { user } = useSelector((state: RootState) => state.currentUser);

  const handleDelete = async (project: any) => {
    try {
      // Call the parent callback immediately to update the UI optimistically
      if (onDelete) {
        onDelete(project.projectAttributeId);
      }

      // Delete the project from the server
      await deleteProject(project.projectAttributeId);

      // Refresh the projects data to ensure the tree is updated
      if (user?.id) {
        dispatch(getUserProjects({ userId: user.id, orderBy: 'desc', inputType: [], creationType: '' }));
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  return (
    <Box id="GridView" w="full">
      <Box maxH="calc(100vh - 210px)" overflowY="auto">
        <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing={4}>
          {data
            ?.filter((uP) => uP.projectAttributeId)
            .map((uP, index) => (
              <CardProject
                key={`${uP.projectAttributeId}-${index}`}
                data={uP}
                onEdit={onEdit}
                onDelete={handleDelete}
                onClick={() => onSelectProject && onSelectProject(uP as any)}
              />
            ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default GridView;



