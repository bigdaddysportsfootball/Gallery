export type MediaType = 'image' | 'video' | 'gif';

export interface MediaFile {
  id: string;
  folderId: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  dateModified: number;
  duration?: string;
  isHidden?: boolean;
  format: string;
  isFavorite?: boolean;
  file?: File;
}

export interface Folder {
  id: string;
  name: string;
  dateModified: number;
  isHidden?: boolean;
  isVirtual?: boolean;
}
