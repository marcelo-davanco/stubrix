export interface Project {
  id: string;
  name: string;
  slug: string;
  proxyTarget: string | null;
  description: string;
  createdAt: string | null;
}

export interface ProjectWithStats extends Project {
  mocksCount: number;
}

export interface CreateProjectDto {
  name: string;
  proxyTarget?: string;
  description?: string;
}

export interface UpdateProjectDto {
  name?: string;
  proxyTarget?: string | null;
  description?: string;
}
