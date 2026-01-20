import type { FileMeta, FileSaveOptions, IFileService } from '~/interfaces/file.service'
import { createHash } from 'node:crypto'
import { promises as fsp } from 'node:fs'
import { dirname, join, normalize, resolve } from 'pathe'
import { v4 as uuidv4 } from 'uuid'
import { useSkinSQLite } from '~/plugins/skinSqlite'

/**
 * File reference record from SQLite
 */
interface FileRef {
  hash: string
  path: string
  mime: string
  size: number
  ref_count: number
  created_at: number
  last_used_at: number
}

/**
 * CAS (Content Addressable Storage) implementation
 * - Files are stored by SHA-256 hash
 * - Duplicate content is deduplicated
 * - Reference counting tracks usage
 */
class FileService implements IFileService {
  private uploadDir: string

  constructor(uploadDir: string) {
    this.uploadDir = resolve(uploadDir)
  }

  /**
   * Compute SHA-256 hash of buffer
   */
  private computeHash(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex')
  }

  /**
   * Validate that a path is within the upload directory (prevent directory traversal)
   */
  private validateAndResolvePath(relativePath: string): string {
    const normalizedPath = normalize(relativePath)
    const absPath = join(this.uploadDir, normalizedPath)
    const resolvedPath = resolve(absPath)

    if (!resolvedPath.startsWith(this.uploadDir)) {
      throw new Error('Invalid path: directory traversal attempt detected')
    }

    return resolvedPath
  }

  /**
   * Generate CAS-style path from hash: subDir/ab/cd/ef/<hash>.<ext>
   */
  private generateCASPath(subDir: string, hash: string, extension: string): string {
    return `${subDir}/${hash.slice(0, 2)}/${hash.slice(2, 4)}/${hash.slice(4, 6)}/${hash}.${extension}`
  }

  /**
   * Legacy path generation (for migration compatibility)
   */
  private generateFilePath(subDir: string, extension: string): string {
    const hex = uuidv4().replace(/-/g, '')
    return `${subDir}/${hex.slice(0, 2)}/${hex.slice(2, 4)}/${hex.slice(4, 6)}/${hex}.${extension}`
  }

  /**
   * Save file with CAS deduplication
   * - If hash exists: increment ref_count, return existing path
   * - If new: save file, create ref record
   */
  async saveFile(data: Buffer, options: FileSaveOptions): Promise<FileMeta> {
    const extension = options.extension || 'bin'
    const hash = this.computeHash(data)
    const mime = this.getMimeFromExtension(extension)
    const now = Date.now()

    try {
      const db = useSkinSQLite()

      // Check if hash already exists
      const existing = db.query<FileRef, [string]>(
        'SELECT * FROM file_refs WHERE hash = ?',
      ).get(hash)

      if (existing) {
        // Increment ref count and update last_used
        db.run(
          'UPDATE file_refs SET ref_count = ref_count + 1, last_used_at = ? WHERE hash = ?',
          [now, hash],
        )
        console.log(`[FileService] CAS hit: hash=${hash.slice(0, 12)}... ref_count=${existing.ref_count + 1}`)

        return {
          id: hash,
          path: existing.path,
          mime: existing.mime,
          size: existing.size,
          created: existing.created_at,
        }
      }

      // New file: save to disk
      const relPath = this.generateCASPath(options.subDir, hash, extension)
      const absPath = this.validateAndResolvePath(relPath)

      await fsp.mkdir(dirname(absPath), { recursive: true })
      await fsp.writeFile(absPath, data)

      // Insert into file_refs
      db.run(
        'INSERT INTO file_refs (hash, path, mime, size, ref_count, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [hash, relPath, mime, data.length, 1, now, now],
      )

      console.log(`[FileService] CAS new: hash=${hash.slice(0, 12)}... path=${relPath}`)

      return {
        id: hash,
        path: relPath,
        mime,
        size: data.length,
        created: Math.floor(now / 1000),
      }
    }
    catch (err: any) {
      // SQLite not ready (during startup) - fall back to legacy behavior
      console.warn('[FileService] SQLite not ready, using legacy save:', err.message)
      return this.saveFileLegacy(data, options)
    }
  }

  /**
   * Legacy save without CAS (for backward compatibility)
   */
  private async saveFileLegacy(data: Buffer, options: FileSaveOptions): Promise<FileMeta> {
    const extension = options.extension || 'bin'
    const relPath = this.generateFilePath(options.subDir, extension)
    const absPath = this.validateAndResolvePath(relPath)

    await fsp.mkdir(dirname(absPath), { recursive: true })
    await fsp.writeFile(absPath, data)

    return {
      id: uuidv4(),
      path: relPath,
      mime: this.getMimeFromExtension(extension),
      size: data.length,
      created: Math.floor(Date.now() / 1000),
    }
  }

