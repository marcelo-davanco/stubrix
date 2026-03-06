import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Project, CreateProjectDto, UpdateProjectDto } from '@stubrix/shared';

const DEFAULT_PROJECT: Project = {
  id: 'default',
  name: 'Default',
  slug: 'default',
  proxyTarget: null,
  description: 'Mocks sem projeto definido',
  createdAt: null,
};

@Injectable()
export class ProjectsService {
  private readonly projectsFile: string;

  constructor(private readonly config: ConfigService) {
    const mocksDir =
      this.config.get<string>('MOCKS_DIR') ??
      path.join(process.cwd(), '../../mocks');
    this.projectsFile = path.join(mocksDir, 'projects.json');
    this.ensureProjectsFile();
  }

  private ensureProjectsFile(): void {
    if (!fs.existsSync(this.projectsFile)) {
      fs.writeFileSync(
        this.projectsFile,
        JSON.stringify([DEFAULT_PROJECT], null, 2),
      );
    }
  }

  private readProjects(): Project[] {
    const raw = fs.readFileSync(this.projectsFile, 'utf-8');
    return JSON.parse(raw) as Project[];
  }

  private writeProjects(projects: Project[]): void {
    fs.writeFileSync(this.projectsFile, JSON.stringify(projects, null, 2));
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  findAll(): Project[] {
    return this.readProjects();
  }

  findOne(id: string): Project {
    const projects = this.readProjects();
    const project = projects.find((p) => p.id === id);
    if (!project) throw new NotFoundException(`Project '${id}' not found`);
    return project;
  }

  create(dto: CreateProjectDto): Project {
    const projects = this.readProjects();
    const slug = this.slugify(dto.name);
    if (projects.find((p) => p.slug === slug)) {
      throw new ConflictException(`Project with slug '${slug}' already exists`);
    }
    const project: Project = {
      id: slug,
      name: dto.name,
      slug,
      proxyTarget: dto.proxyTarget ?? null,
      description: dto.description ?? '',
      createdAt: new Date().toISOString(),
    };
    projects.push(project);
    this.writeProjects(projects);
    return project;
  }

  update(id: string, dto: UpdateProjectDto): Project {
    const projects = this.readProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Project '${id}' not found`);
    if (id === 'default')
      throw new ConflictException('Cannot modify the default project');
    projects[index] = { ...projects[index], ...dto };
    this.writeProjects(projects);
    return projects[index];
  }

  remove(id: string): void {
    if (id === 'default')
      throw new ConflictException('Cannot delete the default project');
    const projects = this.readProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Project '${id}' not found`);
    projects.splice(index, 1);
    this.writeProjects(projects);
  }

  exists(id: string): boolean {
    return this.readProjects().some((p) => p.id === id);
  }
}
