import { promises as fs } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Import the service (after global mock)
import { useFileService } from './file.service';

// Mock skinSqlite plugin BEFORE importing file.service
vi.mock('~/plugins/skinSqlite', () => ({
    useSkinSQLite: vi.fn(() => ({
        query: vi.fn(() => ({
            get: vi.fn(() => null),
            all: vi.fn(() => []),
        })),
        run: vi.fn(),
    })),
}));

// Mock dependencies
vi.mock('node:fs', () => ({
    promises: {
        mkdir: vi.fn(),
        writeFile: vi.fn(),
        readFile: vi.fn(),
        rm: vi.fn(),
        access: vi.fn(),
        readdir: vi.fn().mockResolvedValue([]),
        rmdir: vi.fn(),
    },
}));

vi.mock('uuid', () => ({
    v4: () => '11111111-2222-3333-4444-555555555555',
}));

// Mock global useRuntimeConfig
const mockConfig = {
    uploads: '/tmp/uploads',
};
// @ts-ignore
global.useRuntimeConfig = vi.fn(() => mockConfig);

describe('fileService', () => {
    let service: any;

    beforeEach(() => {
        vi.clearAllMocks();
        service = useFileService();
        // Reset private uploadDir if needed or ensure it uses the mocked config
    });

    it('should validate paths correctly', () => {
        // Accessing private method via 'any' casting for testing purposes
        const validPath = 'gallery/test.png';
        expect(() => service.validateAndResolvePath(validPath)).not.toThrow();

        const invalidPath = '../secret.txt';
        expect(() => service.validateAndResolvePath(invalidPath)).toThrow('directory traversal');
    });

    it('should generate correct file paths', () => {
        const path = service.generateFilePath('gallery', 'png');
        // UUID mock: 11111111-2222-3333-4444-555555555555 -> 11111111222233334444555555555555
        // Path structure: subDir/11/11/11/fulluuid.ext
        expect(path).toBe('gallery/11/11/11/11111111222233334444555555555555.png');
    });

    it('should save file', async () => {
        const buffer = Buffer.from('test content');
        const meta = await service.saveFile(buffer, { subDir: 'gallery', extension: 'png' });

        expect(fs.mkdir).toHaveBeenCalled();
        expect(fs.writeFile).toHaveBeenCalled();
        expect(meta.mime).toBe('image/png');
        expect(meta.size).toBe(buffer.length);
    });
});