  /**
   * Decrement reference count. If count reaches 0, file becomes "orphaned"
   * (not deleted immediately - admin can purge orphaned files)
   */
  async decrementRef(hash: string): Promise<void> {
    try {
      const db = useSkinSQLite()
      db.run(
        'UPDATE file_refs SET ref_count = MAX(0, ref_count - 1) WHERE hash = ?',
        [hash],
      )
    }
    catch (err) {
      console.warn('[FileService] Failed to decrement ref:', err)
    }
  }

  /**
   * Get orphaned files (ref_count = 0)
   */
  async getOrphanedFiles(): Promise<FileRef[]> {
    try {
      const db = useSkinSQLite()
      return db.query<FileRef, []>(
        'SELECT * FROM file_refs WHERE ref_count = 0 ORDER BY last_used_at ASC',
      ).all()
    }
    catch {
      return []
    }
  }

  /**
   * Purge orphaned files (delete files with ref_count = 0)
   */
  async purgeOrphanedFiles(): Promise<number> {
    const orphaned = await this.getOrphanedFiles()
    let deleted = 0

    for (const file of orphaned) {
      try {
        await this.deleteFile(file.path)
        const db = useSkinSQLite()
        db.run('DELETE FROM file_refs WHERE hash = ?', [file.hash])
        deleted++
      }
      catch (err) {
        console.warn(`[FileService] Failed to purge ${file.hash}:`, err)
      }
    }

    return deleted
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    const absPath = this.validateAndResolvePath(relativePath)
    try {
      await fsp.rm(absPath, { force: true })
      await this.cleanEmptyDirs(dirname(absPath))
      return true
    }
    catch (err: any) {
      if (err.code === 'ENOENT')
        return false
      throw err
    }
  }

  async readFile(relativePath: string): Promise<Buffer | null> {
    const absPath = this.validateAndResolvePath(relativePath)
    console.log(`[FileService] readFile: relative="${relativePath}", absolute="${absPath}"`)
    try {
      const buf = await fsp.readFile(absPath)
      console.log(`[FileService] readFile: success, size=${buf.length}`)
      return buf
    }
    catch (err: any) {
      console.log(`[FileService] readFile: failed, code=${err.code}`)
      if (err.code === 'ENOENT')
        return null
      throw err
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const absPath = this.validateAndResolvePath(relativePath)
    try {
      await fsp.access(absPath)
      return true
    }
    catch {
      return false
    }
  }

  getAbsolutePath(relativePath: string): string {
    return this.validateAndResolvePath(relativePath)
  }

  private async cleanEmptyDirs(dirPath: string): Promise<void> {
    if (!dirPath.startsWith(this.uploadDir) || dirPath === this.uploadDir) {
      return
    }

    try {
      const entries = await fsp.readdir(dirPath)
      if (entries.length === 0) {
        await fsp.rmdir(dirPath)
        await this.cleanEmptyDirs(dirname(dirPath))
      }
    }
    catch {
      // Directory might not exist or not be accessible
    }
  }

  private getMimeFromExtension(extension: string): string {
    const mimeMap: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bin: 'application/octet-stream',
    }
    return mimeMap[extension.toLowerCase()] || 'application/octet-stream'
  }
}

// Singleton instance
let fileServiceInstance: FileService | null = null

export function useFileService(): IFileService {
  if (!fileServiceInstance) {
    const config = useRuntimeConfig()
    const uploadDir = config.uploads || './uploads'
    console.log(`[FileService] Initializing with uploadDir: ${resolve(uploadDir)}`)
    fileServiceInstance = new FileService(uploadDir)
  }
  return fileServiceInstance
}

export async function deleteFiles(paths: string[]): Promise<void> {
  const service = useFileService()
  await Promise.all(paths.map(path => service.deleteFile(path)))
}

export async function removeEmptyDirs(root: string): Promise<void> {
  try {
    const entries = await fsp.readdir(root, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(root, entry.name)
      if (entry.isDirectory()) {
        await removeEmptyDirs(fullPath)
        const remaining = await fsp.readdir(fullPath)
        if (remaining.length === 0) {
          await fsp.rmdir(fullPath)
        }
      }
    }
  }
  catch {
    // Directory might not exist
  }
}

// Export CAS-specific functions
export async function getOrphanedFiles(): Promise<FileRef[]> {
  const service = useFileService() as FileService
  return service.getOrphanedFiles()
}

export async function purgeOrphanedFiles(): Promise<number> {
  const service = useFileService() as FileService
  return service.purgeOrphanedFiles()
}
