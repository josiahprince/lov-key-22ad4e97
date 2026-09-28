export interface UserPhoto {
  id: string;
  photo_url: string;
  photo_slot: number;
  is_main: boolean;
  signedUrl?: string;
  canViewUnblurred?: boolean;
}

// Single storage bucket backing every profile photo. Kept here so the hook,
// the signed-url edge function contract and useSecurePhotos all agree.
export const PHOTO_BUCKET = 'profile-photos';

// Profiles expose a fixed 6-slot grid, filled or empty.
export const PHOTO_SLOT_COUNT = 6;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff',
  'image/x-icon', 'image/vnd.microsoft.icon',
];

// Returns a user-facing message describing why the file is unusable, or null
// when it passes. Message text is what the upload toast shows verbatim.
export const validatePhotoFile = (file: File): string | null => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Please select a valid image file (JPG, PNG, GIF, BMP, WebP, SVG, TIFF, ICO)';
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'File size should be less than 5MB';
  }
  return null;
};

// Expands the rows actually stored into the full fixed-length slot grid, so
// the UI can render empty slots without null-checking every position. Slot 1
// is marked main only for a brand-new profile with no photos at all.
export const initializePhotoSlots = (userPhotos: UserPhoto[]): UserPhoto[] =>
  Array.from({ length: PHOTO_SLOT_COUNT }, (_, index) => {
    const slot = index + 1;
    const existingPhoto = userPhotos.find((p) => p.photo_slot === slot);
    return existingPhoto || {
      id: `slot-${slot}`,
      photo_url: '',
      photo_slot: slot,
      is_main: slot === 1 && userPhotos.length === 0,
    };
  });

// Storage path for a stored photo URL, or null when the photo is externally
// hosted (social imports) and therefore has nothing to delete from storage.
export const storagePathForPhotoUrl = (photoUrl: string, userId: string): string | null => {
  if (!photoUrl.includes('supabase')) return null;
  const fileName = photoUrl.split('/').pop();
  return fileName ? `${userId}/${fileName}` : null;
};
