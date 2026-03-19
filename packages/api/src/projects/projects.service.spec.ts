import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMock } from '@golevelup/ts-jest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ProjectsService } from './projects.service';

const TEST_DIR = join(__dirname, '..', '..', '..', 'tmp-test-projects');

describe('ProjectsService', () => {
  let service: ProjectsService;
  let module: TestingModule;

  function cleanup() {
    try {
      if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }

  beforeEach(async () => {
    cleanup();
    mkdirSync(TEST_DIR, { recursive: true });

    const config = createMock<ConfigService>();
    config.get.mockReturnValue(TEST_DIR);

    module = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(async () => {
    await module.close();
    cleanup();
  });

  // ─── findAll ─────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return the default project on fresh init', () => {
      const projects = service.findAll();
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe('default');
    });

    it('should return all created projects', () => {
      service.create({ name: 'Alpha', description: '' });
      service.create({ name: 'Beta', description: '' });
      expect(service.findAll()).toHaveLength(3);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should return the default project', () => {
      const project = service.findOne('default');
      expect(project.id).toBe('default');
      expect(project.slug).toBe('default');
    });

    it('should return a created project by id', () => {
      service.create({ name: 'My Service', description: 'desc' });
      const found = service.findOne('my-service');
      expect(found.name).toBe('My Service');
    });

    it('should throw NotFoundException for unknown id', () => {
      expect(() => service.findOne('nonexistent')).toThrow(NotFoundException);
    });

    it('should include the error id in the NotFoundException message', () => {
      expect(() => service.findOne('missing-id')).toThrow(
        "Project 'missing-id' not found",
      );
    });
  });

  // ─── create ──────────────────────────────────────────────────

  describe('create()', () => {
    it('should create a project with slugified id', () => {
      const project = service.create({ name: 'User API', description: '' });
      expect(project.id).toBe('user-api');
      expect(project.slug).toBe('user-api');
    });

    it('should set createdAt to a non-null ISO string', () => {
      const project = service.create({ name: 'Test', description: '' });
      expect(project.createdAt).not.toBeNull();
      expect(() => new Date(project.createdAt!)).not.toThrow();
    });

    it('should default proxyTarget to null when not provided', () => {
      const project = service.create({ name: 'No Proxy', description: '' });
      expect(project.proxyTarget).toBeNull();
    });

    it('should store provided proxyTarget', () => {
      const project = service.create({
        name: 'Proxy',
        description: '',
        proxyTarget: 'https://api.example.com',
      });
      expect(project.proxyTarget).toBe('https://api.example.com');
    });

    it('should persist project so findOne resolves it', () => {
      service.create({ name: 'Persistent', description: '' });
      expect(service.findOne('persistent').name).toBe('Persistent');
    });

    it('should throw ConflictException on duplicate slug', () => {
      service.create({ name: 'Duplicate', description: '' });
      expect(() =>
        service.create({ name: 'Duplicate', description: '' }),
      ).toThrow(ConflictException);
    });

    it('should slugify spaces and special characters', () => {
      const project = service.create({
        name: 'Hello World! v2',
        description: '',
      });
      expect(project.slug).toBe('hello-world-v2');
    });

    it('should collapse multiple dashes into one', () => {
      const project = service.create({ name: 'a---b', description: '' });
      expect(project.slug).toBe('a-b');
    });

    it('should strip leading and trailing dashes', () => {
      const project = service.create({
        name: '!Leading Trailing!',
        description: '',
      });
      expect(project.slug).not.toMatch(/^-|-$/);
    });
  });

  // ─── update ──────────────────────────────────────────────────

  describe('update()', () => {
    it('should update name and description', () => {
      const created = service.create({ name: 'Original', description: '' });
      const updated = service.update(created.id, {
        name: 'Renamed',
        description: 'New desc',
      });
      expect(updated.name).toBe('Renamed');
      expect(updated.description).toBe('New desc');
    });

    it('should update proxyTarget', () => {
      const created = service.create({ name: 'UpdateProxy', description: '' });
      service.update(created.id, { proxyTarget: 'https://new.api.com' });
      expect(service.findOne(created.id).proxyTarget).toBe(
        'https://new.api.com',
      );
    });

    it('should persist updated values across findOne calls', () => {
      const created = service.create({ name: 'Persist', description: '' });
      service.update(created.id, { description: 'Updated description' });
      expect(service.findOne(created.id).description).toBe(
        'Updated description',
      );
    });

    it('should throw NotFoundException for unknown id', () => {
      expect(() => service.update('unknown', { name: 'X' })).toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when updating the default project', () => {
      expect(() => service.update('default', { name: 'Hacked' })).toThrow(
        ConflictException,
      );
    });
  });

  // ─── remove ──────────────────────────────────────────────────

  describe('remove()', () => {
    it('should remove an existing project', () => {
      const created = service.create({ name: 'ToDelete', description: '' });
      service.remove(created.id);
      expect(() => service.findOne(created.id)).toThrow(NotFoundException);
    });

    it('should reduce findAll count by one', () => {
      const created = service.create({ name: 'WillGo', description: '' });
      const before = service.findAll().length;
      service.remove(created.id);
      expect(service.findAll().length).toBe(before - 1);
    });

    it('should throw ConflictException when removing the default project', () => {
      expect(() => service.remove('default')).toThrow(ConflictException);
    });

    it('should throw NotFoundException for unknown id', () => {
      expect(() => service.remove('nonexistent')).toThrow(NotFoundException);
    });
  });

  // ─── exists ──────────────────────────────────────────────────

  describe('exists()', () => {
    it('should return true for the default project', () => {
      expect(service.exists('default')).toBe(true);
    });

    it('should return true for a created project', () => {
      service.create({ name: 'Check', description: '' });
      expect(service.exists('check')).toBe(true);
    });

    it('should return false for a nonexistent project', () => {
      expect(service.exists('does-not-exist')).toBe(false);
    });

    it('should return false after a project is removed', () => {
      const created = service.create({ name: 'Gone', description: '' });
      service.remove(created.id);
      expect(service.exists(created.id)).toBe(false);
    });
  });
});
