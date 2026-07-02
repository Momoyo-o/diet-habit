import { useMemo, useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { AppData } from '../types';
import { getDayLog } from '../store';

type Props = {
  data: AppData;
  dateKey: string;
};

function dkFor(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Monthly Calendar ─────────────────────────────────────────────────────────
function CalendarCard({ data, todayKey }: { data: AppData; todayKey: string }) {
  const today = new Date(todayKey + 'T00:00:00');
  const [viewDate, setViewDate] = useState(startOfMonth(today));

  const isCurrentMonth = viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();
  const monthLabel = format(viewDate, 'yyyy年M月', { locale: ja });

  const firstDay = startOfMonth(viewDate);
  const lastDay = endOfMonth(viewDate);
  const startPad = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const getCellClass = (day: number) => {
    const key = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const log = getDayLog(data, key);
    const hasGym = log.exercises.some(e => e.type === 'gym');
    const hasRecord = log.body !== null || log.meals.length > 0 || log.exercises.length > 0 || log.sleep !== null;
    const isToday = key === todayKey;

    let base = 'aspect-square flex items-center justify-center rounded-full text-xs font-medium ';
    if (hasGym) base += 'bg-[#3b6ef5] text-white ';
    else if (hasRecord) base += 'bg-blue-100 text-[#3b6ef5] ';
    else base += 'text-gray-400 ';
    if (isToday) base += 'ring-2 ring-[#3b6ef5] ring-offset-1 ';
    return base;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(d => subMonths(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-700">{monthLabel}</span>
        <button onClick={() => !isCurrentMonth && setViewDate(d => addMonths(d, 1))} disabled={isCurrentMonth} className={`p-1.5 rounded-lg ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}>
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center mb-1">
        {['月', '火', '水', '木', '金', '土', '日'].map(d => (
          <div key={d} className="text-xs text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) =>
          day == null
            ? <div key={`e-${i}`} />
            : <div key={day} className={getCellClass(day)}>{day}</div>
        )}
      </div>
      <div className="flex gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#3b6ef5]" />
          <span className="text-xs text-gray-500">ジムあり</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200" />
          <span className="text-xs text-gray-500">記録あり</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-[#3b6ef5]" />
          <span className="text-xs text-gray-500">今日</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GraphTab({ data, dateKey }: Props) {
  const days = 14;

  const points = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const d = subDays(new Date(dateKey), days - 1 - i);
      const key = dkFor(d);
      const log = getDayLog(data, key);
      const label = format(d, 'M/d', { locale: ja });
      const totalCal = log.meals.reduce((s, m) => s + m.cal, 0);
      const burnCal = log.exercises.reduce((s, e) => s + e.burnCal, 0);
      const netCal = totalCal - burnCal;
      return {
        key, label,
        weight: log.body?.weight ?? null,
        bodyfat: log.body?.bodyfat ?? null,
        netCal: totalCal > 0 || burnCal > 0 ? netCal : null,
        isOver: !log.eatingOut && totalCal > 0 && netCal > data.settings.targetCal,
        eatingOut: log.eatingOut,
      };
    });
  }, [data, dateKey, days]);

  // ── 全期間体重データ（#33）──────────────────────────────────────────────────
  const weightChartInfo = useMemo(() => {
    const entries = Object.entries(data.logs)
      .filter(([, log]) => log.body?.weight != null)
      .map(([dk, log]) => ({ dk, weight: log.body!.weight! }))
      .sort((a, b) => a.dk.localeCompare(b.dk));

    if (entries.length === 0) return { chartData: [], mode: 'raw' as const };

    const first = new Date(entries[0].dk + 'T00:00:00');
    const last  = new Date(dateKey + 'T00:00:00');
    const spanDays = Math.round((last.getTime() - first.getTime()) / 86400000);

    if (spanDays < 30) {
      return {
        chartData: entries.map(e => {
          const d = new Date(e.dk + 'T00:00:00');
          return { label: `${d.getMonth() + 1}/${d.getDate()}`, weight: e.weight };
        }),
        mode: 'raw' as const,
      };
    }

    if (spanDays < 90) {
      // 7日移動平均（対象日 ±3 日の記録平均）
      const byDk: Record<string, number> = {};
      entries.forEach(e => { byDk[e.dk] = e.weight; });
      return {
        chartData: entries.map(e => {
          const d = new Date(e.dk + 'T00:00:00');
          const ws: number[] = [];
          for (let off = -3; off <= 3; off++) {
            const od = new Date(d); od.setDate(d.getDate() + off);
            const odk = dkFor(od);
            if (byDk[odk] != null) ws.push(byDk[odk]);
          }
          const avg = ws.length > 0 ? ws.reduce((s, w) => s + w, 0) / ws.length : e.weight;
          return { label: `${d.getMonth() + 1}/${d.getDate()}`, weight: Math.round(avg * 10) / 10 };
        }),
        mode: 'moving' as const,
      };
    }

    // 週次平均（90日以上）
    const weekMap: Record<string, number[]> = {};
    entries.forEach(e => {
      const d = new Date(e.dk + 'T00:00:00');
      const dow = d.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      d.setDate(d.getDate() + diff);
      const wk = dkFor(d);
      if (!weekMap[wk]) weekMap[wk] = [];
      weekMap[wk].push(e.weight);
    });
    return {
      chartData: Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).map(([wk, ws]) => {
        const d = new Date(wk + 'T00:00:00');
        return { label: `${d.getMonth() + 1}/${d.getDate()}`, weight: Math.round(ws.reduce((s, w) => s + w, 0) / ws.length * 10) / 10 };
      }),
      mode: 'weekly' as const,
    };
  }, [data, dateKey]);

  // ── 体重統計（#34）────────────────────────────────────────────────────────
  const weightStats = useMemo(() => {
    const sortedDks = Object.keys(data.logs).sort();
    let currentWeight: number | null = null;
    for (const dk of [...sortedDks].reverse()) {
      const w = data.logs[dk]?.body?.weight;
      if (w != null) { currentWeight = w; break; }
    }

    const getWeekAvg = (monDk: string, sunDk: string): number | null => {
      const ws = sortedDks.filter(dk => dk >= monDk && dk <= sunDk).map(dk => data.logs[dk]?.body?.weight).filter((w): w is number => w != null);
      return ws.length > 0 ? ws.reduce((s, w) => s + w, 0) / ws.length : null;
    };

    // 1ヶ月前の週（28日前の月曜〜日曜）
    const today = new Date(dateKey + 'T00:00:00');
    const ago28 = new Date(today); ago28.setDate(today.getDate() - 28);
    const dow28 = ago28.getDay();
    ago28.setDate(ago28.getDate() + (dow28 === 0 ? -6 : 1 - dow28));
    const monAgo = dkFor(ago28);
    const sunAgo = dkFor(new Date(ago28.getTime() + 6 * 86400000));

    let baseAvg = getWeekAvg(monAgo, sunAgo);
    let baseLabel = '1ヶ月前比';

    if (baseAvg == null) {
      // 開始週（最古の体重記録がある週）
      const firstWeightDk = sortedDks.find(dk => data.logs[dk]?.body?.weight != null);
      if (firstWeightDk) {
        const fd = new Date(firstWeightDk + 'T00:00:00');
        const fdow = fd.getDay();
        fd.setDate(fd.getDate() + (fdow === 0 ? -6 : 1 - fdow));
        const monStart = dkFor(fd);
        const sunStart = dkFor(new Date(fd.getTime() + 6 * 86400000));
        baseAvg = getWeekAvg(monStart, sunStart);
        baseLabel = '開始週比';
      }
    }

    const change = currentWeight != null && baseAvg != null
      ? Math.round((currentWeight - baseAvg) * 10) / 10
      : null;

    return { currentWeight, change, baseLabel };
  }, [data, dateKey]);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const key = dkFor(subDays(new Date(dateKey), i));
      const log = getDayLog(data, key);
      if (log.body !== null || log.meals.length > 0 || log.exercises.length > 0) count++;
      else break;
    }
    return count;
  }, [data, dateKey]);

  const bodyfatChartInfo = useMemo(() => {
    const entries = Object.entries(data.logs)
      .filter(([, log]) => log.body?.bodyfat != null)
      .map(([dk, log]) => ({ dk, bodyfat: log.body!.bodyfat! }))
      .sort((a, b) => a.dk.localeCompare(b.dk));

    if (entries.length === 0) return { chartData: [], mode: 'raw' as const };

    const first = new Date(entries[0].dk + 'T00:00:00');
    const last  = new Date(dateKey + 'T00:00:00');
    const spanDays = Math.round((last.getTime() - first.getTime()) / 86400000);

    if (spanDays < 30) {
      return {
        chartData: entries.map(e => {
          const d = new Date(e.dk + 'T00:00:00');
          return { label: `${d.getMonth() + 1}/${d.getDate()}`, bodyfat: e.bodyfat };
        }),
        mode: 'raw' as const,
      };
    }

    if (spanDays < 90) {
      const byDk: Record<string, number> = {};
      entries.forEach(e => { byDk[e.dk] = e.bodyfat; });
      return {
        chartData: entries.map(e => {
          const d = new Date(e.dk + 'T00:00:00');
          const ws: number[] = [];
          for (let off = -3; off <= 3; off++) {
            const od = new Date(d); od.setDate(d.getDate() + off);
            const odk = dkFor(od);
            if (byDk[odk] != null) ws.push(byDk[odk]);
          }
          const avg = ws.length > 0 ? ws.reduce((s, w) => s + w, 0) / ws.length : e.bodyfat;
          return { label: `${d.getMonth() + 1}/${d.getDate()}`, bodyfat: Math.round(avg * 10) / 10 };
        }),
        mode: 'moving' as const,
      };
    }

    const weekMap: Record<string, number[]> = {};
    entries.forEach(e => {
      const d = new Date(e.dk + 'T00:00:00');
      const dow = d.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      d.setDate(d.getDate() + diff);
      const wk = dkFor(d);
      if (!weekMap[wk]) weekMap[wk] = [];
      weekMap[wk].push(e.bodyfat);
    });
    return {
      chartData: Object.entries(weekMap).sort(([a], [b]) => a.localeCompare(b)).map(([wk, ws]) => {
        const d = new Date(wk + 'T00:00:00');
        return { label: `${d.getMonth() + 1}/${d.getDate()}`, bodyfat: Math.round(ws.reduce((s, w) => s + w, 0) / ws.length * 10) / 10 };
      }),
      mode: 'weekly' as const,
    };
  }, [data, dateKey]);

  const calData = points.map(p => ({ label: p.label, cal: p.netCal, isOver: p.isOver, eatingOut: p.eatingOut }));

  const { targetWeight, targetBodyfat } = data.settings;

  return (
    <div className="space-y-4">
      {/* Streak */}
      <div className="card flex items-center gap-3">
        <Flame size={28} className="text-orange-500 flex-shrink-0" />
        <div className="flex items-baseline gap-1">
          <span className="num text-3xl font-bold text-gray-900">{streak}</span>
          <span className="text-sm text-gray-500">日連続記録中</span>
        </div>
      </div>

      {/* Stats */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">体重統計</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-400 mb-1">現在体重</div>
            <div className="flex items-baseline gap-0.5">
              <span className="num text-xl font-bold text-gray-900">{weightStats.currentWeight ?? '—'}</span>
              {weightStats.currentWeight && <span className="text-xs text-gray-400">kg</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">
              変化{weightStats.baseLabel ? `（${weightStats.baseLabel}）` : ''}
            </div>
            <div className={`flex items-baseline gap-0.5 ${weightStats.change != null ? (weightStats.change > 0 ? 'text-red-500' : weightStats.change < 0 ? 'text-[#12b76a]' : 'text-gray-600') : ''}`}>
              <span className="num text-xl font-bold">
                {weightStats.change != null ? (weightStats.change > 0 ? `+${weightStats.change}` : weightStats.change) : '—'}
              </span>
              {weightStats.change != null && <span className="text-xs">kg</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Weight chart */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">
          体重推移{weightChartInfo.mode === 'moving' ? '（7日移動平均）' : weightChartInfo.mode === 'weekly' ? '（週次平均）' : ''}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={weightChartInfo.chartData} margin={{ top: 5, right: 24, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b6ef5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b6ef5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} domain={[
              (v: number) => Math.floor(Math.min(v, targetWeight ?? v) - 1),
              (v: number) => Math.ceil(Math.max(v, targetWeight ?? v) + 1),
            ]} />
            <Tooltip formatter={(v: number) => [`${v} kg`, '体重']} />
            {targetWeight != null && (
              <ReferenceLine y={targetWeight} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '目標', fontSize: 10, fill: '#f59e0b', position: 'right' }} />
            )}
            <Area type="monotone" dataKey="weight" stroke="#3b6ef5" strokeWidth={2} fill="url(#wGrad)" connectNulls dot={{ r: 3, fill: '#3b6ef5' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bodyfat chart */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">
          体脂肪率推移{bodyfatChartInfo.mode === 'moving' ? '（7日移動平均）' : bodyfatChartInfo.mode === 'weekly' ? '（週次平均）' : ''}
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={bodyfatChartInfo.chartData} margin={{ top: 5, right: 24, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[
              (v: number) => Math.floor(Math.min(v, targetBodyfat ?? v) - 0.5),
              (v: number) => Math.ceil(Math.max(v, targetBodyfat ?? v) + 0.5),
            ]} />
            <Tooltip formatter={(v: number) => [`${v} %`, '体脂肪率']} />
            {targetBodyfat != null && (
              <ReferenceLine y={targetBodyfat} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '目標', fontSize: 10, fill: '#f59e0b', position: 'right' }} />
            )}
            <Area type="monotone" dataKey="bodyfat" stroke="#f59e0b" strokeWidth={2} fill="url(#bfGrad)" connectNulls dot={{ r: 3, fill: '#f59e0b' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Calorie chart */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">カロリー推移 (14日間)</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={calData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => [`${v} kcal`, '実質カロリー']} />
            <ReferenceLine y={data.settings.targetCal} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '目標', fontSize: 10, fill: '#f59e0b' }} />
            <Bar dataKey="cal" radius={[4, 4, 0, 0]}>
              {calData.map((entry, i) => (
                <Cell key={i} fill={entry.eatingOut ? '#f59e0b' : entry.isOver ? '#ef4444' : '#3b6ef5'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2 justify-center">
          {[
            { color: 'bg-[#3b6ef5]', label: '通常' },
            { color: 'bg-red-400',   label: '目標超過' },
            { color: 'bg-amber-400', label: '🍽 外食' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-sm ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 推定1RM グラフ */}
      {(() => {
        // collect exercise names
        const namesSet = new Set<string>();
        Object.values(data.logs).forEach(log =>
          log.exercises.filter(e => e.subType === 'strength').forEach(e => namesSet.add(e.name))
        );
        const exerciseNames = [...namesSet].sort();
        return <OneRMCard data={data} exerciseNames={exerciseNames} />;
      })()}

      {/* Monthly Calendar */}
      <CalendarCard data={data} todayKey={dateKey} />
    </div>
  );
}

// ─── 1RM card ─────────────────────────────────────────────────────────────────
function calc1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  const d = 1.0278 - 0.0278 * reps;
  return d > 0 ? weight / d : weight;
}

function OneRMCard({ data, exerciseNames }: { data: AppData; exerciseNames: string[] }) {
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (!selected && exerciseNames.length > 0) setSelected(exerciseNames[0]);
  }, [exerciseNames, selected]);

  const { rmData, prInfo } = useMemo(() => {
    if (!selected) return { rmData: [], prInfo: null as null | { label: string; rm: number; setsStr: string } };
    const points: { label: string; rm: number | null; isPR: boolean }[] = [];
    let maxRM = 0;
    let prInfo: { label: string; rm: number; setsStr: string } | null = null;
    for (const dk of Object.keys(data.logs).sort()) {
      const log = data.logs[dk];
      const exes = log.exercises.filter(e => e.subType === 'strength' && e.name === selected);
      if (exes.length === 0) continue;
      let dayMax = 0;
      let daySetsStr = '';
      exes.forEach(e => {
        if (e.setsDetail && e.setsDetail.length > 0) {
          e.setsDetail.forEach(s => {
            if (s.weight != null && s.reps != null && s.reps > 0) {
              const rm = calc1RM(s.weight, s.reps);
              if (rm > dayMax) {
                dayMax = rm;
                daySetsStr = e.setsDetail!.filter(x => x.weight != null && x.reps != null).map(x => `${x.weight}kg×${x.reps}`).join(', ');
              }
            }
          });
        } else if (e.weight != null && e.reps != null && e.reps > 0) {
          const rm = calc1RM(e.weight, e.reps);
          if (rm > dayMax) { dayMax = rm; daySetsStr = `${e.weight}kg×${e.reps}`; }
        }
      });
      if (dayMax <= 0) continue;
      const rounded = Math.round(dayMax * 10) / 10;
      const isPR = rounded > maxRM;
      if (isPR) { maxRM = rounded; const d = new Date(dk + 'T00:00:00'); prInfo = { label: `${d.getMonth() + 1}/${d.getDate()}`, rm: rounded, setsStr: daySetsStr }; }
      const d = new Date(dk + 'T00:00:00');
      points.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, rm: rounded, isPR });
    }
    return { rmData: points, prInfo };
  }, [data, selected]);

  const CustomDot = (props: { cx?: number; cy?: number; payload?: { isPR: boolean } }) => {
    const { cx = 0, cy = 0, payload } = props;
    if (payload?.isPR) {
      return <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="#f59e0b">★</text>;
    }
    return <circle cx={cx} cy={cy} r={3} fill="#3b6ef5" stroke="white" strokeWidth={1} />;
  };

  if (exerciseNames.length === 0) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-gray-700">推定1RM推移</span>
      </div>
      {prInfo && (
        <div className="bg-amber-50 rounded-xl px-3 py-2 mb-3 text-xs text-amber-700">
          <span className="font-semibold">★ 最高PR: {prInfo.rm}kg（{prInfo.label}）</span>
          <span className="text-amber-600 ml-1">｜{prInfo.setsStr}</span>
        </div>
      )}
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white mb-3 focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]"
      >
        {exerciseNames.map(n => <option key={n} value={n}>{n}</option>)}
      </select>
      {rmData.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-4">記録がありません</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={rmData} margin={{ top: 16, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
            <Tooltip formatter={(v: number) => [`${v} kg`, '推定1RM']} />
            <Line type="monotone" dataKey="rm" stroke="#3b6ef5" strokeWidth={2} dot={<CustomDot />} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      )}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-amber-500 text-xs">★</span>
        <span className="text-xs text-gray-400">PR更新日</span>
      </div>
    </div>
  );
}
