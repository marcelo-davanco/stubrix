import type { ConfigField } from '@stubrix/shared';

// ─── Mock Engines ────────────────────────────────────────────────

export const WIREMOCK_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'WIREMOCK_PORT',
    label: 'HTTP Port',
    dataType: 'number',
    defaultValue: 8081,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'WIREMOCK_VERBOSE',
    label: 'Verbose Logging',
    dataType: 'boolean',
    defaultValue: false,
  },
  {
    key: 'WIREMOCK_ROOT_DIR',
    label: 'Root Directory',
    dataType: 'string',
    defaultValue: '/home/wiremock',
  },
];

export const WIREMOCK_RECORD_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'WIREMOCK_RECORD_PORT',
    label: 'HTTP Port',
    dataType: 'number',
    defaultValue: 8081,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'RECORD_TARGET_URL',
    label: 'Target URL',
    dataType: 'string',
    defaultValue: 'https://pokeapi.co',
    description: 'URL to proxy and record requests from',
  },
];

export const MOCKOON_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'MOCKOON_PORT',
    label: 'HTTP Port',
    dataType: 'number',
    defaultValue: 8081,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'MOCKOON_DATA_FILE',
    label: 'Data File',
    dataType: 'string',
    defaultValue: '/data/mockoon-env.json',
  },
];

export const MOCKOON_PROXY_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'MOCKOON_PROXY_PORT',
    label: 'HTTP Port',
    dataType: 'number',
    defaultValue: 8081,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'MOCKOON_PROXY_TARGET',
    label: 'Proxy Target URL',
    dataType: 'string',
    defaultValue: 'https://pokeapi.co',
  },
];

// ─── Databases ───────────────────────────────────────────────────

export const POSTGRES_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'PG_HOST',
    label: 'Host',
    dataType: 'string',
    defaultValue: 'db-postgres',
  },
  {
    key: 'PG_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 5432,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'PG_USER',
    label: 'User',
    dataType: 'string',
    defaultValue: 'postgres',
  },
  {
    key: 'PG_PASSWORD',
    label: 'Password',
    dataType: 'string',
    defaultValue: 'postgres',
    sensitive: true,
  },
  {
    key: 'PG_DATABASE',
    label: 'Database',
    dataType: 'string',
    defaultValue: 'postgres',
  },
  {
    key: 'PG_EXTERNAL_PORT',
    label: 'External Port',
    dataType: 'number',
    defaultValue: 5442,
    validation: { min: 1, max: 65535 },
  },
];

export const MYSQL_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'MYSQL_HOST',
    label: 'Host',
    dataType: 'string',
    defaultValue: 'db-mysql',
  },
  {
    key: 'MYSQL_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 3306,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'MYSQL_USER',
    label: 'User',
    dataType: 'string',
    defaultValue: 'root',
  },
  {
    key: 'MYSQL_PASSWORD',
    label: 'Root Password',
    dataType: 'string',
    defaultValue: 'rootpass',
    sensitive: true,
  },
  {
    key: 'MYSQL_DATABASE',
    label: 'Database',
    dataType: 'string',
    defaultValue: 'stubrix',
  },
  {
    key: 'MYSQL_EXTERNAL_PORT',
    label: 'External Port',
    dataType: 'number',
    defaultValue: 3307,
    validation: { min: 1, max: 65535 },
  },
];

// ─── DB Viewers ──────────────────────────────────────────────────

export const ADMINER_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'ADMINER_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 8084,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'ADMINER_DEFAULT_SERVER',
    label: 'Default Server',
    dataType: 'string',
    defaultValue: 'db-postgres',
  },
];

export const CLOUDBEAVER_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'CLOUDBEAVER_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 8083,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'CLOUDBEAVER_CONTENT_ROOT',
    label: 'Web Content Root',
    dataType: 'string',
    defaultValue: '/opt/cloudbeaver/web',
  },
  {
    key: 'CLOUDBEAVER_WORKSPACE_DIR',
    label: 'Workspace Directory',
    dataType: 'string',
    defaultValue: '/opt/cloudbeaver/workspace',
  },
  {
    key: 'CLOUDBEAVER_DRIVERS_DIR',
    label: 'Drivers Directory',
    dataType: 'string',
    defaultValue: '/opt/cloudbeaver/drivers',
  },
  {
    key: 'CLOUDBEAVER_PRODUCT_CONF',
    label: 'Product Config Path',
    dataType: 'string',
    defaultValue: '/opt/cloudbeaver/conf/product.conf',
  },
  {
    key: 'CLOUDBEAVER_SESSION_EXPIRE',
    label: 'Session Expiry (ms)',
    dataType: 'number',
    defaultValue: 1800000,
    validation: { min: 60000 },
  },
  {
    key: 'CLOUDBEAVER_ANONYMOUS_ACCESS',
    label: 'Allow Anonymous Access',
    dataType: 'boolean',
    defaultValue: true,
  },
  {
    key: 'CLOUDBEAVER_CUSTOM_CONNECTIONS',
    label: 'Allow Custom Connections',
    dataType: 'boolean',
    defaultValue: true,
  },
];

