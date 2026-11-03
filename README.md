# AI 学习教练

一个把「六步闭环学习法」和「五阶段能力地图」做成本地网页的 AI 学习工作台。每个学习项目都有自己的资料、阶梯、阶段定位、学习内容、考试记录和费曼对话，随时能回答三个问题：

1. **我在第几阶？** —— 五阶段定位 + 当前阶段高亮
2. **这一阶具体学什么？** —— 按阶段生成可照着学的讲解、例子、练习与自测，重点单独高亮
3. **我真的懂了吗？** —— AI 考官逐题打分与缺口报告 + 费曼复述判定 + 错题回顾

已实现项目与资料、五阶阶梯、学习内容、AI 考官、错题回顾和费曼反馈；筛选资源、核心 20%、速查表、间隔复习仍标记为后续版本。

## 功能

### 学习项目与学习资料
- 输入主题、目标、基础与每周时间，创建学习项目
- 「试试」区域展示你最近的项目，点一下即可复用主题、目标和背景，不用每次重填
- 创建时可选三种学习节奏：轻量（简单课题，一两次课收束）、标准、深入（复杂课题，多周投入）
- 新建项目时可以直接上传书籍或文档：`.pdf`、`.md`、`.txt`、`.csv`、`.json`、`.tsv`，单份 ≤20MB，最多一次 6 份
- 也可以随时在项目看板的「学习资料」卡片里补传、移除；支持点击选择和拖拽
- 系统只保存抽取出的文字（PDF 用 `unpdf` 提取），原文件不落盘。生成阶梯和学习内容时，AI 会优先依据这些资料的范围、术语和顺序
- 扫描版 PDF 没有文字层，需要先做 OCR；上传后会给出明确提示
- 「我的学习项目」里的每个项目都可以删除，删除会级联清理它的阶梯、定位、学习内容、考试、费曼记录和资料

### 学习阶梯（含阶段定位）
- 输入主题、目标、基础与每周时间，AI 生成 5 级阶梯
- 阶梯只用来**定位和验收**：每级保留一句话描述和过关标准，要能做到、常见坑、练习收进可展开的详情里，避免和具体学习内容重复
- 每级带有课时估算：约几次课、多少小时、跨几周；`0 次课` 表示「检查点，随前一阶带过」
- 估算可以逐阶内联修改（留空表示未设置），AI 会按学习节奏调整阶梯和学习内容的篇幅
- 5 道行为单选题（不是知识题，每题 4 个选项）→ 判定当前阶段、给出证据和下一步，并写回项目阶段

### 学习内容
- 定位之后，按当前阶段生成一份可以直接照着学的课程，而不是只有标题的大纲
- 每阶 5 节，固定覆盖概念讲解、具体例子、动手练习、常见错误和小结；每节都有练习与自测题
- 每份课程有一条明确的「本阶段主线」：5 节是同一条主线的连续推进，不再是零散知识拼盘
- 每节开头用「承接」说明它从上一节哪里接过来，结尾用「这一节要带走」给出一句可复用的结论
- **五种学习模式，可随时切换**：
  - 标准讲解：结构清晰地讲原理、给例子、做练习
  - 白话解释：尽量不用术语，先说人话，再把术语对回来
  - 苏格拉底式：用一连串递进问题引导你自己推理
  - 类比式：用一个贯穿始终的生活类比解释机制
  - 案例驱动：从真实案例或项目出发，边拆边学
- 同一阶段的每种模式单独生成、单独保存进度；切换模式时勾选状态互不影响
- **重点突出标记**：全课 3–5 个重点、每节 1–3 个本节重点单独做成高亮卡片；正文里真正关键的短语也会高亮显示
- 每节可标记「已学」；学完自动提示去 AI 考官验证
- 每节可直接跳转到费曼反馈，概念会自动填好；学完整阶后可以带着本阶段主题去开始一场聚焦考试
- 可以重新生成当前阶段、当前模式的内容（会重置该模式的勾选）

### AI 考官
- 配置题数（5–12）、起始难度（1–5，默认 1）、聚焦范围和题型
- 题型可选**单选题**或**简答题**：
  - 单选：每题 4 个选项，答对 10 分、答错 0 分
  - 简答：输入自己的答案，AI 对照参考答案按 0–10 分评分，列出讲对、漏掉和讲错的部分
