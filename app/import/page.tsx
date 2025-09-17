'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Folder, AlertCircle } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface ImportResult {
  filename: string;
  success: boolean;
  message: string;
  noteId?: number;
}

interface ImportSummary {
  total: number;
  success: number;
  error: number;
}

export default function ImportPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 加载分类列表
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/import');
        const data = await response.json();
        
        if (data.success) {
          setCategories(data.categories);
          if (data.categories.length > 0) {
            setSelectedCategoryId(data.categories[0].id.toString());
          }
        } else {
          console.error('加载分类失败:', data.message);
        }
      } catch (error) {
        console.error('加载分类失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const mdFiles = files.filter(file => file.name.toLowerCase().endsWith('.md'));
    
    if (mdFiles.length !== files.length) {
      alert('只支持.md文件，已过滤掉其他格式的文件');
    }
    
    setSelectedFiles(mdFiles);
    setImportResults([]);
    setImportSummary(null);
  };

  // 处理导入
  const handleImport = async () => {
    if (selectedFiles.length === 0) {
      alert('请选择要导入的文件');
      return;
    }

    if (!selectedCategoryId) {
      alert('请选择目标分类');
      return;
    }

    setIsImporting(true);
    setImportResults([]);
    setImportSummary(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('categoryId', selectedCategoryId);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setImportResults(data.results);
        setImportSummary(data.summary);
        
        // 清空文件选择
        setSelectedFiles([]);
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // 显示成功消息并通知主页刷新
        if (data.summary.success > 0) {
          // 设置localStorage标记，通知主页需要刷新数据
          localStorage.setItem('ongwu_import_success', JSON.stringify({
            timestamp: Date.now(),
            count: data.summary.success,
            categoryId: selectedCategoryId
          }));
          
          // 触发自定义事件，通知主页刷新
          window.dispatchEvent(new CustomEvent('ongwu_import_success', {
            detail: {
              count: data.summary.success,
              categoryId: selectedCategoryId
            }
          }));
          
          // 显示成功消息
          alert(`导入成功！成功导入 ${data.summary.success} 个文件。`);
          
          // 自动跳转到主页
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        }
      } else {
        alert('导入失败：' + data.message);
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败，请重试');
    } finally {
      setIsImporting(false);
    }
  };

  // 重置状态
  const handleReset = () => {
    setSelectedFiles([]);
    setImportResults([]);
    setImportSummary(null);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">导入文档</h1>
            </div>
            <a
              href="/"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              ← 返回笔记
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* 导入说明 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">批量导入Markdown文档</h2>
            <p className="text-gray-600">
              选择本地的.md文件，批量导入到指定的分类中。支持多文件同时导入。
            </p>
          </div>

          {/* 分类选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标分类
            </label>
            <div className="relative">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Folder className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* 文件选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择Markdown文件
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                id="file-input"
                type="file"
                multiple
                accept=".md"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  点击选择文件或拖拽文件到此处
                </p>
                <p className="text-sm text-gray-500">
                  支持选择多个.md文件
                </p>
              </label>
            </div>
            
            {/* 已选择的文件列表 */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  已选择的文件 ({selectedFiles.length} 个)
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                      <FileText className="w-4 h-4 mr-2" />
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-4">
            <button
              onClick={handleImport}
              disabled={isImporting || selectedFiles.length === 0}
              className="ongwu-btn ongwu-btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  导入中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  开始导入
                </>
              )}
            </button>
            
            <button
              onClick={handleReset}
              disabled={isImporting}
              className="ongwu-btn ongwu-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              重置
            </button>
          </div>

          {/* 导入结果 */}
          {importSummary && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">导入结果</h3>
              
              {/* 汇总信息 */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{importSummary.total}</div>
                  <div className="text-sm text-blue-700">总文件数</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{importSummary.success}</div>
                  <div className="text-sm text-green-700">成功导入</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{importSummary.error}</div>
                  <div className="text-sm text-red-700">导入失败</div>
                </div>
              </div>

              {/* 详细结果 */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {importResults.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center p-3 rounded-lg ${
                      result.success ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mr-3" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{result.filename}</div>
                      <div className={`text-sm ${
                        result.success ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 使用提示 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">使用提示</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 只支持导入.md格式的Markdown文件</li>
                  <li>• 文件名将作为笔记标题（自动去除.md扩展名）</li>
                  <li>• 文件内容将作为笔记正文</li>
                  <li>• 所有导入的笔记将添加到选定的分类中</li>
                  <li>• 支持同时选择多个文件进行批量导入</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
