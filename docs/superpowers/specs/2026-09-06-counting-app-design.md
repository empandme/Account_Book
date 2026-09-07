# 记账 App 设计文档

**日期**: 2026-09-06
**状态**: 待实现
**作者**: William Wu

---

## 1. 背景与目标

### 1.1 需求

开发一款个人记账 App，用于日常控制花销。核心约束：

1. **同账号多端互通**：手机记账，电脑能看
2. **零维护成本**：不产生持续费用
3. **轻量简单**：功能克制，代码精简

### 1.2 使用场景澄清

经过澄清，实际使用节奏为：

- **手机端（99% 场景）**：日常随手记账、查看近期消费
- **电脑端（低频）**：一周 / 一月 / 一学期打开一次，做统计分析
- **传输方式**：手动导出文件，用户通过自选渠道（AirDrop / 微信 / 邮件 / iCloud 云盘等）传到电脑

**关键推论**：不需要实时云同步，可以砍掉所有云端基础设施。

### 1.3 非目标

- 不做多用户 / 账号系统
- 不做云端存储 / 自动同步
- 不做记账社交、AI 分析等增值功能
- 不做 Android / Windows 支持（用户设备为 iPhone + Mac）

---

## 2. 技术选型

### 2.1 架构

**同一份 PWA 代码**，通过运行时判断（屏幕宽度 + UA）分发到手机端与电脑端两种模式，用同一个入口、同一个 URL：

- **手机端模式**：记账、查看、导出
- **电脑端模式**：导入、统计分析、导出报表

### 2.2 技术栈

| 层次 | 选型 | 理由 |
|---|---|---|
| 前端框架 | **Svelte + TypeScript** | 比 React 更轻，包体小 |
| 构建工具 | **Vite** | 零配置、快 |
| 本地存储（手机） | **Dexie.js**（IndexedDB 封装） | 结构化查询、Schema 迁移方便 |
| 图表（电脑） | **uPlot**（首选）或 Chart.js | 轻量、性能好 |
| PWA 能力 | **Manifest + Service Worker** | 添加到主屏幕、离线可用 |
| 部署 | **GitHub Pages** + Actions 构建 | 永久免费、自动 HTTPS、代码托管一体化 |
| 后端 | **无** | 零维护、零成本、隐私最大化 |
| 图标 | Emoji + 少量 inline SVG | 免依赖 |
| CSS | 手写，无 UI 库 | 包体最小化 |

### 2.3 部署与成本

- GitHub Pages 托管静态资源，域名 `<username>.github.io/counting-app`，$0 永久
- 使用已有的 GitHub 账号，仓库公开（代码本身无任何密钥或敏感数据）；无自建数据库 / 无服务器 / 无付费订阅 → **年度维护成本 = $0**
- 部署方式：`main` 分支 push → GitHub Actions 跑 `vite build` → 产物发布到 `gh-pages` 分支（或用 GitHub 官方的 `actions/deploy-pages`）
- GitHub 端仅存代码文件，看不到任何账单数据

### 2.4 数据流

```
手机端记账 → IndexedDB（本地）
              ↓ 用户手动触发导出
           CSV / JSON 文件
              ↓ 用户自选渠道（AirDrop / 邮件 / 微信 / iCloud...）
           电脑端 Safari
              ↓ 拖入或选择文件
           内存中的分析视图（不持久化）
              ↓ 可选
           导出 PDF / PNG 报表
```

**重要**：手机端 App 加载完成后，运行期不再向任何服务器发送请求；电脑端同理，导入的数据只存内存。

---

## 3. 数据模型

### 3.1 核心表：`transactions`

| 字段 | 类型 | v1 用途 | 升级空间 |
|---|---|---|---|
| `id` | string (uuid) | 主键 | — |
| `amount` | number（最小单位整数） | 金额；用整数避免浮点误差（详见 3.5） | — |
| `currency` | string (ISO 4217) | 币种，如 `CNY` / `USD` / `JPY` | — |
| `kind` | `'expense' \| 'income'` | v1 恒为 `'expense'` | v2 支持收入 |
| `category` | string | 分类名（如 "吃饭" / "交通"） | v3 换成 `category_id` 关联 categories 表 |
| `note` | string | 备注文本，默认空串 | — |
| `occurred_at` | string (ISO datetime) | 消费发生时间 | — |
| `account_id` | string \| null | v1 恒为 `null` | v2 多账户（现金 / 微信 / 信用卡） |
| `tags` | string[] | v1 恒为 `[]` | v3 打标签 |
| `created_at` | string (ISO datetime) | 记录创建时间 | — |
| `updated_at` | string (ISO datetime) | 最近编辑时间 | — |
| `deleted_at` | string \| null | 软删除，方便撤销 | — |

### 3.2 辅助表：`categories`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string (uuid) | 主键 |
| `name` | string | 分类名 |
| `icon` | string | Emoji |
| `color` | string | 十六进制色值 |
| `sort_order` | number | 排序权重 |
| `archived` | boolean | 是否隐藏（不删除，保留历史交易的引用） |

