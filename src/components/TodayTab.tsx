import { useState, useEffect } from 'react';
import { X, Pencil, Dumbbell, Activity, Footprints, Moon, Droplets, Store, Utensils, Copy, Minus, Plus } from 'lucide-react';
import { AppData, DayLog, MealEntry, ExerciseEntry, ExerciseSet } from '../types';
import { getDayLog, setDayLog, calcBMI } from '../store';
import BottomSheet from './BottomSheet';
import { parseWeekMenuJSON, getDayMenuFromJSON, WEEK_MENU_PLACEHOLDER } from '../utils/weekMenu';

type Props = {
  dateKey: string;
  data: AppData;
  onDataChange: (d: AppData) => void;
};

// ─── Set helpers ─────────────────────────────────────────────────────────────
function parseSetsField(setsStr: string, defaultWeight: number | null): ExerciseSet[] {
  const match = setsStr.trim().match(/^(\d+)[×xX](\d+)$/);
  if (match) {
    const reps = parseInt(match[1]);
    const count = parseInt(match[2]);
    return Array.from({ length: count }, () => ({ weight: defaultWeight, reps }));
  }
  return [{ weight: defaultWeight, reps: null }];
}

function getOrInitSets(
  menuEdits: Record<string, { sets: ExerciseSet[] }>,
  ck: string,
  ex: { sets: string; weight: number | null }
): ExerciseSet[] {
  const edit = menuEdits[ck];
  if (edit?.sets?.length > 0) return edit.sets;
  if (ex.sets) return parseSetsField(ex.sets, ex.weight);
  return [{ weight: ex.weight, reps: null }];
}

