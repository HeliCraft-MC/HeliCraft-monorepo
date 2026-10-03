import type {
    CreateGalleryImageDto,
    GalleryImage,
    GalleryImagePublic,
    GalleryListFilters,
    GallerySortBy,
    GalleryUserInfo,
    PaginatedResponse,
    UpdateGalleryImageAdminDto,
    UpdateGalleryImageOwnerDto,
} from '~/interfaces/gallery.types';
import { v4 as uuidv4 } from 'uuid';
import { useSkinSQLite } from '~/plugins/skinSqlite';
import { isUserBanned } from './banlist.utils';
import { useFileService } from './file.service';
import { getUserByUUID } from './user.utils';

/**
 * Normalize UUID format (remove dashes, lowercase)
 */
function normalizeUuid(raw: string): string {
    return raw.replace(/-/g, '').toLowerCase();
}

/**
 * Get user info from UUID
 */
async function getUserInfo(uuid: string): Promise<GalleryUserInfo | null> {
    try {
        const user = await getUserByUUID(uuid);
        // FIXED: Drizzle uses camelCase (uuid, nickname), not UPPERCASE
        return {
            uuid: user.uuid || '',
            nickname: user.nickname || 'Unknown',
        };
    }
    catch {
        return null;
    }
}

/**
 * Parse involved players string into array of user info
 */
async function parseInvolvedPlayers(playersStr: string | null): Promise<GalleryUserInfo[]> {
    if (!playersStr)
        return [];

    const uuids = playersStr.split(',').map(s => s.trim()).filter(Boolean);
    const results: GalleryUserInfo[] = [];

    for (const uuid of uuids) {
        const userInfo = await getUserInfo(uuid);
        if (userInfo) {
            results.push(userInfo);
        }
    }

    return results;
}

/**
 * Convert database row to public gallery image
 */
async function toPublicImage(image: GalleryImage, currentUserUuid?: string): Promise<GalleryImagePublic> {
    const ownerInfo = await getUserInfo(image.owner_uuid);
    const involvedPlayers = await parseInvolvedPlayers(image.involved_players);

    // Check if current user has liked this image
    let isLiked: boolean | undefined;
    if (currentUserUuid) {
        isLiked = hasUserLikedImage(image.id, currentUserUuid);
    }

    return {
        id: image.id,
        path: image.path,
        mime: image.mime,
        size: image.size,
        owner: ownerInfo || { uuid: image.owner_uuid, nickname: 'Unknown' },
        description: image.description,
        category: image.category,
        season: image.season,
        coord_x: image.coord_x,
        coord_y: image.coord_y,
        coord_z: image.coord_z,
        involved_players: involvedPlayers,
        status: image.status,
        likes_count: image.likes_count || 0,
        is_liked: isLiked,
        created_at: image.created_at,
        updated_at: image.updated_at,
    };
}

/**
 * Check if user can upload to gallery
 * Returns error message if not allowed, null if allowed
 */
export async function canUserUpload(uuid: string): Promise<string | null> {
    const banned = await isUserBanned(uuid);
    if (banned) {
        return 'Banned users cannot upload to gallery';
    }
    return null;
}

/**
 * Create a new gallery image
 */
export async function createGalleryImage(
    data: any, // Using any here to avoid Buffer global issue if needed, or follow linter
    mime: string,
    dto: CreateGalleryImageDto,
): Promise<GalleryImage> {
    const db = useSkinSQLite();
    const fileService = useFileService();

    // Check if user is banned
    const uploadError = await canUserUpload(dto.owner_uuid);
    if (uploadError) {
        throw createError({
            statusCode: 403,
            statusMessage: uploadError,
            data: { statusMessageRu: 'Забаненные пользователи не могут загружать изображения' },
        });
    }

    // Save file
    const extension = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : 'webp';
    const fileMeta = await fileService.saveFile(data, {
        subDir: 'gallery',
        extension,
    });

    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const normalizedOwner = normalizeUuid(dto.owner_uuid);

    db.prepare(`
    INSERT INTO gallery (
      id, path, mime, size, owner_uuid, description,
      category, season, coord_x, coord_y, coord_z,
      status, likes_count, created_at, updated_at, involved_players
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)
  `).run(
        id,
        fileMeta.path,
        mime,
        data.length,
        normalizedOwner,
        dto.description || null,
        dto.category || null,
        dto.season || null,
        dto.coord_x ?? null,
        dto.coord_y ?? null,
        dto.coord_z ?? null,
        now,
        now,
        dto.involved_players || normalizedOwner, // By default, owner is the only involved player
    );

    return getGalleryImage(id);
}

