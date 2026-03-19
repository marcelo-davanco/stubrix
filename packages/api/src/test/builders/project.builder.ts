import { Project } from '@stubrix/shared';

export class ProjectBuilder {
  private readonly data: Project = {
    id: 'test-project',
    name: 'Test Project',
    slug: 'test-project',
    proxyTarget: null,
    description: '',
    createdAt: null,
  };

  static create(): ProjectBuilder {
    return new ProjectBuilder();
  }

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withSlug(slug: string): this {
    this.data.slug = slug;
    return this;
  }

  withProxyTarget(proxyTarget: string | null): this {
    this.data.proxyTarget = proxyTarget;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  withCreatedAt(createdAt: string | null): this {
    this.data.createdAt = createdAt;
    return this;
  }

  build(): Project {
    return { ...this.data };
  }
}
