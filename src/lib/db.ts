import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Track } from '../types';

interface WinampDB extends DBSchema {
  settings: {
    key: string;
    value: any;
  };
  playlist: {
    key: string;
    value: Track;
  };
}

let dbPromise: Promise<IDBPDatabase<WinampDB>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<WinampDB>('winamp-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('playlist')) {
          db.createObjectStore('playlist', { keyPath: 'id' });
        }
        // we leave favorites in the schema creation if it exists, or omit it, but openDB strictly types so let's omit it from the DBSchema
      },
    });
  }
  return dbPromise;
}

export async function savePlaylist(playlist: Track[]) {
  const db = await getDB();
  const tx = db.transaction('playlist', 'readwrite');
  await tx.objectStore('playlist').clear();
  for (let i = 0; i < playlist.length; i++) {
    const track = { ...playlist[i], _order: i } as any;
    tx.objectStore('playlist').put(track);
  }
  await tx.done;
}

export async function loadPlaylist(): Promise<Track[]> {
  const db = await getDB();
  const tracks = await db.getAll('playlist');
  return tracks.sort((a: any, b: any) => (a._order || 0) - (b._order || 0));
}

export async function saveSetting(key: string, value: any) {
  const db = await getDB();
  await db.put('settings', value, key);
}

export async function loadSetting(key: string, defaultValue: any) {
  const db = await getDB();
  const val = await db.get('settings', key);
  return val !== undefined ? val : defaultValue;
}
