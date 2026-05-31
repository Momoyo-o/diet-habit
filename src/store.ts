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
};

const defaultDayLog = (): DayLog => ({
  body: null,
  meals: [],
  exercises: [],
  sleep: null,
  bowel: null,
  eatingOut: false,
  memo: '',
});

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { logs: {}, weekMenus: {}, weekMemos: {}, settings: defaultSettings };
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      logs: parsed.logs ?? {},
      weekMenus: parsed.weekMenus ?? {},
      weekMemos: parsed.weekMemos ?? {},
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return { logs: {}, weekMenus: {}, weekMemos: {}, settings: defaultSettings };
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDayLog(data: AppData, dateKey: string): DayLog {
  return data.logs[dateKey] ?? defaultDayLog();
}

export function setDayLog(data: AppData, dateKey: string, log: DayLog): AppData {
  return { ...data, logs: { ...data.logs, [dateKey]: log } };
}

export function calcBMR(s: Settings, weight: number): number {
  // Mifflin-St Jeor
  if (s.gender === 'male') {
    return Math.round(10 * weight + 6.25 * s.height - 5 * s.age + 5);
  }
  return Math.round(10 * weight + 6.25 * s.height - 5 * s.age - 161);
}

export function calcBMI(weight: number, height: number): number {
  const h = height / 100;
  return Math.round((weight / (h * h)) * 10) / 10;
}
