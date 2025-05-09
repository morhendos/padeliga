/**
 * MongoDB Configuration Loader
 *
 * Loads MongoDB configuration with environment-specific values and
 * environment variable overrides.
 */

import { ReadPreferenceMode } from "mongodb";
import { createLogger } from "@/lib/logger";
import { isLocalConnection } from "@/utils/mongodb-utils";
import {
  isDevelopment,
  isProduction,
  isTest,
  isBuildTime,
  isStaticGeneration,
} from "../environment";
import { MongoDBConfig, WriteConcern } from "./types";

// Initialize logger
const logger = createLogger("MongoDB Config");

/**
 * Default MongoDB configuration values for production environment
 * Optimized for cloud deployments like MongoDB Atlas
 */
const PRODUCTION_CONFIG: Partial<MongoDBConfig> = {
  // Connection pool
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 60000, // Increased from 30000 to 60000

  // Timeouts - Increased to handle potential slowdowns
  serverSelectionTimeoutMS: 15000, // Increased from 5000 to 15000
  socketTimeoutMS: 60000, // Increased from 45000 to 60000
  connectionTimeoutMS: 30000, // Increased from 10000 to 30000

  // Read/Write preferences
  writeConcern: "majority" as WriteConcern,
  readPreference: "primaryPreferred" as ReadPreferenceMode,

  // Other settings
  autoIndex: false,
  autoCreate: false,
  ssl: true,
  compressors: ["zlib", "snappy"],

  // Monitoring
  monitoring: {
    enabled: true,
    metricsIntervalSeconds: 60,

    alerts: {
      queryPerformance: {
        enabled: true,
        slowQueryThresholdMs: 200, // Increased threshold to reduce noise
        aggregationThresholdMs: 2000, // Increased threshold
      },
      connectionPoolUtilization: {
        enabled: true,
        threshold: 80,
        criticalThreshold: 90,
      },
      replication: {
        enabled: true,
        maxLagSeconds: 10,
      },
    },

    logging: {
      slowQueryThresholdMs: 200, // Increased to match performance alert threshold
      rotationDays: 7,
      level: "warn",
      mongoDBProfileLevel: 1,
    },
  },

  // Development settings
  development: {
    logOperations: false,
  },
};

/**
 * Default MongoDB configuration values for development environment
 * Optimized for local development
 */
const DEVELOPMENT_CONFIG: Partial<MongoDBConfig> = {
  // Connection pool
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 180000, // Increased from 120000 to 180000

  // Timeouts
  serverSelectionTimeoutMS: 30000, // Increased from 10000 to 30000
  socketTimeoutMS: 90000, // Increased from 60000 to 90000
  connectionTimeoutMS: 45000, // Increased from 20000 to 45000

  // Read/Write preferences
  writeConcern: 1 as WriteConcern,
  readPreference: "primary" as ReadPreferenceMode,

  // Other settings
  autoIndex: true,
  autoCreate: true,
  ssl: false, // No SSL for local development by default
  compressors: ["zlib"],

  // Monitoring
  monitoring: {
    enabled: false,
    metricsIntervalSeconds: 60,

    alerts: {
      queryPerformance: {
        enabled: true,
        slowQueryThresholdMs: 300, // Increased threshold for development
        aggregationThresholdMs: 3000, // Increased threshold for development
      },
      connectionPoolUtilization: {
        enabled: false,
        threshold: 80,
        criticalThreshold: 90,
      },
      replication: {
        enabled: false,
        maxLagSeconds: 10,
      },
    },

    logging: {
      slowQueryThresholdMs: 300, // Increased to match performance alert threshold
      rotationDays: 1,
      level: "debug",
      mongoDBProfileLevel: 1,
    },
  },

  // Development settings
  development: {
    logOperations: true,
  },
};

/**
 * Build-time configuration that mocks or disables certain features
 */
const BUILD_TIME_CONFIG: Partial<MongoDBConfig> = {
  // Reduced connection pool to minimize potential issues
  maxPoolSize: 2,
  minPoolSize: 1,

  // Very short timeouts to fail fast during builds
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 10000,
  connectionTimeoutMS: 5000,

  // Always disable SSL during build time to prevent TLS handshake issues
  ssl: false,

  // Disable monitoring during builds
  monitoring: {
    enabled: false,
    metricsIntervalSeconds: 0,
    alerts: {
      queryPerformance: {
        enabled: false,
        slowQueryThresholdMs: 0,
        aggregationThresholdMs: 0,
      },
      connectionPoolUtilization: {
        enabled: false,
        threshold: 0,
        criticalThreshold: 0,
      },
      replication: {
        enabled: false,
        maxLagSeconds: 0,
      },
    },
    logging: {
      slowQueryThresholdMs: 0,
      rotationDays: 1,
      level: "error",
      mongoDBProfileLevel: 0,
    },
  },

  // Disable debug logging during build
  development: {
    logOperations: false,
  },
};

/**
 * Load MongoDB configuration with environment-specific values and
 * environment variable overrides.
 */
