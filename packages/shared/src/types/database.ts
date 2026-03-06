export interface Engine {
  name: string;
  status: 'active' | 'inactive' | 'error';
}

export interface TableInfo {
  name: string;
  size: string;
}

export interface DatabaseInfo {
  database: string;
  engine: string;
  totalSize: string;
  tables: Array<TableInfo>;
}

export interface SnapshotMeta {
  favorite: boolean;
  protected: boolean;
  category: null | string;
  engine: null | string;
  projectId?: null | string;
}

export interface Snapshot extends SnapshotMeta {
  name: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
}
