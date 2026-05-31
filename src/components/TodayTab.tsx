import { useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { AppData, DayLog, MealEntry, ExerciseEntry } from '../types';
import { getDayLog, setDayLog, calcBMI } from '../store';
import BottomSheet from './BottomSheet';
import { parseWeekMenu } from '../utils/weekMenu';

type Props = {
  dateKey: string;
  data: AppData;
  onDataChange: (d: AppData) => void;
};

// ---- Calorie Summary Card ----
function CalSummaryCard({ log, settings }: { log: DayLog; settings: AppData['settings'] }) {
  const totalCal = log.meals.reduce((s, m) => s + m.cal, 0);
  const burnCal = log.exercises.reduce((s, e) => s + e.burnCal, 0);
  const netCal = totalCal - burnCal;
  const remaining = settings.targetCal - netCal;
  const pct = Math.min((netCal / settings.targetCal) * 100, 100);
  const over = netCal > settings.targetCal;

  const totalP = log.meals.reduce((s, m) => s + m.p, 0);
  const totalF = log.meals.reduce((s, m) => s + m.f, 0);
  const totalC = log.meals.reduce((s, m) => s + m.c, 0);

  return (
    <div className="card mb-3">
      <div className="flex items-start justify-between mb-1">
        <div>
          <span className="num text-4xl font-bold text-gray-900">{netCal}</span>
          <span className="text-sm text-gray-500 ml-1">kcal</span>
          <div className="text-xs text-gray-400 mt-0.5">摂取 {totalCal} − 消費 {burnCal}</div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold ${over ? 'text-red-500' : 'text-[#12b76a]'}`}>
            {over ? `${Math.abs(remaining)} kcalオーバー` : `あと ${remaining} kcal`}
          </div>
          <div className="text-xs text-gray-400">目標 {settings.targetCal} kcal</div>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : 'bg-[#3b6ef5]'}`}
          style={{ width: `${pct}%` }}
        />
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
              <span className="num text-lg font-bold text-gray-900">{val}</span>
              <span className="text-xs text-gray-400">g</span>
            </div>
            <div className="text-xs text-gray-400 mb-1">{label} /{target}g</div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full`}
                style={{ width: `${Math.min((val / target) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Body Card ----
function BodyCard({ log, dateKey, data, onDataChange }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void }) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState(log.body?.weight?.toString() ?? '');
  const [bodyfat, setBodyfat] = useState(log.body?.bodyfat?.toString() ?? '');

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
    const bf = bodyfat ? parseFloat(bodyfat) : null;
    const updated = setDayLog(data, dateKey, { ...log, body: { weight: w, bodyfat: bf } });
    onDataChange(updated);
    setOpen(false);
  };

  return (
    <>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">体重・体脂肪</span>
          <button className="btn-primary text-xs py-1 px-3" onClick={() => {
            setWeight(log.body?.weight?.toString() ?? '');
            setBodyfat(log.body?.bodyfat?.toString() ?? '');
            setOpen(true);
          }}>＋ 記録</button>
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
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]"
              placeholder="例: 65.5"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">体脂肪率 (%) — 任意</label>
            <input
              type="number"
              step="0.1"
              value={bodyfat}
              onChange={e => setBodyfat(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]"
              placeholder="例: 18.5"
            />
          </div>
          <button onClick={save} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ---- Week Menu Card ----
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
  const parsed = rawMenu ? parseWeekMenu(rawMenu) : null;
  const todayMenu = parsed?.[dateKey];

  const saveMenu = () => {
    const updated = { ...data, weekMenus: { ...data.weekMenus, [mondayKey]: menuText } };
    onDataChange(updated);
    setOpen(false);
  };

  return (
    <>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">今日の運動メニュー</span>
          <button
            className="bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-1 text-sm font-medium active:bg-gray-50"
            onClick={() => { setMenuText(rawMenu ?? ''); setOpen(true); }}
          >週メニュー入力</button>
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
            <div className="text-base">😴 休養日</div>
          ) : (
            <div className="space-y-3">
              {todayMenu.strength.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">【筋トレ】</div>
                  <div className="space-y-1">
                    {todayMenu.strength.map((ex, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="font-medium">{ex.name}</span>
                        {ex.sets && <span className="text-gray-400">{ex.sets}</span>}
                        {ex.note && <span className="text-gray-400 text-xs">{ex.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {todayMenu.cardio.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-1">【有酸素】</div>
                  <div className="space-y-1">
                    {todayMenu.cardio.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="font-medium">{c.name}</span>
                        {c.duration && <span className="text-gray-400">{c.duration}</span>}
                        {c.detail && <span className="text-gray-400 text-xs">{c.detail}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="週メニューを入力">
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Claudeが出力したテキストをそのまま貼り付けてください</p>
          <textarea
            value={menuText}
            onChange={e => setMenuText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5] font-mono"
            rows={14}
            placeholder={`例:\n6/1 月\n【筋トレ】\nベンチプレス　10×5　肩甲骨を寄せる\n【有酸素】\nトレッドミル　20分　傾斜2・速度7\n6/2 火\n休養日`}
          />
          <button onClick={saveMenu} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ---- Meal Section ----
function MealSection({ log, dateKey, data, onDataChange }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [cal, setCal] = useState('');
  const [p, setP] = useState('');
  const [f, setF] = useState('');
  const [c, setC] = useState('');

  const presets = ['朝食', '昼食', '夕食', '間食'];

  const add = () => {
    if (!name || !cal) return;
    const entry: MealEntry = {
      id: Date.now(),
      name,
      cal: parseInt(cal) || 0,
      p: parseFloat(p) || 0,
      f: parseFloat(f) || 0,
      c: parseFloat(c) || 0,
    };
    const updated = setDayLog(data, dateKey, { ...log, meals: [...log.meals, entry] });
    onDataChange(updated);
    setOpen(false);
    setName(''); setCal(''); setP(''); setF(''); setC('');
  };

  const remove = (id: number) => {
    const updated = setDayLog(data, dateKey, { ...log, meals: log.meals.filter(m => m.id !== id) });
    onDataChange(updated);
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
                <span className="text-2xl">🍽️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{m.name}</div>
                  <div className="text-xs text-gray-400">P {m.p}g・F {m.f}g・C {m.c}g</div>
                </div>
                <div className="text-right flex items-center gap-2">
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
            <label className="text-sm text-gray-600 block mb-1.5">食事名</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {presets.map(p => (
                <button key={p} onClick={() => setName(p)} className={`px-3 py-1 rounded-full text-sm border ${name === p ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}>{p}</button>
              ))}
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]"
              placeholder="または直接入力"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">カロリー (kcal)</label>
            <input type="number" value={cal} onChange={e => setCal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 650" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'タンパク質 P (g)', val: p, set: setP },
              { label: '脂質 F (g)', val: f, set: setF },
              { label: '炭水化物 C (g)', val: c, set: setC },
            ].map(({ label, val, set }) => (
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

// ---- Exercise Section ----
function ExerciseSection({ log, dateKey, data, onDataChange }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'gym' | 'other'>('gym');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [burnCal, setBurnCal] = useState('');
  const [memo, setMemo] = useState('');

  const add = () => {
    if (!name) return;
    const entry: ExerciseEntry = {
      id: Date.now(),
      type,
      name,
      duration: parseInt(duration) || 0,
      burnCal: parseInt(burnCal) || 0,
      memo,
    };
    const updated = setDayLog(data, dateKey, { ...log, exercises: [...log.exercises, entry] });
    onDataChange(updated);
    setOpen(false);
    setName(''); setDuration(''); setBurnCal(''); setMemo('');
  };

  const remove = (id: number) => {
    const updated = setDayLog(data, dateKey, { ...log, exercises: log.exercises.filter(e => e.id !== id) });
    onDataChange(updated);
  };

  return (
    <>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">運動記録</span>
          <button className="btn-primary text-xs py-1 px-3" onClick={() => setOpen(true)}>＋ 追加</button>
        </div>
        {log.exercises.length === 0 ? (
          <div className="card text-center text-sm text-gray-400 py-4">記録なし</div>
        ) : (
          <div className="space-y-2">
            {log.exercises.map(ex => (
              <div key={ex.id} className="card flex items-center gap-3">
                <span className="text-2xl">{ex.type === 'gym' ? '🏋️' : '🚶'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{ex.name}</div>
                  <div className="text-xs text-gray-400">{ex.duration}分{ex.memo ? `・${ex.memo}` : ''}</div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className="num text-sm font-semibold text-[#12b76a]">-{ex.burnCal} kcal</span>
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
          <div>
            <label className="text-sm text-gray-600 block mb-1.5">種別</label>
            <div className="flex gap-2">
              {(['gym', 'other'] as const).map(t => (
                <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 rounded-xl border text-sm font-medium ${type === t ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}>
                  {t === 'gym' ? '🏋️ ジム' : '🚶 その他'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">種目・内容名</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 胸・肩トレ" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-600 block mb-1">時間 (分)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="60" />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">消費カロリー (kcal)</label>
              <input type="number" value={burnCal} onChange={e => setBurnCal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="300" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">メモ (任意)</label>
            <input type="text" value={memo} onChange={e => setMemo(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: ベンチ5セット" />
          </div>
          <button onClick={add} className="btn-primary w-full py-3">追加</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ---- Health Section ----
function HealthSection({ log, dateKey, data, onDataChange }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void }) {
  const [sleepOpen, setSleepOpen] = useState(false);
  const [bowelOpen, setBowelOpen] = useState(false);
  const [sleepVal, setSleepVal] = useState(log.sleep ?? '');
  const [bowelVal, setBowelVal] = useState(log.bowel ?? '');

  const sleepPresets = ['5h', '5.5h', '6h', '6.5h', '7h', '7.5h', '8h', '8.5h', '9h'];
  const bowelPresets = ['あり', 'なし', '2回以上'];

  const saveSleep = () => {
    onDataChange(setDayLog(data, dateKey, { ...log, sleep: sleepVal }));
    setSleepOpen(false);
  };
  const saveBowel = () => {
    onDataChange(setDayLog(data, dateKey, { ...log, bowel: bowelVal }));
    setBowelOpen(false);
  };

  return (
    <>
      <div className="mb-3">
        <div className="text-sm font-semibold text-gray-700 mb-2">体調記録</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => { setSleepVal(log.sleep ?? ''); setSleepOpen(true); }} className="card text-left active:bg-gray-50">
            <div className="text-base mb-1">😴 睡眠</div>
            <div className="text-sm text-gray-500">{log.sleep ?? 'タップして記録'}</div>
          </button>
          <button onClick={() => { setBowelVal(log.bowel ?? ''); setBowelOpen(true); }} className="card text-left active:bg-gray-50">
            <div className="text-base mb-1">🚽 排便</div>
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
          <div>
            <label className="text-sm text-gray-600 block mb-1">または直接入力</label>
            <input type="text" value={sleepVal} onChange={e => setSleepVal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 6.5h" />
          </div>
          <button onClick={saveSleep} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>

      <BottomSheet open={bowelOpen} onClose={() => setBowelOpen(false)} title="排便を記録">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {bowelPresets.map(b => (
              <button key={b} onClick={() => setBowelVal(b)} className={`py-2 rounded-xl border text-sm font-medium ${bowelVal === b ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}>{b}</button>
            ))}
          </div>
          <button onClick={saveBowel} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ---- Memo Section ----
function MemoSection({ log, dateKey, data, onDataChange }: { log: DayLog; dateKey: string; data: AppData; onDataChange: (d: AppData) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(log.memo);

  const save = () => {
    onDataChange(setDayLog(data, dateKey, { ...log, memo: text }));
    setOpen(false);
  };

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
          {log.memo ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.memo}</p>
          ) : (
            <p className="text-sm text-gray-400">メモなし</p>
          )}
        </div>
      </div>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="メモを編集">
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]"
            rows={6}
            placeholder="体調・気づきなど..."
          />
          <button onClick={save} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </>
  );
}

// ---- Main Today Tab ----
export default function TodayTab({ dateKey, data, onDataChange }: Props) {
  const log = getDayLog(data, dateKey);

  return (
    <div>
      {log.eatingOut ? (
        <div className="card mb-3 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍜</span>
            <div>
              <div className="text-sm font-semibold text-amber-800">外食モード</div>
              <div className="text-xs text-amber-600">本日のカロリー・PFC集計は非表示です</div>
            </div>
          </div>
        </div>
      ) : (
        <CalSummaryCard log={log} settings={data.settings} />
      )}
      <BodyCard log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} />
      <WeekMenuCard dateKey={dateKey} data={data} onDataChange={onDataChange} />
      <MealSection log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} />
      <ExerciseSection log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} />
      <HealthSection log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} />
      <MemoSection log={log} dateKey={dateKey} data={data} onDataChange={onDataChange} />
    </div>
  );
}
