# 记账助手 (Accounting Tool)

一个基于Node.js + Nuxt + MongoDB的账本工具，支持多层级账单类型管理、多维度报表统计、历史记录修改等功能。

## 功能特点 (Features)

1. **多层级的账单类型字典管理**：支持最多3级的账单分类，可以按层级进行组织和管理
2. **按时间周期进行报表统计**：支持按照周、月、季度、年份进行统计
3. **按类型层级进行报表统计**：支持按照类型的第一级、二级、三级进行分类统计
4. **历史记录修改**：支持修改和删除历史交易记录
5. **基础消费配置**：支持设置每月的基础消费项目
6. **用户认证**：实现了简单的用户登录和注册功能，未登录时自动拦截并跳转到登录页

## 技术栈 (Tech Stack)

- **前端**：Nuxt 3 (Vue.js)、Tailwind CSS、Nuxt UI
- **后端**：Node.js、Express、MongoDB
- **认证**：JWT (JSON Web Tokens)
- **数据可视化**：Chart.js

## 项目结构 (Project Structure)

```
accounting-list/
├── server/                # 服务器端代码
│   ├── api/               # API端点
│   │   ├── auth/          # 认证相关API
│   │   ├── categories/    # 账单类型API
│   │   ├── transactions/  # 交易记录API
│   │   ├── reports/       # 报表统计API
│   │   └── basic-expenses/# 基础消费API
│   ├── middleware/        # 中间件
│   ├── models/            # 数据模型
│   ├── types/             # 类型定义
│   └── utils/             # 工具函数
├── pages/                 # 前端页面
├── layouts/               # 布局组件
├── components/            # 可复用组件
├── utils/                 # 前端工具函数
├── public/                # 静态资源
└── nuxt.config.ts         # Nuxt配置
```

## 安装和运行 (Installation and Running)

### 前提条件 (Prerequisites)

- Node.js 16+
- MongoDB 4.4+

### 安装步骤 (Installation Steps)

1. 克隆仓库 (Clone the repository)

```bash
git clone https://github.com/yourusername/accounting-list.git
cd accounting-list
```

2. 安装依赖 (Install dependencies)

```bash
npm install
```

3. 配置环境变量 (Configure environment variables)

创建一个`.env`文件，添加以下内容：

```
MONGODB_URI=mongodb://localhost:27017/accounting-app
JWT_SECRET=your-secret-key
```

4. 运行开发服务器 (Run development server)

```bash
npm run dev
```

5. 构建生产版本 (Build for production)

```bash
npm run build
npm run start
```

## 使用说明 (Usage)

1. 注册账号或使用默认账号登录
2. 在"账单类型"页面创建分类
3. 在"交易记录"页面添加收入和支出
4. 在"统计报表"页面查看各种维度的统计数据
5. 在"基础消费"页面设置每月固定支出

## 贡献 (Contributing)

欢迎提交问题和功能请求。如果您想贡献代码，请先创建一个issue讨论您想要更改的内容。

## 许可证 (License)

[MIT](LICENSE)
