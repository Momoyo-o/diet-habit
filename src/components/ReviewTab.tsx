import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Moon, Droplets, Car, Bus, Plane } from 'lucide-react';
import { format, startOfWeek, addWeeks, addDays } from 'date-fns';
import { ja } from 'date-fns/locale';
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

// Total training volume (kg) for a single day
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

const VEHICLES = [
  { label: '飛行機', unitKg: 300_000, Icon: Plane },
  { label: 'バス',   unitKg:  10_000, Icon: Bus },
  { label: '軽自動車', unitKg:    700, Icon: Car },
] as const;

function getBestVehicle(kg: number) {
  for (const v of VEHICLES) {
    const ratio = kg / v.unitKg;
    if (ratio >= 1) return { ...v, ratio: Math.round(ratio * 10) / 10 };
  }
  return null;
}

const DOW = ['月', '火', '水', '木', '金', '土', '日'];

export default function ReviewTab({ data, dateKey, onDataChange }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [volumeTab, setVolumeTab] = useState<'week' | 'month' | 'total'>('week');

  const baseDate = new Date(dateKey);
  const monday = addWeeks(startOfWeek(baseDate, { weekStartsOn: 1 }), weekOffset);
  const mondayKey = dateKeyFor(monday);

  const weekLabel = useMemo(() => {
    const sun = addDays(monday, 6);
    return `${format(monday, 'M/d', { locale: ja })} 〜 ${format(sun, 'M/d', { locale: ja })}`;
  }, [monday]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      const key = dateKeyFor(d);
      const log = getDayLog(data, key);
      const totalCal = log.meals.reduce((s, m) => s + m.cal, 0);
      const burnCal = log.exercises.reduce((s, e) => s + e.burnCal, 0);
      const netCal = totalCal > 0 || burnCal > 0 ? totalCal - burnCal : null;
      const hasRecord = log.body !== null || log.meals.length > 0 || log.exercises.length > 0;
      const gymCount = log.exercises.filter(e => e.type === 'gym').length;
      return { key, log, netCal, hasRecord, gymCount, dow: DOW[i] };
    });
  }, [data, monday]);

  const summary = useMemo(() => {
    const weights = days.map(d => d.log.body?.weight).filter((w): w is number => w !== undefined && w !== null);
    const weightChange = weights.length >= 2 ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10 : null;
    const eatOut = days.filter(d => d.log.eatingOut).length;
    const cals = days.filter(d => !d.log.eatingOut).map(d => d.netCal).filter((c): c is number => c !== null);
    const avgCal = cals.length > 0 ? Math.round(cals.reduce((s, c) => s + c, 0) / cals.length) : null;
    const gymDays = days.reduce((s, d) => s + (d.gymCount > 0 ? 1 : 0), 0);
    const recordDays = days.filter(d => d.hasRecord).length;
    return { weightChange, avgCal, gymDays, eatOut, recordDays };
  }, [days]);

  const volumeData = useMemo(() => {
    const weekVol = Math.round(days.reduce((s, d) => s + calcLogVolume(d.log), 0));

    const year = monday.getFullYear();
    const month = monday.getMonth();
    const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthVol = Math.round(
      Object.entries(data.logs)
        .filter(([dk]) => dk.startsWith(ym))
        .reduce((s, [, log]) => s + calcLogVolume(log), 0)
    );

    const totalVol = Math.round(
      Object.values(data.logs).reduce((s, log) => s + calcLogVolume(log), 0)
    );

    return { week: weekVol, month: monthVol, total: totalVol };
  }, [data, days, monday]);

  const calData = days.map(d => ({ dow: d.dow, cal: d.netCal, isOver: !d.log.eatingOut && d.netCal !== null && d.netCal > data.settings.targetCal, eatingOut: d.log.eatingOut }));
  const weekMemo = data.weekMemos[mondayKey] ?? '';

  const saveMemo = () => {
    onDataChange({ ...data, weekMemos: { ...data.weekMemos, [mondayKey]: memoText } });
    setMemoOpen(false);
  };

  const canGoNext = weekOffset < 0;

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 bg-white rounded-xl border border-gray-200 active:bg-gray-50">
          <ChevronLeft size={18} className="text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-700">{weekLabel}</span>
        <button
          onClick={() => canGoNext && setWeekOffset(o => o + 1)}
          disabled={!canGoNext}
          className={`p-2 rounded-xl border ${canGoNext ? 'bg-white border-gray-200 active:bg-gray-50' : 'bg-gray-50 border-gray-100 opacity-40'}`}
        >
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Summary */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">週次サマリー</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '体重変化', val: summary.weightChange !== null ? `${summary.weightChange > 0 ? '+' : ''}${summary.weightChange} kg` : '—', color: summary.weightChange !== null ? (summary.weightChange > 0 ? 'text-red-500' : 'text-[#12b76a]') : '', sub: '' },
            { label: '平均摂取カロリー', val: summary.avgCal !== null ? `${summary.avgCal} kcal` : '—', color: '', sub: summary.eatOut > 0 ? `外食 ${summary.eatOut} 日除く` : '' },
            { label: 'ジム回数', val: `${summary.gymDays} 日`, color: '', sub: '' },
            { label: '外食日数', val: `${summary.eatOut} 日`, color: '', sub: '' },
            { label: '記録日数', val: `${summary.recordDays} / 7 日`, color: '', sub: '' },
          ].map(({ label, val, color, sub }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className={`num text-lg font-bold text-gray-900 ${color}`}>{val}</div>
              {sub && <div className="text-xs text-amber-600 mt-0.5">{sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Total volume */}
      {(() => {
        const currentVol = volumeTab === 'week' ? volumeData.week : volumeTab === 'month' ? volumeData.month : volumeData.total;
        const vehicle = getBestVehicle(currentVol);
        return (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">総負荷量</span>
              <div className="flex gap-1">
                {(['week', 'month', 'total'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setVolumeTab(tab)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium ${volumeTab === tab ? 'bg-[#3b6ef5] text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {tab === 'week' ? '今週' : tab === 'month' ? '今月' : '累計'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end gap-1.5 mb-3">
              <span className="num text-4xl font-bold text-gray-900">{currentVol.toLocaleString()}</span>
              <span className="text-sm text-gray-400 mb-1">kg</span>
            </div>

            {vehicle ? (
              <div className="flex items-center gap-3 bg-indigo-50 rounded-xl p-3">
                <vehicle.Icon size={28} className="text-[#3b6ef5]" />
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-gray-500">×</span>
                    <span className="num text-2xl font-bold text-gray-900">{vehicle.ratio}</span>
                  </div>
                  <div className="text-xs text-gray-400">{vehicle.label}換算</div>
                </div>
              </div>
            ) : currentVol > 0 ? (
              <div className="text-xs text-gray-400">軽自動車1台（700 kg）未満</div>
            ) : (
              <div className="text-xs text-gray-400">筋トレ記録がありません</div>
            )}
          </div>
        );
      })()}

      {/* Calorie bar chart */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">カロリー推移</div>
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

      {/* Sleep & Bowel */}
      <div className="card">
        <div className="text-sm font-semibold text-gray-700 mb-3">睡眠・排便</div>
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

      {/* Week memo */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">週のメモ</span>
          <button onClick={() => { setMemoText(weekMemo); setMemoOpen(true); }} className="bg-white border border-gray-200 text-gray-600 rounded-xl px-3 py-1 text-sm font-medium flex items-center gap-1 active:bg-gray-50">
            <Pencil size={12} /> 編集
          </button>
        </div>
        {weekMemo ? <p className="text-sm text-gray-700 whitespace-pre-wrap">{weekMemo}</p> : <p className="text-sm text-gray-400">メモなし</p>}
      </div>

      <BottomSheet open={memoOpen} onClose={() => setMemoOpen(false)} title="週のメモを編集">
        <div className="space-y-4">
          <textarea value={memoText} onChange={e => setMemoText(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3b6ef5]" rows={6} placeholder="今週の振り返りなど..." />
          <button onClick={saveMemo} className="btn-primary w-full py-3">保存</button>
        </div>
      </BottomSheet>
    </div>
  );
}
