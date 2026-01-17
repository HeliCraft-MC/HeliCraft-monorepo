/* ────────────────────────────────────────────────────────────── */
/*  Gallery Types                                                 */
/* ────────────────────────────────────────────────────────────── */

/** Image approval status */
export enum GalleryImageStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

/** Public gallery image data returned by API */
export interface IGalleryImagePublic {
  /** Unique image ID */
  id: string
  /** UUID of the user who uploaded the image */
  uploader_uuid: string
  /** Image description */
  description: string | null
  /** Image category */
  category: string | null
  /** Season name */
  season: string | null
  /** X coordinate in game */
  coord_x: number | null
  /** Y coordinate in game */
  coord_y: number | null
  /** Z coordinate in game */
  coord_z: number | null
  /** Comma-separated UUIDs of involved players */
  involved_players: string | null
  /** Approval status */
  status: GalleryImageStatus
  /** UNIX-time (ms) of creation */
  created_at: number
  /** UNIX-time (ms) of last update */
  updated_at: number
}

/** Full gallery image data (includes file path, admin only) */
export interface IGalleryImage extends IGalleryImagePublic {
  /** Internal file path */
  file_path?: string
  /** Original filename */
  original_filename?: string
  /** File MIME type */
  mime_type?: string
  /** File size in bytes */
  file_size?: number
}

/** Paginated response for gallery images */
export interface IGalleryListResponse {
  items: IGalleryImagePublic[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

/** Paginated response for gallery image IDs only */
export interface IGalleryIdsResponse {
  items: string[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

/** Response for categories list */
export interface IGalleryCategoriesResponse {
  categories: string[]
}

/** Response for seasons list */
export interface IGallerySeasonsResponse {
  seasons: string[]
}

/** Request body for updating gallery image */
export interface IGalleryImageUpdateRequest {
  description?: string
  category?: string
  season?: string
  coord_x?: number
  coord_y?: number
  coord_z?: number
  involved_players?: string
}

/** Response for upload/approve/reject/delete operations */
export interface IGalleryActionResponse {
  ok: boolean
  image?: IGalleryImagePublic
  message?: string
}

/** Player search result */
export interface IPlayerSearchResult {
  uuid: string
  nickname: string
}
