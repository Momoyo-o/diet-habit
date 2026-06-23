import { AppData, DayLog, Settings } from './types';

const STORAGE_KEY = 'diet-habit-v1';

const defaultSettings: Settings = {
  targetCal: 1800,
  targetP: 130,
  targetF: 60,
  targetC: 200,
  height: 165,
  age: 25,
  gender: 'female',
  startWeight: 60,
  targetWeight: null,
  targetBodyfat: null,
};

const defaultDayLog = (): DayLog => ({
  body: null,
  meals: [],
  exercises: [],
  sleep: null,
  bowel: 'なし',
  eatingOut: false,
  memo: '',
  trainingMemo: '',
  menuEdits: {},
});

const MIGRATION_KEY = 'diet-habit-migration-v1';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let appData: AppData;
    if (!raw) {
      appData = { logs: {}, weekMenus: {}, weekMemos: {}, weekGoals: {}, menuChecks: {}, settings: defaultSettings };
    } else {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      appData = {
        logs: parsed.logs ?? {},
        weekMenus: parsed.weekMenus ?? {},
        weekMemos: parsed.weekMemos ?? {},
        weekGoals: parsed.weekGoals ?? {},
        menuChecks: parsed.menuChecks ?? {},
        settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
      };
    }
    // 一度だけ実行する種目名マイグレーション
    if (!localStorage.getItem(MIGRATION_KEY)) {
      const migrations = [
        { from: 'マルチプレス',          to: 'マルチプレス（フラット）' },
        { from: 'マルチプレス90度',      to: 'マルチプレス（90度）'    },
        { from: 'レッグプレス',          to: 'レッグプレス（ノーマル）' },
        { from: 'バックエクステンション', to: 'リアデルト'             },
      ];
      migrations.forEach(({ from, to }) => { appData = renameExercise(appData, from, to); });
      localStorage.setItem(MIGRATION_KEY, '1');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    }
    return appData;
  } catch {
    return { logs: {}, weekMenus: {}, weekMemos: {}, weekGoals: {}, menuChecks: {}, settings: defaultSettings };
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDayLog(data: AppData, dateKey: string): DayLog {
  const stored = data.logs[dateKey];
  if (!stored) return defaultDayLog();
  // Backfill missing fields for logs that pre-date new fields
  return {
    ...stored,
    trainingMemo: stored.trainingMemo ?? '',
    menuEdits: stored.menuEdits ?? {},
  };
}

export function setDayLog(data: AppData, dateKey: string, log: DayLog): AppData {
  return { ...data, logs: { ...data.logs, [dateKey]: log } };
}

export function renameExercise(data: AppData, fromName: string, toName: string): AppData {
  if (!fromName || !toName || fromName === toName) return data;
  const newLogs: typeof data.logs = {};
  Object.entries(data.logs).forEach(([dk, log]) => {
    if (!log.exercises.some(e => e.name === fromName)) { newLogs[dk] = log; return; }
    newLogs[dk] = { ...log, exercises: log.exercises.map(e => e.name === fromName ? { ...e, name: toName } : e) };
  });
  return { ...data, logs: newLogs };
}

export function calcBMR(s: Settings, weight: number): number {
  if (s.gender === 'male') {
    return Math.round(10 * weight + 6.25 * s.height - 5 * s.age + 5);
  }
  return Math.round(10 * weight + 6.25 * s.height - 5 * s.age - 161);
}

export function calcBMI(weight: number, height: number): number {
  const h = height / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
}