- 题目以基础概念和直接应用为主，难度随表现动态调整
- 每题给出正确答案或参考答案、你的答案和解析；连续两题答错（简答低于 4 分）或达到题数上限自动收卷
- 结束后生成缺口报告：总分、强项、按严重度排序的缺口、带时长的复习计划
- 刷新页面可恢复进行中的考试；重复提交同一题是幂等的

### 错题回顾
- 自动汇总 AI 考官里的错题：单选答错（0 分）和简答低分（低于 7 分）
- 按知识点聚合，区分**反复出错**（同一知识点错 2 次及以上）和**偶发失误**（只错 1 次）
- 每个知识点显示错误次数、错误率、平均分、最近错误时间，并可展开查看最近几道错题的原题、你的答案、正确答案/参考答案和解析
- 「针对此知识点重考」会预填聚焦范围和最近一次错题的题型，但**不会自动开局**；确认后自己点开始

### 费曼反馈
- 输入一个概念，AI 用 12 岁能懂的语言讲解（流式输出，可随时停止，已写出的部分会保存）
- 你复述 → AI 点评四栏：讲对 / 漏掉 / 混淆 / 假懂，并给出清晰度与掌握度
- 未通过时，AI 会针对上一轮的薄弱点换一个类比重讲，直到通过
- 通过后记录状态、轮数和掌握度；所有历史会话可回看
- **学过的内容自测**：根据你标记为「已学」的节生成 3–5 道参考自测题，每题带提示、参考答案和来源；先自己答，再展开对照。没有已学内容时按当前阶段内容出题，并明确提示。只保留最新一组，可随时「换一组」

## 技术栈

- Next.js 16（App Router / Turbopack）、React 19、TypeScript
- Tailwind CSS 4（CSS-first 配置）
- better-sqlite3（服务端文件数据库）+ 原生 SQL 仓库层
- DeepSeek OpenAI 兼容接口（默认 `deepseek-flash`，可切 `deepseek-v4-pro`）
- zod 校验 AI 结构化输出与请求体；自行封装 SSE 流式转发
- unpdf 抽取 PDF 文本

## 快速开始

要求 Node.js >= 22.16（`unpdf` 与 better-sqlite3 都依赖 Node 22+）。

```bash
npm install
npm run dev       # http://localhost:3000
```

启动后打开「设置」页，填写 DeepSeek API Key、接口地址和模型，保存后点「测试连接」。配置保存在本机 `data/app.db`，不需要创建或修改 `.env.local`，因此项目可以直接上传 GitHub。

### 环境变量（可选）

设置页是推荐方式。Key、接口地址和模型以设置页为准，环境变量只在设置页对应项为空时兜底；思考模式与推理强度目前只读环境变量。修改环境变量后需要重启服务。

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 否 | 设置页未填 Key 时使用；推荐在「设置」页填写，避免明文出现在环境文件里 |
| `DEEPSEEK_BASE_URL` | 否 | 设置页未填接口地址时使用，默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 设置页未填模型时使用，如 `deepseek-flash` 或 `deepseek-v4-pro` |
| `DEEPSEEK_THINKING` | 否 | `disabled`（默认，首字更快）或 `enabled` |
| `DEEPSEEK_REASONING_EFFORT` | 否 | 思考模式下的推理强度，默认 `low` |
| `DATA_DIR` | 否 | 数据库目录，默认项目下的 `data/` |

> `.env.local` 和 `data/` 都已被 `.gitignore` 忽略。不要提交、不要分享，也不要把真实 Key 写进 `.env.local.example`。

## 数据与备份

- 数据库文件：`data/app.db`（另有 SQLite 的 `-wal` / `-shm` 文件）
- 上传的资料以**抽取后的纯文本**存进数据库；原始 PDF / Markdown 文件不会被保留
- 备份：停止服务后复制整个 `data/` 目录（或至少 `app.db`；有 WAL 文件时建议一起复制）
- **`data/` 里包含你在设置页填写的 API Key**（明文存放于 `app.db`）。备份、拷贝或分享 `data/` 等同于备份或分享密钥，请按敏感文件保管
- 恢复：把备份放回原位置再启动
- 删除学习项目会级联删除它的阶梯、定位、学习内容、考试、费曼记录和资料
- 首次启动会自动建库建表，无需手动迁移；已有数据库会在启动时自动升级到当前 schema

