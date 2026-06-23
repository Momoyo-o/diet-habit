import { useState, useMemo } from 'react';
import { Pencil, Moon, Droplets, Car, Bus, Plane } from 'lucide-react';
import { startOfWeek, addDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { AppData, DayLog } from '../types';
import { getDayLog } from '../store';
import BottomSheet from './BottomSheet';

type Props = {
  data: AppData;
  dateKey: string;
  onDataChange: (d: AppData) => void;
};

function dateKeyFor(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calcLogVolume(log: DayLog): number {
  return log.exercises
    .filter(e => e.subType === 'strength')
    .reduce((total, e) => {
      if (e.setsDetail && e.setsDetail.length > 0) {
        return total + e.setsDetail.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
      }
      return total + (e.weight ?? 0) * (e.reps ?? 0) * (e.sets ?? 0);
    }, 0);
}

const DOW = ['月', '火', '水', '木', '金', '土', '日'];

export default function ReviewTab({ data, dateKey, onDataChange }: Props) {
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalText, setGoalText] = useState('');

  const monday = startOfWeek(new Date(dateKey), { weekStartsOn: 1 });
  const mondayKey = dateKeyFor(monday);

  // 今週7日分（カロリーグラフ・睡眠排便テーブル用）
  const days = useMemo(() => {
    const mon = startOfWeek(new Date(dateKey), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(mon, i);
      const key = dateKeyFor(d);
      const log = getDayLog(data, key);
      const totalCal = log.meals.reduce((s, m) => s + m.cal, 0);
      const burnCal = log.exercises.reduce((s, e) => s + e.burnCal, 0);
      const netCal = totalCal > 0 || burnCal > 0 ? totalCal - burnCal : null;
      const hasRecord = log.body !== null || log.meals.length > 0 || log.exercises.length > 0;
      const gymCount = log.exercises.filter(e => e.type === 'gym').length;
      return { key, log, netCal, hasRecord, gymCount, dow: DOW[i] };
    });
  }, [data, dateKey]);

  // ── 全期間サマリー ────────────────────────────────────────────────────────────
  const allTimeSummary = useMemo(() => {
    const allEntries = Object.entries(data.logs);
    if (allEntries.length === 0) return null;

    const sortedKeys = allEntries.map(([k]) => k).sort();
    const startDate = sortedKeys[0];

    const totalRecords = allEntries.filter(([, log]) =>
      log.body !== null || log.meals.length > 0 || log.exercises.length > 0
    ).length;

    let startWeight: number | null = null;
    for (const key of sortedKeys) {
      const w = data.logs[key].body?.weight;
      if (w != null) { startWeight = w; break; }
    }
    let currentWeight: number | null = null;
    for (const key of [...sortedKeys].reverse()) {
      const w = data.logs[key].body?.weight;
      if (w != null) { currentWeight = w; break; }
    }
    const weightChange = startWeight != null && currentWeight != null
      ? Math.round((currentWeight - startWeight) * 10) / 10
      : null;

    const eatOutDays = allEntries.filter(([, log]) => log.eatingOut).length;

    const calList = allEntries
      .filter(([, log]) => !log.eatingOut)
      .map(([, log]) => {
        const tc = log.meals.reduce((s, m) => s + m.cal, 0);
        const bc = log.exercises.reduce((s, e) => s + e.burnCal, 0);
        return tc > 0 || bc > 0 ? tc - bc : null;
      })
      .filter((c): c is number => c !== null);
    const avgCal = calList.length > 0
      ? Math.round(calList.reduce((s, c) => s + c, 0) / calList.length)
      : null;

    const gymDays = allEntries.filter(([, log]) =>
      log.exercises.some(e => e.type === 'gym')
    ).length;

    // 食事スコア平均（外食日・食事記録なし日を除く）
    const scoreDays = allEntries.filter(([, log]) => !log.eatingOut && log.meals.length > 0);
    const avgScore = scoreDays.length > 0
      ? Math.round(scoreDays.reduce((s, [, log]) => {
          const tc = log.meals.reduce((x, m) => x + m.cal, 0);
          const tp = log.meals.reduce((x, m) => x + m.p, 0);
          const tf = log.meals.reduce((x, m) => x + m.f, 0);
          const cc = log.meals.reduce((x, m) => x + m.c, 0);
          const cp = tc / (data.settings.targetCal || 1);
          const cs = (cp >= 0.9 && cp <= 1.1) ? 25 : ((cp >= 0.8 && cp < 0.9) || (cp > 1.1 && cp <= 1.2)) ? 15 : 5;
          const pp = tp / (data.settings.targetP || 1);
          const ps = pp >= 1.0 ? 35 : pp >= 0.9 ? 25 : pp >= 0.8 ? 15 : 5;
          const fp = tf / (data.settings.targetF || 1);
          const fs = fp <= 1.0 ? 20 : fp <= 1.1 ? 15 : fp <= 1.2 ? 10 : 5;
          const ccp = cc / (data.settings.targetC || 1);
          const ccs = (ccp >= 0.9 && ccp <= 1.1) ? 20 : ((ccp >= 0.8 && ccp < 0.9) || (ccp > 1.1 && ccp <= 1.2)) ? 12 : 5;
          return s + cs + ps + fs + ccs;
        }, 0) / scoreDays.length)
      : null;

    return { startDate, totalRecords, startWeight, currentWeight, weightChange, avgCal, gymDays, eatOutDays, avgScore };
  }, [data]);

  // ── 総負荷量 ──────────────────────────────────────────────────────────────────
  const volumeData = useMemo(() => {
    const weekVol = Math.round(days.reduce((s, d) => s + calcLogVolume(d.log), 0));

    const today = new Date(dateKey);
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthVol = Math.round(
      Object.entries(data.logs)
        .filter(([dk]) => dk.startsWith(ym))
        .reduce((s, [, log]) => s + calcLogVolume(log), 0)
    );

    const totalVol = Math.round(
      Object.values(data.logs).reduce((s, log) => s + calcLogVolume(log), 0)
    );

    return { week: weekVol, month: monthVol, total: totalVol };
  }, [data, days, dateKey]);

  const calData = days.map(d => ({
    dow: d.dow,
    cal: d.netCal,
    isOver: !d.log.eatingOut && d.netCal !== null && d.netCal > data.settings.targetCal,
    eatingOut: d.log.eatingOut,
  }));

  const weekMemo = data.weekMemos[mondayKey] ?? '';
  const weekGoal = (data.weekGoals ?? {})[mondayKey] ?? '';

  const saveMemo = () => {
    onDataChange({ ...data, weekMemos: { ...data.weekMemos, [mondayKey]: memoText } });
    setMemoOpen(false);
  };

  const saveGoal = () => {
    onDataChange({ ...data, weekGoals: { ...(data.weekGoals ?? {}), [mondayKey]: goalText } });
    setGoalOpen(false);
  };

  const ratioStr = (vol: number, unit: number) => {
    const r = vol / unit;
    return r < 0.1 ? '0.0' : (Math.round(r * 10) / 10).toFixed(1);
  };

  return (
    <div className="space-y-4">

      {/* 全期間サマリー */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">全期間サマリー</span>
          {allTimeSummary && (
            <span className="text-xs text-gray-400">
              {allTimeSummary.startDate.replace(/-/g, '/')} 〜 今日
            </span>
          )}
        </div>

        {allTimeSummary ? (
          <div className="grid grid-cols-2 gap-3">
            {([
              {
                label: '総記録日数',
                val: `${allTimeSummary.totalRecords} 日`,
                color: '',
                sub: '',
                subClass: '',
              },
              {
                label: '体重変化',
                val: allTimeSummary.weightChange !== null
                  ? `${allTimeSummary.weightChange > 0 ? '+' : ''}${allTimeSummary.weightChange} kg`
                  : '—',
                color: allTimeSummary.weightChange !== null
                  ? allTimeSummary.weightChange > 0 ? 'text-red-500' : 'text-[#12b76a]'
                  : '',
                sub: allTimeSummary.startWeight != null && allTimeSummary.currentWeight != null
                  ? `${allTimeSummary.startWeight} → ${allTimeSummary.currentWeight} kg`
                  : '',
                subClass: 'text-gray-400',
              },
              {
                label: '平均摂取カロリー',
                val: allTimeSummary.avgCal !== null ? `${allTimeSummary.avgCal} kcal` : '—',
                color: '',
                sub: allTimeSummary.eatOutDays > 0 ? `外食 ${allTimeSummary.eatOutDays} 日除く` : '',
                subClass: 'text-amber-600',
              },
              {
                label: '総ジム回数',
                val: `${allTimeSummary.gymDays} 日`,
                color: '',
                sub: '',
                subClass: '',
              },
              {
                label: '総外食日数',
                val: `${allTimeSummary.eatOutDays} 日`,
                color: '',
                sub: '',
                subClass: '',
              },
              {
                label: '平均食事スコア',
                val: allTimeSummary.avgScore !== null ? `${allTimeSummary.avgScore} 点` : '—',
                color: allTimeSummary.avgScore !== null
                  ? allTimeSummary.avgScore >= 80 ? 'text-[#12b76a]'
                  : allTimeSummary.avgScore >= 60 ? 'text-amber-500' : 'text-red-500'
                  : '',
                sub: '',
                subClass: '',
              },
            ] as const).map(({ label, val, color, sub, subClass }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-1">{label}</div>
                <div className={`num text-lg font-bold text-gray-900 ${color}`}>{val}</div>
                {sub && <div className={`text-xs mt-0.5 ${subClass}`}>{sub}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-400 text-center py-4">記録がありません</div>
        )}
      </div>

      {/* 総負荷量 — 3列同時表示 */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">総負荷量</div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: '今週', vol: volumeData.week,  Icon: Car,   unit: 700 },
            { label: '今月', vol: volumeData.month, Icon: Bus,   unit: 10_000 },
            { label: '累計', vol: volumeData.total, Icon: Plane, unit: 300_000 },
          ] as const).map(({ label, vol, Icon, unit }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="flex items-baseline gap-0.5 mb-2">
                <span className="num text-base font-bold text-gray-900">{vol.toLocaleString()}</span>
                <span className="text-xs text-gray-400">kg</span>
              </div>
              <Icon size={22} className="text-[#3b6ef5] mb-1" />
              <div className="text-xs font-medium text-gray-600">×{ratioStr(vol, unit)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 部位別総負荷量（今月） */}
      {(() => {
        const today = new Date(dateKey);
        const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        const PARTS = ['胸', '背中', '脚', '肩', '腕', '腹', '全身'];
        const partVols: Record<string, number> = {};
        PARTS.forEach(p => { partVols[p] = 0; });
        Object.entries(data.logs)
          .filter(([dk]) => dk.startsWith(ym))
          .forEach(([, log]) => {
            log.exercises.filter(e => e.subType === 'strength' && e.part && partVols[e.part] !== undefined).forEach(e => {
              const v = e.setsDetail && e.setsDetail.length > 0
                ? e.setsDetail.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0)
                : (e.weight ?? 0) * (e.reps ?? 0) * (e.sets ?? 0);
              partVols[e.part] += v;
            });
          });
        const rows = PARTS.map(p => ({ part: p, vol: Math.round(partVols[p]) }));
        const maxVol = Math.max(...rows.map(r => r.vol), 1);
        const hasData = rows.some(r => r.vol > 0);
        if (!hasData) return null;
        return (
          <div className="card">
            <div className="text-sm font-semibold text-gray-700 mb-3">部位別総負荷量（今月）</div>
            <div className="space-y-2">
              {rows.map(({ part, vol }) => (
                <div key={part} className="flex items-center gap-2">
                  <div className="w-8 text-xs text-gray-500 text-right flex-shrink-0">{part}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-[#3b6ef5] rounded-full" style={{ width: `${(vol / maxVol) * 100}%` }} />
                  </div>
                  <div className="w-20 text-xs text-right num text-gray-600 flex-shrink-0">{vol.toLocaleString()} kg</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* カロリー推移（今週） */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">カロリー推移（今週）</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={calData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="dow" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [`${v} kcal`, 'カロリー']} />
            <ReferenceLine y={data.settings.targetCal} stroke="#f59e0b" strokeDasharray="4 4" />
            <Bar dataKey="cal" radius={[4, 4, 0, 0]}>
              {calData.map((entry, i) => (
                <Cell key={i} fill={entry.eatingOut ? '#f59e0b' : entry.isOver ? '#ef4444' : '#3b6ef5'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 睡眠・排便（今週） */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">睡眠・排便（今週）</div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm text-center">
            <thead>
              <tr>
                <th className="text-xs text-gray-400 font-normal pb-2 w-12"></th>
                {days.map(d => <th key={d.dow} className="text-xs text-gray-500 font-semibold pb-2">{d.dow}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="pr-2"><Moon size={13} className="text-indigo-400" /></td>
                {days.map(d => (
                  <td key={d.dow} className="py-1">
                    <span className={`text-xs ${d.log.sleep ? 'text-gray-700' : 'text-gray-300'}`}>{d.log.sleep ?? '—'}</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="pr-2"><Droplets size={13} className="text-blue-400" /></td>
                {days.map(d => (
                  <td key={d.dow} className="py-1">
                    <span className={`text-xs ${d.log.bowel ? 'text-gray-700' : 'text-gray-300'}`}>{d.log.bowel ?? '—'}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 今週の目標 */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">今週の目標</span>
          <button onClick={() => { setGoalText(weekGoal); setGoalOpen(true); }} className="bg-white border border-gray-200 text-gray-600 rounded-xl px-3 py-1 text-sm font-medium flex items-center gap-1 active:bg-gray-50">
            <Pencil size={12} /> 編集
          </button>
        </div>
        {weekGoal
          ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{weekGoal}</p>
          : <p className="text-sm text-gray-400">目標なし</p>}
      </div>

      <BottomSheet open={goalOpen} onClose={() => setGoalOpen(false)} title="今週の目標を編集">
        <div className="space-y-4">
          <textarea value={goalText} onChange={e => setGoalText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]"
            rows={5} placeholder="今週の目標を入力..." />
          <button onClick={saveGoal} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>

      {/* 週のメモ */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">週のメモ</span>
          <button onClick={() => { setMemoText(weekMemo); setMemoOpen(true); }} className="bg-white border border-gray-200 text-gray-600 rounded-xl px-3 py-1 text-sm font-medium flex items-center gap-1 active:bg-gray-50">
            <Pencil size={12} /> 編集
          </button>
        </div>
        {weekMemo
          ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{weekMemo}</p>
          : <p className="text-sm text-gray-400">メモなし</p>}
      </div>

      <BottomSheet open={memoOpen} onClose={() => setMemoOpen(false)} title="週のメモを編集">
        <div className="space-y-4">
          <textarea
            value={memoText}
            onChange={e => setMemoText(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]"
            rows={6}
            placeholder="今週の振り返りなど..."
          />
          <button onClick={saveMemo} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </div>
  );
}
