const DB_NAME = "homescreen";
const STORE = "sounds";
const VERSION = 1;

export interface StoredSound {
  id: string;
  name: string;
  blob: Blob;
  createdAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const result = fn(store);
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result as T);
          result.onerror = () => reject(result.error);
        } else {
          result.then(resolve, reject);
        }
        t.oncomplete = () => db.close();
        t.onerror = () => {
          db.close();
          reject(t.error);
        };
      }),
  );
}

export function getAllSounds(): Promise<StoredSound[]> {
  return tx("readonly", (s) => s.getAll() as IDBRequest<StoredSound[]>);
}

export function getSound(id: string): Promise<StoredSound | undefined> {
  return tx("readonly", (s) => s.get(id) as IDBRequest<StoredSound | undefined>);
}

export async function addSound(file: File): Promise<StoredSound> {
  const record: StoredSound = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: file.name.replace(/\.[^.]+$/, ""),
    blob: file,
    createdAt: Date.now(),
  };
  await tx("readwrite", (s) => s.put(record));
  return record;
}

export function deleteSound(id: string): Promise<void> {
  return tx("readwrite", (s) => s.delete(id) as IDBRequest<undefined>).then(
    () => undefined,
  );
}