## 迁移到另一台电脑

1. 在旧电脑上**先停止服务**（`Ctrl+C`），避免 WAL 里还有未合并的数据。
2. 复制整个项目目录，但可以排除 `node_modules/`、`.next/` 和 `.git/`。务必带上 `data/`：里面既有学习记录，也有设置页保存的 API Key。`.env.local` 是可选的，不再需要它提供 Key。
3. 在新电脑安装 Node.js 22 LTS，进入项目目录执行：
   ```bash
   npm install
   npm run build
   npm run start
   ```
4. 打开 `http://localhost:3000`，在「设置」页点「测试连接」；项目、资料和学习记录应全部还在。
5. 如果不想连带旧 Key：复制 `data/` 后，在新机器的「设置」页替换或清除 API Key（替换前旧 Key 仍保存在数据库里）。含密钥的中间拷贝请妥善保管或删除。

如果不想复制整个项目，也可以在旧电脑执行 `npm run build` 后，把项目源码（不含 `node_modules`）和 `data/` 一起拷走；原生模块需要在目标机器重新 `npm install`，不要直接复用旧机器的 `node_modules`。

只想迁移学习数据时：停止两边的服务，把旧机器的 `app.db`、`app.db-wal`、`app.db-shm` 一起复制到新机器相同的 `DATA_DIR` 下，再启动。只复制 `app.db` 而漏掉 WAL 可能丢失最近的记录。

## 部署到自己的服务器

这个应用没有登录和多用户隔离，**不建议直接暴露到公网**。推荐路线是：应用只监听 `127.0.0.1`，前面放一层带身份验证的反向代理。

### 1. 准备运行环境

- Linux 服务器，Node.js >= 22.16
- 一个持久化目录放数据库，例如 `/var/lib/ai-learning-coach`（不要放在临时容器层里）
- 把代码放到 `/opt/ai-learning-coach`；模型配置可以在启动后到「设置」页填写，也可以写入生产用 `.env.local`（权限设为仅服务用户可读）

```bash
cd /opt/ai-learning-coach
npm install
npm run build
mkdir -p /var/lib/ai-learning-coach
chown -R www-data:www-data /var/lib/ai-learning-coach
```

### 2. 用 systemd 跑单进程

better-sqlite3 是本地文件数据库，**只能运行一个应用进程**，不要用 PM2 cluster 或多副本同时写同一个数据库。

`/etc/systemd/system/ai-learning-coach.service`（路径和用户按实际修改）：

```ini
[Unit]
Description=AI Learning Coach
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ai-learning-coach
Environment=NODE_ENV=production
Environment=DATA_DIR=/var/lib/ai-learning-coach
ExecStart=/usr/bin/npm run start -- -H 127.0.0.1 -p 3000
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ai-learning-coach
curl http://127.0.0.1:3000/api/health
```

`DATA_DIR` 指向持久目录后，重新部署代码不会丢数据。升级代码时：替换源码 → `npm install` → `npm run build` → `systemctl restart ai-learning-coach`。

### 3. 反向代理 + 身份验证

用 Nginx 或 Caddy 把 `127.0.0.1:3000` 暴露到你自己的域名，并且**必须加一层认证**（HTTP Basic Auth、公司 SSO、Cloudflare Access 等）。因为这个应用本身没有登录，任何能打开页面的人都能读取和删除全部学习数据。

Nginx 关键配置：

```nginx
location / {
    auth_basic "AI Learning Coach";
    auth_basic_user_file /etc/nginx/.htpasswd;

    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # AI 生成和流式讲解会持续较久，关闭缓冲并放宽超时
    proxy_buffering off;
    proxy_read_timeout 300s;
}
```

