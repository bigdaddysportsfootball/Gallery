import { MediaFile } from './types';

export const MOCK_FILES: MediaFile[] = [
  // Camera Folder
  { id: 'c1', folderId: 'Camera', name: 'IMG_20240401_1000.jpg', type: 'image', url: 'https://picsum.photos/seed/c1/1080/1920', size: 2500000, dateModified: Date.now() - 86400000 * 1, format: 'jpg' },
  { id: 'c2', folderId: 'Camera', name: 'VID_20240401_1005.mp4', type: 'video', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', thumbnailUrl: 'https://picsum.photos/seed/c2/800/800', size: 15000000, dateModified: Date.now() - 86400000 * 1.1, duration: '00:10', format: 'mp4' },
  { id: 'c3', folderId: 'Camera', name: 'IMG_20240402_1200.jpg', type: 'image', url: 'https://picsum.photos/seed/c3/1080/1920', size: 2800000, dateModified: Date.now() - 86400000 * 0.5, format: 'jpg' },
  { id: 'c4', folderId: 'Camera', name: 'IMG_20240403_1500.png', type: 'image', url: 'https://picsum.photos/seed/c4/1920/1080', size: 3200000, dateModified: Date.now() - 3600000 * 2, format: 'png' },

  // WhatsApp Images
  { id: 'w1', folderId: 'WhatsApp Images', name: 'WA_20240328_0001.jpg', type: 'image', url: 'https://picsum.photos/seed/w1/800/800', size: 850000, dateModified: Date.now() - 86400000 * 7, format: 'jpg' },
  { id: 'w2', folderId: 'WhatsApp Images', name: 'WA_20240329_0002.jpg', type: 'image', url: 'https://picsum.photos/seed/w2/800/800', size: 920000, dateModified: Date.now() - 86400000 * 6, format: 'jpg' },
  { id: 'w3', folderId: 'WhatsApp Images', name: 'WA_20240330_0003.jpg', type: 'image', url: 'https://picsum.photos/seed/w3/800/800', size: 780000, dateModified: Date.now() - 86400000 * 5, format: 'jpg' },

  // WhatsApp Video
  { id: 'wv1', folderId: 'WhatsApp Video', name: 'WA_VID_20240331_0001.mp4', type: 'video', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', thumbnailUrl: 'https://picsum.photos/seed/wv1/800/800', size: 5500000, dateModified: Date.now() - 86400000 * 4, duration: '00:15', format: 'mp4' },

  // Downloads
  { id: 'd1', folderId: 'Downloads', name: 'funny_meme.gif', type: 'gif', url: 'https://picsum.photos/seed/d1/800/800', size: 1200000, dateModified: Date.now() - 86400000 * 10, format: 'gif' },
  { id: 'd2', folderId: 'Downloads', name: 'wallpaper.jpg', type: 'image', url: 'https://picsum.photos/seed/d2/1920/1080', size: 4500000, dateModified: Date.now() - 86400000 * 12, format: 'jpg' },
  { id: 'd3', folderId: 'Downloads', name: 'tutorial.mp4', type: 'video', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', thumbnailUrl: 'https://picsum.photos/seed/d3/800/800', size: 25000000, dateModified: Date.now() - 86400000 * 15, duration: '05:00', format: 'mp4' },

  // Screenshots
  { id: 's1', folderId: 'Screenshots', name: 'SCR_20240403_1000.png', type: 'image', url: 'https://picsum.photos/seed/s1/1080/2400', size: 1100000, dateModified: Date.now() - 3600000 * 5, format: 'png' },
  { id: 's2', folderId: 'Screenshots', name: 'SCR_20240403_1001.png', type: 'image', url: 'https://picsum.photos/seed/s2/1080/2400', size: 1200000, dateModified: Date.now() - 3600000 * 4, format: 'png' },

  // Hidden Folder
  { id: 'h1', folderId: '.Secret', name: 'private_photo.jpg', type: 'image', url: 'https://picsum.photos/seed/h1/800/800', size: 4500000, dateModified: Date.now() - 86400000 * 20, format: 'jpg', isHidden: true },
  { id: 'h2', folderId: '.Secret', name: 'private_video.mp4', type: 'video', url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', thumbnailUrl: 'https://picsum.photos/seed/h2/800/800', size: 8500000, dateModified: Date.now() - 86400000 * 21, duration: '00:30', format: 'mp4', isHidden: true },
];
