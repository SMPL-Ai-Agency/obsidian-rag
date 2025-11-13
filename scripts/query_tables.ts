import { SupabaseService } from '../services/SupabaseService';
import {
        ObsidianRAGSettings,
        DEFAULT_HYBRID_STRATEGY,
        DEFAULT_NEO4J_SETTINGS,
        DEFAULT_EMBEDDING_PROVIDER_SETTINGS,
        DEFAULT_CHUNKING_OPTIONS,
        DEFAULT_UPDATE_BEHAVIOR
} from '../settings/Settings';

async function queryTables() {
        const settings: ObsidianRAGSettings = {
                supabase: {
                        url: process.env.SUPABASE_URL!,
                        apiKey: process.env.SUPABASE_ANON_KEY!,
                        initialized: true
                },
                neo4j: { ...DEFAULT_NEO4J_SETTINGS },
                embeddings: { ...DEFAULT_EMBEDDING_PROVIDER_SETTINGS },
                vaultId: 'test-vault',
                lastKnownVaultName: 'Test Vault',
                chunking: { ...DEFAULT_CHUNKING_OPTIONS },
                queue: {
                        maxConcurrent: 3,
                        retryAttempts: 3,
                        retryDelay: 1000
                },
                exclusions: {
                        excludedFolders: [],
                        excludedFileTypes: [],
                        excludedFilePrefixes: [],
                        excludedFiles: [],
                        systemExcludedFolders: [],
                        systemExcludedFileTypes: [],
                        systemExcludedFilePrefixes: [],
                        systemExcludedFiles: []
                },
                debug: {
                        enableDebugLogs: true,
                        logLevel: 'debug',
                        logToFile: false
                },
                enableAutoSync: true,
                enableNotifications: true,
                enableProgressBar: true,
                sync: {
                        syncFilePath: '.obsidian/plugins/obsidian-rag/sync.json',
                        backupInterval: 3600000,
                        checkInterval: 60000,
                        checkAttempts: 3,
                        timeout: 30000,
                        requireSync: false,
                        mode: 'supabase',
                        hybridStrategy: { ...DEFAULT_HYBRID_STRATEGY },
                        deviceId: 'test-device',
                        deviceName: 'Test Device',
                        knownDevices: [],
                        connectionCheckInterval: 60000,
                        offlineQueueEnabled: true,
                        conflictResolutionStrategy: 'newest-wins'
                },
                initialSync: {
                        batchSize: 10,
                        maxConcurrentBatches: 2,
                        enableAutoInitialSync: true,
                        priorityRules: []
                },
                updateBehavior: { ...DEFAULT_UPDATE_BEHAVIOR },
                llmModel: 'llama3',
                enableAdvancedEntities: false,
                entityTypes: ['person', 'organization', 'location'],
                customEntityRules: [],
                maxGleaningIterations: 2
        };

        const service = await SupabaseService.getInstance(settings);
        if (!service) {
                console.error('Failed to initialize SupabaseService');
                return;
        }

        // Query documents
        console.log('Querying documents...');
        const documents = await service.getAllDocuments();
        console.log('documents:', documents);

        // Query obsidian_file_status
        console.log('\nQuerying obsidian_file_status...');
        const fileStatus = await service.getAllFileStatus();
        console.log('obsidian_file_status:', fileStatus);
}

queryTables().catch(console.error);
