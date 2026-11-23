import type {
  StoredPdfAsset,
  ThemePreference,
  UniversityDatabaseState,
  UserRole,
} from '../types/domain';
import { generateSeedDataset } from '../data/seedGenerator';

const DB_NAME = 'bzu_exam_prototype_db';
const DB_VERSION = 1;
const STORE_STATE = 'app_state';
const STORE_PDFS = 'pdf_assets';
const STATE_KEY = 'university_db_v1';

const LS_SESSION_KEY = 'bzu_exam_demo_session_v1';
const LS_THEME_KEY = 'bzu_exam_theme_pref_v1';
const LS_TOUR_KEY = 'bzu_exam_tours_completed_v1';
const LS_FALLBACK_STATE_KEY = 'bzu_exam_fallback_state_v1';
const LS_DEMO_MODE_KEY = 'bzu_exam_demo_mode_v1';

export interface DemoSessionMeta {
  userId: string;
  role: UserRole;
  loggedInAt: string;
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this browser environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE);
      }
      if (!db.objectStoreNames.contains(STORE_PDFS)) {
        db.createObjectStore(STORE_PDFS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function idbGetState(): Promise<UniversityDatabaseState | null> {
  try {
    const db = await openIndexedDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readonly');
      const store = tx.objectStore(STORE_STATE);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve((req.result as UniversityDatabaseState) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB blocked
    try {
      const raw = localStorage.getItem(LS_FALLBACK_STATE_KEY);
      return raw ? (JSON.parse(raw) as UniversityDatabaseState) : null;
    } catch {
      return null;
    }
  }
}

async function idbPutState(state: UniversityDatabaseState): Promise<void> {
  try {
    const db = await openIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_STATE, 'readwrite');
      const store = tx.objectStore(STORE_STATE);
      store.put(state, STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to persist state in IndexedDB'));
    });
  } catch (err) {
    // Attempt localStorage fallback for small state, or surface quota error cleanly
    try {
      localStorage.setItem(LS_FALLBACK_STATE_KEY, JSON.stringify(state));
    } catch {
      throw new Error(
        `Browser storage quota exceeded or blocked (${err instanceof Error ? err.message : 'unknown error'}). Try resetting demo data.`
      );
    }
  }
}

export async function savePdfAssetToDb(asset: StoredPdfAsset): Promise<void> {
  const db = await openIndexedDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PDFS, 'readwrite');
    tx.objectStore(STORE_PDFS).put(asset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to store PDF asset (check browser storage quota).'));
  });
}

export async function getPdfAssetFromDb(id: string): Promise<StoredPdfAsset | null> {
  try {
    const db = await openIndexedDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDFS, 'readonly');
      const req = tx.objectStore(STORE_PDFS).get(id);
      req.onsuccess = () => resolve((req.result as StoredPdfAsset) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function listPdfAssetsFromDb(): Promise<StoredPdfAsset[]> {
  try {
    const db = await openIndexedDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PDFS, 'readonly');
      const req = tx.objectStore(STORE_PDFS).getAll();
      req.onsuccess = () => resolve((req.result as StoredPdfAsset[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function clearAllPdfAssets(): Promise<void> {
  try {
    const db = await openIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PDFS, 'readwrite');
      tx.objectStore(STORE_PDFS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore if IDB unavailable
  }
}

export async function loadOrSeedDatabase(): Promise<UniversityDatabaseState> {
  const existing = await idbGetState();
  if (existing && existing.version === 1 && Array.isArray(existing.students) && existing.students.length === 500) {
    return existing;
  }
  const { db, pdfAssets } = generateSeedDataset();
  await idbPutState(db);
  for (const asset of pdfAssets) {
    try {
      await savePdfAssetToDb(asset);
    } catch {
      // Continue gracefully if storage is restricted
    }
  }
  return db;
}

export async function persistDatabaseState(state: UniversityDatabaseState): Promise<void> {
  await idbPutState(state);
}

export async function resetDatabaseToSeed(): Promise<UniversityDatabaseState> {
  await clearAllPdfAssets();
  localStorage.removeItem(LS_FALLBACK_STATE_KEY);
  const { db, pdfAssets } = generateSeedDataset();
  await idbPutState(db);
  for (const asset of pdfAssets) {
    try {
      await savePdfAssetToDb(asset);
    } catch {
      // Ignore quota issue on fallback
    }
  }
  return db;
}

export function loadSessionMeta(): DemoSessionMeta | null {
  try {
    const raw = localStorage.getItem(LS_SESSION_KEY);
    return raw ? (JSON.parse(raw) as DemoSessionMeta) : null;
  } catch {
    return null;
  }
}

export function saveSessionMeta(session: DemoSessionMeta | null): void {
  try {
    if (!session) {
      localStorage.removeItem(LS_SESSION_KEY);
    } else {
      localStorage.setItem(LS_SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore localStorage error
  }
}

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(LS_THEME_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
    return 'auto';
  } catch {
    return 'auto';
  }
}

export function saveThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(LS_THEME_KEY, pref);
  } catch {
    // Ignore
  }
}

export function loadCompletedTours(): Record<UserRole, boolean> {
  try {
    const raw = localStorage.getItem(LS_TOUR_KEY);
    if (raw) return JSON.parse(raw) as Record<UserRole, boolean>;
  } catch {
    // Ignore
  }
  return { student: false, teacher: false, admin: false };
}

export function saveCompletedTour(role: UserRole, completed: boolean): void {
  try {
    const current = loadCompletedTours();
    current[role] = completed;
    localStorage.setItem(LS_TOUR_KEY, JSON.stringify(current));
  } catch {
    // Ignore
  }
}

export function loadDemoModeActive(): boolean {
  try {
    return localStorage.getItem(LS_DEMO_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveDemoModeActive(active: boolean): void {
  try {
    localStorage.setItem(LS_DEMO_MODE_KEY, active ? 'true' : 'false');
  } catch {
    // Ignore
  }
}

