export const ErrorMessages = {
        SUPABASE_NOT_CONFIGURED: 'Supabase credentials are missing. Please open the plugin settings and provide a URL and service key.',
        NEO4J_NOT_CONFIGURED: 'Neo4j is not configured. Update the graph database section in settings to enable graph syncs.',
        VAULT_NOT_INITIALIZED: 'This vault has not been initialized yet. Generate a vault ID before running sync operations.',
        SYNC_FILE_UNAVAILABLE: 'The sync coordination file is missing or invalid. Recreate it from the plugin settings.',
        INITIAL_SYNC_IN_PROGRESS: 'An initial sync is already running. Please wait until it completes before starting another.',
        OFFLINE_QUEUE_DISABLED: 'Offline queueing is disabled. Enable it in the sync settings to buffer changes while offline.',
        DATABASE_CONNECTION_FAILED: 'Unable to connect to the configured databases. Verify your Supabase and Neo4j credentials.',
        INVALID_EXCLUSION_SETTINGS: 'The provided exclusion settings are invalid. Please review the folders, file types, and prefixes.'
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;

export function getErrorMessage(key: ErrorMessageKey): string {
        return ErrorMessages[key];
}
