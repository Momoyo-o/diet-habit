import { AppData } from './types';

const DB_NAME = 'diet-habit-backup';
const DB_VERSION = 1;
const STORE = 'backups';
const MAX_BACKUPS = 7;

export type BackupMeta = {
  id: number;
  timestamp: string;
  label: string;
  logCount: number;
};

type StoredEntry = BackupMeta & { data: AppData };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

function cursorListMeta(db: IDBDatabase): Promise<BackupMeta[]> {
  return new Promise((resolve, reject) => {
    const result: BackupMeta[] = [];
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).openCursor();
    req.onsuccess = e => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
      if (cursor) {
        const { id, timestamp, label, logCount } = cursor.value as StoredEntry;
        result.push({ id, timestamp, label, logCount });
        cursor.continue();
      }
    };
    tx.oncomplete = () =>
      resolve(result.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveBackup(data: AppData): Promise<void> {
  const db = await openDB();
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const entry: Omit<StoredEntry, 'id'> = {
    timestamp: now.toISOString(),
    label: `${now.getFullYear()}/${p(now.getMonth() + 1)}/${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`,
    logCount: Object.keys(data.logs).length,
    data,
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const all = await cursorListMeta(db);
  if (all.length > MAX_BACKUPS) {
    const toDelete = all.slice(MAX_BACKUPS);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      toDelete.forEach(b => store.delete(b.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  db.close();
}

export async function listBackups(): Promise<BackupMeta[]> {
  const db = await openDB();
  const result = await cursorListMeta(db);
  db.close();
  return result;
}

export async function getBackupData(id: number): Promise<AppData | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result ? (req.result as StoredEntry).data : null);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}
