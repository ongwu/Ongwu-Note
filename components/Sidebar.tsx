// Ongwu笔记侧边栏组件
'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Folder, 
  FileText, 
  Search, 
  Edit3, 
  Trash2,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  GripVertical,
  X
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarProps {
  onNoteSelect: (note: any) => void;
  selectedNote: any;
}

export interface SidebarRef {
  refresh: () => void;
}

interface SortableCategoryItemProps {
  category: any;
  isExpanded: boolean;
  onToggle: () => void;
  onRename: (id: number, newName: string) => void;
  onDelete: (id: number) => void;
  notes: any[];
  onNoteSelect: (note: any) => void;
  onNoteDelete: (noteId: number) => void;
  selectedNote: any;
}

function SortableCategoryItem({ 
  category, 
  isExpanded, 
  onToggle, 
  onRename, 
  onDelete, 
  notes, 
  onNoteSelect, 
  onNoteDelete,
  selectedNote 
}: SortableCategoryItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRename = async () => {
    if (editName.trim() && editName.trim() !== category.name) {
      try {
        const response = await fetch(`/api/categories/${category.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: editName.trim() }),
        });
        
        if (response.ok) {
          onRename(category.id, editName.trim());
        }
      } catch (error) {
        console.error('重命名失败:', error);
      }
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm(`确定要删除分类"${category.name}"吗？这将同时删除该分类下的所有笔记。`)) {
      try {
        const response = await fetch(`/api/categories/${category.id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          onDelete(category.id);
        }
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
    setShowMenu(false);
  };

  const categoryNotes = notes.filter(note => note.category_id === category.id);

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className="flex items-center group">
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 text-gray-700"
        >
          <div className="flex items-center">
            <Folder className="w-4 h-4 mr-2" />
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') {
                    setEditName(category.name);
                    setIsEditing(false);
                  }
                }}
                className="bg-transparent border-none outline-none text-sm font-medium"
                autoFocus
              />
            ) : (
              <span className="font-medium">{category.name}</span>
            )}
            <span className="ml-2 text-xs text-gray-500">({categoryNotes.length})</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-gray-200 rounded"
            title="拖拽排序"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-200 rounded"
              title="更多操作"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                >
                  <Edit3 className="w-3 h-3 mr-2" />
                  重命名
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {categoryNotes.map(note => (
            <div
              key={note.id}
              className={`group flex items-center p-2 rounded-lg hover:bg-gray-100 ${selectedNote?.id === note.id ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
            >
              <button
                onClick={() => onNoteSelect(note)}
                className="flex-1 text-left flex items-center min-w-0"
              >
                <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{note.title}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNoteDelete(note.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-600 hover:text-red-800 transition-opacity"
                title="删除笔记"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ onNoteSelect, selectedNote }, ref) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  // 点击外部关闭导出菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu && !(event.target as Element).closest('.export-menu')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  // 暴露刷新方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: fetchData
  }));

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 并行获取笔记和分类数据
      const [notesResponse, categoriesResponse] = await Promise.all([
        fetch('/api/notes'),
        fetch('/api/categories')
      ]);
      
      const [notesData, categoriesData] = await Promise.all([
        notesResponse.json(),
        categoriesResponse.json()
      ]);
      
      if (notesData.success) {
        setNotes(notesData.notes);
      } else {
        console.error('获取笔记失败:', notesData.message);
      }
      
      if (categoriesData.success) {
        // 使用API返回的分类数据，并计算每个分类的笔记数量
        const categoryMap = new Map();
        
        // 添加"未分类"分类
        categoryMap.set(null, {
          id: null,
          name: '未分类',
          description: '没有分类的笔记',
          note_count: 0
        });
        
        // 添加API返回的分类
        categoriesData.categories.forEach((category: any) => {
          categoryMap.set(category.id, {
            ...category,
            note_count: 0
          });
        });
        
        // 计算每个分类的笔记数量
        if (notesData.success) {
          notesData.notes.forEach((note: any) => {
            const categoryId = note.category_id;
            if (categoryMap.has(categoryId)) {
              categoryMap.get(categoryId).note_count++;
            } else {
              // 如果笔记的分类不在分类列表中，添加到未分类
              categoryMap.get(null).note_count++;
            }
          });
        }
        
        setCategories(Array.from(categoryMap.values()));
      } else {
        console.error('获取分类失败:', categoriesData.message);
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const toggleCategory = (categoryId: number | null) => {
    if (categoryId === null) return;
    
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getNotesByCategory = (categoryId: number | null) => {
    return notes.filter(note => note.category_id === categoryId);
  };

  const filteredNotes = searchQuery 
    ? notes.filter(note => 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];


  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const validCategories = categories.filter(cat => cat && cat.id);
      const oldIndex = validCategories.findIndex(category => category.id === active.id);
      const newIndex = validCategories.findIndex(category => category.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newCategories = arrayMove(validCategories, oldIndex, newIndex);
        setCategories(newCategories);

      // 更新数据库中的排序
      try {
        for (let i = 0; i < newCategories.length; i++) {
          await fetch(`/api/categories/${newCategories[i].id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: i }),
          });
        }
      } catch (error) {
        console.error('更新排序失败:', error);
        // 如果更新失败，恢复原来的顺序
        fetchData();
      }
      }
    }
  };

  const handleCategoryRename = (categoryId: number, newName: string) => {
    setCategories(categories.map(cat => 
      cat.id === categoryId ? { ...cat, name: newName } : cat
    ));
  };

  const handleCategoryDelete = (categoryId: number) => {
    setCategories(categories.filter(cat => cat.id !== categoryId));
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      newSet.delete(categoryId);
      return newSet;
    });
  };

  // 删除笔记功能
  const handleNoteDelete = async (noteId: number) => {
    if (!confirm('确定要删除这篇笔记吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        // 从本地状态中移除笔记
        setNotes(notes.filter(note => note.id !== noteId));
        
        // 如果删除的是当前选中的笔记，清空选中状态
        if (selectedNote?.id === noteId) {
          onNoteSelect(null);
        }
        
        alert('笔记已删除');
      } else {
        alert('删除失败：' + data.message);
      }
    } catch (error) {
      console.error('删除笔记失败:', error);
      alert('删除失败，请重试');
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

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 搜索框 - 简化样式 */}
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索笔记..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>


      {/* 笔记列表 - 优化间距和视觉效果 */}
      <div className="flex-1 overflow-y-auto ongwu-scrollbar">
        {searchQuery ? (
          // 搜索结果
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              搜索结果 ({filteredNotes.length} 条)
            </h3>
            {filteredNotes.length > 0 ? (
              <div className="space-y-1">
                {filteredNotes.map(note => {
                  const isTitleMatch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
                  const isContentMatch = note.content.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  // 获取内容匹配的片段
                  const getContentSnippet = (content: string, query: string) => {
                    const index = content.toLowerCase().indexOf(query.toLowerCase());
                    if (index === -1) return '';
                    
                    const start = Math.max(0, index - 30);
                    const end = Math.min(content.length, index + query.length + 30);
                    let snippet = content.substring(start, end);
                    
                    if (start > 0) snippet = '...' + snippet;
                    if (end < content.length) snippet = snippet + '...';
                    
                    return snippet;
                  };
                  
                  return (
                    <div
                      key={note.id}
                      className={`group flex items-start p-3 rounded-lg hover:bg-gray-50 ${selectedNote?.id === note.id ? 'bg-blue-500 text-white' : 'text-gray-700'} transition-colors duration-150`}
                    >
                      <button
                        onClick={() => onNoteSelect(note)}
                        className="flex-1 text-left flex items-start min-w-0"
                      >
                        <FileText className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {isTitleMatch ? (
                              <span dangerouslySetInnerHTML={{__html: note.title.replace(new RegExp(`(${searchQuery})`, 'gi'), '<mark class="bg-yellow-200">$1</mark>')}} />
                            ) : (
                              note.title
                            )}
                          </div>
                          {isContentMatch && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                              <span dangerouslySetInnerHTML={{__html: getContentSnippet(note.content, searchQuery).replace(new RegExp(`(${searchQuery})`, 'gi'), '<mark class="bg-yellow-200">$1</mark>')}} />
                            </div>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNoteDelete(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-600 hover:text-red-800 transition-opacity ml-2"
                        title="删除笔记"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">未找到相关笔记</p>
            )}
          </div>
        ) : (
          // 分类列表
          <div className="p-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.filter(cat => cat && cat.id).map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                {categories.filter(cat => cat && cat.id).map(category => {
                  const isExpanded = expandedCategories.has(category.id);
                  
                  return (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      isExpanded={isExpanded}
                      onToggle={() => toggleCategory(category.id)}
                      onRename={handleCategoryRename}
                      onDelete={handleCategoryDelete}
                      notes={notes}
                      onNoteSelect={onNoteSelect}
                      onNoteDelete={handleNoteDelete}
                      selectedNote={selectedNote}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
});

// 保留一个SortableCategoryItem函数定义
Sidebar.displayName = 'Sidebar';
export default Sidebar;