// ─── Calorie Summary ─────────────────────────────────────────────────────────
function CalSummaryCard({ log, settings, eatingOut }: { log: DayLog; settings: AppData['settings']; eatingOut?: boolean }) {
  const totalCal = log.meals.reduce((s, m) => s + m.cal, 0);
  const remaining = settings.targetCal - totalCal;
  const pct = Math.min((totalCal / settings.targetCal) * 100, 100);
  const over = totalCal > settings.targetCal;
  const totalP = log.meals.reduce((s, m) => s + m.p, 0);
  const totalF = log.meals.reduce((s, m) => s + m.f, 0);
  const totalC = log.meals.reduce((s, m) => s + m.c, 0);

  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between mb-1">
        <div>
          {eatingOut && <span className="text-3xl font-bold text-gray-400 mr-0.5">〜</span>}
          <span className="num text-4xl font-bold text-gray-900">{totalCal}</span>
          <span className="text-sm text-gray-500 ml-1">kcal</span>
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold ${over ? 'text-red-500' : 'text-[#12b76a]'}`}>
            {over ? `${Math.abs(remaining)} kcalオーバー` : `あと ${remaining} kcal`}
          </div>
          <div className="text-xs text-gray-400">目標 {settings.targetCal} kcal</div>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-[#3b6ef5]'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'タンパク質', key: 'P', val: totalP, target: settings.targetP, color: 'bg-blue-400' },
          { label: '脂質', key: 'F', val: totalF, target: settings.targetF, color: 'bg-yellow-400' },
          { label: '炭水化物', key: 'C', val: totalC, target: settings.targetC, color: 'bg-green-400' },
        ].map(({ label, key, val, target, color }) => (
          <div key={key} className="bg-gray-50 rounded-xl p-2">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-xs font-semibold text-gray-500">{key}</span>
              <span className="num text-lg font-bold text-gray-900">{val.toFixed(1)}</span>
              <span className="text-xs text-gray-400">g</span>
            </div>
            <div className="text-xs text-gray-400 mb-1">{label} /{target}g{eatingOut && <span className="ml-1 text-amber-500">概算</span>}</div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min((val / target) * 100, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Body Card ────────────────────────────────────────────────────────────────
function BodyCard({ log, dateKey, data, onDataChange, trigger }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void; trigger?: number }) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState('');
  const [bodyfat, setBodyfat] = useState('');

  useEffect(() => {
    if (!trigger) return;
    setWeight(log.body?.weight?.toString() ?? '');
    setBodyfat(log.body?.bodyfat?.toString() ?? '');
    setOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const prevDateKey = (() => {
    const d = new Date(dateKey);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const prevLog = getDayLog(data, prevDateKey);
  const bmi = log.body ? calcBMI(log.body.weight, data.settings.height) : null;
  const diff = log.body && prevLog.body ? Math.round((log.body.weight - prevLog.body.weight) * 10) / 10 : null;

  const save = () => {
    const w = parseFloat(weight);
    if (isNaN(w)) return;
    onDataChange(setDayLog(data, dateKey, { ...log, body: { weight: w, bodyfat: bodyfat ? parseFloat(bodyfat) : null } }));
    setOpen(false);
  };

  return (
    <>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">体重・体脂肪</span>
          <button className="btn-primary text-xs py-1 px-3" onClick={() => { setWeight(log.body?.weight?.toString() ?? ''); setBodyfat(log.body?.bodyfat?.toString() ?? ''); setOpen(true); }}>＋ 記録</button>
        </div>
        <div className="card">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-400 mb-0.5">体重</div>
              <div className="flex items-baseline gap-1">
                <span className="num text-2xl font-bold text-gray-900">{log.body?.weight ?? '—'}</span>
                <span className="text-xs text-gray-400">kg</span>
              </div>
              {diff !== null && (
                <div className={`text-xs font-medium mt-0.5 ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-[#12b76a]' : 'text-gray-400'}`}>
                  {diff > 0 ? `+${diff}` : diff} kg 前日比
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">体脂肪率</div>
              <div className="flex items-baseline gap-1">
                <span className="num text-2xl font-bold text-gray-900">{log.body?.bodyfat ?? '—'}</span>
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">BMI</div>
              <div className="num text-2xl font-bold text-gray-900">{bmi ?? '—'}</div>
            </div>
          </div>
        </div>
      </div>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="体重・体脂肪を記録">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">体重 (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 65.5" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">体脂肪率 (%) — 任意</label>
            <input type="number" step="0.1" value={bodyfat} onChange={e => setBodyfat(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 18.5" />
          </div>
          <button onClick={save} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ─── Week Menu Card ───────────────────────────────────────────────────────────
const Checkmark = () => (
  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function WeekMenuCard({ dateKey, data, onDataChange }: { dateKey: string; data: AppData; onDataChange: (d: AppData) => void }) {
  const [open, setOpen] = useState(false);
  const [menuText, setMenuText] = useState('');

  const mondayKey = (() => {
    const d = new Date(dateKey);
    const dow = d.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const rawMenu = data.weekMenus[mondayKey];
  const parsed = rawMenu ? parseWeekMenuJSON(rawMenu) : null;
  const todayMenu = parsed ? getDayMenuFromJSON(parsed, dateKey) : null;
  const checks = data.menuChecks[dateKey] ?? {};
  const dayLog = getDayLog(data, dateKey);
  const menuEdits = dayLog.menuEdits ?? {};

  const totalItems = todayMenu ? todayMenu.training.length + todayMenu.cardio.length : 0;
  const doneItems = Object.values(checks).filter(Boolean).length;

  // Save updated sets for a training item, and sync the exercise entry if checked
  const saveSets = (ck: string, sets: ExerciseSet[]) => {
    const newMenuEdits = { ...menuEdits, [ck]: { sets } };
    let newLog = { ...dayLog, menuEdits: newMenuEdits };

    // If the exercise is already checked, also update its setsDetail
    const exerciseId = `menu_${ck}`;
    const exIdx = newLog.exercises.findIndex(e => e.id === exerciseId);
    if (exIdx >= 0) {
      const updatedEx: ExerciseEntry = { ...newLog.exercises[exIdx], setsDetail: sets, sets: sets.length };
      const newExercises = [...newLog.exercises];
      newExercises[exIdx] = updatedEx;
      newLog = { ...newLog, exercises: newExercises };
    }

    onDataChange(setDayLog(data, dateKey, newLog));
  };

  // Toggle training item (筋トレ)
  const toggleTrainingCheck = (i: number, ex: { name: string; sets: string; weight: number | null; point: string }) => {
    const ck = `t_${i}`;
    const newChecked = !checks[ck];
    const dayChecks = { ...checks, [ck]: newChecked };
    const exerciseId = `menu_t_${i}`;

    let newLog = { ...dayLog };
    if (newChecked) {
      const currentSets = getOrInitSets(menuEdits, ck, ex);
      const entry: ExerciseEntry = {
        id: exerciseId,
        type: 'gym',
        subType: 'strength',
        part: '',
        name: ex.name,
        startTime: null,
        weight: currentSets[0]?.weight ?? null,
        reps: currentSets[0]?.reps ?? null,
        sets: currentSets.length,
        setsDetail: currentSets,
        duration: null,
        burnCal: 0,
        memo: ex.point || '',
        fromMenu: true,
      };
      newLog = { ...newLog, exercises: [...newLog.exercises, entry] };
    } else {
      newLog = { ...newLog, exercises: newLog.exercises.filter(e => e.id !== exerciseId) };
    }

    const newData = { ...data, menuChecks: { ...data.menuChecks, [dateKey]: dayChecks } };
    onDataChange(setDayLog(newData, dateKey, newLog));
  };

  // Save a single field of a cardio edit, and live-update the exercise entry if checked
  const saveCardioEdit = (
    ck: string,
    field: 'cardioBurnCal' | 'cardioIncline' | 'cardioSpeed' | 'cardioDuration',
    rawVal: string
  ) => {
    const num = rawVal === '' ? null : parseFloat(rawVal);
    const curEdit = menuEdits[ck] ?? { sets: [] };
    const newEdit = { ...curEdit, [field]: num };
    let newLog = { ...dayLog, menuEdits: { ...menuEdits, [ck]: newEdit } };

    const exerciseId = `menu_${ck}`;
    const exIdx = newLog.exercises.findIndex(e => e.id === exerciseId);
    if (exIdx >= 0) {
      const burnCal  = ((field === 'cardioBurnCal'  ? num : curEdit.cardioBurnCal)  ?? 0) as number;
      const duration = (field === 'cardioDuration'  ? num : curEdit.cardioDuration) ?? newLog.exercises[exIdx].duration;
      const incline  =  field === 'cardioIncline'   ? num : (curEdit.cardioIncline  ?? null);
      const speed    =  field === 'cardioSpeed'     ? num : (curEdit.cardioSpeed    ?? null);
      const memoParts = [incline != null ? `傾斜${incline}` : null, speed != null ? `速度${speed}` : null].filter(Boolean);
      const updatedEx: ExerciseEntry = { ...newLog.exercises[exIdx], burnCal, duration, memo: memoParts.join('・') };
      const newExercises = [...newLog.exercises];
      newExercises[exIdx] = updatedEx;
      newLog = { ...newLog, exercises: newExercises };
    }

    onDataChange(setDayLog(data, dateKey, newLog));
  };

  // Toggle cardio item
  const toggleCardioCheck = (i: number, c: { name: string; duration: number; note: string }) => {
    const ck = `c_${i}`;
    const newChecked = !checks[ck];
    const dayChecks = { ...checks, [ck]: newChecked };
    const exerciseId = `menu_c_${i}`;

    let newLog = { ...dayLog };
    if (newChecked) {
      const edit = menuEdits[ck];
      const burnCal  = edit?.cardioBurnCal  ?? 0;
      const duration = edit?.cardioDuration ?? (c.duration > 0 ? c.duration : null);
      const incline  = edit?.cardioIncline  ?? null;
      const speed    = edit?.cardioSpeed    ?? null;
      const memoParts = [incline != null ? `傾斜${incline}` : null, speed != null ? `速度${speed}` : null].filter(Boolean);
      const entry: ExerciseEntry = {
        id: exerciseId,
        type: 'gym',
        subType: 'cardio',
        part: '',
        name: c.name,
        startTime: null,
        weight: null,
        reps: null,
        sets: null,
        setsDetail: null,
        duration,
        burnCal,
        memo: memoParts.length > 0 ? memoParts.join('・') : c.note,
        fromMenu: true,
      };
      newLog = { ...newLog, exercises: [...newLog.exercises, entry] };
    } else {
      newLog = { ...newLog, exercises: newLog.exercises.filter(e => e.id !== exerciseId) };
    }

    const newData = { ...data, menuChecks: { ...data.menuChecks, [dateKey]: dayChecks } };
    onDataChange(setDayLog(newData, dateKey, newLog));
  };

  // Generate keys for Mon–Sun of this week
  const weekDayKeys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayKey + 'T00:00:00');
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const saveMenu = () => {
    if (menuText.trim()) {
      const result = parseWeekMenuJSON(menuText);
      if (!result) {
        alert('JSONの形式が正しくありません。入力内容を確認してください。');
        return;
      }
    }

    // Preserve checked entries (logs.exercises is the source of truth after check).
    // Only clear menuEdits for unchecked items so new menu defaults show correctly.
    const newLogs = { ...data.logs };
    weekDayKeys.forEach(dk => {
      const existing = data.logs[dk];
      if (!existing) return;
      const dayChecks = data.menuChecks[dk] ?? {};
      // Keep menuEdits only for keys that are currently checked
      const keptEdits = Object.fromEntries(
        Object.entries(existing.menuEdits ?? {}).filter(([ck]) => !!dayChecks[ck])
      );
      newLogs[dk] = { ...existing, menuEdits: keptEdits };
    });

    onDataChange({
      ...data,
      weekMenus: { ...data.weekMenus, [mondayKey]: menuText },
      logs: newLogs,
    });
    setOpen(false);
  };

  return (
    <>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">今日の運動メニュー</span>
          <button className="bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-1 text-sm font-medium active:bg-gray-50" onClick={() => { setMenuText(rawMenu ?? ''); setOpen(true); }}>
            週メニュー入力
          </button>
        </div>
        <div className="card min-h-[64px]">
          {!rawMenu ? (
            <div className="text-center py-2">
              <div className="text-sm text-gray-400 mb-1">今週のメニューが入力されていません</div>
              <button onClick={() => { setMenuText(''); setOpen(true); }} className="text-sm text-[#3b6ef5]">週メニューを入力する →</button>
            </div>
          ) : !todayMenu ? (
            <div className="text-sm text-gray-400">本日の記録なし</div>
          ) : todayMenu.rest ? (
            <div className="flex items-center gap-1.5 text-indigo-400">
              <Moon size={16} />
              <span className="text-sm font-medium text-gray-600">休養日</span>
            </div>
          ) : (
            <div>
              {totalItems > 0 && (
                <div className="flex justify-end mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${doneItems === totalItems ? 'bg-[#12b76a] text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {doneItems}/{totalItems} 完了
                  </span>
                </div>
              )}
              <div className="space-y-3">
                {/* 筋トレ */}
                {todayMenu.training.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2">【筋トレ】</div>
                    <div className="space-y-3">
                      {todayMenu.training.map((ex, i) => {
                        const ck = `t_${i}`;
                        const done = !!checks[ck];
                        const currentSets = getOrInitSets(menuEdits, ck, ex);

                        const updateSet = (si: number, field: 'weight' | 'reps', rawVal: string) => {
                          const val = rawVal === '' ? null : parseFloat(rawVal);
                          const newSets = currentSets.map((s, j) => j === si ? { ...s, [field]: val } : s);
                          saveSets(ck, newSets);
                        };

                        const copySet = (si: number) => {
                          const newSets = [
                            ...currentSets.slice(0, si + 1),
                            { ...currentSets[si] },
                            ...currentSets.slice(si + 1),
                          ];
                          saveSets(ck, newSets);
                        };

                        const removeSet = (si: number) => {
                          if (currentSets.length <= 1) return;
                          saveSets(ck, currentSets.filter((_, j) => j !== si));
                        };

                        const addSet = () => {
                          const last = currentSets[currentSets.length - 1];
                          saveSets(ck, [...currentSets, { weight: last?.weight ?? null, reps: last?.reps ?? null }]);
                        };

                        return (
                          <div key={i} className="rounded-xl bg-gray-50 px-3 py-2.5">
                            {/* Checkbox + name */}
                            <div className="flex items-start gap-2 mb-2">
                              <button
                                onClick={() => toggleTrainingCheck(i, ex)}
                                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${done ? 'bg-[#3b6ef5] border-[#3b6ef5]' : 'border-gray-300 bg-white'}`}
                              >
                                {done && <Checkmark />}
                              </button>
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-800">{ex.name}</span>
                                {ex.point && <div className="text-xs text-gray-400 mt-0.5">{ex.point}</div>}
                              </div>
                            </div>

                            {/* Set rows */}
                            <div className="ml-6 space-y-1.5">
                              {currentSets.map((s, si) => (
                                <div key={si} className="flex items-center gap-1">
                                  <span className="text-xs text-gray-400 w-4 text-right flex-shrink-0">{si + 1}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={s.weight ?? ''}
                                    onChange={e => updateSet(si, 'weight', e.target.value)}
                                    className="w-14 border border-gray-200 bg-white rounded-lg px-1.5 py-1 text-xs text-center num focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
                                    placeholder="kg"
                                  />
                                  <span className="text-xs text-gray-400">kg</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={s.reps ?? ''}
                                    onChange={e => updateSet(si, 'reps', e.target.value)}
                                    className="w-12 border border-gray-200 bg-white rounded-lg px-1.5 py-1 text-xs text-center num focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
                                    placeholder="回"
                                  />
                                  <span className="text-xs text-gray-400">回</span>
                                  <button
                                    onClick={() => copySet(si)}
                                    className="p-1 rounded-md bg-white border border-gray-200 active:bg-gray-100 ml-1"
                                    title="この行をコピー"
                                  >
                                    <Copy size={10} className="text-gray-400" />
                                  </button>
                                  <button
                                    onClick={() => removeSet(si)}
                                    disabled={currentSets.length <= 1}
                                    className={`p-1 rounded-md bg-white border border-gray-200 ${currentSets.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'active:bg-gray-100'}`}
                                    title="この行を削除"
                                  >
                                    <Minus size={10} className="text-gray-400" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={addSet}
                                className="flex items-center gap-1 text-xs text-[#3b6ef5] py-0.5 mt-0.5"
                              >
                                <Plus size={11} />セット追加
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 有酸素 */}
                {todayMenu.cardio.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1.5">【有酸素】</div>
                    <div className="space-y-3">
                      {todayMenu.cardio.map((c, i) => {
                        const ck = `c_${i}`;
                        const done = !!checks[ck];
                        const edit = menuEdits[ck];
                        const editDuration = edit?.cardioDuration ?? (c.duration > 0 ? c.duration : null);
                        const editBurnCal  = edit?.cardioBurnCal  ?? null;
                        const editIncline  = edit?.cardioIncline  ?? null;
                        const editSpeed    = edit?.cardioSpeed    ?? null;
                        return (
                          <div key={i} className="rounded-xl bg-gray-50 px-3 py-2.5">
                            {/* Checkbox + name */}
                            <div className="flex items-start gap-2 mb-2">
                              <button
                                onClick={() => toggleCardioCheck(i, c)}
                                className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${done ? 'bg-[#3b6ef5] border-[#3b6ef5]' : 'border-gray-300 bg-white'}`}
                              >
                                {done && <Checkmark />}
                              </button>
                              <span className={`text-sm font-medium text-gray-800 ${done ? 'opacity-40' : ''}`}>{c.name}</span>
                            </div>
                            {/* Input fields */}
                            <div className="ml-6 grid grid-cols-2 gap-x-4 gap-y-1.5">
                              {([
                                { label: '時間(分)', field: 'cardioDuration' as const, val: editDuration, step: '1',   ph: c.duration > 0 ? String(c.duration) : '30' },
                                { label: '消費kcal', field: 'cardioBurnCal'  as const, val: editBurnCal,  step: '10',  ph: '—' },
                                { label: '傾斜',     field: 'cardioIncline'  as const, val: editIncline,  step: '0.5', ph: '—' },
                                { label: '速度',     field: 'cardioSpeed'    as const, val: editSpeed,    step: '0.5', ph: '—' },
                              ] as const).map(({ label, field, val, step, ph }) => (
                                <div key={field} className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-400 w-14 flex-shrink-0">{label}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step={step}
                                    value={val ?? ''}
                                    onChange={e => saveCardioEdit(ck, field, e.target.value)}
                                    className="flex-1 min-w-0 border border-gray-200 bg-white rounded-lg px-1.5 py-1 text-xs text-center num focus:outline-none focus:ring-1 focus:ring-[#3b6ef5]"
                                    placeholder={ph}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="週メニューを入力 (JSON)">
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            ClaudeにJSON形式で週メニューを出力してもらい、そのまま貼り付けてください。
          </p>
          <textarea
            value={menuText}
            onChange={e => setMenuText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#3b6ef5] font-mono"
            rows={16}
            placeholder={WEEK_MENU_PLACEHOLDER}
          />
          <button onClick={saveMenu} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ─── Meal Section ─────────────────────────────────────────────────────────────
const MEAL_TYPES = ['朝食', '昼食', '夕食', '間食', '1日トータル', 'その他'];

function MealSection({ log, dateKey, data, onDataChange, eatingOut, trigger }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void; eatingOut?: boolean; trigger?: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(MEAL_TYPES[0]);
  const [cal, setCal] = useState('');
  const [p, setP] = useState('');
  const [f, setF] = useState('');
  const [c, setC] = useState('');

  useEffect(() => {
    if (!trigger) return;
    setOpen(true);
  }, [trigger]);

  const add = () => {
    if (!cal) return;
    const entry: MealEntry = {
      id: Date.now(),
      name,
      cal: parseInt(cal) || 0,
      p: parseFloat(p) || 0,
      f: parseFloat(f) || 0,
      c: parseFloat(c) || 0,
    };
    onDataChange(setDayLog(data, dateKey, { ...log, meals: [...log.meals, entry] }));
    setOpen(false);
    setName(MEAL_TYPES[0]); setCal(''); setP(''); setF(''); setC('');
  };

  const remove = (id: number) => {
    onDataChange(setDayLog(data, dateKey, { ...log, meals: log.meals.filter(m => m.id !== id) }));
  };

  return (
    <>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">食事</span>
          <button className="btn-primary text-xs py-1 px-3" onClick={() => setOpen(true)}>＋ 追加</button>
        </div>
        {log.meals.length === 0 ? (
          <div className="card text-center text-sm text-gray-400 py-4">記録なし</div>
        ) : (
          <div className="space-y-2">
            {log.meals.map(m => (
              <div key={m.id} className="card flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center bg-orange-50 rounded-xl flex-shrink-0">
                  <Utensils size={16} className="text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{eatingOut && <span className="text-gray-400">〜</span>}{m.name}</div>
                  <div className="text-xs text-gray-400">P {m.p.toFixed(1)}g・F {m.f.toFixed(1)}g・C {m.c.toFixed(1)}g</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="num text-sm font-semibold text-[#3b6ef5]">{m.cal} kcal</span>
                  <button onClick={() => remove(m.id)} className="p-1.5 bg-gray-100 rounded-lg active:bg-gray-200">
                    <X size={14} className="text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="食事を追加">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">食事タイプ</label>
            <select value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]">
              {MEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">カロリー (kcal)</label>
            <input type="number" value={cal} onChange={e => setCal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 650" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'P (g)', val: p, set: setP }, { label: 'F (g)', val: f, set: setF }, { label: 'C (g)', val: c, set: setC }].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-xs text-gray-500 block mb-1">{label}</label>
                <input type="number" step="0.1" value={val} onChange={e => set(e.target.value)} className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="0" />
              </div>
            ))}
          </div>
          <button onClick={add} className="btn-primary w-full py-3">追加</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ─── Exercise Section ─────────────────────────────────────────────────────────
const BODY_PARTS = ['胸', '背中', '脚', '肩', '腕', '腹', '全身'];

function ExerciseSection({ log, dateKey, data, onDataChange, trigger }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void; trigger?: number }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'gym' | 'other'>('gym');
  const [subType, setSubType] = useState<'strength' | 'cardio'>('strength');
  const [part, setPart] = useState('胸');
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('');
  const [duration, setDuration] = useState('');
  const [burnCal, setBurnCal] = useState('');
  const [memo, setMemo] = useState('');

  const reset = () => {
    setName(''); setStartTime(''); setWeight(''); setReps(''); setSets('');
    setDuration(''); setBurnCal(''); setMemo(''); setPart('胸');
  };

  useEffect(() => {
    if (!trigger) return;
    setName(''); setStartTime(''); setWeight(''); setReps(''); setSets('');
    setDuration(''); setBurnCal(''); setMemo(''); setPart('胸');
    setOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const add = () => {
    if (!name) return;
    const entry: ExerciseEntry = {
      id: Date.now(),
      type,
      subType: type === 'gym' ? subType : '',
      part: type === 'gym' && subType === 'strength' ? part : '',
      name,
      startTime: startTime || null,
      weight: weight ? parseFloat(weight) : null,
      reps: reps ? parseInt(reps) : null,
      sets: sets ? parseInt(sets) : null,
      setsDetail: null,
      duration: duration ? parseInt(duration) : null,
      burnCal: parseInt(burnCal) || 0,
      memo,
      fromMenu: false,
    };
    onDataChange(setDayLog(data, dateKey, { ...log, exercises: [...log.exercises, entry] }));
    setOpen(false);
    reset();
  };

  const remove = (id: number | string) => {
    const ex = log.exercises.find(e => e.id === id);
    const newExercises = log.exercises.filter(e => e.id !== id);

    if (ex?.fromMenu) {
      // Uncheck the corresponding menu item: 'menu_t_0' → 't_0'
      const ck = String(id).replace(/^menu_/, '');
      const dayChecks = { ...(data.menuChecks[dateKey] ?? {}), [ck]: false };
      const newData = { ...data, menuChecks: { ...data.menuChecks, [dateKey]: dayChecks } };
      onDataChange(setDayLog(newData, dateKey, { ...log, exercises: newExercises }));
      return;
    }

    onDataChange(setDayLog(data, dateKey, { ...log, exercises: newExercises }));
  };

  const ExerciseIcon = ({ ex }: { ex: ExerciseEntry }) => {
    if (ex.type === 'gym' && ex.subType === 'cardio')
      return <div className="w-9 h-9 flex items-center justify-center bg-blue-50 rounded-xl flex-shrink-0"><Activity size={16} className="text-[#3b6ef5]" /></div>;
    if (ex.type === 'gym' && ex.subType === 'strength')
      return <div className="w-9 h-9 flex items-center justify-center bg-blue-50 rounded-xl flex-shrink-0"><Dumbbell size={16} className="text-[#3b6ef5]" /></div>;
    return <div className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-xl flex-shrink-0"><Footprints size={16} className="text-gray-500" /></div>;
  };

  const subLabel = (ex: ExerciseEntry) => {
    const parts: string[] = [];
    if (ex.startTime) parts.push(`${ex.startTime}〜`);
    if (ex.subType === 'strength') {
      if (ex.setsDetail && ex.setsDetail.length > 0) {
        const detail = ex.setsDetail
          .map(s => [s.weight != null ? `${s.weight}kg` : null, s.reps != null ? `×${s.reps}` : null].filter(Boolean).join(''))
          .filter(Boolean)
          .join(', ');
        if (detail) parts.push(detail);
      } else {
        const detail = [
          ex.weight ? `${ex.weight}kg` : null,
          ex.reps ? `${ex.reps}回` : null,
          ex.sets ? `${ex.sets}セット` : null,
        ].filter(Boolean).join(' × ');
        if (detail) parts.push(detail);
      }
    }
    if (ex.duration) parts.push(`${ex.duration}分`);
    if (ex.memo) parts.push(ex.memo);
    return parts.join('・');
  };

  return (
    <>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">運動記録</span>
          <button className="btn-primary text-xs py-1 px-3" onClick={() => { reset(); setOpen(true); }}>＋ 追加</button>
        </div>
        {log.exercises.length === 0 ? (
          <div className="card text-center text-sm text-gray-400 py-4">記録なし</div>
        ) : (
          <div className="space-y-2">
            {log.exercises.map(ex => (
              <div key={ex.id} className="card flex items-center gap-3">
                <ExerciseIcon ex={ex} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">
                    {ex.name}{ex.part ? ` (${ex.part})` : ''}
                    {ex.fromMenu && <span className="ml-1.5 text-xs text-[#3b6ef5] bg-blue-50 px-1.5 py-0.5 rounded-full">メニュー</span>}
                  </div>
                  {subLabel(ex) && <div className="text-xs text-gray-400 mt-0.5">{subLabel(ex)}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {ex.burnCal > 0 && (
                    <span className="num text-sm font-semibold text-[#12b76a]">-{ex.burnCal} kcal</span>
                  )}
                  <button onClick={() => remove(ex.id)} className="p-1.5 bg-gray-100 rounded-lg active:bg-gray-200">
                    <X size={14} className="text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="運動を追加">
        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-sm text-gray-600 block mb-1.5">種別</label>
            <div className="flex gap-2">
              {(['gym', 'other'] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 ${type === t ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}>
                  {t === 'gym' ? <><Dumbbell size={14} /> ジム</> : <><Footprints size={14} /> その他</>}
                </button>
              ))}
            </div>
          </div>

          {/* SubType (gym only) */}
          {type === 'gym' && (
            <div>
              <label className="text-sm text-gray-600 block mb-1.5">トレーニング種類</label>
              <div className="flex gap-2">
                <button onClick={() => setSubType('strength')} className={`flex-1 py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 ${subType === 'strength' ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}><Dumbbell size={14} /> 筋トレ</button>
                <button onClick={() => setSubType('cardio')} className={`flex-1 py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5 ${subType === 'cardio' ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}><Activity size={14} /> 有酸素</button>
              </div>
            </div>
          )}

          {/* Strength fields */}
          {type === 'gym' && subType === 'strength' && (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-1.5">部位</label>
                <div className="flex gap-1.5 flex-wrap">
                  {BODY_PARTS.map(bp => (
                    <button key={bp} onClick={() => setPart(bp)} className={`px-3 py-1 rounded-full text-sm border ${part === bp ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}>{bp}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">種目名</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: ベンチプレス" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">開始時刻 — 任意</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[{ label: '重さ (kg)', val: weight, set: setWeight, ph: '80' }, { label: '回数', val: reps, set: setReps, ph: '10' }, { label: 'セット数', val: sets, set: setSets, ph: '5' }].map(({ label, val, set, ph }) => (
                  <div key={label}>
                    <label className="text-xs text-gray-500 block mb-1">{label}</label>
                    <input type="number" value={val} onChange={e => set(e.target.value)} className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder={ph} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">運動時間 (分) — 任意</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="60" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">消費カロリー (kcal)</label>
                  <input type="number" value={burnCal} onChange={e => setBurnCal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="300" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">メモ — 任意</label>
                <input type="text" value={memo} onChange={e => setMemo(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="フォームのポイントなど" />
              </div>
            </>
          )}

          {/* Cardio fields */}
          {type === 'gym' && subType === 'cardio' && (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-1">種目名</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: トレッドミル" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">開始時刻 — 任意</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">運動時間 (分)</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="30" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">消費カロリー (kcal)</label>
                  <input type="number" value={burnCal} onChange={e => setBurnCal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="200" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">傾斜・速度メモ</label>
                <input type="text" value={memo} onChange={e => setMemo(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 傾斜2・速度7" />
              </div>
            </>
          )}

          {/* Other fields */}
          {type === 'other' && (
            <>
              <div>
                <label className="text-sm text-gray-600 block mb-1">内容</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: ウォーキング" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">開始時刻 — 任意</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">運動時間 (分) — 任意</label>
                  <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="30" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">消費カロリー (kcal)</label>
                  <input type="number" value={burnCal} onChange={e => setBurnCal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="150" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">メモ — 任意</label>
                <input type="text" value={memo} onChange={e => setMemo(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 近所を一周" />
              </div>
            </>
          )}

          <button onClick={add} className="btn-primary w-full py-3">追加</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ─── Health Section ───────────────────────────────────────────────────────────
function HealthSection({ log, dateKey, data, onDataChange, trigger }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void; trigger?: number }) {
  const [sleepOpen, setSleepOpen] = useState(false);
  const [bowelOpen, setBowelOpen] = useState(false);
  const [sleepVal, setSleepVal] = useState('');
  const [bowelVal, setBowelVal] = useState('');

  useEffect(() => {
    if (!trigger) return;
    setSleepVal(log.sleep ?? '');
    setSleepOpen(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  const sleepPresets = ['5h', '5.5h', '6h', '6.5h', '7h', '7.5h', '8h', '8.5h', '9h'];
  const bowelPresets = ['あり', 'なし', '2回以上'];

  return (
    <>
      <div className="mb-3">
        <div className="text-sm font-semibold text-gray-700 mb-2">体調記録</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setSleepVal(log.sleep ?? ''); setSleepOpen(true); }} className="card text-left active:bg-gray-50">
            <div className="flex items-center gap-1.5 mb-1">
              <Moon size={15} className="text-indigo-400" />
              <span className="text-sm font-medium text-gray-700">睡眠</span>
            </div>
            <div className="text-sm text-gray-500">{log.sleep ?? 'タップして記録'}</div>
          </button>
          <button onClick={() => { setBowelVal(log.bowel ?? ''); setBowelOpen(true); }} className="card text-left active:bg-gray-50">
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets size={15} className="text-blue-400" />
              <span className="text-sm font-medium text-gray-700">排便</span>
            </div>
            <div className="text-sm text-gray-500">{log.bowel ?? 'タップして記録'}</div>
          </button>
        </div>
      </div>
      <BottomSheet open={sleepOpen} onClose={() => setSleepOpen(false)} title="睡眠を記録">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {sleepPresets.map(s => (
              <button key={s} onClick={() => setSleepVal(s)} className={`py-2 rounded-xl border text-sm font-medium ${sleepVal === s ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}>{s}</button>
            ))}
          </div>
          <input type="text" value={sleepVal} onChange={e => setSleepVal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 6.5h" />
          <button onClick={() => { onDataChange(setDayLog(data, dateKey, { ...log, sleep: sleepVal })); setSleepOpen(false); }} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
      <BottomSheet open={bowelOpen} onClose={() => setBowelOpen(false)} title="排便を記録">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {bowelPresets.map(b => (
              <button key={b} onClick={() => setBowelVal(b)} className={`py-2 rounded-xl border text-sm font-medium ${bowelVal === b ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}>{b}</button>
            ))}
          </div>
          <button onClick={() => { onDataChange(setDayLog(data, dateKey, { ...log, bowel: bowelVal })); setBowelOpen(false); }} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ─── Memo Section ─────────────────────────────────────────────────────────────
function MemoSection({ log, dateKey, data, onDataChange }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  return (
    <>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">メモ</span>
          <button onClick={() => { setText(log.memo); setOpen(true); }} className="bg-white border border-gray-200 text-gray-600 rounded-xl px-3 py-1 text-sm font-medium flex items-center gap-1 active:bg-gray-50">
            <Pencil size={12} /> 編集
          </button>
        </div>
        <div className="card min-h-[48px]">
          {log.memo ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.memo}</p> : <p className="text-sm text-gray-400">メモなし</p>}
        </div>
      </div>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="メモを編集">
        <div className="space-y-4">
          <textarea value={text} onChange={e => setText(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" rows={6} placeholder="体調・気づきなど..." />
          <button onClick={() => { onDataChange(setDayLog(data, dateKey, { ...log, memo: text })); setOpen(false); }} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TodayTab({ dateKey, data, onDataChange }: Props) {
  const [bodyTrigger, setBodyTrigger] = useState(0);
  const [mealTrigger, setMealTrigger] = useState(0);
  const [exTrigger, setExTrigger] = useState(0);
  const [healthTrigger, setHealthTrigger] = useState(0);

  const log = getDayLog(data, dateKey);

  return (
    <div>
      {log.eatingOut && (
        <div className="card mb-3 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <Store size={20} className="text-amber-600 flex-shrink-0" />
            <div className="text-sm font-medium text-amber-700">外食モード — 概算値を表示しています</div>
          </div>
        </div>
      )}
      <CalSummaryCard log={log} settings={data.settings} eatingOut={log.eatingOut} />
      <BodyCard log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} trigger={bodyTrigger} />
      <WeekMenuCard dateKey={dateKey} data={data} onDataChange={onDataChange} />
      <MealSection log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} eatingOut={log.eatingOut} trigger={mealTrigger} />
      <ExerciseSection log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} trigger={exTrigger} />
      <HealthSection log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} trigger={healthTrigger} />
      <MemoSection log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} />
      <div className="h-16" />

      {/* Quick input bar */}
      <div className="fixed bottom-14 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t border-gray-200 z-30 flex">
        {([
          { emoji: '⚖️', label: '体重', onClick: () => setBodyTrigger(t => t + 1) },
          { emoji: '🍽️', label: '食事', onClick: () => setMealTrigger(t => t + 1) },
          { emoji: '🏋️', label: '運動', onClick: () => setExTrigger(t => t + 1) },
          { emoji: '😴', label: '体調', onClick: () => setHealthTrigger(t => t + 1) },
        ] as const).map(({ emoji, label, onClick }) => (
          <button key={label} onClick={onClick} className="flex-1 flex flex-col items-center py-2 gap-0.5 active:bg-gray-50">
            <span className="text-xl leading-none">{emoji}</span>
            <span className="text-[10px] font-medium text-gray-500">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
