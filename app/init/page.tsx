'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, Database, User, Key } from 'lucide-react';

export default function InitPage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const checkDatabaseStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/init-db');
      const data = await response.json();
      setDbStatus(data);
    } catch (error) {
      console.error('检查数据库状态失败:', error);
      setDbStatus({ success: false, message: '检查失败' });
    } finally {
      setIsChecking(false);
    }
  };

  const initializeDatabase = async () => {
    setIsInitializing(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        // 初始化成功后重新检查状态
        setTimeout(() => {
          checkDatabaseStatus();
        }, 1000);
      }
    } catch (error) {
      console.error('初始化数据库失败:', error);
      setResult({ 
        success: false, 
        message: '初始化失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <Database className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Ongwu笔记</h1>
          <p className="text-gray-600">数据库初始化</p>
        </div>

        {/* 数据库状态检查 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">数据库状态</h2>
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={checkDatabaseStatus}
              disabled={isChecking}
              className="ongwu-btn ongwu-btn-primary flex items-center"
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              {isChecking ? '检查中...' : '检查数据库状态'}
            </button>
          </div>

          {dbStatus && (
            <div className={`p-4 rounded-lg ${
              dbStatus.success 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <div className="flex items-center">
                {dbStatus.success ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 mr-2" />
                )}
                <span className="font-medium">
                  {dbStatus.success ? '数据库连接正常' : '数据库连接失败'}
                </span>
              </div>
              {dbStatus.tables && (
                <div className="mt-2">
                  <p className="text-sm">已创建的表: {dbStatus.tables.join(', ')}</p>
                  <p className="text-sm">
                    初始化状态: {dbStatus.isInitialized ? '已完成' : '未完成'}
                  </p>
                  {dbStatus.systemStatus && (
                    <div className="mt-2 text-xs">
                      <p>系统状态: {dbStatus.systemStatus.isInitialized ? '已初始化' : '未初始化'}</p>
                      <p>用户数量: {dbStatus.systemStatus.userCount}</p>
                      {dbStatus.systemStatus.initializedAt && (
                        <p>初始化时间: {new Date(dbStatus.systemStatus.initializedAt).toLocaleString()}</p>
                      )}
                    </div>
                  )}
                  {dbStatus.isInitialized && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border">
                      <p className="text-xs text-blue-700">
                        ✅ 数据库已初始化，包含默认分类和管理员账户
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 数据库初始化 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">初始化数据库</h2>
          <p className="text-gray-600 mb-4">
            点击下面的按钮来创建必要的数据库表和管理员用户。
          </p>
          
          <button
            onClick={initializeDatabase}
            disabled={isInitializing || (dbStatus?.isInitialized)}
            className={`ongwu-btn w-full flex items-center justify-center ${
              dbStatus?.isInitialized 
                ? 'ongwu-btn-disabled cursor-not-allowed' 
                : 'ongwu-btn-primary'
            }`}
          >
            {isInitializing ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Database className="w-5 h-5 mr-2" />
            )}
            {isInitializing 
              ? '初始化中...' 
              : dbStatus?.isInitialized 
                ? '系统已初始化' 
                : '初始化数据库'
            }
          </button>
        </div>

        {/* 结果显示 */}
        {result && (
          <div className={`p-4 rounded-lg ${
            result.success 
              ? 'bg-green-100 text-green-800' 
              : result.alreadyInitialized
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <div className="flex items-center mb-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : result.alreadyInitialized ? (
                <XCircle className="w-5 h-5 mr-2" />
              ) : (
                <XCircle className="w-5 h-5 mr-2" />
              )}
              <span className="font-medium">{result.message}</span>
            </div>
            
            {result.success && result.tables && (
              <div className="mt-2">
                <p className="text-sm">创建的表: {result.tables.join(', ')}</p>
                {result.adminUser && (
                  <div className="mt-2 p-3 bg-blue-50 rounded border">
                    <div className="flex items-center mb-2">
                      <User className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="font-medium text-blue-800">管理员账户</span>
                    </div>
                    <div className="flex items-center">
                      <Key className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-sm">
                        用户名: <strong>{result.adminUser.username}</strong> | 
                        密码: <strong>{result.adminUser.password}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {result.error && (
              <div className="mt-2">
                <p className="text-sm">错误详情: {result.error}</p>
              </div>
            )}
            
            {result.reason && (
              <div className="mt-2">
                <p className="text-sm">原因: {result.reason}</p>
              </div>
            )}
          </div>
        )}

        {/* 完成后的提示 */}
        {result?.success && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">初始化完成！</h3>
            <p className="text-sm text-blue-700 mb-3">
              数据库已成功初始化，您现在可以：
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 访问 <a href="/" className="underline">主页</a> 开始使用应用</li>
              <li>• 使用管理员账户登录</li>
              <li>• 开始创建笔记和分类</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
