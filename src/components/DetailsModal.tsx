import React from 'react';
import { X } from 'lucide-react';
import { MediaFile, Folder } from '../types';
import { formatBytes, formatDate } from '../lib/utils';

interface DetailsModalProps {
  items: (MediaFile | Folder)[];
  onClose: () => void;
}

export default function DetailsModal({ items, onClose }: DetailsModalProps) {
  if (items.length === 0) return null;

  const item = items[0];
  const isFolder = !('type' in item);
  const isMulti = items.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-app-surface w-full max-w-sm rounded-xl border border-app-border overflow-hidden">
        <div className="p-4 border-b border-app-border flex justify-between items-center">
          <h2 className="text-xl font-semibold text-app-text">Details</h2>
          <button onClick={onClose} className="text-app-text-muted hover:text-app-text"><X size={24} /></button>
        </div>
        
        <div className="p-4 space-y-3 text-sm">
          {isMulti ? (
            <>
              <DetailRow label="Items Selected" value={items.length.toString()} />
              <DetailRow 
                label="Total Size" 
                value={formatBytes(items.reduce((acc, curr) => acc + (('size' in curr) ? curr.size : 0), 0))} 
              />
            </>
          ) : isFolder ? (
            <>
              <DetailRow label="Name" value={item.name} />
              <DetailRow label="Type" value="Folder" />
              <DetailRow label="Location" value={`/storage/emulated/0/${item.name}`} />
              <DetailRow label="Items" value={(item as any).fileCount?.toString() || '0'} />
              <DetailRow label="Last Modified" value={formatDate(item.dateModified)} />
            </>
          ) : (
            <>
              <DetailRow label="Name" value={item.name} />
              <DetailRow label="Type" value={(item as MediaFile).type.toUpperCase()} />
              <DetailRow label="Format" value={(item as MediaFile).format.toUpperCase()} />
              <DetailRow label="Size" value={formatBytes((item as MediaFile).size)} />
              <DetailRow label="Location" value={`/storage/emulated/0/Gallery/${(item as MediaFile).folderId}`} />
              <DetailRow label="Last Modified" value={formatDate(item.dateModified)} />
              {(item as MediaFile).type === 'video' && (
                <>
                  <DetailRow label="Duration" value={(item as MediaFile).duration || 'Unknown'} />
                  <DetailRow label="Encoded" value="H.264 / AAC" />
                </>
              )}
              {(item as MediaFile).type === 'image' && (
                <>
                  <DetailRow label="Resolution" value="1920x1080" />
                  <DetailRow label="Color Space" value="sRGB" />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-app-border/50 last:border-0">
      <span className="text-app-text-muted">{label}</span>
      <span className="text-app-text font-medium break-all sm:text-right sm:ml-4">{value}</span>
    </div>
  );
}
