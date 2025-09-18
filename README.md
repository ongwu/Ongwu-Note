[![Hexo](https://img.shields.io/badge/Hexo-5.0+-blue.svg)](https://hexo.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.0-orange.svg)](https://github.com/ongwu/ongwu-simple)

## 1. 项目构想

Ongwu笔记是一个基于GitHub + Vercel + PostgreSQL的Web笔记应用，旨在提供一个简洁、高效、安全的在线笔记管理平台。

### 演示demo：https://note.ongwu.cn

### 核心需求
- 提供用户注册与登录功能
- 支持笔记的创建、编辑、删除和搜索
- 支持笔记分类管理
- 提供笔记导入导出功能
- 确保数据安全与隐私保护
- 提供良好的用户体验和界面设计

### 技术选型
- **前端框架**：Next.js 13+（React 18+）
- **编程语言**：TypeScript
- **样式框架**：Tailwind CSS
- **后端服务**：Vercel Functions（API路由）
- **数据库**：Supabase PostgreSQL
- **认证方案**：JWT (JSON Web Token)
- **部署平台**：Vercel
- **代码托管**：GitHub

## 2. 项目架构

### 技术栈架构
- **前端**：Next.js 13+ App Router + React 18+ + TypeScript + Tailwind CSS
- **后端**：Next.js API Routes + Node.js
- **数据层**：PostgreSQL (Supabase) + pg客户端库
- **认证授权**：JWT认证 + 自定义中间件
- **部署环境**：Vercel Cloud Platform

### 项目结构
```
├── app/             # Next.js 13+ 应用目录
│   ├── api/         # API路由（后端接口）
│   ├── admin/       # 管理员页面
│   ├── export/      # 导出功能页面
│   ├── import/      # 导入功能页面
│   ├── init/        # 数据库初始化页面
│   ├── settings/    # 设置页面
│   ├── layout.tsx   # 应用布局
│   └── page.tsx     # 首页
├── components/      # React组件
├── lib/             # 工具库和业务逻辑
├── public/          # 静态资源
├── scripts/         # 脚本文件
├── next.config.js   # Next.js配置
├── package.json     # 项目依赖配置
└── tailwind.config.js # Tailwind CSS配置
```

### 核心模块设计
1. **用户认证模块**
   - 提供用户注册、登录、注销功能
   - 基于JWT的身份验证机制
   - 会话管理与安全保障

2. **笔记管理模块**
   - 笔记CRUD操作
   - 笔记分类管理
   - 笔记搜索与过滤

3. **数据导入导出模块**
   - 支持笔记批量导入
   - 支持笔记导出为Markdown格式

4. **系统管理模块**
   - 数据库初始化与维护
   - 系统状态监控
   - 用户权限管理

## 3. 项目实现

### 数据库设计
项目使用PostgreSQL作为数据存储，主要包含以下数据模型：

1. **用户模型 (OngwuUser)**
   - id: 用户唯一标识
   - username: 用户名
   - password: 密码（加密存储）
   - email: 邮箱地址
   - created_at: 创建时间
   - updated_at: 更新时间

2. **分类模型 (OngwuCategory)**
   - id: 分类唯一标识
   - name: 分类名称
   - description: 分类描述
   - user_id: 所属用户ID
   - created_at: 创建时间
   - updated_at: 更新时间

3. **笔记模型 (OngwuNote)**
   - id: 笔记唯一标识
   - title: 笔记标题
   - content: 笔记内容
   - category_id: 所属分类ID
   - user_id: 所属用户ID
   - created_at: 创建时间
   - updated_at: 更新时间

4. **系统状态模型 (OngwuSystemStatus)**
   - key: 状态键
   - value: 状态值
   - description: 状态描述
   - updated_at: 更新时间

### 核心功能实现

1. **数据库连接实现**
   - 使用pg库创建连接池
   - 采用单例模式确保连接池唯一性
   - 实现连接错误处理和超时设置

2. **认证系统实现**
   - 基于JWT的身份验证
   - 密码加密存储与验证
   - 访问控制中间件

3. **API接口设计**
   - RESTful API设计风格
   - 统一的错误处理机制
   - 请求参数验证

4. **前端界面实现**
   - 使用Next.js 13+ App Router
   - React函数式组件与Hooks
   - Tailwind CSS响应式设计

5. **笔记编辑器实现**
   - Markdown编辑器集成
   - 实时预览功能
   - 自动保存机制

## 4. 项目实施

### 部署教程：GitHub + Vercel + PostgreSQL

#### 环境准备
1. **GitHub账号**：创建项目仓库
2. **Vercel账号**：用于应用部署
3. **Supabase账号**：创建PostgreSQL数据库

#### 1. GitHub配置
1. 直接点击链接fork仓库:  https://github.com/ongwu/Ongwu-Note/fork

#### 2. Supabase PostgreSQL信息获取：
1. 登录Supabase，创建新项目
2. 在Project Settings > Database >顶部Connect 中获取数据库连接信息
3. type选择PSQL，选择 Session pooler ，你会获得如下信息：
   - Host
   - Port
   - Database Name
   - Username
   - Password （创建sql时的密码）


#### 3. Vercel部署配置
登录VERCEL：https://vercel.com

导入第三方 Git 仓库
1. 登录Vercel，导入GitHub仓库
2. 配置环境变量（在Settings > Environment Variables）

   ```
      ONGWU_NOTE_DB_HOST=xxxxxxxxxxx.pooler.supabase.com
      ONGWU_NOTE_DB_PORT=5432
      ONGWU_NOTE_DB_NAME=postgres
      ONGWU_NOTE_DB_USER=postgres.xxxxxxxxxxxxx
      ONGWU_NOTE_DB_PASSWORD=xxxxxxxxxxxx
      ONGWU_NOTE_JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxx
      NODE_ENV=production

      JWT 密钥 (用于用户登录令牌签名，必须保密)，生成方法：访问 https://generate-secret.vercel.app/32
      应用环境 (production=生产环境, development=开发环境)
   ```
3. 配置构建设置默认即可
 
4. 点击"Deploy"按钮部署应用,等待1分钟左右部署完成获得url访问

5. 这时候你无法登陆，需要初始化，初始化后你会获得管理员用户名和密码，登陆后台后续可修改！
   初始化： 域名/init，例如：https://sss.com/init

### 注意事项与最佳实践
1. **安全性**：
   - 妥善保管数据库凭证和JWT密钥
   - 定期更新密码和密钥
   - 避免在前端代码中暴露敏感信息

2. **性能优化**：
   - 使用数据库连接池
   - 实现API缓存机制
   - 优化数据库查询

3. **维护与监控**：
   - 定期备份数据库
   - 监控应用性能和错误日志
   - 及时更新依赖包版本

---

Ongwu
https://www.ongwu.cn
