import { SupabaseService } from '@/services/SupabaseService';
import { DEFAULT_SETTINGS, type ObsidianRAGSettings } from '@/settings/Settings';
import { createClient } from '@supabase/supabase-js';

type MockClient = {
        from: jest.Mock;
};

type QueryResult<T> = { data: T; error: null };

type FileStatusRecord = { id: number; file_path: string };

jest.mock('@supabase/supabase-js', () => ({
        createClient: jest.fn()
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

const baseSettings: ObsidianRAGSettings = {
        ...DEFAULT_SETTINGS,
        vaultId: 'vault-123',
        supabase: {
                ...DEFAULT_SETTINGS.supabase,
                url: 'http://example.com',
                apiKey: 'example-key'
        },
        exclusions: {
                ...DEFAULT_SETTINGS.exclusions,
                excludedFolders: [],
                excludedFileTypes: [],
                excludedFilePrefixes: [],
                excludedFiles: []
        }
};

const createSettings = (): ObsidianRAGSettings => ({
        ...baseSettings,
        supabase: { ...baseSettings.supabase },
        exclusions: {
                ...baseSettings.exclusions,
                excludedFolders: [...baseSettings.exclusions.excludedFolders],
                excludedFileTypes: [...baseSettings.exclusions.excludedFileTypes],
                excludedFilePrefixes: [...baseSettings.exclusions.excludedFilePrefixes],
                excludedFiles: [...baseSettings.exclusions.excludedFiles]
        }
});

const createSelectBuilder = <T>(result: QueryResult<T>): any => {
        const builder: any = {};
        builder.select = jest.fn(() => builder);
        builder.eq = jest.fn(() => builder);
        builder.or = jest.fn(() => Promise.resolve(result));
        return builder;
};

const createDeleteBuilder = (): any => {
        const builder: any = {};
        builder.delete = jest.fn(() => builder);
        builder.eq = jest.fn(() => builder);
        builder.in = jest.fn(() => Promise.resolve({ error: null }));
        return builder;
};

beforeEach(() => {
        jest.clearAllMocks();
        (SupabaseService as unknown as { instance: SupabaseService | null }).instance = null;
});

describe('SupabaseService.removeExcludedFiles', () => {
        it('returns 0 without querying when no exclusions are provided', async () => {
                const mockClient: MockClient = {
                        from: jest.fn()
                };

                mockCreateClient.mockReturnValue(mockClient as any);

                const service = new (SupabaseService as any)(createSettings()) as SupabaseService;

                const result = await service.removeExcludedFiles('vault-123', {
                        excludedFolders: [],
                        excludedFileTypes: [],
                        excludedFilePrefixes: [],
                        excludedFiles: []
                });

                expect(result).toBe(0);
                expect(mockClient.from).not.toHaveBeenCalled();
        });

        it('applies exclusion filters safely and removes matching files', async () => {
                const filesToRemove: FileStatusRecord[] = [
                        { id: 7, file_path: 'Projects/Client,Work/report.md' }
                ];

                const fileStatusSelectBuilder = createSelectBuilder<FileStatusRecord[]>({
                        data: filesToRemove,
                        error: null
                });
                const fileStatusDeleteBuilder = createDeleteBuilder();

                let fileStatusCallCount = 0;
                const fromMock = jest.fn((table: string) => {
                        if (table === 'obsidian_file_status') {
                                fileStatusCallCount += 1;
                                return fileStatusCallCount === 1 ? fileStatusSelectBuilder : fileStatusDeleteBuilder;
                        }
                        throw new Error(`Unexpected table ${table}`);
                });

                const mockClient: MockClient = {
                        from: fromMock
                };

                mockCreateClient.mockReturnValue(mockClient as any);

                const service = new (SupabaseService as any)(createSettings()) as SupabaseService;
                jest.spyOn(service, 'deleteDocumentChunks').mockResolvedValue();

                const result = await service.removeExcludedFiles('vault-123', {
                        excludedFolders: ['', 'Projects/Client,Work'],
                        excludedFileTypes: ['MD'],
                        excludedFilePrefixes: ['Archive_File'],
                        excludedFiles: ['notes/"quote".md']
                });

                expect(fileStatusSelectBuilder.or).toHaveBeenCalledWith(
                        'file_path.ilike."Projects/Client,Work%",file_path.ilike."%.md",file_path.ilike."Archive\\_File%",file_path.eq."notes/\\"quote\\".md"'
                );
                expect(service.deleteDocumentChunks).toHaveBeenCalledWith(7, 'Projects/Client,Work/report.md');
                expect(result).toBe(1);
                expect(fileStatusDeleteBuilder.in).toHaveBeenCalledWith('file_path', ['Projects/Client,Work/report.md']);
        });
});

describe('SupabaseService concurrency guards', () => {
        const createChunk = () => ({
                vault_id: 'vault-123',
                file_status_id: 1,
                chunk_index: 0,
                content: 'content',
                metadata: {
                        obsidianId: 'Test.md',
                        path: 'Test.md',
                        lastModified: Date.now(),
                        customMetadata: { contentHash: 'abc' },
                        tags: [],
                        aliases: [],
                        links: []
                },
                embedding: [0.1],
                vectorized_at: new Date().toISOString()
        });

        const createSupabaseClientMock = () => {
                const selectResponses = [
                        { data: [{ id: 1 }], error: null },
                        { data: [], error: null }
                ];
                const createSelectFilter = () => {
                        const filter: any = {};
                        filter.eq = jest.fn(() => filter);
                        filter.contains = jest.fn(() => Promise.resolve(selectResponses.shift() ?? { data: [], error: null }));
                        return filter;
                };
                const deleteFilter: any = {};
                deleteFilter.eq = jest.fn(() => deleteFilter);
                deleteFilter.contains = jest.fn(() => Promise.resolve({ error: null }));

                const documentsBuilder: any = {
                        select: jest.fn(() => createSelectFilter()),
                        delete: jest.fn(() => deleteFilter),
                        insert: jest.fn().mockResolvedValue({ error: null })
                };

                const fileStatusBuilder: any = {
                        upsert: jest.fn(() => ({
                                select: jest.fn(() => ({
                                        single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null })
                                }))
                        }))
                };

                const mockClient: any = {
                        from: jest.fn((table: string) => {
                                if (table === 'obsidian_file_status') {
                                        return fileStatusBuilder;
                                }
                                if (table === 'documents') {
                                        return documentsBuilder;
                                }
                                throw new Error(`Unexpected table ${table}`);
                        })
                };

                return { mockClient };
        };

        it('waits for delete operations that are already in progress for the same path', async () => {
                jest.useFakeTimers();
                try {
                        const { mockClient } = createSupabaseClientMock();
                        mockCreateClient.mockReturnValue(mockClient);
                        const service = new (SupabaseService as any)(createSettings()) as SupabaseService;
                        const chunk = createChunk();

                        (service as any).deleteOperationsInProgress.set('Test.md', true);

                        const upsertPromise = service.upsertChunks([chunk]);
                        await Promise.resolve();
                        expect(mockClient.from).not.toHaveBeenCalled();

                        (service as any).deleteOperationsInProgress.set('Test.md', false);
                        jest.advanceTimersByTime(500);
                        await Promise.resolve();

                        await upsertPromise;
                        expect(mockClient.from).toHaveBeenCalledWith('obsidian_file_status');
                        expect(mockClient.from).toHaveBeenCalledWith('documents');
                } finally {
                        jest.useRealTimers();
                }
        });
});
