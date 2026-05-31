export type MealEntry = {
  id: number;
  name: string;
  cal: number;
  p: number;
  f: number;
  c: number;
};

export type ExerciseEntry = {
  id: number;
  type: 'gym' | 'other';
  name: string;
  duration: number;
  burnCal: number;
  memo: string;
};

export type DayLog = {
  body: { weight: number; bodyfat: number | null } | null;
  meals: MealEntry[];
  exercises: ExerciseEntry[];
  sleep: string | null;
  bowel: string | null;
  eatingOut: boolean;
  memo: string;
};

export type Settings = {
  targetCal: number;
  targetP: number;
  targetF: number;
  targetC: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  startWeight: number;
};

export type AppData = {
  logs: Record<string, DayLog>;
  weekMenus: Record<string, string>;
  weekMemos: Record<string, string>;
  settings: Settings;
};
