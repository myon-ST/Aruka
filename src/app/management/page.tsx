'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday, isSameDay, getMonth, getDate } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, BarChart3, Calendar as CalendarIcon, Clock, X } from 'lucide-react';

// タスク/スケジュールの型定義
interface ScheduleItem {
  id: string;
  type: 'task' | 'schedule' | 'lecture';
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  project?: string;
  color: string;
  width?: string; // 重複処理用
  left?: string; // 重複処理用
}

// カレンダー予定の型定義
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  color: string;
}

export default function Management() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date()));
  const [weekViewMode, setWeekViewMode] = useState<'sunday' | 'today'>('sunday');
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [calendarEvents] = useState<CalendarEvent[]>([]); // カレンダーから取得する予定
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // フォーム状態
  const [formData, setFormData] = useState({
    type: 'task' as 'task' | 'schedule' | 'lecture',
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    project: '',
    color: 'bg-blue-500',
    lecturePeriod: 1, // 講義の時限
  });

  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customHex, setCustomHex] = useState('#3B82F6');
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkAddData, setBulkAddData] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    repeatType: 'daily' as 'daily' | 'weekly' | 'specific',
    selectedDays: [] as number[], // 0=日曜日, 1=月曜日, ...
  });

  // 講義の時限設定
  const lecturePeriods = {
    1: { label: '1限', startTime: '08:50', endTime: '09:55' },
    2: { label: '2限', startTime: '10:05', endTime: '11:10' },
    3: { label: '3限', startTime: '11:20', endTime: '12:25' },
    4: { label: '4限', startTime: '13:10', endTime: '14:15' },
    5: { label: '5限', startTime: '14:35', endTime: '15:40' },
  };

  // 祝日判定関数
  const isHoliday = (date: Date) => {
    const month = getMonth(date) + 1;
    const day = getDate(date);
    const year = date.getFullYear();

    const fixedHolidays = [
      { month: 1, day: 1 }, // 元日
      { month: 2, day: 11 }, // 建国記念の日
      { month: 2, day: 23 }, // 天皇誕生日
      { month: 4, day: 29 }, // 昭和の日
      { month: 5, day: 3 }, // 憲法記念日
      { month: 5, day: 4 }, // みどりの日
      { month: 5, day: 5 }, // こどもの日
      { month: 8, day: 11 }, // 山の日
      { month: 11, day: 3 }, // 文化の日
      { month: 11, day: 23 }, // 勤労感謝の日
    ];

    return fixedHolidays.some(holiday => holiday.month === month && holiday.day === day);
  };

  // 色のオプション
  const colorOptions = [
    { value: 'bg-red-500', label: '赤', hex: '#EF4444' },
    { value: 'bg-red-400', label: '薄赤', hex: '#F87171' },
    { value: 'bg-orange-500', label: 'オレンジ', hex: '#F97316' },
    { value: 'bg-amber-500', label: 'アンバー', hex: '#F59E0B' },
    { value: 'bg-yellow-500', label: '黄', hex: '#EAB308' },
    { value: 'bg-lime-500', label: 'ライム', hex: '#84CC16' },
    { value: 'bg-green-500', label: '緑', hex: '#22C55E' },
    { value: 'bg-emerald-500', label: 'エメラルド', hex: '#10B981' },
    { value: 'bg-teal-500', label: 'ティール', hex: '#14B8A6' },
    { value: 'bg-cyan-500', label: 'シアン', hex: '#06B6D4' },
    { value: 'bg-sky-500', label: 'スカイ', hex: '#0EA5E9' },
    { value: 'bg-blue-500', label: '青', hex: '#3B82F6' },
    { value: 'bg-indigo-500', label: 'インディゴ', hex: '#6366F1' },
    { value: 'bg-violet-500', label: 'バイオレット', hex: '#8B5CF6' },
    { value: 'bg-purple-500', label: '紫', hex: '#A855F7' },
    { value: 'bg-fuchsia-500', label: 'フクシア', hex: '#D946EF' },
    { value: 'bg-pink-500', label: 'ピンク', hex: '#EC4899' },
    { value: 'bg-rose-500', label: 'ローズ', hex: '#F43F5E' },
    { value: 'bg-gray-500', label: 'グレー', hex: '#6B7280' },
    { value: 'bg-slate-500', label: 'スレート', hex: '#64748B' },
  ];

  // HEXからTailwind CSS風のクラス名を生成
  const hexToTailwindClass = (hex: string) => {
    return `custom-color-${hex.replace('#', '')}`;
  };

  // カスタム色のスタイルを適用
  const getCustomColorStyle = (color: string) => {
    if (color.startsWith('custom-color-')) {
      const hex = '#' + color.replace('custom-color-', '');
      return { backgroundColor: hex };
    }
    return {};
  };

  // 背景色に基づいて文字色を決定
  const getTextColor = (bgColor: string) => {
    const lightColors = ['bg-yellow-500', 'bg-lime-500', 'bg-cyan-500', 'bg-amber-500'];
    
    // カスタム色の場合はHEX値から明度を判定
    if (bgColor.startsWith('custom-color-')) {
      const hex = '#' + bgColor.replace('custom-color-', '');
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? 'text-black' : 'text-white';
    }
    
    return lightColors.includes(bgColor) ? 'text-black' : 'text-white';
  };

  // データ取得
  const fetchData = async () => {
    try {
      const [tasksResponse, projectsResponse] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/projects')
      ]);
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setScheduleItems(tasksData);
      }
      
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // プロジェクトオプション（データベースから取得）
  const projectOptions = projects.map(p => p.name);

  // 週の日付を生成
  const generateWeekDays = () => {
    let startDate;
    if (weekViewMode === 'sunday') {
      startDate = currentWeekStart;
    } else {
      // 今日始まりの場合、currentWeekStartを今日の日付として使用
      startDate = currentWeekStart;
    }
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(startDate, i));
    }
    return days;
  };

  // 時間スロットを生成（0:00-24:00）
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        time: `${hour.toString().padStart(2, '0')}:00`,
        hour: hour
      });
    }
    return slots;
  };

  // 指定日の予定を取得
  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return scheduleItems.filter(item => item.date === dateStr);
  };

  // 指定日のカレンダー予定を取得
  const getCalendarEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return calendarEvents.filter(event => event.date === dateStr);
  };

  // ナビゲーション関数
  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, 1));
  };

  const goToToday = () => {
    if (weekViewMode === 'sunday') {
      setCurrentWeekStart(startOfWeek(new Date()));
    } else {
      setCurrentWeekStart(new Date()); // 今日始まりの場合は今日の日付
    }
  };

  // ビューモード変更時の処理
  const handleViewModeChange = (mode: 'sunday' | 'today') => {
    setWeekViewMode(mode);
    if (mode === 'sunday') {
      setCurrentWeekStart(startOfWeek(new Date()));
    } else {
      setCurrentWeekStart(new Date());
    }
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 講義の場合は時限から時間を設定
      let finalFormData = { ...formData };
      if (formData.type === 'lecture' && formData.lecturePeriod) {
        const period = lecturePeriods[formData.lecturePeriod as keyof typeof lecturePeriods];
        finalFormData.startTime = period.startTime;
        finalFormData.endTime = period.endTime;
      }

      // プロジェクトIDを取得
      const selectedProject = projects.find(p => p.name === formData.project);
      const projectId = selectedProject?.id || null;
      
      const taskData = {
        type: finalFormData.type,
        title: finalFormData.title,
        description: finalFormData.description,
        date: finalFormData.date,
        startTime: finalFormData.startTime,
        endTime: finalFormData.endTime,
        color: finalFormData.color,
        projectId,
        lecturePeriod: finalFormData.lecturePeriod,
      };
      
      if (editingItem) {
        // 編集モード
        const response = await fetch(`/api/tasks/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...taskData, status: editingItem.status }),
        });
        
        if (response.ok) {
          await fetchData();
        }
        setEditingItem(null);
      } else {
        // 新規追加モード
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
        
        if (response.ok) {
          await fetchData();
        }
      }
      
      // フォームリセット
      setFormData({
        type: 'task',
        title: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:00',
        project: '',
        color: 'bg-blue-500',
        lecturePeriod: 1,
      });
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  // 一括追加機能
  const handleBulkAdd = async () => {
    try {
      const startDate = new Date(bulkAddData.startDate);
      const endDate = new Date(bulkAddData.endDate);
      const newItems = [];
      
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        let shouldAdd = false;
        
        if (bulkAddData.repeatType === 'daily') {
          shouldAdd = true;
        } else if (bulkAddData.repeatType === 'weekly') {
          // 開始日と同じ曜日
          shouldAdd = currentDate.getDay() === startDate.getDay();
        } else if (bulkAddData.repeatType === 'specific') {
          // 指定した曜日
          shouldAdd = bulkAddData.selectedDays.includes(currentDate.getDay());
        }
        
        if (shouldAdd) {
          let finalFormData = { ...formData };
          if (formData.type === 'lecture' && formData.lecturePeriod) {
            const period = lecturePeriods[formData.lecturePeriod as keyof typeof lecturePeriods];
            finalFormData.startTime = period.startTime;
            finalFormData.endTime = period.endTime;
          }

          // プロジェクトIDを取得
          const selectedProject = projects.find(p => p.name === formData.project);
          const projectId = selectedProject?.id || null;
          
          const taskData = {
            type: finalFormData.type,
            title: finalFormData.title,
            description: finalFormData.description,
            date: format(currentDate, 'yyyy-MM-dd'),
            startTime: finalFormData.startTime,
            endTime: finalFormData.endTime,
            color: finalFormData.color,
            projectId,
            lecturePeriod: finalFormData.lecturePeriod,
          };
          
          newItems.push(taskData);
        }
        
        currentDate = addDays(currentDate, 1);
      }
      
      // 一括でAPIに送信
      for (const taskData of newItems) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData),
        });
      }
      
      await fetchData(); // データを再取得
      setShowBulkAdd(false);
      
      // フォームリセット
      setFormData({
        type: 'task',
        title: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:00',
        project: '',
        color: 'bg-blue-500',
        lecturePeriod: 1,
      });
    } catch (error) {
      console.error('Error bulk adding tasks:', error);
    }
  };

  // 編集開始
  const handleEdit = (item: ScheduleItem) => {
    setEditingItem(item);
    
    // 講義の場合は時限を逆算
    let lecturePeriod = 1;
    if (item.type === 'lecture') {
      for (const [period, times] of Object.entries(lecturePeriods)) {
        if (times.startTime === item.startTime && times.endTime === item.endTime) {
          lecturePeriod = parseInt(period);
          break;
        }
      }
    }
    
    setFormData({
      type: item.type,
      title: item.title,
      description: item.description,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      project: item.project || '',
      color: item.color,
      lecturePeriod,
    });
  };

  // 削除
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // 編集キャンセル
  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormData({
      type: 'task',
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      project: '',
      color: 'bg-blue-500',
      lecturePeriod: 1,
    });
  };

  const weekDays = generateWeekDays();
  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[2000px] mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <BarChart3 className="mr-3 text-purple-600" size={32} />
            管理
          </h1>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* 左側：週スケジュール表示 */}
          <div className="col-span-9 bg-white rounded-xl shadow-lg border border-gray-200">
            {/* ナビゲーション */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPreviousWeek}
                    className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={goToNextWeek}
                    className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-md"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <button
                    onClick={goToToday}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-md ml-2"
                  >
                    今日
                  </button>
                </div>

                <h2 className="text-xl font-bold text-gray-800">
                  {format(weekDays[0], 'yyyy年M月d日', { locale: ja })} - {format(weekDays[6], 'M月d日', { locale: ja })}
                </h2>

                {/* ビュー切り替え */}
                <div className="flex bg-white rounded-lg shadow-md overflow-hidden border">
                  <button
                    onClick={() => handleViewModeChange('sunday')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      weekViewMode === 'sunday'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    日曜始まり
                  </button>
                  <button
                    onClick={() => handleViewModeChange('today')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      weekViewMode === 'today'
                        ? 'bg-purple-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    今日始まり
                  </button>
                </div>
              </div>

              {/* 日付ヘッダー */}
              <div className="grid grid-cols-8 gap-0 mb-4">
                <div className="w-20 border-r border-gray-200"></div> {/* 時間列のスペース */}
                {weekDays.map((day, index) => {
                  const isHolidayDay = isHoliday(day);
                  const isFirstOfMonth = getDate(day) === 1;
                  
                  return (
                    <div key={index} className="text-center border-r border-gray-200 last:border-r-0 px-2">
                      <div className={`text-sm font-medium ${
                        isHolidayDay || index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                        {format(day, 'E', { locale: ja })}
                      </div>
                      
                      {isFirstOfMonth && (
                        <div className="text-xs font-bold text-blue-600 mb-1">
                          {format(day, 'M月', { locale: ja })}
                        </div>
                      )}
                      
                      <div className={`text-lg font-bold mt-1 ${
                        isToday(day) ? 'text-blue-600 bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center mx-auto' : 
                        isHolidayDay ? 'text-red-600' : 'text-gray-800'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      
                      {/* カレンダー予定表示 */}
                      <div className="mt-2 space-y-1">
                        {getCalendarEventsForDate(day).map((event) => (
                          <div
                            key={event.id}
                            className={`${event.color} text-white text-xs px-2 py-1 rounded truncate`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* スケジュール表 */}
            <div className="p-4" style={{ height: '800px', overflowY: 'auto' }}>
              <div className="relative">
                {timeSlots.map((slot, index) => (
                  <div key={slot.time} className="grid grid-cols-8 gap-0 border-b border-gray-200 relative" style={{ minHeight: '35px' }}>
                    {/* 時間表示 */}
                    <div className="w-20 pr-3 text-right border-r border-gray-200 relative">
                      <div className="absolute -top-2 right-3 text-xs text-gray-600 bg-white px-1">
                        {slot.time}
                      </div>
                    </div>
                    
                    {/* 各日のスケジュール */}
                    {weekDays.map((day, dayIndex) => {
                      const dayItems = getItemsForDate(day).filter(item => {
                        const [startHour] = item.startTime.split(':').map(Number);
                        return startHour === slot.hour;
                      });

                      // 時間帯重複の処理
                      const processOverlappingItems = (items: ScheduleItem[]) => {
                        if (items.length <= 1) return items.map(item => ({ ...item, width: '100%', left: '0%' }));
                        
                        return items.map((item, index) => ({
                          ...item,
                          width: `${100 / items.length}%`,
                          left: `${(index * 100) / items.length}%`
                        }));
                      };

                      const processedItems = processOverlappingItems(dayItems);

                      return (
                        <div key={dayIndex} className="relative border-r border-gray-200 last:border-r-0">
                          {processedItems.map((item) => {
                            const [startHour, startMin] = item.startTime.split(':').map(Number);
                            const [endHour, endMin] = item.endTime.split(':').map(Number);
                            const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
                            const heightInPixels = Math.max((duration / 60) * 35, 25);

                            return (
                              <div
                                key={item.id}
                                className={`${item.color.startsWith('custom-color-') ? '' : item.color} ${getTextColor(item.color)} text-xs px-2 py-1 rounded shadow-sm absolute z-10 cursor-pointer hover:opacity-90`}
                                style={{ 
                                  height: `${heightInPixels}px`,
                                  minHeight: '25px',
                                  width: item.width,
                                  left: item.left,
                                  ...getCustomColorStyle(item.color)
                                }}
                                title={`${item.title} (${item.startTime}-${item.endTime})`}
                                onClick={() => handleEdit(item)}
                              >
                                <div className="font-medium truncate">{item.title}</div>
                                <div className="text-xs opacity-90 truncate">{item.startTime}-{item.endTime}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側：タスク/スケジュール追加フォーム */}
          <div className="col-span-3 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {editingItem ? 'タスク・スケジュール編集' : 'タスク・スケジュール追加'}
              </h2>
            </div>

            <div className="mb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* タイプ選択 */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">種類</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="task"
                        checked={formData.type === 'task'}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'task' | 'schedule' | 'lecture' }))}
                        className="mr-3"
                      />
                      <span className="text-gray-900 font-medium">タスク</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="schedule"
                        checked={formData.type === 'schedule'}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'task' | 'schedule' | 'lecture' }))}
                        className="mr-3"
                      />
                      <span className="text-gray-900 font-medium">スケジュール</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="lecture"
                        checked={formData.type === 'lecture'}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'task' | 'schedule' | 'lecture' }))}
                        className="mr-3"
                      />
                      <span className="text-gray-900 font-medium">講義</span>
                    </label>
                  </div>
                </div>

                {/* 日付 */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">日付</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>

                {/* 時間 */}
                {formData.type === 'lecture' ? (
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">時限</label>
                    <select
                      value={formData.lecturePeriod}
                      onChange={(e) => setFormData(prev => ({ ...prev, lecturePeriod: parseInt(e.target.value) }))}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      required
                    >
                      {Object.entries(lecturePeriods).map(([period, times]) => (
                        <option key={period} value={period}>
                          {times.label} ({times.startTime}~{times.endTime})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">開始時刻</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">終了時刻</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* タイトル */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">名前</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="タスク/スケジュール名"
                    required
                  />
                </div>

                {/* プロジェクト */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">プロジェクト</label>
                  <select
                    value={formData.project}
                    onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">プロジェクトを選択</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.name}>{project.name}</option>
                    ))}
                  </select>
                </div>

                {/* 色選択 */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">色</label>
                  
                  {/* プリセット色 */}
                  <div className="grid grid-cols-6 gap-1 mb-3">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                        className={`${color.value} w-8 h-8 rounded border-2 transition-all ${
                          formData.color === color.value 
                            ? 'border-gray-800 scale-110' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        title={color.label}
                      >
                        {formData.color === color.value && (
                          <div className={`${getTextColor(color.value)} text-xs font-bold`}>✓</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* HEX入力とカラーピッカー */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={customHex}
                      onChange={(e) => setCustomHex(e.target.value)}
                      placeholder="#3B82F6"
                      className="flex-1 border-2 border-gray-300 rounded px-3 py-2 text-sm font-mono text-gray-900 font-medium placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <input
                      type="color"
                      value={customHex}
                      onChange={(e) => setCustomHex(e.target.value)}
                      className="w-12 h-10 border-2 border-gray-300 rounded cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color: hexToTailwindClass(customHex) }))}
                      className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded hover:bg-purple-600 transition-colors"
                    >
                      適用
                    </button>
                  </div>
                </div>

                {/* 内容 */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">内容</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="詳細な内容"
                    rows={3}
                  />
                </div>

                {/* 送信ボタン */}
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {editingItem ? '更新' : '追加'}
                  </button>
                  {!editingItem && (
                    <button
                      type="button"
                      onClick={() => setShowBulkAdd(true)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                    >
                      一括追加
                    </button>
                  )}
                  {editingItem && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* 一括追加モーダル */}
            {showBulkAdd && (
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md pointer-events-auto border-2 border-gray-300" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">一括追加</h3>
                    <button
                      onClick={() => setShowBulkAdd(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X size={20} className="text-gray-700" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* 期間設定 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">開始日</label>
                        <input
                          type="date"
                          value={bulkAddData.startDate}
                          onChange={(e) => setBulkAddData(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">終了日</label>
                        <input
                          type="date"
                          value={bulkAddData.endDate}
                          onChange={(e) => setBulkAddData(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* 繰り返しタイプ */}
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-2">繰り返し</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="daily"
                            checked={bulkAddData.repeatType === 'daily'}
                            onChange={(e) => setBulkAddData(prev => ({ ...prev, repeatType: e.target.value as any }))}
                            className="mr-3"
                          />
                          <span className="text-gray-900 font-medium">毎日</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="weekly"
                            checked={bulkAddData.repeatType === 'weekly'}
                            onChange={(e) => setBulkAddData(prev => ({ ...prev, repeatType: e.target.value as any }))}
                            className="mr-3"
                          />
                          <span className="text-gray-900 font-medium">同じ曜日（開始日と同じ曜日）</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="specific"
                            checked={bulkAddData.repeatType === 'specific'}
                            onChange={(e) => setBulkAddData(prev => ({ ...prev, repeatType: e.target.value as any }))}
                            className="mr-3"
                          />
                          <span className="text-gray-900 font-medium">特定の曜日</span>
                        </label>
                      </div>
                    </div>

                    {/* 特定曜日選択 */}
                    {bulkAddData.repeatType === 'specific' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">曜日選択</label>
                        <div className="grid grid-cols-7 gap-2">
                          {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                            <label key={index} className="flex flex-col items-center">
                              <input
                                type="checkbox"
                                checked={bulkAddData.selectedDays.includes(index)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBulkAddData(prev => ({
                                      ...prev,
                                      selectedDays: [...prev.selectedDays, index]
                                    }));
                                  } else {
                                    setBulkAddData(prev => ({
                                      ...prev,
                                      selectedDays: prev.selectedDays.filter(d => d !== index)
                                    }));
                                  }
                                }}
                                className="mb-1"
                              />
                              <span className="text-sm font-bold text-gray-900">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 実行ボタン */}
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={handleBulkAdd}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                      >
                        一括追加実行
                      </button>
                      <button
                        onClick={() => setShowBulkAdd(false)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 追加されたアイテム一覧 */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">追加済みアイテム</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scheduleItems.map((item) => (
                  <div
                    key={item.id}
                    className={`${item.color.startsWith('custom-color-') ? '' : item.color} ${getTextColor(item.color)} p-3 rounded-lg relative group`}
                    style={getCustomColorStyle(item.color)}
                  >
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs opacity-90">
                      {format(new Date(item.date), 'M/d', { locale: ja })} {item.startTime}-{item.endTime}
                    </div>
                    {item.project && (
                      <div className="text-xs opacity-80 mt-1">{item.project}</div>
                    )}
                    
                    {/* 編集・削除ボタン */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <button
                        onClick={() => handleEdit(item)}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded p-1 transition-colors"
                        title="編集"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded p-1 transition-colors"
                        title="削除"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 102 0v3a1 1 0 11-2 0V9zm4 0a1 1 0 10-2 0v3a1 1 0 102 0V9z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
