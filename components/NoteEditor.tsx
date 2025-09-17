// Ongwu笔记编辑器组件
'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  Save, 
  Edit3, 
  Eye, 
  EyeOff, 
  FileText,
  AlertCircle,
  CheckCircle,
  Folder,
  ChevronDown,
  Trash2
} from 'lucide-react';

interface NoteEditorProps {
  note: any;
  onNoteUpdate: (note: any) => void;
  onNoteDelete?: (noteId: number) => void;
  categories?: any[];
}

export default function NoteEditor({ note, onNoteUpdate, onNoteDelete, categories = [] }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setCategoryId(note.category_id || null);
      setIsEditing(false);
      setIsPreview(false);
    } else {
      setTitle('');
      setContent('');
      // 新建笔记时，默认选择第一个分类
      setCategoryId(categories.length > 0 ? categories[0].id : null);
      setIsEditing(false);
      setIsPreview(false);
    }
  }, [note, categories]);


  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCategoryDropdown]);

  // 自动保存功能
  useEffect(() => {
    if (note && (title !== note.title || content !== note.content)) {
      // 清除之前的定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 设置新的定时器，2秒后自动保存
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 2000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, note]);

  const handleSave = async () => {
    if (!note) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      let response;
      
      // 检查是否是有效的新笔记（ID为0或负数表示新笔记）
      if (!note.id || note.id <= 0) {
        // 创建新笔记
        response = await fetch('/api/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            content,
            category_id: categoryId
          }),
        });
      } else {
        // 更新现有笔记
        response = await fetch(`/api/notes/${note.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            content,
            category_id: categoryId
          }),
        });
      }

      const data = await response.json();

      if (data.success) {
        onNoteUpdate(data.note);
        setSaveStatus('saved');
        setLastSaved(new Date());
        
        // 3秒后重置保存状态
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        // 如果是404错误且是更新操作，尝试重新创建笔记
        if (note && note.id && (data.message?.includes('不存在') || response.status === 404)) {
          try {
            const createResponse = await fetch('/api/notes', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title,
                content,
                category_id: categoryId
              }),
            });
            
            const createData = await createResponse.json();
            if (createData.success) {
              onNoteUpdate(createData.note);
              setSaveStatus('saved');
              setLastSaved(new Date());
              setTimeout(() => setSaveStatus('idle'), 3000);
              return;
            }
          } catch (createError) {
            // 忽略重新创建失败的错误，继续抛出原始错误
          }
        }
        
        throw new Error(data.message || '保存失败');
      }
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleDelete = async () => {
    if (!note?.id) return;
    
    if (!confirm('确定要删除这篇笔记吗？此操作不可撤销。')) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        if (onNoteDelete) {
          onNoteDelete(note.id);
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


  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsPreview(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handlePreview = () => {
    setIsPreview(!isPreview);
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        // 加载中动画组件
        const LoadingSpinner = () => {
          return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />;
        };
        
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-ongwu-primary" />;
      case 'saved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return '保存中...';
      case 'saved':
        return lastSaved ? `已保存 ${lastSaved.toLocaleTimeString()}` : '已保存';
      case 'error':
        return '保存失败';
      default:
        return '未保存';
    }
  };

  if (!note) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">选择或创建笔记</h3>
          <p className="text-gray-400">从左侧菜单选择笔记开始编辑</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部工具栏 - 简化样式 */}
      <div className="bg-white border-b border-gray-100 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="笔记标题..."
              className="text-lg font-medium bg-transparent border-none outline-none w-full placeholder-gray-400"
            />
            
            {/* 分类选择器 - 简化样式 */}
            <div className="mt-3 flex items-center space-x-4">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Folder className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">
                    {categoryId ? 
                      categories.find(cat => cat.id === categoryId)?.name || '选择分类' : 
                      '选择分类'
                    }
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </button>
                
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-sm z-10 animate-fadeIn">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setCategoryId(null);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${categoryId === null ? 'bg-blue-500 text-white' : 'text-gray-700'}`}
                      >
                        未分类
                      </button>
                      {categories.map(category => (
                        <button
                          key={category.id}
                          onClick={() => {
                            setCategoryId(category.id);
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${categoryId === category.id ? 'bg-blue-500 text-white' : 'text-gray-700'}`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 保存状态 */}
            <div className="flex items-center text-sm text-gray-500">
              {getSaveStatusIcon()}
              <span className="ml-2">{getSaveStatusText()}</span>
            </div>

            {/* 操作按钮 - 简化布局 */}
            <div className="flex items-center space-x-1">
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="ongwu-btn ongwu-btn-secondary flex items-center"
                >
                  <Edit3 className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">编辑</span>
                </button>
              )}

              <button
                onClick={handlePreview}
                className="ongwu-btn ongwu-btn-secondary flex items-center"
              >
                {isPreview ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">隐藏预览</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-1.5" />
                    <span className="hidden sm:inline">预览</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="ongwu-btn ongwu-btn-primary flex items-center"
              >
                <Save className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">{isSaving ? '保存中...' : '保存'}</span>
              </button>

              {note?.id && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full hover:text-red-500 transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 编辑器区域 - 优化样式 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑区域 */}
        <div className={`flex-1 ${isPreview ? 'w-1/2' : 'w-full'} transition-all duration-300 ease-in-out relative`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="开始编写您的笔记..."
            className="ongwu-editor p-6 text-gray-800 leading-relaxed font-sans text-base"
            style={{ minHeight: '100%' }}
          />
        </div>

        {/* 预览区域 */}
        {isPreview && (
          <div className="w-1/2 border-l border-gray-100 overflow-y-auto ongwu-scrollbar transition-all duration-300 ease-in-out">
            <div className="ongwu-preview">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ 
                  code({ node, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = props.inline;
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={tomorrow as any}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {content || '*暂无内容*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
