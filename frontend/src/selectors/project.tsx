import { RootState } from '@/store';
import { createSelector } from '@reduxjs/toolkit';
import { MOCK_UNASSIGNED_ATTRIBUTES } from '../features/admin/pages/admin/project/data';

export const projectImagesSelector = createSelector(
  [(state: RootState) => state.projectManagement.projects, (state: RootState) => state.projectManagement.assignedAttributes],
  (projects, assignedAttributes) => {
    const result: any[] = [];
    // Return empty if no projects
    if (!projects || projects.length === 0) {
      return result;
    }

    projects.forEach((project) => {
      if (!project || !project.value) return;

      const folders = project.value.folders || [];

      // const totalImages = folders.reduce((acc, folder) => {
      //   const imgs = folder.images || [];
      //   return (
      //     acc +
      //     imgs.filter((img) => {
      //       const id = img.imageId || img.attributeId || img.attribute_id || img.value?.key;
      //       const path = img.imagePath || img.path || img.value?.path;
      //       return id && path;
      //     }).length
      //   );
      // }, 0);

      const totalImages = folders.reduce((acc, folder) => {
        const imgs = folder.images || [];
        return acc + imgs.length;
      }, 0);

      let hasValidImage = false;

      for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        if (folder.images && folder.images.length > 0) {
          const image = folder.images[0];
          const imageId = image.id || image.attributeId;
          const imagePath = image.path || image.value?.path;

          if (imageId && imagePath) {
            const matchedAttribute = assignedAttributes.find((attr) => attr.attributeId === imageId);
            result.push({
              projectTitle: project.value?.title || '',
              projectDescription: project.value?.description || '',
              projectAttributeId: project.attributeId || '',
              folderName: folder.name,
              folderIndex: i,
              imageId,
              imagePath,
              type: matchedAttribute?.actions?.inputType || '',
              numberOfImages: totalImages,
              updatedAt: matchedAttribute?.actions?.createdAt || project?.createdAt || null,
            });
            hasValidImage = true;
            break;
          }
        }
      }

      if (!hasValidImage) {
        result.push({
          projectTitle: project.value?.title || '',
          projectDescription: project.value?.description || '',
          projectAttributeId: project.attributeId || '',
          folderName: folders[0]?.name || '',
          folderIndex: 0,
          imageId: MOCK_UNASSIGNED_ATTRIBUTES[0].key,
          imagePath: MOCK_UNASSIGNED_ATTRIBUTES[0].path,
          type: '',
          numberOfImages: 0,
          updatedAt: project?.createdAt || null,
        });
      }
    });

    return result;
  }
);

