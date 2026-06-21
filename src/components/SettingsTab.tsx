import { useState, useMemo } from 'react';
import { Download, Check } from 'lucide-react';
import { AppData, Settings, ExerciseEntry } from '../types';
import { calcBMR, calcBMI, getDayLog, renameExercise } from '../store';
import BottomSheet from './BottomSheet';

type Props = {
  data: AppData;
  onDataChange: (d: AppData) => void;
};

// ─── Export helpers ───────────────────────────────────────────────────────────

function fmtDate(dk: string): string {
  return dk.replace(/-/g, '/');
}

function prevDk(dk: string): string {
  const d = new Date(dk + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDateRange(startDk: string, endDk: string): string[] {
  const result: string[] = [];
  const cur = new Date(startDk + 'T00:00:00');
  const end = new Date(endDk + 'T00:00:00');
  while (cur <= end) {
    result.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`);
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function fmtExercise(e: ExerciseEntry, inclMemo = false): string {
  const name = e.part ? `${e.name}（${e.part}）` : e.name;
  let base = '';
  if (e.subType === 'strength') {
    if (e.setsDetail && e.setsDetail.length > 0) {
      const sets = e.setsDetail
        .map(s => `${s.weight != null ? s.weight + 'kg' : ''}${s.reps != null ? '×' + s.reps : ''}`)
        .filter(Boolean)
        .join(', ');
      base = sets ? `${name}　${sets}` : name;
    } else {
      const detail = [
        e.weight != null ? `${e.weight}kg` : null,
        e.reps != null ? `×${e.reps}` : null,
        e.sets != null ? `×${e.sets}セット` : null,
      ].filter(Boolean).join('');
      base = detail ? `${name}　${detail}` : name;
    }
  } else {
    const extras = [e.duration != null ? `${e.duration}分` : null, e.memo || null].filter(Boolean).join('　');
    base = extras ? `${name}　${extras}` : name;
  }
  if (inclMemo && e.userMemo) base += `（${e.userMemo}）`;
  return base;
}


function buildExportText(
  data: AppData,
  dks: string[],
  opts: { exercise: boolean; meals: boolean; body: boolean; health: boolean; exerciseMemo: boolean; trainingMemo: boolean; dailyMemo: boolean }
): string {
  const blocks = dks.map(dk => {
    const log = getDayLog(data, dk);
    const prev = getDayLog(data, prevDk(dk));
    const sections: string[] = [];

    if (opts.exercise) {
      if (log.exercises.length > 0) {
        sections.push(`【運動】 ${log.exercises.map(e => fmtExercise(e, opts.exerciseMemo)).join(' ')}`);
      } else {
        sections.push('【運動】 （記録なし）');
      }
    }

    if (opts.trainingMemo && log.trainingMemo) {
      sections.push(`【トレーニングメモ】 ${log.trainingMemo}`);
    }

    if (opts.meals) {
      if (log.eatingOut) {
        sections.push('【食事合計】 外食日のため記録なし');
      } else if (log.meals.length > 0) {
        const tCal = log.meals.reduce((s, m) => s + m.cal, 0);
        const tP   = log.meals.reduce((s, m) => s + m.p,   0);
        const tF   = log.meals.reduce((s, m) => s + m.f,   0);
        const tC   = log.meals.reduce((s, m) => s + m.c,   0);
        sections.push(`【食事合計】 ${tCal}kcal　P${tP.toFixed(1)}g F${tF.toFixed(1)}g C${tC.toFixed(1)}g`);
      } else {
        sections.push('【食事合計】 （記録なし）');
      }
    }

    if (opts.body) {
      if (log.body) {
        const diff = prev.body
          ? Math.round((log.body.weight - prev.body.weight) * 10) / 10
          : null;
        const diffStr = diff != null
          ? `（前日比 ${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.abs(diff)}kg）`
          : '';
        const bfStr = log.body.bodyfat != null ? `　体脂肪率 ${log.body.bodyfat}%` : '';
        sections.push(`【体重・体脂肪】 体重 ${log.body.weight}kg${diffStr}${bfStr}`);
      } else {
        sections.push('【体重・体脂肪】 （記録なし）');
      }
    }

    if (opts.health) {
      const parts: string[] = [];
      if (log.sleep) parts.push(`睡眠 ${log.sleep}`);
      if (log.bowel && log.bowel !== 'なし') parts.push(`排便 ${log.bowel}`);
      if (opts.dailyMemo && log.memo) parts.push(`メモ：${log.memo}`);
      sections.push(`【体調】 ${parts.length > 0 ? parts.join('　') : '（記録なし）'}`);
    } else if (opts.dailyMemo && log.memo) {
      sections.push(`【体調メモ】 ${log.memo}`);
    }

    if (sections.length === 0) return null;
    return `${fmtDate(dk)} ${sections[0]}${sections.length > 1 ? '\n' + sections.slice(1).join('\n') : ''}`;
  });

  return blocks.filter((b): b is string => b !== null).join('\n\n');
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SettingsTab({ data, onDataChange }: Props) {
  const s = data.settings;

  // Profile / Goal state
  const [profileOpen, setProfileOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [height, setHeight] = useState(s.height.toString());
  const [age, setAge] = useState(s.age.toString());
  const [gender, setGender] = useState<'male' | 'female'>(s.gender);
  const [startWeight, setStartWeight] = useState(s.startWeight.toString());
  const [targetCal, setTargetCal] = useState(s.targetCal.toString());
  const [targetP, setTargetP] = useState(s.targetP.toString());
  const [targetF, setTargetF] = useState(s.targetF.toString());
  const [targetC, setTargetC] = useState(s.targetC.toString());
  const [targetWeight, setTargetWeight] = useState(s.targetWeight?.toString() ?? '');
  const [targetBodyfat, setTargetBodyfat] = useState(s.targetBodyfat?.toString() ?? '');

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [inclExercise, setInclExercise] = useState(true);
  const [inclMeals, setInclMeals] = useState(false);
  const [inclBody, setInclBody] = useState(false);
  const [inclHealth, setInclHealth] = useState(false);
  const [inclExerciseMemo, setInclExerciseMemo] = useState(true);
  const [inclTrainingMemo, setInclTrainingMemo] = useState(true);
  const [inclDailyMemo, setInclDailyMemo] = useState(false);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exportText, setExportText] = useState('');
  const [copied, setCopied] = useState(false);

  // 種目名管理
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [renameConfirmOpen, setRenameConfirmOpen] = useState(false);
  const [renameCount, setRenameCount] = useState(0);

  const exerciseNames = useMemo(() => {
    const s = new Set<string>();
    Object.values(data.logs).forEach(l => l.exercises.forEach(e => s.add(e.name)));
    return [...s].sort();
  }, [data.logs]);

  const confirmRename = () => {
    if (!renameFrom || !renameTo || renameFrom === renameTo) return;
    const cnt = Object.values(data.logs).reduce((n, l) => n + l.exercises.filter(e => e.name === renameFrom).length, 0);
    setRenameCount(cnt);
    setRenameConfirmOpen(true);
  };

  const executeRename = () => {
    onDataChange(renameExercise(data, renameFrom, renameTo));
    setRenameFrom('');
    setRenameTo('');
    setRenameConfirmOpen(false);
  };

  const bmr = calcBMR(s, s.startWeight);
  const bmi = calcBMI(s.startWeight, s.height);

  const saveProfile = () => {
    const updated: Settings = {
      ...s,
      height: parseFloat(height) || s.height,
      age: parseInt(age) || s.age,
      gender,
      startWeight: parseFloat(startWeight) || s.startWeight,
    };
    onDataChange({ ...data, settings: updated });
    setProfileOpen(false);
  };

  const saveGoal = () => {
    const updated: Settings = {
      ...s,
      targetCal: parseInt(targetCal) || s.targetCal,
      targetP: parseInt(targetP) || s.targetP,
      targetF: parseInt(targetF) || s.targetF,
      targetC: parseInt(targetC) || s.targetC,
      targetWeight: targetWeight ? parseFloat(targetWeight) : null,
      targetBodyfat: targetBodyfat ? parseFloat(targetBodyfat) : null,
    };
    onDataChange({ ...data, settings: updated });
    setGoalOpen(false);
  };

  const openGoal = () => {
    setTargetCal(s.targetCal.toString());
    setTargetP(s.targetP.toString());
    setTargetF(s.targetF.toString());
    setTargetC(s.targetC.toString());
    setTargetWeight(s.targetWeight?.toString() ?? '');
    setTargetBodyfat(s.targetBodyfat?.toString() ?? '');
    setGoalOpen(true);
  };

  const generate = () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let dks: string[] = [];
    if (period === 'today') {
      dks = [todayKey];
    } else if (period === 'week') {
      const d = new Date(today);
      const dow = d.getDay();
      d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
      const mondayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dks = buildDateRange(mondayKey, todayKey);
    } else if (period === 'month') {
      const firstKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      dks = buildDateRange(firstKey, todayKey);
    } else if (period === 'custom' && customStart && customEnd) {
      dks = buildDateRange(customStart, customEnd);
    }

    setExportText(buildExportText(data, dks, {
      exercise: inclExercise,
      meals: inclMeals,
      body: inclBody,
      health: inclHealth,
      exerciseMemo: inclExerciseMemo,
      trainingMemo: inclTrainingMemo,
      dailyMemo: inclDailyMemo,
    }));
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!exportText) return;
    try {
      await navigator.clipboard.writeText(exportText);
    } catch {
      const el = document.createElement('textarea');
      el.value = exportText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canGenerate = (inclExercise || inclMeals || inclBody || inclHealth || inclTrainingMemo || inclDailyMemo) &&
    (period !== 'custom' || (!!customStart && !!customEnd && customStart <= customEnd));

  return (
    <div className="space-y-4">
      {/* Profile display */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">プロフィール</span>
          <button onClick={() => {
            setHeight(s.height.toString());
            setAge(s.age.toString());
            setGender(s.gender);
            setStartWeight(s.startWeight.toString());
            setProfileOpen(true);
          }} className="text-xs text-[#3b6ef5] font-medium">編集</button>
        </div>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          {[
            { label: '身長', val: `${s.height} cm` },
            { label: '年齢', val: `${s.age} 歳` },
            { label: '性別', val: s.gender === 'male' ? '男性' : '女性' },
            { label: '開始体重', val: `${s.startWeight} kg` },
            { label: 'BMI', val: bmi.toString() },
            { label: '基礎代謝', val: `${bmr} kcal` },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="text-xs text-gray-400 mb-0.5">{label}</div>
              <div className="num text-sm font-semibold text-gray-800">{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily goal */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">目標値</span>
          <button onClick={openGoal} className="text-xs text-[#3b6ef5] font-medium">編集</button>
        </div>
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          {[
            { label: '目標カロリー', val: `${s.targetCal} kcal` },
            { label: 'タンパク質 P', val: `${s.targetP} g` },
            { label: '脂質 F', val: `${s.targetF} g` },
            { label: '炭水化物 C', val: `${s.targetC} g` },
            { label: '目標体重', val: s.targetWeight != null ? `${s.targetWeight} kg` : '未設定' },
            { label: '目標体脂肪率', val: s.targetBodyfat != null ? `${s.targetBodyfat} %` : '未設定' },
          ].map(({ label, val }) => (
            <div key={label}>
              <div className="text-xs text-gray-400 mb-0.5">{label}</div>
              <div className="num text-sm font-semibold text-gray-800">{val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Exercise name management */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">種目名の管理</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">変更前の種目名</label>
            <select value={renameFrom} onChange={e => setRenameFrom(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]">
              <option value="">選択してください</option>
              {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">変更後の種目名</label>
            <input type="text" value={renameTo} onChange={e => setRenameTo(e.target.value)} list="rename-targets"
              placeholder="種目名を入力または選択"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" />
            <datalist id="rename-targets">
              {exerciseNames.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>
          <button onClick={confirmRename} disabled={!renameFrom || !renameTo || renameFrom === renameTo}
            className="btn-primary w-full py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
            統合する
          </button>
        </div>
      </div>

      {/* Data export card */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-0.5">データ出力</div>
            <div className="text-xs text-gray-400">記録をテキスト形式でコピー</div>
          </div>
          <button
            onClick={() => { setExportText(''); setCopied(false); setExportOpen(true); }}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Download size={13} />出力
          </button>
        </div>
      </div>

      {/* Profile edit modal */}
      <BottomSheet open={profileOpen} onClose={() => setProfileOpen(false)} title="プロフィール編集">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">身長 (cm)</label>
            <input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">年齢</label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1.5">性別</label>
            <div className="flex gap-2">
              {(['female', 'male'] as const).map(g => (
                <button key={g} onClick={() => setGender(g)} className={`flex-1 py-2 rounded-xl border text-sm font-medium ${gender === g ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600'}`}>
                  {g === 'male' ? '男性' : '女性'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">開始体重 (kg)</label>
            <input type="number" step="0.1" value={startWeight} onChange={e => setStartWeight(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" />
          </div>
          <button onClick={saveProfile} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>

      {/* Goal edit modal */}
      <BottomSheet open={goalOpen} onClose={() => setGoalOpen(false)} title="目標値を編集">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">目標カロリー (kcal)</label>
            <input type="number" value={targetCal} onChange={e => setTargetCal(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'P (g)', val: targetP, set: setTargetP },
              { label: 'F (g)', val: targetF, set: setTargetF },
              { label: 'C (g)', val: targetC, set: setTargetC },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-xs text-gray-500 block mb-1">{label}</label>
                <input type="number" value={val} onChange={e => set(e.target.value)} className="w-full border border-gray-200 rounded-xl px-2 py-2 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-gray-600 block mb-1">目標体重 (kg) — 任意</label>
              <input type="number" step="0.1" value={targetWeight} onChange={e => setTargetWeight(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 58.0" />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">目標体脂肪率 (%) — 任意</label>
              <input type="number" step="0.1" value={targetBodyfat} onChange={e => setTargetBodyfat(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm num focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" placeholder="例: 15.0" />
            </div>
          </div>
          <button onClick={saveGoal} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>

      {/* Rename confirm modal */}
      <BottomSheet open={renameConfirmOpen} onClose={() => setRenameConfirmOpen(false)} title="確認">
        <div className="space-y-4">
          <p className="text-sm text-gray-700"><span className="num font-semibold">{renameCount}</span>件のエントリが変更されます。</p>
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <span className="text-gray-500">{renameFrom}</span>
            <span className="mx-2 text-gray-400">→</span>
            <span className="font-semibold text-gray-900">{renameTo}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRenameConfirmOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium">キャンセル</button>
            <button onClick={executeRename} className="flex-1 py-3 rounded-xl bg-[#3b6ef5] text-white text-sm font-medium">変更する</button>
          </div>
        </div>
      </BottomSheet>

      {/* Export modal */}
      <BottomSheet open={exportOpen} onClose={() => setExportOpen(false)} title="データ出力">
        <div className="space-y-4">

          {/* Content checkboxes */}
          <div>
            <div className="text-sm text-gray-600 mb-2">出力内容</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '運動記録', val: inclExercise, set: setInclExercise },
                { label: '食事記録', val: inclMeals, set: setInclMeals },
                { label: '体重・体脂肪', val: inclBody, set: setInclBody },
                { label: '体調', val: inclHealth, set: setInclHealth },
                { label: '体調メモ', val: inclDailyMemo, set: setInclDailyMemo },
                { label: 'トレーニングメモ', val: inclTrainingMemo, set: setInclTrainingMemo },
                { label: '運動エントリメモ', val: inclExerciseMemo, set: setInclExerciseMemo },
              ].map(({ label, val, set }) => (
                <button
                  key={label}
                  onClick={() => set(!val)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium ${val ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600 bg-white'}`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${val ? 'border-white bg-white/20' : 'border-gray-300'}`}>
                    {val && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Period selection */}
          <div>
            <div className="text-sm text-gray-600 mb-2">期間</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { label: '今日', val: 'today' },
                { label: '今週（月〜今日）', val: 'week' },
                { label: '今月（1日〜今日）', val: 'month' },
                { label: '期間指定', val: 'custom' },
              ] as const).map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setPeriod(val)}
                  className={`py-2.5 rounded-xl border text-sm font-medium ${period === val ? 'bg-[#3b6ef5] text-white border-[#3b6ef5]' : 'border-gray-200 text-gray-600 bg-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]"
                />
                <span className="text-gray-400 text-sm flex-shrink-0">〜</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]"
                />
              </div>
            )}
          </div>

          {/* Generate */}
          <button
            onClick={generate}
            disabled={!canGenerate}
            className="btn-primary w-full py-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            テキスト生成
          </button>

          {/* Preview + Copy */}
          {exportText && (
            <>
              <textarea
                readOnly
                value={exportText}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-gray-50 focus:outline-none resize-none"
                rows={8}
              />
              <button
                onClick={handleCopy}
                className={`w-full py-3 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                  copied
                    ? 'bg-[#12b76a] text-white border-[#12b76a]'
                    : 'bg-white border-gray-200 text-gray-700 active:bg-gray-50'
                }`}
              >
                {copied ? <><Check size={16} />コピーしました</> : 'テキストをコピー'}
              </button>
            </>
          )}

        </div>
      </BottomSheet>
    </div>
  );
}