/**
 * Get gallery image by ID
 */
export function getGalleryImage(id: string): GalleryImage {
    const db = useSkinSQLite();
    const image = db.prepare('SELECT * FROM gallery WHERE id = ?').get(id) as GalleryImage | undefined;

    if (!image) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Image not found',
            data: { statusMessageRu: 'Изображение не найдено' },
        });
    }

    return image;
}

/**
 * Get gallery image with public user info
 */
export async function getGalleryImagePublic(id: string, currentUserUuid?: string): Promise<GalleryImagePublic> {
    const image = getGalleryImage(id);
    return toPublicImage(image, currentUserUuid);
}

/**
 * Check if user can view image
 */
export function canViewImage(image: GalleryImage, userUuid: string | null, isAdmin: boolean): boolean {
    if (isAdmin)
        return true;
    // Approved images are visible to everyone
    if (image.status === 'approved')
        return true;

    // Pending/rejected images visible only to owner and admins
    if (userUuid && normalizeUuid(userUuid) === normalizeUuid(image.owner_uuid))
        return true;

    return false;
}

/**
 * List gallery images with filters, pagination and sorting
 */
export async function listGalleryImages(
    filters: GalleryListFilters,
    page: number = 1,
    perPage: number = 20,
    includeFullObjects: boolean = true,
    sortBy: GallerySortBy = 'created_at',
    currentUserUuid?: string,
): Promise<PaginatedResponse<GalleryImagePublic | string>> {
    const db = useSkinSQLite();

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Only show approved images by default
    if (filters.status) {
        whereClauses.push('status = ?');
        params.push(filters.status);
    }
    else {
        whereClauses.push('status = \'approved\'');
    }

    if (filters.category) {
        whereClauses.push('category = ?');
        params.push(filters.category);
    }

    if (filters.season) {
        whereClauses.push('season = ?');
        params.push(filters.season);
    }

    if (filters.owner_uuid) {
        whereClauses.push('owner_uuid = ?');
        params.push(normalizeUuid(filters.owner_uuid));
    }

    // Search filter (description and involved players)
    if (filters.search) {
        const searchLower = `%${filters.search.toLowerCase()}%`;
        whereClauses.push('(LOWER(description) LIKE ? OR LOWER(involved_players) LIKE ?)');
        params.push(searchLower, searchLower);
    }

    // Date filters
    if (filters.date_from) {
        whereClauses.push('created_at >= ?');
        params.push(filters.date_from);
    }

    if (filters.date_to) {
        whereClauses.push('created_at <= ?');
        params.push(filters.date_to);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Get total count
    const countResult = db.prepare(`SELECT COUNT(*) as count FROM gallery ${whereClause}`).get(...params) as { count: number };
    const total = countResult.count;

    // Calculate pagination
    const totalPages = Math.ceil(total / perPage);
    const offset = (page - 1) * perPage;

    // Determine sort order
    let orderBy = 'created_at DESC';
    if (sortBy === 'likes') {
        orderBy = 'likes_count DESC, created_at DESC';
    }
    else if (sortBy === 'updated_at') {
        orderBy = 'updated_at DESC';
    }

    // Get items
    const rows = db.prepare(`
    SELECT * FROM gallery ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, perPage, offset) as GalleryImage[];

    let items: (GalleryImagePublic | string)[];

    if (includeFullObjects) {
        items = await Promise.all(rows.map(row => toPublicImage(row, currentUserUuid)));
    }
    else {
        items = rows.map(r => r.id);
    }

    return {
        items,
        total,
        page,
        perPage,
        totalPages,
    };
}

/**
 * List pending images for admin review
 */
export async function listPendingImages(
    page: number = 1,
    perPage: number = 20,
): Promise<PaginatedResponse<GalleryImagePublic>> {
    const result = await listGalleryImages(
        { status: 'pending' },
        page,
        perPage,
        true,
    );
    return result as PaginatedResponse<GalleryImagePublic>;
}

/**
 * List user's own images
 */
export async function listUserImages(
    userUuid: string,
    page: number = 1,
    perPage: number = 20,
): Promise<PaginatedResponse<GalleryImagePublic>> {
    const db = useSkinSQLite();
    const normalizedUuid = normalizeUuid(userUuid);

    // Get total count
    const countResult = db.prepare('SELECT COUNT(*) as count FROM gallery WHERE owner_uuid = ?').get(normalizedUuid) as { count: number };
    const total = countResult.count;

    // Calculate pagination
    const totalPages = Math.ceil(total / perPage);
    const offset = (page - 1) * perPage;

    // Get items
    const rows = db.prepare(`
    SELECT * FROM gallery WHERE owner_uuid = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(normalizedUuid, perPage, offset) as GalleryImage[];

    const items = await Promise.all(rows.map(row => toPublicImage(row, userUuid)));

    return {
        items,
        total,
        page,
        perPage,
        totalPages,
    };
}

/**
 * Update gallery image by owner (now supports all metadata fields)
 */
export async function updateGalleryImageByOwner(
    id: string,
    ownerUuid: string,
    dto: UpdateGalleryImageOwnerDto,
): Promise<GalleryImagePublic> {
    const db = useSkinSQLite();
    const image = getGalleryImage(id);

    // Verify ownership
    if (normalizeUuid(image.owner_uuid) !== normalizeUuid(ownerUuid)) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Not authorized to edit this image',
            data: { statusMessageRu: 'Нет прав для редактирования этого изображения' },
        });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (dto.description !== undefined) {
        updates.push('description = ?');
        params.push(dto.description);
    }

    if (dto.category !== undefined) {
        updates.push('category = ?');
        params.push(dto.category);
    }

    if (dto.season !== undefined) {
        updates.push('season = ?');
        params.push(dto.season);
    }

    if (dto.coord_x !== undefined) {
        updates.push('coord_x = ?');
        params.push(dto.coord_x);
    }

    if (dto.coord_y !== undefined) {
        updates.push('coord_y = ?');
        params.push(dto.coord_y);
    }

    if (dto.coord_z !== undefined) {
        updates.push('coord_z = ?');
        params.push(dto.coord_z);
    }

    if (dto.involved_players !== undefined) {
        updates.push('involved_players = ?');
        params.push(dto.involved_players);
    }

    if (updates.length > 0) {
        const now = Math.floor(Date.now() / 1000);
        updates.push('updated_at = ?');
        params.push(now);
        params.push(id);

        db.prepare(`UPDATE gallery SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    return getGalleryImagePublic(id, ownerUuid);
}

/**
 * Update gallery image by admin (all fields)
 */
export async function updateGalleryImageByAdmin(
    id: string,
    dto: UpdateGalleryImageAdminDto,
): Promise<GalleryImagePublic> {
    const db = useSkinSQLite();
    getGalleryImage(id); // Verify exists

    const updates: string[] = [];
    const params: any[] = [];

    if (dto.description !== undefined) {
        updates.push('description = ?');
        params.push(dto.description);
    }

    if (dto.category !== undefined) {
        updates.push('category = ?');
        params.push(dto.category);
    }

    if (dto.season !== undefined) {
        updates.push('season = ?');
        params.push(dto.season);
    }

    if (dto.coord_x !== undefined) {
        updates.push('coord_x = ?');
        params.push(dto.coord_x);
    }

    if (dto.coord_y !== undefined) {
        updates.push('coord_y = ?');
        params.push(dto.coord_y);
    }

    if (dto.coord_z !== undefined) {
        updates.push('coord_z = ?');
        params.push(dto.coord_z);
    }

    if (dto.involved_players !== undefined) {
        updates.push('involved_players = ?');
        params.push(dto.involved_players);
    }

    if (updates.length > 0) {
        const now = Math.floor(Date.now() / 1000);
        updates.push('updated_at = ?');
        params.push(now);
        params.push(id);

        db.prepare(`UPDATE gallery SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    return getGalleryImagePublic(id);
}

/**
 * Approve gallery image
 */
export async function approveGalleryImage(id: string): Promise<GalleryImagePublic> {
    const db = useSkinSQLite();
    const now = Math.floor(Date.now() / 1000);

    const result = db.prepare('UPDATE gallery SET status = \'approved\', updated_at = ? WHERE id = ?').run(now, id);

    if (result.changes === 0) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Image not found',
            data: { statusMessageRu: 'Изображение не найдено' },
        });
    }

    return getGalleryImagePublic(id);
}

