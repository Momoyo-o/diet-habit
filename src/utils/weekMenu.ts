export type Exercise = {
  name: string;
  sets: string;
  note: string;
};

export type CardioEntry = {
  name: string;
  duration: string;
  detail: string;
};

export type DayMenu = {
  rest: boolean;
  strength: Exercise[];
  cardio: CardioEntry[];
};

export type WeekMenuParsed = Record<string, DayMenu>; // key: "YYYY-MM-DD"

function parseDate(line: string, year: number): string | null {
  // Matches patterns like "6/1 月", "6/1月", "6/1"
  const m = line.match(/^(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  const d = new Date(year, month - 1, day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseWeekMenu(text: string, referenceYear = new Date().getFullYear()): WeekMenuParsed {
  const result: WeekMenuParsed = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let currentDate: string | null = null;
  let currentSection: 'strength' | 'cardio' | null = null;

  for (const line of lines) {
    const date = parseDate(line, referenceYear);
    if (date) {
      currentDate = date;
      currentSection = null;
      result[currentDate] = { rest: false, strength: [], cardio: [] };
      continue;
    }

    if (!currentDate) continue;

    if (line.includes('休養日')) {
      result[currentDate].rest = true;
      continue;
    }

    if (line === '【筋トレ】') {
      currentSection = 'strength';
      continue;
    }
    if (line === '【有酸素】') {
      currentSection = 'cardio';
      continue;
    }

    if (currentSection === 'strength') {
      // Split by full-width space or tab: name　sets　note
      const parts = line.split(/[　\t]/).map(p => p.trim()).filter(Boolean);
      result[currentDate].strength.push({
        name: parts[0] ?? '',
        sets: parts[1] ?? '',
        note: parts[2] ?? '',
      });
    } else if (currentSection === 'cardio') {
      const parts = line.split(/[　\t]/).map(p => p.trim()).filter(Boolean);
      result[currentDate].cardio.push({
        name: parts[0] ?? '',
        duration: parts[1] ?? '',
        detail: parts[2] ?? '',
      });
    }
  }

  return result;
}
