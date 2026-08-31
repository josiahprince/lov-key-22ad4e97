export const PHOTO_UNLOCK_THRESHOLD = 60;

export const getPhotoUnlockCopy = (current: number, total: number = PHOTO_UNLOCK_THRESHOLD) => ({
  title: 'Photos unlock soon',
  description: `Photos will be revealed after exchanging ${total} messages.`,
  progress: `${current}/${total} messages`,
});
