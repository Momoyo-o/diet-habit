import { useState, useCallback } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Utensils, BarChart2, CalendarDays, Settings as SettingsIcon, ClipboardList, Leaf } from 'lucide-react';
import { AppData } from './types';
import { loadData, saveData, getDayLog, setDayLog } from './store';
import TodayTab from './components/TodayTab';
import GraphTab from './components/GraphTab';
import ReviewTab from './components/ReviewTab';
import SettingsTab from './components/SettingsTab';

type Tab = 'today' | 'graph' | 'review' | 'settings';

function dateKeyFor(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<AppData>(() => loadData());

  const dateKey = dateKeyFor(currentDate);
  const todayKey = dateKeyFor(new Date());
  const isCurrentToday = dateKey === todayKey;

  const handleDataChange = useCallback((newData: AppData) => {
    setData(newData);
    saveData(newData);
  }, []);

  const goBack = () => setCurrentDate(d => subDays(d, 1));
  const goForward = () => {
    if (!isCurrentToday) setCurrentDate(d => addDays(d, 1));
  };

  const dateLabel = isCurrentToday ? '今日' : format(currentDate, 'M月d日(E)', { locale: ja });

  const log = getDayLog(data, dateKey);

  const toggleEatingOut = () => {
    handleDataChange(setDayLog(data, dateKey, { ...log, eatingOut: !log.eatingOut }));
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: '今日', icon: <ClipboardList size={20} /> },
    { id: 'graph', label: 'グラフ', icon: <BarChart2 size={20} /> },
    { id: 'review', label: '振り返り', icon: <CalendarDays size={20} /> },
    { id: 'settings', label: '設定', icon: <SettingsIcon size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div className="w-full max-w-[420px] bg-gray-100 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white shadow-sm sticky top-0 z-40">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Leaf size={20} className="text-[#3b6ef5]" />
                <h1 className="text-lg font-bold text-gray-900">Diet Log</h1>
              </div>
              <button
                onClick={toggleEatingOut}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                  log.eatingOut
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-600'
                }`}
              >
                <Utensils size={14} />
                外食
              </button>
            </div>
            {/* Date navigator */}
            <div className="flex items-center gap-2">
              <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100">
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <div className="flex-1 bg-blue-50 rounded-xl py-1.5 text-center text-sm font-semibold text-[#3b6ef5]">
                {dateLabel}
              </div>
              <button
                onClick={goForward}
                disabled={isCurrentToday}
                className={`p-1.5 rounded-lg ${isCurrentToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100'}`}
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
          {/* Tab bar (top) */}
          <div className="flex border-t border-gray-100">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  tab === t.id ? 'text-[#3b6ef5] border-b-2 border-[#3b6ef5]' : 'text-gray-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 px-3 py-3 pb-24 overflow-y-auto">
          {tab === 'today' && (
            <TodayTab dateKey={dateKey} data={data} onDataChange={handleDataChange} />
          )}
          {tab === 'graph' && (
            <GraphTab data={data} dateKey={dateKey} />
          )}
          {tab === 'review' && (
            <ReviewTab data={data} dateKey={dateKey} onDataChange={handleDataChange} />
          )}
          {tab === 'settings' && (
            <SettingsTab data={data} onDataChange={handleDataChange} />
          )}
        </main>

        {/* Bottom nav */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t border-gray-200 flex z-40">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                tab === t.id ? 'text-[#3b6ef5]' : 'text-gray-400'
              }`}
            >
              {t.icon}
              <span className="text-[10px] font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
