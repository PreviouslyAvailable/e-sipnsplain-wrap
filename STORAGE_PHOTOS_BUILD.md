# Build List: Pull Photos from Supabase Storage

## Overview
Implement functionality to list photos from Supabase Storage bucket and seed the database with actual photos that exist in storage.

## Prerequisites
- Supabase Storage bucket named "timeline-photos" exists
- Bucket is configured as public (or has proper RLS policies)
- Photos are organized in the bucket (by month, date, or flat structure)

---

## Phase 1: Storage API Functions

### 1.1 Create Storage Utility Functions
**File**: `src/lib/storage.ts`

**Functions to implement**:
- [ ] `listPhotosFromStorage(bucketName: string, folder?: string)` 
  - Lists all files in the storage bucket
  - Optionally filters by folder path
  - Returns file metadata (name, path, size, created_at, updated_at)
  
- [ ] `getPhotoPublicUrl(bucketName: string, filePath: string)`
  - Gets the public URL for a photo in storage
  - Handles URL construction properly
  
- [ ] `getStorageFileMetadata(bucketName: string, filePath: string)`
  - Gets metadata for a specific file
  - Can extract EXIF data if needed (date taken, etc.)

**Dependencies**: 
- Supabase client already configured
- Storage bucket access

---

## Phase 2: Photo Discovery & Parsing

### 2.1 Photo Path Parsing
**File**: `src/lib/photoParser.ts`

**Functions to implement**:
- [ ] `parsePhotoPath(filePath: string)`
  - Extracts date from filename or folder structure
  - Handles formats like: `2024-01-15_photo.jpg`, `january/photo.jpg`, `2024/01/photo.jpg`
  - Returns: `{ date: Date | null, month: string, year: number }`

- [ ] `extractCaptionFromFilename(filename: string)`
  - Attempts to extract caption from filename
  - Handles formats like: `team-kickoff.jpg` → "Team kickoff"
  - Returns: `string | null`

- [ ] `groupPhotosByMonth(photos: StorageFile[])`
  - Groups photos by month for timeline organization
  - Returns: `Map<string, StorageFile[]>`

**Types to define**:
```typescript
type StorageFile = {
  name: string;
  path: string;
  size: number;
  created_at: string;
  updated_at: string;
  publicUrl: string;
};
```

---

## Phase 3: Storage-Based Seeding

### 3.1 Update Seeding Functions
**File**: `src/lib/seedPhotos.ts`

**New function to add**:
- [ ] `seedPhotosFromStorage(roomCode: string, options?: { folder?: string, clearExisting?: boolean })`
  - Lists photos from Supabase Storage
  - Parses photo paths to extract dates/metadata
  - Creates photo records in database
  - Handles errors gracefully
  - Returns: `{ success: boolean, photosCreated: number, photosFound: number, errors: string[] }`

**Update existing functions**:
- [ ] Fix `getPhotoUrl()` path handling (remove double prefix issue)
- [ ] Add validation to check if photo URLs are accessible

---

## Phase 4: API Endpoint

### 4.1 Storage List Endpoint
**File**: `src/app/api/storage/list/route.ts`

**Endpoints to create**:
- [ ] `GET /api/storage/list?bucket=timeline-photos&folder=`
  - Lists all photos in storage bucket
  - Returns: `{ files: StorageFile[], count: number }`
  - Handles folder filtering

- [ ] `POST /api/storage/seed`
  - Seeds photos from storage to database
  - Accepts: `{ roomCode: string, folder?: string, clearExisting?: boolean }`
  - Returns seeding results

---

## Phase 5: Admin UI Updates

### 5.1 Storage Browser Component
**File**: `src/components/StorageBrowser.tsx`

**Features**:
- [ ] Display list of photos in storage
- [ ] Show photo thumbnails (if possible)
- [ ] Filter by folder/month
- [ ] Preview photo metadata (filename, size, date)
- [ ] Select photos to seed
- [ ] Show seeding progress

### 5.2 Update Admin Page
**File**: `src/app/admin/page.tsx`

**Updates needed**:
- [ ] Add "From Storage" seed option
- [ ] Add storage browser component
- [ ] Show storage photo count
- [ ] Add folder selection dropdown
- [ ] Display storage connection status
- [ ] Show preview of photos before seeding

---

## Phase 6: Date Extraction & Organization

### 6.1 Smart Date Detection
**File**: `src/lib/photoParser.ts` (extend)

**Features**:
- [ ] Extract date from EXIF data (if available)
- [ ] Parse date from filename patterns:
  - `YYYY-MM-DD_filename.jpg`
  - `YYYYMMDD_filename.jpg`
  - `MM-DD-YYYY_filename.jpg`
- [ ] Extract date from folder structure:
  - `2024/01/photo.jpg`
  - `january/2024/photo.jpg`
- [ ] Fallback to file creation date if no date found

### 6.2 Photo Organization
- [ ] Sort photos by date (extracted or file date)
- [ ] Group by month for timeline display
- [ ] Handle photos without dates (put at end or use file date)

---

## Phase 7: Error Handling & Validation

### 7.1 Validation
- [ ] Validate storage bucket exists
- [ ] Check bucket permissions (public read)
- [ ] Validate photo file types (images only)
- [ ] Check file accessibility (can we actually load the image?)
- [ ] Handle missing/invalid dates gracefully

### 7.2 Error Handling
- [ ] Handle storage connection errors
- [ ] Handle missing bucket errors
- [ ] Handle permission errors
- [ ] Log errors for debugging
- [ ] Show user-friendly error messages

---

## Phase 8: Performance & Optimization

### 8.1 Optimization
- [ ] Paginate storage file listing (if many photos)
- [ ] Cache storage file list
- [ ] Lazy load photo thumbnails
- [ ] Batch database inserts
- [ ] Progress indicators for large operations

### 8.2 Testing
- [ ] Test with empty bucket
- [ ] Test with various folder structures
- [ ] Test with photos that have dates vs. don't
- [ ] Test with large number of photos
- [ ] Test error scenarios

---

## Implementation Order

1. **Phase 1** - Storage API functions (foundation)
2. **Phase 2** - Photo parsing utilities (data processing)
3. **Phase 3** - Storage-based seeding (core functionality)
4. **Phase 4** - API endpoints (backend)
5. **Phase 5** - Admin UI (frontend)
6. **Phase 6** - Date extraction (enhancement)
7. **Phase 7** - Error handling (robustness)
8. **Phase 8** - Performance (polish)

---

## Success Criteria

- [ ] Can list all photos from Supabase Storage bucket
- [ ] Can seed database with photos from storage
- [ ] Photos appear correctly in timeline with proper dates
- [ ] Handles various folder structures gracefully
- [ ] Admin UI shows storage photos and allows seeding
- [ ] Error messages are clear and helpful
- [ ] Works with 100+ photos without performance issues

---

## Notes

- Storage bucket name: `timeline-photos` (configurable)
- Consider adding photo upload functionality later
- May want to add photo metadata editing (captions, dates) after seeding
- Consider adding duplicate detection (don't re-seed existing photos)