再配合 HTTPS（Caddy 可自动签发证书）、防火墙只放行 22/80/443，并确认 3000 端口不对外网开放。没有域名时，更安全的做法是保持应用监听 `127.0.0.1`，通过 SSH 隧道访问：

```bash
ssh -L 3000:127.0.0.1:3000 user@your-server
# 然后在本机打开 http://localhost:3000
```

### 4. 备份

在服务器上定期备份数据库目录。最稳妥的方式是短暂停止服务后复制，或者用 SQLite 的在线备份命令：

```bash
sqlite3 /var/lib/ai-learning-coach/app.db ".backup '/backup/ai-coach-$(date +%F).db'"
```

### 5. Docker（可选）

仓库没有附带 Dockerfile。若要容器化，注意三点：镜像里执行 `npm ci && npm run build`；把持久目录挂载到容器并设置 `DATA_DIR`（例如 `/data`）；只运行一个副本，不要横向扩容共用同一个 SQLite 文件。

## 安全说明

这个应用**没有登录和多用户隔离**，默认定位为在本机单人使用：

- Next.js 默认会在所有网卡上监听（启动日志里的 Network 地址）。只想本机访问时用
  `npm run dev -- -H 127.0.0.1`（生产模式同理：`npm run start -- -H 127.0.0.1`）
- 不要把它直接暴露到公网；放到服务器时必须由反向代理加认证，并只让应用监听回环地址
- 模型 Key 保存在本机 SQLite 的 `app_settings` 表里（或可选的 `.env.local`），只在服务端读取；设置页和 API 只返回脱敏后的 Key，不会把完整 Key 下发到浏览器。数据库是明文存储，备份 `data/` 时请按含密钥的文件处理
- 如果 Key 曾经出现在提交、截图或分享里，请先到 DeepSeek 控制台轮换，再在设置页填入新 Key
- 根目录的 `claude-pick.bat` 从 `%USERPROFILE%\.claude-pick.env.bat` 读取启动器令牌，项目目录不含明文令牌；不要把 Poe / DeepSeek 的 Claude Code 令牌写回这个脚本
- 所有学习数据和上传资料的抽取文本都在本机 SQLite；生成学习内容时，相关主题、背景和资料摘录会发送给 DeepSeek

## 常用脚本

```bash
npm run dev        # 开发服务器
npm run build      # 生产构建（含类型检查）
npm run start      # 运行生产构建
npm run typecheck  # 只跑 tsc
npm run lint       # ESLint
```

## 目录结构

```
app/                     页面与 Route Handlers
  project/[id]/          看板、学习阶梯、学习内容、AI 考官、错题回顾、费曼反馈
  settings/              模型配置、连接状态、数据位置、方法说明
  api/                   projects / ladder / assessment / lessons / sources / exam / feynman / settings
components/              UI 基础组件与各模块的交互组件
lib/
  ai/                    DeepSeek 客户端、提示词、zod schema
  repos/                 SQLite 仓库层（含设置、错题聚合、费曼自测题）
  db.ts                  建表、迁移、连接单例
  learned-content.ts     汇总「已学」内容供费曼自测出题
  files.ts               PDF / 文本资料文字抽取
  source-files.ts        前后端共用的上传限制与格式校验
  streaming.ts           SSE 转发与「边生成边落库」
  hooks/useTextStream.ts 浏览器端流式读取
data/app.db              本地学习数据与模型配置（gitignore）
```

## 错误处理

API 统一返回 `{ error: { code, message } }`。前端按 code 显示中文提示：Key 无效、余额不足、限流、上游异常、AI 输出不合法等。AI 的 JSON 输出会先做容错提取，失败后自动追加修复提示重试，仍失败才提示重新生成。

## 已知边界

- 仅支持 DeepSeek；没有多模型切换
- 没有登录、多用户、云端同步
- 学习项目之间不共享记忆；上下文只限当前会话
- 上传只支持 PDF 和纯文本类格式，不解析 Word / EPUB；扫描版 PDF 需要先 OCR
- 资源筛选、核心 20%、速查表、间隔复习尚未实现
- 错题按 AI 返回的知识点名称聚合，同义但措辞不同的知识点可能分到不同组；当前只做 trim / 小写归一化，不额外调用 AI 合并
