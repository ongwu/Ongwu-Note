// Ongwu笔记登录表单组件
'use client';

import { useState } from 'react';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        onLoginSuccess();
      } else {
        setError(data.message || '登录失败');
      }
    } catch (error) {
      console.error('登录错误:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 装饰性背景元素 */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-blue-400 rounded-full opacity-5 blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-400 rounded-full opacity-5 blur-3xl"></div>
      
      {/* 登录卡片 */}
      <div className="relative z-10 ongwu-card p-10 w-full max-w-md mx-4 shadow-lg transition-all duration-300 hover:shadow-xl">
        <div className="flex items-center justify-center mb-10 space-x-4">
          {/* Logo区域 - 与标题水平排列 */}
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md transition-all duration-300 hover:scale-105">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          
          {/* 标题和描述区域 */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Ongwu笔记</h1>
            <p className="text-gray-600 text-sm">安全、简洁的个人笔记管理系统</p>
          </div>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg animate-fadeIn">
              {error}
            </div>
          )}

          {/* 用户名输入框 */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              用户名
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <User className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="ongwu-input pl-10 transition-all duration-200 focus:shadow-md"
                placeholder="请输入用户名"
                required
              />
            </div>
          </div>

          {/* 密码输入框 */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              密码
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lock className="w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ongwu-input pl-10 pr-10 transition-all duration-200 focus:shadow-md"
                placeholder="请输入密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={isLoading}
            className="ongwu-btn ongwu-btn-primary w-full py-3 flex items-center justify-center text-base font-semibold transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                登录中...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                安全登录
              </>
            )}
          </button>
        </form>

        {/* 页脚信息 */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2025 Ongwu笔记 - 保护您的每一个想法</p>
        </div>
      </div>
    </div>
  );
}