// ─── Cloud ───────────────────────────────────────────────────────

export const LOCALSTACK_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'LOCALSTACK_PORT',
    label: 'Gateway Port',
    dataType: 'number',
    defaultValue: 4566,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'LOCALSTACK_SERVICES',
    label: 'Enabled Services',
    dataType: 'string',
    defaultValue: 's3,sqs,sns,dynamodb,lambda',
    description: 'Comma-separated list of AWS services to enable',
  },
  {
    key: 'LOCALSTACK_DEFAULT_REGION',
    label: 'Default Region',
    dataType: 'string',
    defaultValue: 'us-east-1',
  },
];

// ─── Storage ─────────────────────────────────────────────────────

export const MINIO_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'MINIO_PORT',
    label: 'API Port',
    dataType: 'number',
    defaultValue: 9000,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'MINIO_CONSOLE_PORT',
    label: 'Console Port',
    dataType: 'number',
    defaultValue: 9001,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'MINIO_ROOT_USER',
    label: 'Root User',
    dataType: 'string',
    defaultValue: 'minioadmin',
  },
  {
    key: 'MINIO_ROOT_PASSWORD',
    label: 'Root Password',
    dataType: 'string',
    defaultValue: 'minioadmin',
    sensitive: true,
  },
  {
    key: 'MINIO_BUCKET',
    label: 'Default Bucket',
    dataType: 'string',
    defaultValue: 'stubrix',
  },
];

// ─── IAM ─────────────────────────────────────────────────────────

export const KEYCLOAK_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'KEYCLOAK_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 8180,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'KEYCLOAK_ADMIN',
    label: 'Admin User',
    dataType: 'string',
    defaultValue: 'admin',
  },
  {
    key: 'KEYCLOAK_ADMIN_PASSWORD',
    label: 'Admin Password',
    dataType: 'string',
    defaultValue: 'admin',
    sensitive: true,
  },
  {
    key: 'KEYCLOAK_REALM',
    label: 'Realm',
    dataType: 'string',
    defaultValue: 'stubrix',
  },
  {
    key: 'KEYCLOAK_CLIENT_ID',
    label: 'Client ID',
    dataType: 'string',
    defaultValue: 'stubrix-api',
  },
  {
    key: 'KEYCLOAK_CLIENT_SECRET',
    label: 'Client Secret',
    dataType: 'string',
    sensitive: true,
  },
];

export const ZITADEL_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'ZITADEL_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 8085,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'ZITADEL_MASTERKEY',
    label: 'Master Key',
    dataType: 'string',
    defaultValue: 'MasterkeyNeedsToHave32Characters',
    sensitive: true,
  },
  {
    key: 'ZITADEL_DATABASE_POSTGRES_HOST',
    label: 'DB Host',
    dataType: 'string',
    defaultValue: 'db-postgres',
  },
  {
    key: 'ZITADEL_DATABASE_POSTGRES_PORT',
    label: 'DB Port',
    dataType: 'number',
    defaultValue: 5432,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'ZITADEL_DATABASE_POSTGRES_DATABASE',
    label: 'Database',
    dataType: 'string',
    defaultValue: 'zitadel',
  },
  {
    key: 'ZITADEL_DATABASE_POSTGRES_USER_USERNAME',
    label: 'DB User',
    dataType: 'string',
    defaultValue: 'postgres',
  },
  {
    key: 'ZITADEL_DATABASE_POSTGRES_USER_PASSWORD',
    label: 'DB Password',
    dataType: 'string',
    defaultValue: 'postgres',
    sensitive: true,
  },
];

// ─── Observability ───────────────────────────────────────────────

export const PROMETHEUS_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'PROMETHEUS_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 9091,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'PROMETHEUS_SCRAPE_INTERVAL',
    label: 'Scrape Interval',
    dataType: 'string',
    defaultValue: '15s',
    description: 'How often to scrape targets (e.g. 15s, 30s, 1m)',
  },
];

export const GRAFANA_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'GRAFANA_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 3000,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'GRAFANA_USER',
    label: 'Admin User',
    dataType: 'string',
    defaultValue: 'admin',
  },
  {
    key: 'GRAFANA_PASS',
    label: 'Admin Password',
    dataType: 'string',
    defaultValue: 'admin',
    sensitive: true,
  },
];

