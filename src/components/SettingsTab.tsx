import { useState } from 'react';
import { AppData, Settings } from '../types';
import { calcBMR, calcBMI } from '../store';
import BottomSheet from './BottomSheet';

type Props = {
  data: AppData;
  onDataChange: (d: AppData) => void;
};

export default function SettingsTab({ data, onDataChange }: Props) {
  const s = data.settings;
  const [profileOpen, setProfileOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  // Profile form state
  const [height, setHeight] = useState(s.height.toString());
  const [age, setAge] = useState(s.age.toString());
  const [gender, setGender] = useState<'male' | 'female'>(s.gender);
  const [startWeight, setStartWeight] = useState(s.startWeight.toString());

  // Goal form state
  const [targetCal, setTargetCal] = useState(s.targetCal.toString());
  const [targetP, setTargetP] = useState(s.targetP.toString());
  const [targetF, setTargetF] = useState(s.targetF.toString());
  const [targetC, setTargetC] = useState(s.targetC.toString());
  const [targetWeight, setTargetWeight] = useState(s.targetWeight?.toString() ?? '');
  const [targetBodyfat, setTargetBodyfat] = useState(s.targetBodyfat?.toString() ?? '');

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
    </div>
  );
}
