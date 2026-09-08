export type PhotoItem = {
  id: string;
  guestName: string | null;
  message: string | null;
  filterId: string;
  createdAt: string;
  hidden: boolean;
  imageUrl: string;
  thumbUrl: string;
};

export type PhotoAlbum = {
  items: PhotoItem[];
  total: number;
};