// ─── Tracing ─────────────────────────────────────────────────────

export const JAEGER_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'JAEGER_UI_PORT',
    label: 'UI Port',
    dataType: 'number',
    defaultValue: 16686,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'JAEGER_COLLECTOR_PORT',
    label: 'Collector Port',
    dataType: 'number',
    defaultValue: 14268,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'JAEGER_OTLP_PORT',
    label: 'OTLP gRPC Port',
    dataType: 'number',
    defaultValue: 4317,
    validation: { min: 1, max: 65535 },
  },
];

// ─── Events ──────────────────────────────────────────────────────

export const REDPANDA_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'REDPANDA_KAFKA_PORT',
    label: 'Kafka Port',
    dataType: 'number',
    defaultValue: 9092,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'REDPANDA_SCHEMA_REGISTRY_PORT',
    label: 'Schema Registry Port',
    dataType: 'number',
    defaultValue: 8081,
    validation: { min: 1, max: 65535 },
  },
];

export const RABBITMQ_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'RABBITMQ_PORT',
    label: 'AMQP Port',
    dataType: 'number',
    defaultValue: 5672,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'RABBITMQ_MANAGEMENT_PORT',
    label: 'Management Port',
    dataType: 'number',
    defaultValue: 15672,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'RABBITMQ_DEFAULT_USER',
    label: 'Default User',
    dataType: 'string',
    defaultValue: 'guest',
  },
  {
    key: 'RABBITMQ_DEFAULT_PASS',
    label: 'Default Password',
    dataType: 'string',
    defaultValue: 'guest',
    sensitive: true,
  },
];

// ─── Protocols ───────────────────────────────────────────────────

export const GRIPMOCK_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'GRIPMOCK_PORT',
    label: 'gRPC Port',
    dataType: 'number',
    defaultValue: 4770,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'GRIPMOCK_ADMIN_PORT',
    label: 'Admin Port',
    dataType: 'number',
    defaultValue: 4771,
    validation: { min: 1, max: 65535 },
  },
];

// ─── Contracts ───────────────────────────────────────────────────

export const PACT_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'PACT_BROKER_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 9292,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'PACT_BROKER_USERNAME',
    label: 'Username',
    dataType: 'string',
    defaultValue: 'pactuser',
  },
  {
    key: 'PACT_BROKER_PASSWORD',
    label: 'Password',
    dataType: 'string',
    defaultValue: 'pactpass',
    sensitive: true,
  },
];

// ─── Chaos ───────────────────────────────────────────────────────

export const TOXIPROXY_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'TOXIPROXY_API_PORT',
    label: 'API Port',
    dataType: 'number',
    defaultValue: 8474,
    validation: { min: 1, max: 65535 },
  },
];

// ─── AI ──────────────────────────────────────────────────────────

export const CHROMADB_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'CHROMADB_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 8000,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'CHROMADB_PERSIST_DIR',
    label: 'Persist Directory',
    dataType: 'string',
    defaultValue: '/chroma/chroma',
  },
];

export const OPENRAG_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'OPENRAG_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 8888,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'OPENAI_API_KEY',
    label: 'OpenAI API Key',
    dataType: 'string',
    sensitive: true,
    description: 'API key for OpenAI model provider',
  },
  {
    key: 'OLLAMA_ENDPOINT',
    label: 'Ollama Endpoint',
    dataType: 'string',
    defaultValue: '',
    description: 'Ollama base URL (e.g. http://host.docker.internal:11434)',
  },
  {
    key: 'OPENSEARCH_PASSWORD',
    label: 'OpenSearch Password',
    dataType: 'string',
    sensitive: true,
    defaultValue: 'changeme',
    description: 'Admin password for the embedded OpenSearch instance',
  },
  {
    key: 'LANGFLOW_SECRET_KEY',
    label: 'Langflow Secret Key',
    dataType: 'string',
    sensitive: true,
    description: 'Encryption key for Langflow internal operations',
  },
];

// ─── API Clients ─────────────────────────────────────────────────

export const HOPPSCOTCH_CONFIG_SCHEMA: ConfigField[] = [
  {
    key: 'HOPPSCOTCH_PORT',
    label: 'Port',
    dataType: 'number',
    defaultValue: 3100,
    validation: { min: 1, max: 65535 },
  },
  {
    key: 'HOPPSCOTCH_DB_URL',
    label: 'Database URL',
    dataType: 'string',
    defaultValue: 'postgresql://postgres:postgres@db-postgres:5432/hoppscotch',
    sensitive: true,
  },
];
