'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday, getMonth, getDate } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, X, Calendar as CalendarIcon, Clock } from 'lucide-react';

// 予定の型定義
interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  color: string;
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weeksStartDate, setWeeksStartDate] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'weeks'>('month');
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 祝日判定関数（主要な祝日のみ）
  const isHoliday = (date: Date) => {
    const month = getMonth(date) + 1; // getMonthは0ベースなので+1
    const day = getDate(date);
    const year = date.getFullYear();

    // 固定祝日
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

    // 移動祝日（簡易版）
    const movableHolidays = [];
    
    // 成人の日（1月第2月曜日）
    if (month === 1) {
      const firstMonday = new Date(year, 0, 1);
      while (firstMonday.getDay() !== 1) {
        firstMonday.setDate(firstMonday.getDate() + 1);
      }
      const secondMonday = new Date(firstMonday);
      secondMonday.setDate(firstMonday.getDate() + 7);
      if (day === secondMonday.getDate()) {
        return true;
      }
    }

    // 海の日（7月第3月曜日）
    if (month === 7) {
      const firstMonday = new Date(year, 6, 1);
      while (firstMonday.getDay() !== 1) {
        firstMonday.setDate(firstMonday.getDate() + 1);
      }
      const thirdMonday = new Date(firstMonday);
      thirdMonday.setDate(firstMonday.getDate() + 14);
      if (day === thirdMonday.getDate()) {
        return true;
      }
    }

    // 敬老の日（9月第3月曜日）
    if (month === 9) {
      const firstMonday = new Date(year, 8, 1);
      while (firstMonday.getDay() !== 1) {
        firstMonday.setDate(firstMonday.getDate() + 1);
      }
      const thirdMonday = new Date(firstMonday);
      thirdMonday.setDate(firstMonday.getDate() + 14);
      if (day === thirdMonday.getDate()) {
        return true;
      }
    }

    // 体育の日/スポーツの日（10月第2月曜日）
    if (month === 10) {
      const firstMonday = new Date(year, 9, 1);
      while (firstMonday.getDay() !== 1) {
        firstMonday.setDate(firstMonday.getDate() + 1);
      }
      const secondMonday = new Date(firstMonday);
      secondMonday.setDate(firstMonday.getDate() + 7);
      if (day === secondMonday.getDate()) {
        return true;
      }
    }

    return fixedHolidays.some(holiday => holiday.month === month && holiday.day === day);
  };

  // 色のオプション
  const eventColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-red-500',
    'bg-purple-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500'
  ];

  // 月表示用の日付を生成
  const generateMonthDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  };

  // 5週間表示用の日付を生成
  const generateWeeksDays = () => {
    const days = [];
    for (let i = 0; i < 35; i++) { // 5週間 = 35日
      days.push(addDays(weeksStartDate, i));
    }
    return days;
  };

  // 5週間表示の月範囲を取得
  const getWeeksMonthRange = () => {
    const days = generateWeeksDays();
    const startMonth = format(days[0], 'M', { locale: ja });
    const endMonth = format(days[days.length - 1], 'M', { locale: ja });
    const startYear = format(days[0], 'yyyy', { locale: ja });
    const endYear = format(days[days.length - 1], 'yyyy', { locale: ja });
    
    if (startYear === endYear) {
      if (startMonth === endMonth) {
        return `${startYear}年${startMonth}月`;
      } else {
        return `${startYear}年${startMonth}~${endMonth}月`;
      }
    } else {
      return `${startYear}年${startMonth}月~${endYear}年${endMonth}月`;
    }
  };

  // 指定日の予定を取得
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => event.date === dateStr);
  };

  // 予定を追加
  const addEvent = () => {
    if (!selectedDate || !newEventTitle.trim()) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existingEvents = getEventsForDate(selectedDate);
    
    if (existingEvents.length >= 4) {
      alert('1日の予定は最大4件までです。');
      return;
    }

    const newEvent: Event = {
      id: Date.now().toString(),
      title: newEventTitle.trim(),
      date: dateStr,
      color: eventColors[existingEvents.length % eventColors.length]
    };

    setEvents(prev => [...prev, newEvent]);
    setNewEventTitle('');
    setShowEventModal(false);
  };

  // 予定を削除
  const deleteEvent = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
  };

  // 日付をクリック
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventModal(true);
  };

  // ナビゲーション関数
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(prev => subMonths(prev, 1));
    } else {
      setWeeksStartDate(prev => addDays(prev, -35)); // 5週間前
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(prev => addMonths(prev, 1));
    } else {
      setWeeksStartDate(prev => addDays(prev, 35)); // 5週間後
    }
  };

  // 今日に戻る
  const goToToday = () => {
    const today = new Date();
    if (viewMode === 'month') {
      setCurrentDate(today);
    } else {
      setWeeksStartDate(startOfWeek(today));
    }
  };

  // 指定日に移動
  const goToDate = (date: Date) => {
    if (viewMode === 'month') {
      setCurrentDate(date);
    } else {
      setWeeksStartDate(startOfWeek(date));
    }
    setShowDatePicker(false);
  };

  const days = viewMode === 'month' ? generateMonthDays() : generateWeeksDays();
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <CalendarIcon className="mr-3 text-blue-600" size={32} />
            カレンダー
          </h1>
          
          {/* ビュー切り替えタブ */}
          <div className="flex bg-white rounded-lg shadow-md overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-6 py-3 font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              月表示
            </button>
            <button
              onClick={() => setViewMode('weeks')}
              className={`px-6 py-3 font-medium transition-colors ${
                viewMode === 'weeks'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              5週間表示
            </button>
          </div>
        </div>

        {/* カレンダーナビゲーション */}
        <div className="bg-white rounded-lg shadow-md mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPrevious}
                className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors shadow-md"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToNext}
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
            
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors cursor-pointer"
            >
              {viewMode === 'month' 
                ? format(currentDate, 'yyyy年M月', { locale: ja })
                : getWeeksMonthRange()
              }
            </button>
            
            <div className="w-32"></div> {/* スペーサー */}
          </div>

          {/* 日付選択 */}
          {showDatePicker && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">日付を選択:</label>
                <input
                  type="date"
                  onChange={(e) => goToDate(new Date(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={`text-center py-3 font-medium ${
                  index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* カレンダーグリッド */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = viewMode === 'month' ? isSameMonth(day, currentDate) : true;
              const isCurrentDay = isToday(day);
              const isHolidayDay = isHoliday(day);
              const isFirstOfMonth = getDate(day) === 1 && viewMode === 'weeks';
              
              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(day)}
                  className={`min-h-[120px] p-2 border cursor-pointer hover:bg-blue-50 transition-colors relative ${
                    !isCurrentMonth ? 'bg-gray-100 text-gray-400 border-gray-200' : 
                    isCurrentDay ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                  }`}
                >
                  {/* 日付表示 */}
                  <div className="mb-2 relative">
                    {isFirstOfMonth && (
                      <div className="text-xs font-bold text-blue-600 mb-1">
                        {format(day, 'M月', { locale: ja })}
                      </div>
                    )}
                    {isCurrentDay && (
                      <div className={`absolute ${isFirstOfMonth ? 'top-3' : '-top-1'} -left-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-10`}>
                        {format(day, 'd')}
                      </div>
                    )}
                    {!isCurrentDay && (
                      <div className={`text-sm font-medium ${
                        isHolidayDay || index % 7 === 0 ? 'text-red-600' : 
                        index % 7 === 6 ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                        {format(day, 'd')}
                      </div>
                    )}
                  </div>
                  
                  {/* 予定表示 */}
                  <div className={`space-y-1 ${isCurrentDay ? 'mt-4' : ''}`}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`${event.color} text-white text-xs px-2 py-1 rounded truncate`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 px-2">
                        +{dayEvents.length - 3}件
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 予定入力モーダル */}
        {showEventModal && selectedDate && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-auto border border-gray-300 pointer-events-auto" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {format(selectedDate, 'M月d日(E)', { locale: ja })} の予定
                </h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>

              {/* 既存の予定 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">現在の予定</h4>
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map((event) => (
                    <div
                      key={event.id}
                      className={`${event.color} text-white px-4 py-3 rounded-lg flex justify-between items-center shadow-sm`}
                    >
                      <span className="font-medium">{event.title}</span>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="hover:bg-white hover:bg-opacity-20 rounded-lg p-1 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {getEventsForDate(selectedDate).length === 0 && (
                    <p className="text-gray-500 text-sm py-4 text-center bg-gray-50 rounded-lg">予定がありません</p>
                  )}
                </div>
              </div>

              {/* 新しい予定を追加 */}
              {getEventsForDate(selectedDate).length < 4 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">新しい予定を追加</h4>
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="予定のタイトルを入力"
                      className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      onKeyPress={(e) => e.key === 'Enter' && addEvent()}
                      autoFocus
                    />
                    <button
                      onClick={addEvent}
                      disabled={!newEventTitle.trim()}
                      className="bg-blue-500 text-white px-5 py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center font-medium"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              )}

              {getEventsForDate(selectedDate).length >= 4 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm font-medium">1日の予定は最大4件までです。</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