**初始种子数据**：吃饭 🍜、交通 🚌、购物 🛍️、日用 🧴、娱乐 🎮、学习 📚、医疗 🏥、其他 💰。

### 3.3 设置表：`settings`（单行 KV）

| 键 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `default_currency` | string (ISO 4217) | `'CNY'` | 记账时的默认币种（可在记账页临时切换）|
| `recent_currencies` | string[] | `['CNY']` | 最近使用过的币种，用于币种选择器排序 |

### 3.4 存储实现

- Dexie 版本号 = 1
- Schema：`transactions: id, occurred_at, category, kind, currency, deleted_at`（后五个是索引）；`categories: id, sort_order`；`settings: key`
- 未来加字段用 Dexie migration（升级 version 号 + 数据填充脚本）

### 3.5 金额精度

- `amount` 一律以**该币种的最小单位**存储的整数：CNY / USD 用分（×100）、JPY / KRW 用元（×1，无小数位）、KWD 用毫（×1000）等
- 用 ISO 4217 定义的小数位表决定倍数（内置一张 currencyDigits 表）
- 显示层根据币种小数位数格式化

### 3.6 导出/导入格式

**CSV**：Excel 直接打开，便于快速查看
- 表头：`id, amount, currency, kind, category, note, occurred_at, tags, account_id, created_at, updated_at`
- `amount` 以该币种的常用单位（元 / 円 / dollar）导出，按币种小数位数保留（CNY 2 位、JPY 0 位）
- 已软删除的记录**不导出**

**JSON**：完整字段，含所有 null / 空数组占位符
- 顶层：`{ version: 1, exported_at, transactions: [...], categories: [...] }`
- `transactions` 内的 `amount` 保持为最小单位整数（无损）
- 电脑端解析器优先读 JSON（信息完整），也兼容 CSV
- **向前兼容原则**：解析器忽略未知字段，缺失字段填默认值

---

## 4. 手机端设计

### 4.1 页面结构

底部 Tab 三个页面：

#### 记账页（默认）
- **顶部**：金额显示区（大号数字）+ **币种小标签**（默认取 `settings.default_currency`，点击弹出币种选择器，最近用过的排前）
- **中部**：分类网格（Emoji + 分类名），常用的排前面
- **下部**：备注输入框（可选）、时间显示（默认"现在"，可点击弹出时间选择器）
- **底部**：自定义大数字键盘（`0-9`、`.`、退格、清空）——按币种小数位数动态限制小数输入
- **右下角**："记账"确认按钮
- **目标**：3 秒完成一笔（不弹系统键盘，一手可操作）

#### 流水页
- 按日期分组的列表（今天 / 昨天 / 更早…）
- 每笔显示：金额 + 币种符号（`¥12.50` / `$8.00` / `¥1200`）
- 每日顶部：当日总支出按币种分开显示（如 `¥85 · $12`）
- 长按某笔 → 编辑 / 删除弹窗
- 顶部日历图标 → 跳到任意月份
- 顶部搜索图标 → 按备注 / 分类 / 币种搜索

#### 我的页
- **本月总览**卡片：按币种分行显示总支出（如 `本月 CNY ¥1,240 · USD $85`），笔数、日均、分类前 3
- **默认币种设置**：切换后仅影响下一次记账的初始币种，已存交易不动
- **导出**按钮：CSV / JSON 二选一 → 触发系统 Share Sheet（AirDrop / 邮件 / 微信 / 存文件到 iCloud 云盘 / ...）
- **导入**按钮：从文件恢复（换手机场景）
- **分类管理**：增 / 改 / 删（archived）/ 排序
- **关于**：版本号、开源地址

### 4.2 交互原则

- 无动画或极少动画（省电、快）
- 深色模式跟随系统
- 主要竖屏优化，横屏可用不美化
- 无网络无任何提示（因为根本不联网）

### 4.3 技术细节

- Svelte 单页 + `svelte-spa-router` 路由
- 无组件库，直接手写 CSS
- 图标：Emoji + 少量 inline SVG
- 目标包体：gzipped < 100 KB

---

## 5. 电脑端设计

### 5.1 模式切换

- 打开同一网址时判断屏幕宽度 / UA：宽屏 → 分析模式；窄屏 → 手机模式
- 提供手动切换按钮兜底

### 5.2 首屏

- 大的"拖入 / 选择 CSV 或 JSON 文件"区域
- 支持多文件合并导入（跨学期文件拼接）
- 支持粘贴内容（复制文本直接分析）

### 5.3 分析面板（三栏）

#### 左栏：筛选器
- 时间范围：本月 / 上月 / 本学期 / 自定义
- 分类多选
- **币种切换 Tab**：置于分析面板顶部，一次只看一种币种；导入文件含哪些币种就出现哪几个 Tab（不做跨币种合计）
- 金额区间（当前币种下）
- 备注关键词搜索

#### 中栏：主图表
1. **时间趋势**：按日 / 周 / 月的折线或柱状图
2. **分类占比**：饼图 / 环形图
3. **分类趋势**：堆叠面积图（看某分类的时间变化）
4. **热力图**：日历式，颜色深浅 = 当日消费额

