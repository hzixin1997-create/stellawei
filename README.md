# Chuhai - AI+真人混合东方命理出海平台

## 🌊 关于项目

楚海科技是一个面向欧美市场的AI+真人混合模式东方命理咨询平台，主打透明定价、防诈骗保障、准确度保证三大差异化优势。

## 🎯 核心价值

- **固定定价**: $25/问题，不按分钟计费
- **防诈骗保障**: 明确声明"不解诅咒、不推销仪式"
- **准确度保证**: AI+真人双重验证，7天无条件退款

## 🛠 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **UI库**: shadcn/ui + Radix UI
- **后端**: Supabase (Auth + PostgreSQL)
- **AI**: OpenAI GPT-4o
- **支付**: Stripe
- **部署**: Vercel

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的配置

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 📁 项目结构

```
chuhai/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (home)/       # 首页路由组
│   │   ├── masters/      # 师傅列表/详情
│   │   ├── services/     # 服务展示
│   │   ├── booking/      # 预约流程
│   │   ├── profile/      # 用户中心
│   │   └── api/          # API路由
│   ├── components/       # React组件
│   │   ├── ui/          # 基础UI组件
│   │   └── sections/    # 页面区块组件
│   ├── lib/             # 工具函数
│   ├── hooks/           # 自定义Hooks
│   └── types/           # TypeScript类型
├── public/              # 静态资源
└── supabase/           # 数据库迁移
```

## 🎨 设计系统

### 品牌色彩
- **深紫**: `#6B46C1` - 主要品牌色
- **金色**: `#D4AF37` - 强调色
- **奶油白**: `#FAF7F0` - 背景色

### 字体
- **标题**: Playfair Display (衬线体)
- **正文**: Inter (无衬线体)

## 📄 许可证

MIT License
