'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, Clock, Play, Pause, Square, Edit2, Target, FolderOpen } from 'lucide-react';

// タスクの型定義
interface Task {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'will-do' | 'doing' | 'done';
  project?: string;
  projectProgress?: number;
}

// スケジュールイベントの型定義
interface ScheduleEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  type: 'task' | 'event';
}

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTaskStopwatchRunning, setIsTaskStopwatchRunning] = useState(false);
  const [isStudyStopwatchRunning, setIsStudyStopwatchRunning] = useState(false);
  const [currentTaskTime, setCurrentTaskTime] = useState(0); // 秒
  const [totalStudyTime, setTotalStudyTime] = useState(0); // 秒
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [targetDate, setTargetDate] = useState(new Date('2026-02-25'));
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);

  // データ取得
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        // 今日のタスクのみフィルタリング
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayTasks = data.filter((task: any) => {
          const taskDate = format(new Date(task.date), 'yyyy-MM-dd');
          return taskDate === today;
        }).map((task: any) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          startTime: task.startTime,
          endTime: task.endTime,
          status: task.status,
          project: task.project?.name || '',
          projectProgress: task.project?.progress || 0,
        }));
        setTasks(todayTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const [scheduleEvents] = useState<ScheduleEvent[]>([
    {
      id: '1',
      title: 'ヤオコー',
      startTime: '18:00',
      endTime: '19:00',
      color: 'bg-yellow-400',
      type: 'event'
    },
    {
      id: '2',
      title: '夕食',
      startTime: '19:00',
      endTime: '20:20',
      color: 'bg-blue-300',
      type: 'event'
    },
    {
      id: '3',
      title: '風呂',
      startTime: '20:20',
      endTime: '20:50',
      color: 'bg-green-300',
      type: 'event'
    }
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTaskStopwatchRunning) {
      interval = setInterval(() => {
        setCurrentTaskTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTaskStopwatchRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStudyStopwatchRunning) {
      interval = setInterval(() => {
        setTotalStudyTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStudyStopwatchRunning]);

  useEffect(() => {
    const doingTask = tasks.find(task => task.status === 'doing');
    setSelectedTask(doingTask || tasks[0] || null);
  }, [tasks]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDaysUntilTarget = () => {
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-gray-400';
      case 'doing': return 'bg-green-500';
      case 'will-do': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const calculateTaskDuration = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = endMinutes - startMinutes;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
  };

  const handleTaskStatusChange = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      let newStatus: 'will-do' | 'doing' | 'done';
      switch (task.status) {
        case 'will-do': newStatus = 'doing'; break;
        case 'doing': newStatus = 'done'; break;
        case 'done': newStatus = 'will-do'; break;
        default: newStatus = 'will-do';
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task', // デフォルト値
          title: task.title,
          description: task.description,
          date: format(new Date(), 'yyyy-MM-dd'),
          startTime: task.startTime,
          endTime: task.endTime,
          color: 'bg-blue-500', // デフォルト値
          status: newStatus,
        }),
      });

      if (response.ok) {
        await fetchTasks(); // データを再取得
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

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

  const getTasksForSchedule = () => {
    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      startTime: task.startTime,
      endTime: task.endTime,
      color: task.status === 'done' ? 'bg-gray-300' : task.status === 'doing' ? 'bg-green-400' : 'bg-blue-400',
      type: 'task' as const
    }));
  };

  const allScheduleItems = [...scheduleEvents, ...getTasksForSchedule()];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[2000px] mx-auto p-6">
        {/* 左上の日付・時刻・残り日数 */}
        <div className="flex justify-start mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 min-w-[350px] border border-gray-200">
            <div className="text-left">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {format(currentTime, 'M月d日(E) yyyy', { locale: ja })}
              </div>
              <div className="text-xl text-gray-700 mb-3 font-mono">
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <div className="flex items-center space-x-2">
                <Target className="text-red-500" size={20} />
                <span className="text-red-600 font-bold text-lg">
                  試験まで {getDaysUntilTarget()}日
                </span>
                <button
                  onClick={() => setIsEditingDate(!isEditingDate)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Edit2 size={16} className="text-gray-500" />
                </button>
              </div>
              {isEditingDate && (
                <div className="mt-3">
                  <input
                    type="date"
                    value={format(targetDate, 'yyyy-MM-dd')}
                    onChange={(e) => setTargetDate(new Date(e.target.value))}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="grid grid-cols-12 gap-8 mb-8">
          {/* 左側：スケジュール表示 */}
          <div className="col-span-3 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[700px]">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Calendar className="mr-3 text-blue-600" size={24} />
                スケジュール
              </h2>
            </div>
            <div className="flex-1 p-4 overflow-y-auto relative">
              <div className="relative">
                {generateTimeSlots().map((slot, index) => {
                  const events = allScheduleItems.filter(e => e.startTime === slot.time);
                  const currentHour = currentTime.getHours();
                  const currentMinutes = currentTime.getMinutes();
                  const isCurrentHour = slot.hour === currentHour;
                  
                  return (
                    <div key={slot.time} className="relative h-16">
                      {/* 時刻の罫線（この線がちょうどその時刻を表す） */}
                      <div className="absolute left-20 right-0 top-0 h-px bg-gray-300"></div>
                      
                      {/* 時刻表示 */}
                      <div className="absolute left-0 w-20 -top-2 text-gray-700 text-sm font-mono text-left bg-gray-50 pr-2">
                        {slot.hour === 0 ? '午前0時' : 
                         slot.hour < 12 ? `午前${slot.hour}時` : 
                         slot.hour === 12 ? '午後0時' : 
                         `午後${slot.hour - 12}時`}
                      </div>
                      
                      {/* イベント表示エリア */}
                      <div className="ml-24 pt-1 pb-1">
                        {events.map((event, eventIndex) => {
                          // イベントの開始時刻と終了時刻から高さを計算
                          const [startHour, startMin] = event.startTime.split(':').map(Number);
                          const [endHour, endMin] = event.endTime.split(':').map(Number);
                          const startMinutes = startHour * 60 + startMin;
                          const endMinutes = endHour * 60 + endMin;
                          const duration = endMinutes - startMinutes;
                          const heightInPixels = (duration / 60) * 64; // 1時間 = 64px
                          
                          // 開始時刻が現在の時刻スロットと一致する場合のみ表示
                          if (startHour === slot.hour) {
                            return (
                              <div 
                                key={event.id} 
                                className={`${event.color} rounded-lg px-3 py-2 text-xs text-white font-medium shadow-sm mb-1`}
                                style={{ 
                                  height: `${Math.max(heightInPixels - 4, 32)}px`,
                                  minHeight: '32px'
                                }}
                              >
                                <div className="flex flex-col">
                                  <span className="font-semibold">{event.title}</span>
                                  <span className="text-xs opacity-90 mt-1">
                                    {event.startTime}~{event.endTime}
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      {/* 現在時刻の赤い線 */}
                      {isCurrentHour && (
                        <div 
                          className="absolute left-20 right-0 h-0.5 bg-red-500 z-20"
                          style={{ 
                            top: `${(currentMinutes / 60) * 64}px`,
                          }}
                        >
                          <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                          <div className="absolute -right-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* 最後の罫線（24時） */}
                <div className="absolute left-20 right-0 bottom-0 h-px bg-gray-300"></div>
              </div>
            </div>
          </div>

          {/* 中央：タスクリスト */}
          <div className="col-span-6 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[700px]">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Clock className="mr-3 text-green-600" size={24} />
                タスク一覧
              </h2>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`border-2 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer ${
                      selectedTask?.id === task.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskStatusChange(task.id);
                          }}
                          className="mt-1"
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            task.status === 'done' ? 'bg-gray-400 border-gray-400' :
                            task.status === 'doing' ? 'bg-green-500 border-green-500' :
                            'bg-blue-500 border-blue-500'
                          }`}>
                            {task.status !== 'will-do' && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                        </button>
                        
                        <div className={`w-4 h-4 rounded-full mt-1 ${getStatusColor(task.status)}`}></div>
                        
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 mb-1">{task.title}</h3>
                          <p className="text-gray-700 mb-3">{task.description}</p>
                          <div className="flex items-center space-x-6 text-sm">
                            <span className="text-gray-800 font-medium">
                              {task.startTime} - {task.endTime}
                            </span>
                            <span className="text-blue-600 font-medium">
                              {calculateTaskDuration(task.startTime, task.endTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                  {tasks.length === 0 && !loading && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">今日のタスクがありません</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 右側：タスク詳細とプロジェクト */}
          <div className="col-span-3 space-y-4">
            {/* タスク詳細 */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[420px]">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">タスク詳細</h2>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                {selectedTask ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900 mb-2">{selectedTask.title}</h3>
                      <p className="text-gray-700 text-base leading-relaxed">{selectedTask.description}</p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">開始時刻:</span>
                        <span className="text-gray-900 font-bold">{selectedTask.startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">終了時刻:</span>
                        <span className="text-gray-900 font-bold">{selectedTask.endTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">所要時間:</span>
                        <span className="text-blue-600 font-bold">
                          {calculateTaskDuration(selectedTask.startTime, selectedTask.endTime)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">ステータス:</span>
                        <span className={`font-bold ${
                          selectedTask.status === 'done' ? 'text-gray-600' :
                          selectedTask.status === 'doing' ? 'text-green-600' :
                          'text-blue-600'
                        }`}>
                          {selectedTask.status === 'done' ? '完了' :
                           selectedTask.status === 'doing' ? '進行中' : '予定'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center mt-8">タスクを選択してください</p>
                )}
              </div>
            </div>

            {/* プロジェクト */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col h-[276px]">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <FolderOpen className="mr-3 text-purple-600" size={24} />
                  プロジェクト
                </h2>
              </div>
              <div className="flex-1 p-6">
                {selectedTask?.project ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3">{selectedTask.project}</h3>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600 font-medium">進行度</span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={Math.round(selectedTask.projectProgress || 0)}
                            onChange={async (e) => {
                              const newProgress = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                              // プロジェクトの進行度を更新
                              // TODO: プロジェクト進行度更新API呼び出し
                              console.log('Update project progress:', newProgress);
                            }}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm text-center"
                            min="0"
                            max="100"
                          />
                          <span className="text-gray-900 font-bold">%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-4 rounded-full transition-all duration-300" 
                          style={{ width: `${selectedTask.projectProgress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      参考書の進行状況や学習の進捗を管理できます。
                      <br />
                      上の数値を変更してプロジェクトの進行度を更新できます。
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center mt-8">プロジェクト情報がありません</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 下部：ストップウォッチ */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 h-[180px] flex items-center">
          <div className="flex justify-center items-center space-x-16 w-full">
            {/* タスク経過時間 */}
            <div className="text-center">
              <div className="text-gray-700 font-medium mb-3 text-lg">タスク経過時間</div>
              <div className="text-4xl font-mono font-bold text-gray-900 mb-4">
                {formatTime(currentTaskTime)}
              </div>
              <button
                onClick={() => setIsTaskStopwatchRunning(!isTaskStopwatchRunning)}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center space-x-2 mx-auto ${
                  isTaskStopwatchRunning 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                }`}
              >
                {isTaskStopwatchRunning ? <Pause size={20} /> : <Play size={20} />}
                <span>{isTaskStopwatchRunning ? '停止' : '開始'}</span>
              </button>
            </div>

            <div className="w-px h-24 bg-gray-300"></div>

            {/* 総勉強時間 */}
            <div className="text-center">
              <div className="text-gray-700 font-medium mb-3 text-lg">今日の総勉強時間</div>
              <div className="text-4xl font-mono font-bold text-gray-900 mb-4">
                {formatTime(totalStudyTime)}
              </div>
              <button
                onClick={() => setIsStudyStopwatchRunning(!isStudyStopwatchRunning)}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center space-x-2 mx-auto ${
                  isStudyStopwatchRunning 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
                }`}
              >
                {isStudyStopwatchRunning ? <Square size={20} /> : <Play size={20} />}
                <span>{isStudyStopwatchRunning ? '停止' : '開始'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}