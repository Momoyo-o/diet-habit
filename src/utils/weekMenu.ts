export type TrainingItem = {
  name: string;
  sets: string;
  weight: number | null;
  part?: string | null;
  point: string;
};

export type CardioItem = {
  name: string;
  duration: number;
  note: string;
};

export type DayMenuJSON = {
  date: string;   // "M/D" 形式 例: "6/1"
  rest: boolean;
  training: TrainingItem[];
  cardio: CardioItem[];
};

export type WeekMenuJSON = {
  week: DayMenuJSON[];
};

/** テキストをJSONとしてパース。不正な場合は null を返す */
export function parseWeekMenuJSON(text: string): WeekMenuJSON | null {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.week)) return null;
    return parsed as WeekMenuJSON;
  } catch {
    return null;
  }
}

/** dateKey (YYYY-MM-DD) に対応するその日のメニューを取得 */
export function getDayMenuFromJSON(parsed: WeekMenuJSON, dateKey: string): DayMenuJSON | null {
  const d = new Date(dateKey + 'T00:00:00');
  const monthDay = `${d.getMonth() + 1}/${d.getDate()}`;
  return parsed.week.find(day => day.date === monthDay) ?? null;
}

/** 入力フォーム用のプレースホルダーJSON */
export const WEEK_MENU_PLACEHOLDER = `{
  "week": [
    {
      "date": "6/1",
      "rest": false,
      "training": [
        { "name": "ベンチプレス", "sets": "10×5", "weight": 60, "part": "胸", "point": "肩甲骨を寄せる" }
      ],
      "cardio": [
        { "name": "トレッドミル", "duration": 20, "note": "傾斜2・速度7" }
      ]
    },
    {
      "date": "6/2",
      "rest": true,
      "training": [],
      "cardio": []
    }
  ]
}`;
