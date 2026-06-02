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
  subType: 'strength' | 'cardio' | '';
  part: string;
  name: string;
  startTime: string | null;
  weight: number | null;
  reps: number | null;
  sets: number | null;
  duration: number | null;
  burnCal: number;
  memo: string;
};

export type MenuEdit = {
  weight: number | null;
  reps: number | null;
  sets: number | null;
};

export type DayLog = {
  body: { weight: number; bodyfat: number | null } | null;
  meals: MealEntry[];
  exercises: ExerciseEntry[];
  sleep: string | null;
  bowel: string | null;
  eatingOut: boolean;
  memo: string;
  menuEdits: Record<string, MenuEdit>;
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
  targetWeight: number | null;
  targetBodyfat: number | null;
};

export type AppData = {
  logs: Record<string, DayLog>;
  weekMenus: Record<string, string>;
  weekMemos: Record<string, string>;
  menuChecks: Record<string, Record<string, boolean>>;
  settings: Settings;
};