#### 右栏：明细与汇总
- **上**：当前币种下的总支出、日均、最大单笔、笔数
- **下**：符合当前筛选的所有交易明细（附币种列），可排序
- **导出当前视图**：PDF 报表 / 图表 PNG（文件名含币种）

### 5.4 持久化策略

- **导入的数据只存内存**，关掉页面即消失
- 用户的原始导出文件即长期存档
- 避免电脑端再维护一份数据造成"两端不一致"

### 5.5 技术细节

- 图表：uPlot（40 KB）
- 文件解析：原生 File API + 手写约 100 行 parser
- 无 Service Worker 缓存分析结果
- 无任何持久化

---

## 6. 代码组织

### 6.1 目录结构

```
counting-app/
├── src/
│   ├── shared/              # 两端共享
│   │   ├── types.ts         # 数据模型类型
│   │   ├── db.ts            # Dexie schema & 查询
│   │   ├── serializer.ts    # CSV/JSON 导入导出
│   │   └── theme.ts         # 颜色 / 深色模式
│   ├── mobile/              # 手机端独有
│   │   ├── App.svelte
│   │   ├── pages/
│   │   │   ├── Record.svelte
│   │   │   ├── Ledger.svelte
│   │   │   └── Me.svelte
│   │   └── components/
│   │       ├── Keypad.svelte
│   │       ├── CategoryGrid.svelte
│   │       └── ...
│   ├── desktop/             # 电脑端独有
│   │   ├── App.svelte
│   │   ├── panels/
│   │   │   ├── Filters.svelte
│   │   │   ├── Charts.svelte
│   │   │   └── Details.svelte
│   │   └── components/
│   │       ├── FileDropzone.svelte
│   │       └── ...
│   └── main.ts              # 统一入口：运行时分发到 mobile / desktop 的 App.svelte
├── public/
│   ├── manifest.json
│   └── icon-*.png
├── index.html
├── vite.config.ts          # base: '/counting-app/' 适配 GitHub Pages 子路径
├── package.json
├── tsconfig.json
└── .github/
    └── workflows/
        └── deploy.yml      # push main → build → 发布到 Pages
```

**GitHub Pages 子路径注意**：仓库名决定 URL 子路径。若仓库叫 `counting-app`，需在 `vite.config.ts` 设 `base: '/counting-app/'`，`svelte-spa-router` 的路由前缀也要一致；PWA `manifest.json` 的 `start_url` / `scope` 也要写全 `/counting-app/`。

### 6.2 依赖清单（预计）

```json
{
  "dependencies": {
    "svelte": "^5",
    "svelte-spa-router": "^4",
    "dexie": "^4",
    "uplot": "^1"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^5",
    "@sveltejs/vite-plugin-svelte": "^3",
    "vite-plugin-pwa": "^0"
  }
}
```

不引入 UI 库、CSS 框架、状态管理库。

---

## 7. 关键设计原则

1. **YAGNI**：v1 不做的功能就不做（无预算、无提醒、无云同步）
2. **一次到位的 Schema**：v2/v3 会用的字段先在 v1 存 null / 空值，避免以后迁移老数据
3. **文件即真相**：电脑端不做持久化，用户的原始导出文件是唯一真相源
4. **手机优先**：所有性能与包体决策向手机端倾斜
5. **零依赖运行**：一旦加载完成，任何设备可以断网永久使用

---

## 8. 未来演进（不在 v1 范围）

按可能性排序：

- **v1.1**：本月预算 + 剩余提醒
- **v2.0**：多账户（现金 / 微信 / 信用卡 / 支付宝）+ 收入记账
- **v2.1**：定期账单（房租 / 订阅）
- **v3.0**：标签系统 + 更复杂的筛选组合
- **v3.1**：可选的汇率换算（把多币种合并到本位币做统一图表）
- **v4.0**：可选的端到端加密云同步（如果零维护约束放宽）

---

## 9. 验收标准

v1 完成后应满足：

- [ ] iPhone Safari 打开 GitHub Pages 网址 → 添加到主屏幕 → 图标可点开
- [ ] 主屏幕图标点开后：断网、飞行模式下正常记账与查看
- [ ] 完成一笔典型记账操作 ≤ 3 秒
- [ ] 支持编辑 / 软删除已有交易
- [ ] 分类可增删改排序
- [ ] 可导出 CSV / JSON，Excel 能正常打开 CSV
- [ ] **可记入多币种**：至少 CNY / USD / JPY 三种，且键盘按币种小数位数动态调整（JPY 不允许小数）
- [ ] **手机端流水页与本月总览按币种分开显示**，不做跨币种加总
- [ ] Mac Safari 打开同一网址 → 自动进入分析模式
- [ ] 拖入 CSV / JSON 后：至少 4 种主图表 + 明细列表 + 汇总数正确
- [ ] **电脑端按币种切换 Tab**，每个 Tab 内所有图表与汇总只反映该币种数据
- [ ] 电脑端可导出 PDF / PNG
- [ ] 手机端 gzipped bundle < 100 KB；电脑端 < 200 KB
- [ ] 全流程不发送任何请求到非部署域名（网络面板可核验）