/**
 * Reject gallery image
 */
export async function rejectGalleryImage(id: string): Promise<GalleryImagePublic> {
    const db = useSkinSQLite();
    const now = Math.floor(Date.now() / 1000);

    const result = db.prepare('UPDATE gallery SET status = \'rejected\', updated_at = ? WHERE id = ?').run(now, id);

    if (result.changes === 0) {
        throw createError({
            statusCode: 404,
            statusMessage: 'Image not found',
            data: { statusMessageRu: 'Изображение не найдено' },
        });
    }

    return getGalleryImagePublic(id);
}

/**
 * Delete gallery image permanently
 */
export async function deleteGalleryImage(id: string): Promise<boolean> {
    const db = useSkinSQLite();
    const fileService = useFileService();

    const image = getGalleryImage(id);

    // Delete file
    await fileService.deleteFile(image.path);

    // Delete likes first (cascade should handle this, but be explicit)
    db.prepare('DELETE FROM gallery_likes WHERE image_id = ?').run(id);

    // Delete from database
    db.prepare('DELETE FROM gallery WHERE id = ?').run(id);

    return true;
}

/**
 * Get all unique categories from gallery
 */
export function getGalleryCategories(): string[] {
    const db = useSkinSQLite();
    const rows = db.prepare(`
    SELECT DISTINCT category FROM gallery 
    WHERE category IS NOT NULL AND category != '' AND status = 'approved'
    ORDER BY category
  `).all() as { category: string }[];

    return rows.map(r => r.category);
}

