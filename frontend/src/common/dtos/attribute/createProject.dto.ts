import { Project } from "./common.dto";

export interface CreateProjectsDto {
    userId: string;
    projects: Project[]
} 

