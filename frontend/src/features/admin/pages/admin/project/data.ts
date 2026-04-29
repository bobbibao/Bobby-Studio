import projectAvatar from '@/assets/img/projects/project_avatar.webp';
import project1 from '@/assets/img/projects/project1.webp';
import project2 from '@/assets/img/projects/project2.webp';
import project3 from '@/assets/img/projects/project3.webp';
import project4 from '@/assets/img/projects/project4.webp';
import project5 from '@/assets/img/projects/project5.webp';
import project6 from '@/assets/img/projects/project6.webp';
import project7 from '@/assets/img/projects/project7.webp';
import { OriginalImageAttributeEntity, GeneratedImageAttributeEntity } from '@/common/dtos/attribute/common.dto';
import { AttributeTypeEnum } from '@/types/project';

export const MOCK_UNASSIGNED_ATTRIBUTES: (OriginalImageAttributeEntity | GeneratedImageAttributeEntity)[] = [
  {
    key: 'image_project',
    id: 'image_project',
    path: projectAvatar,
  } as OriginalImageAttributeEntity,
  {
    key: 'image_1',
    id: 'image_1',
    path: project1,
  } as OriginalImageAttributeEntity,
  {
    key: 'image_2',
    path: project2,
    id: 'image_2',
  } as OriginalImageAttributeEntity,
  {
    key: 'generated_1',
    path: project3,
    previousImageId: 'image_1',
    id: 'generated_1',
    usedModels: ['model_1', 'model_2'],
  } as GeneratedImageAttributeEntity,
  {
    key: 'generated_2',
    path: project4,
    previousImageId: 'image_2',
    id: 'generated_2',
    usedModels: ['model_3'],
  } as GeneratedImageAttributeEntity,
  {
    key: 'generated_3',
    path: project4,
    previousImageId: 'image_2',
    id: 'generated_3',
    usedModels: ['model_3'],
  } as GeneratedImageAttributeEntity,
  {
    key: 'generated_4',
    path: project5,
    previousImageId: 'image_2',
    id: 'generated_4',
    usedModels: ['model_3'],
  } as GeneratedImageAttributeEntity,
  {
    key: 'generated_5',
    path: project6,
    previousImageId: 'image_2',
    id: 'generated_5',
    usedModels: ['model_3'],
  } as GeneratedImageAttributeEntity,
  {
    key: 'generated_6',
    path: project7,
    previousImageId: 'image_2',
    id: 'generated_6',
    usedModels: ['model_3'],
  } as GeneratedImageAttributeEntity,
  {
    key: 'generated_7',
    path: project2,
    id: 'generated_7',
    previousImageId: 'image_2',
    usedModels: ['model_3'],
  } as GeneratedImageAttributeEntity,
  {
    key: 'generated_8',
    path: project7,
    previousImageId: 'image_2',
    id: 'generated_8',
    usedModels: ['model_3'],
  } as GeneratedImageAttributeEntity,
];

export const mockUserProjects = [
  {
    userId: '',
    attributeId: '',
    type: AttributeTypeEnum.PROJECT,

    value: {
      title: 'Project 1',
      description: 'Project 1',
      type: AttributeTypeEnum.PROJECT,
      folders: [
        {
          name: 'Folder 1',
          images: MOCK_UNASSIGNED_ATTRIBUTES,
          type: AttributeTypeEnum.FOLDER,
        },
      ],
    },
  },
];