/**
 * Get all unique seasons from gallery
 */
export function getGallerySeasons(): string[] {
    const db = useSkinSQLite();
    const rows = db.prepare(`
    SELECT DISTINCT season FROM gallery 
    WHERE season IS NOT NULL AND season != '' AND status = 'approved'
    ORDER BY season
  `).all() as { season: string }[];

    return rows.map(r => r.season);
}

// ==================== LIKES FUNCTIONALITY ====================

/**
 * Check if user has liked an image
 */
export function hasUserLikedImage(imageId: string, userUuid: string): boolean {
    const db = useSkinSQLite();
    const normalizedUuid = normalizeUuid(userUuid);

    const result = db.prepare(
        'SELECT id FROM gallery_likes WHERE image_id = ? AND user_uuid = ?',
    ).get(imageId, normalizedUuid);

    return !!result;
}

/**
 * Like an image
 * Returns true if like was added, false if already liked
 */
export function likeImage(imageId: string, userUuid: string): boolean {
    const db = useSkinSQLite();
    const normalizedUuid = normalizeUuid(userUuid);

    // Check image exists
    getGalleryImage(imageId);

    // Check if already liked
    if (hasUserLikedImage(imageId, userUuid)) {
        return false;
    }

    const now = Math.floor(Date.now() / 1000);

    // Add like
    db.prepare(
        'INSERT INTO gallery_likes (image_id, user_uuid, created_at) VALUES (?, ?, ?)',
    ).run(imageId, normalizedUuid, now);

    // Update cached count
    db.prepare(
        'UPDATE gallery SET likes_count = likes_count + 1 WHERE id = ?',
    ).run(imageId);

    return true;
}

/**
 * Unlike an image
 * Returns true if like was removed, false if wasn't liked
 */
export function unlikeImage(imageId: string, userUuid: string): boolean {
    const db = useSkinSQLite();
    const normalizedUuid = normalizeUuid(userUuid);

    // Check image exists
    getGalleryImage(imageId);

    // Check if liked
    if (!hasUserLikedImage(imageId, userUuid)) {
        return false;
    }

    // Remove like
    db.prepare(
        'DELETE FROM gallery_likes WHERE image_id = ? AND user_uuid = ?',
    ).run(imageId, normalizedUuid);

    // Update cached count
    db.prepare(
        'UPDATE gallery SET likes_count = CASE WHEN likes_count > 0 THEN likes_count - 1 ELSE 0 END WHERE id = ?',
    ).run(imageId);

    return true;
}

/**
 * Get likes count for an image
 */
export function getImageLikesCount(imageId: string): number {
    const db = useSkinSQLite();
    const result = db.prepare(
        'SELECT likes_count FROM gallery WHERE id = ?',
    ).get(imageId) as { likes_count: number } | undefined;

    return result?.likes_count || 0;
}

/**
 * Recalculate likes count for an image (for maintenance)
 */
export function recalculateLikesCount(imageId: string): number {
    const db = useSkinSQLite();

    const countResult = db.prepare(
        'SELECT COUNT(*) as count FROM gallery_likes WHERE image_id = ?',
    ).get(imageId) as { count: number };

    const count = countResult.count;

    db.prepare(
        'UPDATE gallery SET likes_count = ? WHERE id = ?',
    ).run(count, imageId);

    return count;
}
