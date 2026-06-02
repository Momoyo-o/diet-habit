import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
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
        isOver: totalCal > 0 && netCal > data.settings.targetCal,
      };
    });
  }, [data, dateKey, days]);

  const weightPoints = points.filter(p => p.weight !== null);
  const startWeight = weightPoints[0]?.weight ?? data.settings.startWeight;
  const currentWeight = weightPoints[weightPoints.length - 1]?.weight ?? null;
  const weightChange = currentWeight !== null ? Math.round((currentWeight - startWeight) * 10) / 10 : null;

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

  const weightData = points.map(p => ({ label: p.label, weight: p.weight }));
  const bodyfatData = points.map(p => ({ label: p.label, bodyfat: p.bodyfat }));
  const calData = points.map(p => ({ label: p.label, cal: p.netCal, isOver: p.isOver }));

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
        <div className="text-sm font-semibold text-gray-700 mb-3">体重統計 (直近14日)</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '開始体重', val: startWeight, unit: 'kg', color: '' },
            { label: '現在体重', val: currentWeight ?? '—', unit: currentWeight ? 'kg' : '', color: '' },
            { label: '変化量', val: weightChange !== null ? (weightChange > 0 ? `+${weightChange}` : weightChange) : '—', unit: weightChange !== null ? 'kg' : '', color: weightChange !== null ? (weightChange > 0 ? 'text-red-500' : 'text-[#12b76a]') : '' },
          ].map(({ label, val, unit, color }) => (
            <div key={label}>
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className={`flex items-baseline gap-0.5 ${color}`}>
                <span className="num text-xl font-bold text-gray-900">{val}</span>
                <span className="text-xs text-gray-400">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weight chart */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">体重推移 (14日間)</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={weightData} margin={{ top: 5, right: 24, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b6ef5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b6ef5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
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
        <div className="text-sm font-semibold text-gray-700 mb-3">体脂肪率推移 (14日間)</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={bodyfatData} margin={{ top: 5, right: 24, left: -20, bottom: 0 }}>
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
                <Cell key={i} fill={entry.isOver ? '#ef4444' : '#3b6ef5'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Calendar */}
      <CalendarCard data={data} todayKey={dateKey} />
    </div>
  );
}