export function loadMongoDBConfig(): MongoDBConfig {
  // Start with environment-specific base config
  let baseConfig: Partial<MongoDBConfig>;

  if (isBuildTime || isStaticGeneration) {
    logger.info("Using build-time configuration");
    baseConfig = {
      ...DEVELOPMENT_CONFIG,
      ...BUILD_TIME_CONFIG,
    };
  } else {
    baseConfig = isProduction ? PRODUCTION_CONFIG : DEVELOPMENT_CONFIG;
  }

  // Create a config object first with the required properties that won't be in the base config
  const requiredConfig = {
    // URI - required
    uri: process.env.MONGODB_URI || "",
    databaseName: process.env.MONGODB_DATABASE || "padeliga",

    // These always get default settings if not specified elsewhere
    maxRetries: parseInt(process.env.MONGODB_MAX_RETRIES || "5"), // Increased from 3 to 5
    retryDelayMS: parseInt(process.env.MONGODB_RETRY_DELAY || "1000"),
    authSource: "admin",
    retryWrites: true,
    retryReads: true,
  };

  // Create the full config by merging the required config with the base config
  // This avoids the property duplication TypeScript error
  const config: MongoDBConfig = {
    ...requiredConfig,
    ...(baseConfig as MongoDBConfig),
  };

  // Disable SSL for local connections
  if (config.uri && isLocalConnection(config.uri)) {
    // Force disable SSL for localhost connections to prevent handshake issues
    logger.info("Localhost connection detected, disabling SSL");
    config.ssl = false;
  }

  // Disable SSL during build time regardless of other settings
  if (isBuildTime || isStaticGeneration) {
    logger.info("Build-time operation detected, disabling SSL");
    config.ssl = false;
  }

  // Override with environment variables if provided
  if (process.env.MONGODB_MAX_POOL_SIZE) {
    config.maxPoolSize = parseInt(process.env.MONGODB_MAX_POOL_SIZE);
  }

  if (process.env.MONGODB_MIN_POOL_SIZE) {
    config.minPoolSize = parseInt(process.env.MONGODB_MIN_POOL_SIZE);
  }

  if (process.env.MONGODB_CONNECTION_TIMEOUT) {
    config.connectionTimeoutMS = parseInt(
      process.env.MONGODB_CONNECTION_TIMEOUT
    );
  }

  if (process.env.MONGODB_SERVER_SELECTION_TIMEOUT) {
    config.serverSelectionTimeoutMS = parseInt(
      process.env.MONGODB_SERVER_SELECTION_TIMEOUT
    );
  }

  if (process.env.MONGODB_SOCKET_TIMEOUT) {
    config.socketTimeoutMS = parseInt(process.env.MONGODB_SOCKET_TIMEOUT);
  }

  if (process.env.MONGODB_MAX_IDLE_TIME) {
    config.maxIdleTimeMS = parseInt(process.env.MONGODB_MAX_IDLE_TIME);
  }

  // SSL override - but respect the automatic disabling for localhost
  if (process.env.MONGODB_SSL !== undefined && !isLocalConnection(config.uri)) {
    config.ssl = process.env.MONGODB_SSL === "true";
  }

  // Monitoring environment variables
  if (process.env.MONGODB_MONITORING_ENABLED) {
    config.monitoring.enabled =
      process.env.MONGODB_MONITORING_ENABLED === "true";
  }

  if (process.env.MONGODB_METRICS_INTERVAL) {
    config.monitoring.metricsIntervalSeconds = parseInt(
      process.env.MONGODB_METRICS_INTERVAL
    );
  }

  if (process.env.MONGODB_SLOW_QUERY_THRESHOLD) {
    const threshold = parseInt(process.env.MONGODB_SLOW_QUERY_THRESHOLD);
    config.monitoring.alerts.queryPerformance.slowQueryThresholdMs = threshold;
    config.monitoring.logging.slowQueryThresholdMs = threshold;
  }

  if (process.env.MONGODB_AGGREGATION_THRESHOLD) {
    config.monitoring.alerts.queryPerformance.aggregationThresholdMs = parseInt(
      process.env.MONGODB_AGGREGATION_THRESHOLD
    );
  }

  if (process.env.MONGODB_ALERT_POOL_THRESHOLD) {
    config.monitoring.alerts.connectionPoolUtilization.threshold = parseInt(
      process.env.MONGODB_ALERT_POOL_THRESHOLD
    );
  }

  if (process.env.MONGODB_ALERT_POOL_CRITICAL) {
    config.monitoring.alerts.connectionPoolUtilization.criticalThreshold =
      parseInt(process.env.MONGODB_ALERT_POOL_CRITICAL);
  }

  if (process.env.MONGODB_MAX_REPLICATION_LAG) {
    config.monitoring.alerts.replication.maxLagSeconds = parseInt(
      process.env.MONGODB_MAX_REPLICATION_LAG
    );
  }

  if (process.env.MONGODB_LOG_LEVEL) {
    config.monitoring.logging.level = process.env.MONGODB_LOG_LEVEL as
      | "error"
      | "warn"
      | "info"
      | "debug";
  }

  if (process.env.MONGODB_LOG_OPERATIONS) {
    config.development.logOperations =
      process.env.MONGODB_LOG_OPERATIONS === "true";
  }

  return config;
}

// Export the loaded configuration
const mongodbConfig = loadMongoDBConfig();
export default mongodbConfig;
