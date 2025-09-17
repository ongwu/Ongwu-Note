// Ongwu笔记主布局组件
'use client';

import { useState, useEffect, useRef } from 'react';
import Sidebar, { SidebarRef } from './Sidebar';
import NoteEditor from './NoteEditor';
import { Menu, X, LogOut, User, Upload, Plus, Download, Settings } from 'lucide-react';
import Link from 'next/link';

interface MainLayoutProps {
  onLogout: () => void;
  user?: any;
}

export default function MainLayout({ onLogout, user: propUser }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [user, setUser] = useState<any>(propUser);
  const [categories, setCategories] = useState<any[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const sidebarRef = useRef<SidebarRef>(null);

  useEffect(() => {
    // 只获取分类数据，用户信息已经在首页获取过了
    fetchCategories();
    
    // 点击外部关闭导出菜单
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu && !(event.target as Element).closest('.export-menu')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    
    // 监听localStorage变化，检测是否有新的导入
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ongwu_import_success' && e.newValue) {
        try {
          const importData = JSON.parse(e.newValue);
          console.log('检测到导入成功，刷新侧边栏数据:', importData);
          
          // 刷新侧边栏数据
          if (sidebarRef.current) {
            sidebarRef.current.refresh();
          }
          
          // 清除localStorage标记
          localStorage.removeItem('ongwu_import_success');
        } catch (error) {
          console.error('解析导入成功数据失败:', error);
        }
      }
    };

    // 监听storage事件
    window.addEventListener('storage', handleStorageChange);
    
    // 监听自定义导入成功事件
    const handleImportSuccess = (e: CustomEvent) => {
      // 刷新侧边栏数据
      if (sidebarRef.current) {
        sidebarRef.current.refresh();
      } else {
        console.error('sidebarRef.current 为空，无法刷新侧边栏');
      }
    };
    
    window.addEventListener('ongwu_import_success', handleImportSuccess as EventListener);
    
    // 检查是否有未处理的导入成功标记（同页面内跳转）
    const checkImportSuccess = () => {
      const importData = localStorage.getItem('ongwu_import_success');
      if (importData) {
        try {
          const data = JSON.parse(importData);
          
          // 刷新侧边栏数据
          if (sidebarRef.current) {
            sidebarRef.current.refresh();
          }
          
          // 清除localStorage标记
          localStorage.removeItem('ongwu_import_success');
        } catch (error) {
          console.error('解析导入成功数据失败:', error);
        }
      }
    };

    // 页面加载时检查
    checkImportSuccess();

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ongwu_import_success', handleImportSuccess as EventListener);
    };
  }, [showExportMenu]);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/verify');
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      onLogout();
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  // 新建笔记功能
  const handleCreateNote = async () => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '新笔记',
          content: '',
          category_id: categories.length > 0 ? categories[0].id : null
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // 刷新侧边栏数据
        if (sidebarRef.current) {
          sidebarRef.current.refresh();
        }
        
        // 选中新创建的笔记
        setSelectedNote(data.note);
      } else {
        alert('创建笔记失败：' + data.message);
      }
    } catch (error) {
      console.error('创建笔记失败:', error);
      alert('创建笔记失败，请重试');
    }
  };

  // 导出功能
  const handleExport = async (type: 'all' | 'category', categoryId?: number) => {
    try {
      setIsExporting(true);
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, categoryId }),
      });

      if (response.ok) {
        // 下载ZIP文件
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 从响应头获取文件名
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
          : `ongwu_notes_${new Date().toISOString().split('T')[0]}.zip`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('导出成功！ZIP文件已开始下载。');
      } else {
        const errorData = await response.json();
        alert('导出失败：' + (errorData.message || '未知错误'));
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('请输入分类名称');
      return;
    }

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim()
        }),
      });

      const data = await response.json();
      if (data.success) {
        // 刷新分类列表
        await fetchCategories();
        // 刷新侧边栏
        if (sidebarRef.current) {
          sidebarRef.current.refresh();
        }
        // 清空表单
        setNewCategoryName('');
        setNewCategoryDescription('');
        setShowNewCategoryForm(false);
        alert('分类创建成功！');
      } else {
        alert(data.message || '创建分类失败');
      }
    } catch (error) {
      console.error('创建分类失败:', error);
      alert('创建分类失败，请重试');
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        /> 
      )}

      {/* 侧边栏 */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 ongwu-sidebar transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <Sidebar 
          ref={sidebarRef}
          onNoteSelect={setSelectedNote}
          selectedNote={selectedNote}
        />
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部导航栏 - 简化布局，减少拥挤感 */}
        <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-2"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="cursor-pointer hover:text-blue-600 transition-colors">
              <h1 className="text-lg font-medium text-gray-800">Ongwu笔记</h1>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            {/* 新建笔记按钮 - 保持核心功能 */}
            <button
              onClick={handleCreateNote}
              className="ongwu-btn ongwu-btn-primary flex items-center text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              新建笔记
            </button>

            {/* 新建分类按钮 - 直接显示在顶部 */}
            <button
              onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}
              className="ongwu-btn ongwu-btn-secondary flex items-center text-sm ml-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              新建分类
            </button>

            {/* 导出文档按钮 - 直接显示在顶部 */}
            <div className="relative ml-2">
              <button
                onClick={() => {
                setShowExportMenu(!showExportMenu);
              }}
                disabled={isExporting}
                className="ongwu-btn ongwu-btn-secondary flex items-center text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                导出文档
              </button>
              
              {showExportMenu && (
                <div className="export-menu dropdown-menu absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-10 min-w-48">
                  <button
                    onClick={() => {
                    handleExport('all');
                  }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center cursor-pointer"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    导出所有笔记
                  </button>
                  {categories.filter(cat => cat && cat.id).map(category => (
                    <button
                      key={category.id}
                      onClick={() => {
                        handleExport('category', category.id);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center cursor-pointer"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      导出 {category.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 导入文档按钮 - 直接显示在顶部 */}
            <a
              href="/import"
              className="ongwu-btn ongwu-btn-secondary flex items-center text-sm ml-2"
            >
              <Upload className="w-4 h-4 mr-2" />
              导入文档
            </a>

            {/* 用户信息按钮 - 添加点击事件 */}
            <button 
              onClick={() => {
                window.location.href = '/settings';
              }}
              className="flex items-center space-x-1 p-2 rounded-full hover:bg-gray-100 ml-4 cursor-pointer"
              title={user?.username || '用户信息'}
            >
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600 hidden md:inline">{user?.username}</span>
            </button>

            {/* 登出按钮保持简洁 */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 笔记编辑器区域 */}
        <main className="flex-1 overflow-hidden">
          <NoteEditor 
            note={selectedNote}
            onNoteUpdate={(note) => {
              setSelectedNote(note);
              // 刷新侧边栏数据
              if (sidebarRef.current) {
                sidebarRef.current.refresh();
              }
            }}
            onNoteDelete={(noteId) => {
              setSelectedNote(null);
              // 刷新侧边栏数据
              if (sidebarRef.current) {
                sidebarRef.current.refresh();
              }
            }}
            categories={categories}
          />
        </main>
      </div>

      {/* 新建分类弹窗 - 保持简洁样式 */}
      {showNewCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-800 mb-4">创建新分类</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="请输入分类名称"
                  className="ongwu-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  分类描述
                </label>
                <input
                  type="text"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="请输入分类描述（可选）"
                  className="ongwu-input"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateCategory}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  创建
                </button>
                <button
                  onClick={() => {
                    setShowNewCategoryForm(false);
                    setNewCategoryName('');
                    setNewCategoryDescription('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
