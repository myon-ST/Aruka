'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { FolderOpen, Plus, BookOpen, GraduationCap, Briefcase, Edit2, Trash2, Calendar } from 'lucide-react';

// プロジェクトの型定義
interface BaseProject {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string;
  progress: number;
}

interface WorkProject extends BaseProject {
  type: 'work';
  tasks: Task[];
}

interface BookProject extends BaseProject {
  type: 'book';
  subject: 'math' | 'english' | 'chemistry' | 'physics';
  fields: Field[];
  totalPages: number;
  currentPage: number;
}

interface LectureProject extends BaseProject {
  type: 'lecture';
  totalSessions: number;
  completedSessions: number;
}

type Project = WorkProject | BookProject | LectureProject;

interface Task {
  id: string;
  name: string;
  completed: boolean;
}

interface Field {
  id: string;
  name: string;
  completed: boolean;
}

export default function Project() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    type: 'work' as 'work' | 'book' | 'lecture',
    name: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    // 作業用
    tasks: [] as Task[],
    // 参考書用
    subject: 'math' as 'math' | 'english' | 'chemistry' | 'physics',
    fields: [] as Field[],
    totalPages: 0,
    currentPage: 0,
    // 講義用
    totalSessions: 0,
    completedSessions: 0,
  });

  const [newTaskName, setNewTaskName] = useState('');
  const [newFieldName, setNewFieldName] = useState('');

  // データ取得
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const subjectLabels = {
    math: '数学',
    english: '英語',
    chemistry: '化学',
    physics: '物理'
  };

  // プロジェクト追加・更新
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const projectData = {
        name: formData.name,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        description: formData.description,
        tasks: formData.tasks,
        subject: formData.subject,
        fields: formData.fields,
        totalPages: formData.totalPages,
        currentPage: formData.currentPage,
        totalSessions: formData.totalSessions,
        completedSessions: formData.completedSessions,
      };

      if (editingProject) {
        // 更新
        const response = await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
        
        if (response.ok) {
          await fetchProjects(); // データを再取得
        }
        setEditingProject(null);
      } else {
        // 新規作成
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        });
        
        if (response.ok) {
          await fetchProjects(); // データを再取得
        }
      }

      resetForm();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  // フォームリセット
  const resetForm = () => {
    setFormData({
      type: 'work',
      name: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      tasks: [],
      subject: 'math',
      fields: [],
      totalPages: 0,
      currentPage: 0,
      totalSessions: 0,
      completedSessions: 0,
    });
    setNewTaskName('');
    setNewFieldName('');
  };

  // タスク追加
  const addTask = () => {
    if (newTaskName.trim()) {
      setFormData(prev => ({
        ...prev,
        tasks: [...prev.tasks, { id: Date.now().toString(), name: newTaskName.trim(), completed: false }]
      }));
      setNewTaskName('');
    }
  };

  // 分野追加
  const addField = () => {
    if (newFieldName.trim()) {
      setFormData(prev => ({
        ...prev,
        fields: [...prev.fields, { id: Date.now().toString(), name: newFieldName.trim(), completed: false }]
      }));
      setNewFieldName('');
    }
  };

  // プロジェクト削除
  const deleteProject = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchProjects(); // データを再取得
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  // プロジェクト編集
  const editProject = (project: Project) => {
    setEditingProject(project);
    setFormData({
      type: project.type,
      name: project.name,
      startDate: project.startDate,
      endDate: project.endDate,
      description: project.description,
      tasks: project.type === 'work' ? project.tasks : [],
      subject: project.type === 'book' ? project.subject : 'math',
      fields: project.type === 'book' ? project.fields : [],
      totalPages: project.type === 'book' ? project.totalPages : 0,
      currentPage: project.type === 'book' ? project.currentPage : 0,
      totalSessions: project.type === 'lecture' ? project.totalSessions : 0,
      completedSessions: project.type === 'lecture' ? project.completedSessions : 0,
    });
    setShowAddForm(true);
  };

  // 進捗更新
  const updateProgress = async (projectId: string, newProgress: Partial<Project>) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedProject = { ...project, ...newProgress };
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updatedProject.name,
          type: updatedProject.type,
          startDate: updatedProject.startDate,
          endDate: updatedProject.endDate,
          description: updatedProject.description,
          tasks: updatedProject.type === 'work' ? updatedProject.tasks : undefined,
          subject: updatedProject.type === 'book' ? updatedProject.subject : undefined,
          fields: updatedProject.type === 'book' ? updatedProject.fields : undefined,
          totalPages: updatedProject.type === 'book' ? updatedProject.totalPages : undefined,
          currentPage: updatedProject.type === 'book' ? updatedProject.currentPage : undefined,
          totalSessions: updatedProject.type === 'lecture' ? updatedProject.totalSessions : undefined,
          completedSessions: updatedProject.type === 'lecture' ? updatedProject.completedSessions : undefined,
        }),
      });
      
      if (response.ok) {
        await fetchProjects(); // データを再取得
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'work': return <Briefcase className="text-blue-600" size={24} />;
      case 'book': return <BookOpen className="text-green-600" size={24} />;
      case 'lecture': return <GraduationCap className="text-purple-600" size={24} />;
      default: return <FolderOpen className="text-gray-600" size={24} />;
    }
  };

  const getProjectTypeLabel = (type: string) => {
    switch (type) {
      case 'work': return '作業';
      case 'book': return '参考書';
      case 'lecture': return '講義';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <FolderOpen className="mr-3 text-orange-600" size={32} />
            プロジェクト管理
          </h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={20} />
            <span>新規プロジェクト</span>
          </button>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* 左側：プロジェクト一覧 */}
          <div className="col-span-8">
            {loading ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p className="text-gray-600">プロジェクトを読み込み中...</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {projects.map((project) => (
                <div key={project.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      {getProjectIcon(project.type)}
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{project.name}</h3>
                        <p className="text-sm text-gray-600">{getProjectTypeLabel(project.type)}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => editProject(project)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{project.description}</p>

                  {/* 期間表示 */}
                  <div className="flex items-center space-x-2 mb-4 text-sm text-gray-600">
                    <Calendar size={16} />
                    <span>
                      {format(new Date(project.startDate), 'yyyy/M/d', { locale: ja })} - 
                      {format(new Date(project.endDate), 'yyyy/M/d', { locale: ja })}
                    </span>
                  </div>

                  {/* 進捗バー */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">進捗</span>
                      <span className="text-sm font-bold text-gray-900">{Math.round(project.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-300" 
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* タイプ別詳細 */}
                  {project.type === 'work' && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">タスク ({project.tasks.filter(t => t.completed).length}/{project.tasks.length})</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {project.tasks.map((task) => (
                          <div key={task.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={(e) => {
                                const updatedTasks = project.tasks.map(t => 
                                  t.id === task.id ? { ...t, completed: e.target.checked } : t
                                );
                                const completedCount = updatedTasks.filter(t => t.completed).length;
                                const newProgress = updatedTasks.length > 0 ? (completedCount / updatedTasks.length) * 100 : 0;
                                updateProgress(project.id, { tasks: updatedTasks, progress: newProgress });
                              }}
                              className="rounded"
                            />
                            <span className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                              {task.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.type === 'book' && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-gray-800">
                          {subjectLabels[project.subject]} - ページ進捗
                        </h4>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={project.currentPage}
                            onChange={(e) => {
                              const newCurrentPage = Math.max(0, Math.min(project.totalPages, parseInt(e.target.value) || 0));
                              const newProgress = project.totalPages > 0 ? (newCurrentPage / project.totalPages) * 100 : 0;
                              updateProgress(project.id, { currentPage: newCurrentPage, progress: newProgress });
                            }}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <span className="text-sm text-gray-600">/ {project.totalPages}</span>
                        </div>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {project.fields.map((field) => (
                          <div key={field.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={field.completed}
                              onChange={(e) => {
                                const updatedFields = project.fields.map(f => 
                                  f.id === field.id ? { ...f, completed: e.target.checked } : f
                                );
                                updateProgress(project.id, { fields: updatedFields });
                              }}
                              className="rounded"
                            />
                            <span className={`text-sm ${field.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                              {field.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.type === 'lecture' && (
                    <div>
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-gray-800">講義進捗</h4>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={project.completedSessions}
                            onChange={(e) => {
                              const newCompleted = Math.max(0, Math.min(project.totalSessions, parseInt(e.target.value) || 0));
                              const newProgress = project.totalSessions > 0 ? (newCompleted / project.totalSessions) * 100 : 0;
                              updateProgress(project.id, { completedSessions: newCompleted, progress: newProgress });
                            }}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <span className="text-sm text-gray-600">/ {project.totalSessions} コマ</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

                {projects.length === 0 && !loading && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                    <FolderOpen className="mx-auto text-gray-400 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">プロジェクトがありません</h3>
                    <p className="text-gray-500">新規プロジェクトボタンから最初のプロジェクトを作成してください。</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右側：プロジェクト追加フォーム */}
          {showAddForm && (
            <div className="col-span-4 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">
                {editingProject ? 'プロジェクト編集' : '新規プロジェクト'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* タイプ選択 */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">種類</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="work"
                        checked={formData.type === 'work'}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="mr-3"
                      />
                      <span className="text-gray-900 font-medium">作業</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="book"
                        checked={formData.type === 'book'}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="mr-3"
                      />
                      <span className="text-gray-900 font-medium">参考書</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="lecture"
                        checked={formData.type === 'lecture'}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                        className="mr-3"
                      />
                      <span className="text-gray-900 font-medium">講義</span>
                    </label>
                  </div>
                </div>

                {/* 基本情報 */}
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">プロジェクト名</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">開始日</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-2">終了日</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">説明</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                  />
                </div>

                {/* タイプ別フィールド */}
                {formData.type === 'work' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">タスク</label>
                    <div className="space-y-2 mb-3">
                      {formData.tasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                          <span className="text-sm">{task.name}</span>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              tasks: prev.tasks.filter(t => t.id !== task.id)
                            }))}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        placeholder="タスク名"
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={addTask}
                        className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {formData.type === 'book' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">教科</label>
                      <select
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value as any }))}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="math">数学</option>
                        <option value="english">英語</option>
                        <option value="chemistry">化学</option>
                        <option value="physics">物理</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">総ページ数</label>
                        <input
                          type="number"
                          value={formData.totalPages}
                          onChange={(e) => setFormData(prev => ({ ...prev, totalPages: parseInt(e.target.value) || 0 }))}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">現在のページ</label>
                        <input
                          type="number"
                          value={formData.currentPage}
                          onChange={(e) => setFormData(prev => ({ ...prev, currentPage: parseInt(e.target.value) || 0 }))}
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                          min="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">分野</label>
                      <div className="space-y-2 mb-3">
                        {formData.fields.map((field) => (
                          <div key={field.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                            <span className="text-sm">{field.name}</span>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                fields: prev.fields.filter(f => f.id !== field.id)
                              }))}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          placeholder="分野名"
                          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={addField}
                          className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {formData.type === 'lecture' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">総コマ数</label>
                      <input
                        type="number"
                        value={formData.totalSessions}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalSessions: parseInt(e.target.value) || 0 }))}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">完了コマ数</label>
                      <input
                        type="number"
                        value={formData.completedSessions}
                        onChange={(e) => setFormData(prev => ({ ...prev, completedSessions: parseInt(e.target.value) || 0 }))}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                        min="0"
                      />
                    </div>
                  </div>
                )}

                {/* 送信ボタン */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                  >
                    {editingProject ? '更新' : '作成'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingProject(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
