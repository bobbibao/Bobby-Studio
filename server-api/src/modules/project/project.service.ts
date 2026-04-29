import { Injectable } from '@nestjs/common';
import { ProjectRepository } from './project.repository';
import { CreateProjectsDto } from '../attribute/dto/create-project.dto';
import { UserAttributeService } from '../attribute/user-attribute.service';
import { AttributeService } from '../attribute/attribute.service';
// import { UserAttributeDto } from './dto/user-attribute.dto';

@Injectable()
export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly userAttributeService: UserAttributeService,
    private readonly attributeService: AttributeService
  ) {}

//   async createProjects(createProjectsDto: CreateProjectsDto) {
//     // create Attributes type = Image (bulk upsert) do conflict if exist DO NOTHING
//     // bulk update AttributeVersion
//     // create Projects type = Project & link Image Attributes as part of value
//     // assign Projects & Attributes to Users
//     const { userId } = createProjectsDto
//     // create attributes with type project
//     const { ids } = await this.attributeService.createAttributes(createProjectsDto);
//     // assign to user
//     const assignProjectsToUserDto: AssignProjectsToUserDto = {
//         userId,
//         projectIds: ids
//     // }
//     // this.userAttributeService.assignAttributeToUser()
//     // return this.projectRepository.createProjects(createProjectDto);
//   }

  async getUserProjects(userId: string) {
    return this.projectRepository.getUserProjects(userId);
  }

  async updateProjects() {

  }
} 

export class AssignProjectsToUserDto {
    userId: string;
    projectIds: string[]
}