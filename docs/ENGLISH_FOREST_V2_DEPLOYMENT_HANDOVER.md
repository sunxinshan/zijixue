# 英语森林 V2 生产部署与替换交接文档

> 文档版本：v1.0  
> 编写日期：2026-10-16  
> 目标：用新项目 `zijixuenew / English Forest V2` 替换现有 English Forest 生产项目。  
> 替换范围：仅影响 `yidongxun.com` 对应的旧 `project2` 服务。  
> **绝对不能影响**同服务器上的 `paihangbang.xyz / ranking` 项目。

---

## 1. 最终部署结论

推荐采用“同服务器原地替换”方案：

```text
yidongxun.com / www.yidongxun.com
              │
              ▼
           Nginx 443
        ┌─────┴──────────┐
        │                │
 /api/* │                │ 其他请求
        ▼                ▼
FastAPI 8002        Next.js 8003
        │                │
        └──────┬─────────┘
               ▼
        MySQL 127.0.0.1:3306
        database: english_forest
```

说明：

- DNS 已指向现有服务器 `115.159.77.118`，优先不需要改 DNS。
- 域名指向新项目的动作，实际是在 Nginx 中把旧 `8001` 改为：
  - `/api/` → `127.0.0.1:8002`
  - 其他请求 → `127.0.0.1:8003`
- 旧 Next.js 项目继续保留在 `/opt/project2/app`，作为回滚版本。
- 新项目部署到 `/opt/project2/app-v2`。
- 新项目使用独立 MySQL 数据库 `english_forest`，不得使用 `ranking` 库。
- 新旧服务切换通过同一个 systemd 名称 `project2` 完成，避免申请额外权限。

---

## 2. 生产服务器事实

| 项目 | 值 |
|---|---|
| 公网 IP | `115.159.77.118` |
| 系统 | Ubuntu 24.04 LTS |
| 规格 | 4 核 4G，磁盘 40G |
| SSH 端口 | 22 |
| 登录账号 | `project2` |
| SSH Key | `/Users/sxs/.ssh/id_ed25519_project2_englishforest_20260920` |
| Python | 3.12.3 |
| Node | `/opt/project2/runtime/node/bin/node`，v24.21.0 |
| MySQL | 8.0.46，监听 `127.0.0.1:3306` |
| Nginx | 1.24 |
| `ranking` 后端 | `127.0.0.1:8000` |
| 旧 English Forest | `127.0.0.1:8001`，systemd `project2` |
| 新 FastAPI 建议端口 | `127.0.0.1:8002` |
| 新 Next.js 建议端口 | `127.0.0.1:8003` |

服务器当前没有全局 `uv` 命令。可以使用以下任一方式安装新项目后端依赖：

- 推荐：`project2` 用户本地安装 `uv`。
- 备选：使用 `python3 -m venv` + `pip install .`。

---

## 3. 绝对禁止事项

严禁：

- 修改或删除 `/opt/ranking`
- 修改 `ranking.service`
- 修改 `/etc/nginx/conf.d/ranking.conf`
- 使用 `ranking` MySQL 数据库
- 使用 `ranking` MySQL 用户
- 使用 `127.0.0.1:8000`
- 对公网开放 `3306`
- 使用 `default_server`
- 使用 `server_name _`
- 修改 deploy 用户的 crontab
- 将 `.env`、API Key、JWT Secret、MySQL 密码提交到 Git

---

## 4. 新项目事实

新项目本地路径：

```text
/Users/sxs/Documents/ChatGPT/zijixuenew
```

新项目结构：

```text
zijixuenew/
  backend/       # FastAPI + SQLAlchemy + Alembic + pytest
  frontend/      # Next.js + React + TypeScript
  data/
    seed/        # 课程 JSON 导出
    assets/
      comic/     # 漫画 PNG
  docs/
  Makefile
```

技术栈：

- 后端：Python 3.12、FastAPI、SQLAlchemy 2、Alembic、Pydantic
- 前端：Next.js 16.3.5、React 19、TypeScript
- 数据库：开发 SQLite，生产 MySQL
- 测试：pytest、ruff、Node test、Next.js build
- AI：AI Adapter，支持 mock / OpenAI 兼容 / DeepSeek
- 认证：注册、登录、JWT、refresh token、Argon2id

新项目当前 Git 信息（部署前必须重新确认）：

```text
HEAD: 9342a92 feat: add promotion mode nickname login
```

注意：新项目 README 的阶段状态表部分内容可能滞后于 STATUS.md 和真实源码。部署判断以当前 Git Commit、完整测试结果和实际可运行功能为准，不能只依赖 README 状态表。

当前工作树存在未提交和未跟踪文件，部署前必须先处理：

```bash
cd /Users/sxs/Documents/ChatGPT/zijixuenew
git status --short
git add ...
git commit -m "..."
git tag english-forest-v2-YYYYMMDD
git rev-parse HEAD
```

如果直接部署脏工作树，会导致生产版本无法通过 Git Commit 追溯和回滚。**未提交前不要开始正式替换。**

---

## 5. 上线前必须解决的阻塞项

### 5.1 添加 MySQL 驱动

新项目文档中的生产连接串示例是：

```text
mysql+pymysql://...
```

但当前 `backend/pyproject.toml` 和 `uv.lock` 没有 `pymysql`。直接部署到 MySQL 会在 SQLAlchemy 创建 Engine 时失败。

必须在正式发布前执行：

```bash
cd /Users/sxs/Documents/ChatGPT/zijixuenew/backend
uv add 'pymysql[rsa]>=1.1,<2'
uv lock
```

或者手动把 `pymysql[rsa]` 加入 `pyproject.toml` 并更新锁文件。

然后提交：

```bash
cd /Users/sxs/Documents/ChatGPT/zijixuenew
git add backend/pyproject.toml backend/uv.lock
git commit -m "chore: add mysql driver for production"
```

没有这一步，不允许切换生产。

### 5.2 创建独立 MySQL 数据库和账号

服务器管理员执行：

```sql
CREATE DATABASE english_forest
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'english_forest'@'127.0.0.1'
  IDENTIFIED BY '<STRONG_RANDOM_PASSWORD>';

GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, DROP, INDEX, REFERENCES
ON english_forest.* TO 'english_forest'@'127.0.0.1';

FLUSH PRIVILEGES;
```

禁止复用：

```text
database: ranking
user: ranking
```

需要向服务器管理员索取：

- `english_forest` 数据库名确认
- `english_forest` 用户
- 强随机密码
- MySQL 主机 `127.0.0.1`
- 端口 `3306`

密码只写入生产环境文件，禁止写入 Git、聊天记录或前端代码。

### 5.3 生成生产 SECRET_KEY

```bash
openssl rand -hex 32
```

使用输出作为：

```text
SECRET_KEY=<64位随机字符串>
```

生产环境 `SECRET_KEY` 少于 32 字符时，新项目会拒绝启动。

### 5.4 准备 AI Key

从旧项目生产 `.env.local` 复制现有 DeepSeek 配置时：

- 不要在终端输出 Key。
- 不要提交到 Git。
- 直接安全写入新项目生产环境文件。
- 如果新项目仍先使用 mock，可以暂时配置 `LLM_PROVIDER=mock`，但正式环境建议配置真实 Provider。

---

## 6. 生产目录规划

推荐目录：

```text
/opt/project2/
├── app/                         # 旧 English Forest，保留用于回滚
├── app-v2/                      # 新 English Forest
│   ├── backend/
│   ├── frontend/
│   ├── data/
│   └── start.sh
├── shared/
│   ├── env/
│   │   └── backend.env          # 生产环境变量，chmod 600
│   ├── seed/                    # 课程 JSON
│   ├── assets/
│   │   └── comic/
│   └── storage/                 # 管理员上传文件
├── deploy/
│   ├── project2.service         # 当前 systemd 单元
│   └── project2.service.old
├── nginx/
│   ├── project2.conf            # 当前 Nginx 配置
│   └── project2.conf.old
├── logs/
└── runtime/
    └── node/
```

重要：

- `shared/` 是持久化目录，不随版本发布删除。
- `app-v2/` 可以重新部署，但不能存放唯一用户数据。
- MySQL 和 `shared/storage` 是生产数据源。
- 旧 `app/` 在回滚观察期结束前不得删除。

---

## 7. 生产环境变量

创建：

```text
/opt/project2/shared/env/backend.env
```

推荐内容：

```env
ENVIRONMENT=production

DATABASE_URL=mysql+pymysql://english_forest:<PASSWORD>@127.0.0.1:3306/english_forest?charset=utf8mb4

CORS_ORIGINS=["https://yidongxun.com","https://www.yidongxun.com"]

SECRET_KEY=<64_CHAR_RANDOM_SECRET>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=14
REFRESH_COOKIE_NAME=english_forest_refresh
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=.yidongxun.com

STORAGE_BACKEND=local
STORAGE_LOCAL_ROOT=/opt/project2/shared/storage
LOCAL_ASSET_ROOT=/opt/project2/shared/assets

AI_PROVIDER=deepseek
AI_API_KEY=<DEEPSEEK_KEY>
AI_MODEL=deepseek-v4-flash
AI_BASE_URL=https://api.deepseek.com/v1
AI_TIMEOUT_SECONDS=60
AI_MAX_RETRIES=2
AI_FALLBACK_COOLDOWN_SECONDS=60
```

设置权限：

```bash
chmod 600 /opt/project2/shared/env/backend.env
```

前端构建时使用：

```env
NEXT_PUBLIC_API_BASE_URL=https://yidongxun.com
```

这是浏览器公开变量，不能放任何密钥。

---

## 8. 发布包准备

### 8.1 本地先完成新项目验证

```bash
cd /Users/sxs/Documents/ChatGPT/zijixuenew
make verify
```

部署候选版本至少必须通过：

- 课程导出校验
- 后端 pytest
- 后端 ruff
- 前端测试
- 前端 lint
- 前端 typecheck
- 前端 build

如果 `make verify` 没有覆盖生产 MySQL，必须在预发布/测试环境额外执行 MySQL migration 验证。

### 8.2 创建 Git 发布包

```bash
cd /Users/sxs/Documents/ChatGPT/zijixuenew

git status --short
# 必须为空

git tag english-forest-v2-YYYYMMDD
git archive --format=tar.gz \
  --output=/tmp/english-forest-v2-YYYYMMDD.tar.gz \
  english-forest-v2-YYYYMMDD

git rev-parse HEAD
```

记录 Commit、Tag、构建时间和发布包 SHA256。

---

## 9. 上传新项目

示例：

```bash
scp -i /Users/sxs/.ssh/id_ed25519_project2_englishforest_20260920 \
  /tmp/english-forest-v2-YYYYMMDD.tar.gz \
  project2@115.159.77.118:/tmp/

ssh -i /Users/sxs/.ssh/id_ed25519_project2_englishforest_20260920 \
  project2@115.159.77.118
```

服务器操作：

```bash
cd /opt/project2
mkdir -p /tmp/ef-v2-release
tar -xzf /tmp/english-forest-v2-YYYYMMDD.tar.gz -C /tmp/ef-v2-release

rm -rf /opt/project2/app-v2
mv /tmp/ef-v2-release /opt/project2/app-v2

mkdir -p /opt/project2/shared/seed
mkdir -p /opt/project2/shared/assets
mkdir -p /opt/project2/shared/storage

cp -a /opt/project2/app-v2/data/seed/. /opt/project2/shared/seed/
cp -a /opt/project2/app-v2/data/assets/. /opt/project2/shared/assets/
```

不要上传本地：

- `backend/.env`
- `backend/english_forest.db`
- `.venv`
- `node_modules`
- `.next`
- 任何密钥文件

---

## 10. 后端安装

### 10.1 使用 uv（推荐）

服务器当前没有全局 uv。可以由 `project2` 用户安装到 `$HOME/.local/bin`：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
uv --version
```

然后：

```bash
cd /opt/project2/app-v2/backend
uv sync --frozen
```

如果网络受限，必须由服务器管理员安装 uv 或提供可访问的 Python 包镜像。

### 10.2 使用 venv + pip（备选）

```bash
cd /opt/project2/app-v2/backend
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install .
```

如果使用备选方案，必须确认生产依赖中包含：

```text
pymysql[rsa]
```

### 10.3 后端配置检查

```bash
cd /opt/project2/app-v2/backend
set -a
source /opt/project2/shared/env/backend.env
set +a

python - <<'PY'
from app.core.config import get_settings
s = get_settings()
print(s.environment)
print(s.database_url.split("@")[-1])
print(s.storage_local_root)
print(s.local_asset_root)
PY
```

不得打印完整 `DATABASE_URL`，因为其中包含密码。

---

## 11. MySQL 迁移和课程导入

### 11.1 执行 Alembic

在切换 Nginx 之前，先只验证数据库连接和迁移：

```bash
cd /opt/project2/app-v2/backend
set -a
source /opt/project2/shared/env/backend.env
set +a

.venv/bin/alembic upgrade head
```

如果使用 uv：

```bash
uv run alembic upgrade head
```

### 11.2 课程导入 Dry Run

```bash
.venv/bin/python -m app.cli import-course \
  --seed-dir /opt/project2/shared/seed \
  --assets-dir /opt/project2/shared/assets \
  --dry-run
```

必须确认：

- Knowledge = 1
- Subtopic = 6
- Pattern = 28
- TeachingContent = 28
- Comic Lesson = 5
- Comic Panel = 8
- UnderstandingCheck = 2
- Asset = 8
- 可选题目池和 baseline 数量正确
- 无缺失 Asset
- 无 FK 错误

### 11.3 正式课程导入

```bash
.venv/bin/python -m app.cli import-course \
  --seed-dir /opt/project2/shared/seed \
  --assets-dir /opt/project2/shared/assets
```

重复导入要求：

- 不重复创建相同 ID。
- 需要更新已有实体时显式添加 `--update-existing`。
- 导入结果报告必须保存到发布记录中。

### 11.4 发布题库

新项目将导入题目默认标记为 `draft`。如果没有执行发布，学生练习可能无题可用。

如果所有导入题已经完成审核：

```bash
.venv/bin/python -m app.cli publish-questions
```

如果只发布某个 Subtopic：

```bash
.venv/bin/python -m app.cli publish-questions \
  --knowledge-id comparative \
  --subtopic-id comparative-basic
```

### 11.5 创建管理员

```bash
.venv/bin/python -m app.cli create-admin \
  --username admin \
  --display-name "管理员"
```

不要在命令行明文传生产管理员密码，优先使用 CLI 的交互式密码输入。

---

## 12. 前端安装和构建

```bash
cd /opt/project2/app-v2/frontend

export PATH=/opt/project2/runtime/node/bin:$PATH

cat > .env.production <<'ENV'
NEXT_PUBLIC_API_BASE_URL=https://yidongxun.com
ENV

npm ci
npm run build
```

生产构建必须验证：

```text
Next.js build success
/ knowledge route generated
/ practice route generated
/ challenge route generated
/ admin route generated
```

不要上传本机的 `.next`，必须在服务器重新构建。

---

## 13. 启动脚本

创建：

```text
/opt/project2/app-v2/start.sh
```

内容：

```bash
#!/usr/bin/env bash
set -euo pipefail

export PATH=/opt/project2/runtime/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export NODE_ENV=production
export PYTHONUNBUFFERED=1

set -a
source /opt/project2/shared/env/backend.env
set +a

cleanup() {
  kill "${API_PID:-}" "${WEB_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd /opt/project2/app-v2/backend
.venv/bin/uvicorn app.main:app \
  --host 127.0.0.1 \
  --port 8002 \
  --proxy-headers &
API_PID=$!

cd /opt/project2/app-v2/frontend
node node_modules/next/dist/bin/next start \
  -H 127.0.0.1 \
  -p 8003 &
WEB_PID=$!

wait -n "$API_PID" "$WEB_PID"
exit $?
```

设置权限：

```bash
chmod 750 /opt/project2/app-v2/start.sh
```

---

## 14. systemd 单元

更新：

```text
/opt/project2/deploy/project2.service
```

内容：

```ini
[Unit]
Description=English Forest V2 Service
After=network.target mysql.service

[Service]
Type=simple
User=project2
Group=project2
WorkingDirectory=/opt/project2/app-v2
Environment=NODE_ENV=production
EnvironmentFile=/opt/project2/shared/env/backend.env
ExecStart=/opt/project2/app-v2/start.sh
Restart=always
RestartSec=5
UMask=0077
SyslogIdentifier=project2

[Install]
WantedBy=multi-user.target
```

安装：

```bash
sudo project2-apply-service
sudo systemctl restart project2
sleep 3
systemctl is-active project2
```

健康检查：

```bash
curl -sS http://127.0.0.1:8002/health
curl -sS http://127.0.0.1:8002/api/v1/health
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8003/
```

---

## 15. Nginx 配置

更新：

```text
/opt/project2/nginx/project2.conf
```

推荐配置：

```nginx
upstream english_forest_api {
    server 127.0.0.1:8002;
    keepalive 16;
}

upstream english_forest_web {
    server 127.0.0.1:8003;
    keepalive 16;
}

server {
    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    server_name yidongxun.com www.yidongxun.com;

    ssl_certificate /etc/letsencrypt/live/yidongxun.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yidongxun.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 20m;

    location /api/ {
        proxy_pass http://english_forest_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /_next/ {
        proxy_pass http://english_forest_web;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://english_forest_web;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    if ($host = www.yidongxun.com) {
        return 301 https://$host$request_uri;
    }

    if ($host = yidongxun.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    listen [::]:80;
    server_name yidongxun.com www.yidongxun.com;
    return 404;
}
```

应用：

```bash
sudo project2-apply-nginx
```

确认：

- `nginx -t` 成功
- 只修改 `/etc/nginx/conf.d/project2.conf`
- 不修改 `ranking.conf`
- HTTPS 证书路径正确

---

## 16. 正式替换流程

### 16.1 冻结和备份旧项目

旧项目目录保持：

```text
/opt/project2/app
```

备份 Nginx 和 systemd：

```bash
cd /opt/project2
cp nginx/project2.conf nginx/project2.conf.old-YYYYMMDD
cp deploy/project2.service deploy/project2.service.old-YYYYMMDD
```

备份旧运行时数据：

```bash
tar -czf /opt/project2/backups/project2-old-data-YYYYMMDD.tar.gz \
  /opt/project2/app/.data \
  /opt/project2/app/.env.local
```

注意：

- `.env.local` 含密钥，备份文件必须 `chmod 600`。
- 不要把备份上传 Git。
- 不要动 `/opt/ranking`。

### 16.2 先启动新项目做预检

在修改 Nginx 前先验证：

```bash
curl -sS http://127.0.0.1:8002/api/v1/health
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8003/
```

通过后再执行域名切换。

### 16.3 应用新 Nginx

```bash
sudo project2-apply-nginx
```

### 16.4 停掉旧 English Forest

旧服务和新服务共用 systemd 名称 `project2`，切换新 unit 后旧进程会被停止。

确认：

```bash
systemctl is-active project2
curl -sS https://yidongxun.com/api/v1/health
```

### 16.5 验证 ranking 不受影响

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://paihangbang.xyz/
```

---

## 17. 上线验收

### 17.1 域名和 HTTPS

- [ ] `https://yidongxun.com/` 200
- [ ] `https://www.yidongxun.com/` 正确跳转
- [ ] HTTPS 证书有效
- [ ] HTTP 自动跳转 HTTPS

### 17.2 后端

- [ ] `http://127.0.0.1:8002/health` 200
- [ ] `http://127.0.0.1:8002/api/v1/health` 200
- [ ] `https://yidongxun.com/api/v1/health` 200
- [ ] MySQL `SELECT 1` 正常
- [ ] Alembic current = head
- [ ] 无数据库连接池错误

### 17.3 前端

- [ ] 首页可打开
- [ ] 登录/注册可用
- [ ] Knowledge 页面可加载
- [ ] 讲解页可加载
- [ ] 漫画资源可加载
- [ ] 正式练习可加载
- [ ] Challenge 可加载
- [ ] 刷新 active Session 可恢复

### 17.4 课程

- [ ] 1 Knowledge
- [ ] 6 Subtopic
- [ ] 28 Pattern
- [ ] 8 漫画资源
- [ ] 2 UnderstandingCheck
- [ ] 题库已发布
- [ ] 管理员账号可用

### 17.5 安全

- [ ] `SECRET_KEY` 为生产随机值
- [ ] `COOKIE_SECURE=true`
- [ ] MySQL 仅监听 127.0.0.1
- [ ] 8002/8003 不直接对公网开放
- [ ] 前端 bundle 无 API Key
- [ ] `backend.env` 权限 600
- [ ] 管理端 API 有权限保护

### 17.6 共享服务器

- [ ] `ranking` 仍 active
- [ ] `paihangbang.xyz` 200
- [ ] `/opt/ranking` 未修改
- [ ] `ranking` MySQL 未修改
- [ ] `/etc/nginx/conf.d/ranking.conf` 未修改

---

## 18. 回滚方案

### 18.1 回滚前停止新项目

```bash
sudo systemctl stop project2
```

### 18.2 恢复旧 systemd

```bash
cp /opt/project2/deploy/project2.service.old-YYYYMMDD \
   /opt/project2/deploy/project2.service

sudo project2-apply-service
sudo systemctl restart project2
```

### 18.3 恢复旧 Nginx

```bash
cp /opt/project2/nginx/project2.conf.old-YYYYMMDD \
   /opt/project2/nginx/project2.conf

sudo project2-apply-nginx
```

### 18.4 检查

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://yidongxun.com/
curl -sS -o /dev/null -w '%{http_code}\n' https://paihangbang.xyz/
```

回滚不需要删除新 MySQL 数据库。修好后再重新切换。

---

## 19. 数据和用户迁移限制

旧项目没有服务端用户数据库：

- 用户学习数据在浏览器 LocalStorage。
- 旧 Questions 在文件 QuestionPool。
- 旧用户名固定为 `local-user`。

新项目有真正的登录和 MySQL 用户数据，因此：

- 旧浏览器 LocalStorage 用户进度不会自动迁移到新 MySQL。
- 如果必须保留旧用户进度，需要先导出浏览器数据，再提供一次性迁移脚本/API。
- 如果没有导出要求，生产更新后可视为重新开始用户数据，但课程数据必须完整导入。
- 旧 `.data/question-pools` 只在必要时作为可选题库素材，不要直接依赖旧运行目录。

---

## 20. 备份、日志和定时任务

### 20.1 MySQL 备份

使用 `project2` 用户自己的 crontab，不要修改 deploy 用户 crontab：

```bash
crontab -e
```

示例：

```cron
15 3 * * * /usr/bin/mysqldump --single-transaction --routines --triggers \
  -h 127.0.0.1 -u english_forest -p'<PASSWORD>' english_forest \
  | gzip > /opt/project2/backups/mysql-$(date +\%F).sql.gz

30 3 * * 0 find /opt/project2/backups -name 'mysql-*.sql.gz' -mtime +30 -delete
```

生产建议使用 MySQL 配置文件和更安全的凭据文件，不要把密码直接放进 crontab。

### 20.2 应用日志

- systemd：`journalctl -u project2`
- 后端日志：stdout/stderr 交给 systemd
- Next.js 日志：stdout/stderr 交给 systemd
- 如额外文件日志，放 `/opt/project2/logs` 并配置 logrotate

### 20.3 shared storage 备份

必须备份：

```text
/opt/project2/shared/storage
/opt/project2/shared/assets
/opt/project2/shared/env/backend.env
```

---

## 21. 常用诊断命令

```bash
# 服务状态
systemctl status project2 --no-pager

# 最近日志
journalctl -u project2 -n 100 --no-pager

# 端口
ss -tlnp | grep -E ':(8000|8001|8002|8003|3306)\b'

# Nginx
sudo nginx -t

# 后端
curl -sS http://127.0.0.1:8002/api/v1/health

# 前端
curl -sS -I http://127.0.0.1:8003/

# 数据库连接
cd /opt/project2/app-v2/backend
set -a; source /opt/project2/shared/env/backend.env; set +a
.venv/bin/alembic current
```

---

## 22. 交接时必须确认的信息

部署工程师开始前必须拿到：

- [ ] 新项目 Git 仓库地址或发布包
- [ ] 固定 Commit / Tag
- [ ] `english_forest` MySQL 用户名和密码
- [ ] `SECRET_KEY`
- [ ] AI Provider Key、Model、Base URL
- [ ] 是否保留旧 LocalStorage 用户数据
- [ ] 管理员账号名称
- [ ] 发布窗口
- [ ] 回滚负责人
- [ ] 是否允许在现有服务器原地切流

未确认以上信息时，只能做预部署，不能切换生产域名。

---

## 23. 最终交付命令摘要

```bash
# 1. 本地验证和发布
cd /Users/sxs/Documents/ChatGPT/zijixuenew
git status --short
make verify
git tag english-forest-v2-YYYYMMDD
git archive --format=tar.gz \
  --output=/tmp/english-forest-v2-YYYYMMDD.tar.gz \
  english-forest-v2-YYYYMMDD

# 2. 上传
scp -i /Users/sxs/.ssh/id_ed25519_project2_englishforest_20260920 \
  /tmp/english-forest-v2-YYYYMMDD.tar.gz \
  project2@115.159.77.118:/tmp/

# 3. 服务器安装
ssh -i /Users/sxs/.ssh/id_ed25519_project2_englishforest_20260920 \
  project2@115.159.77.118

# 4. 后端迁移和导入
cd /opt/project2/app-v2/backend
set -a; source /opt/project2/shared/env/backend.env; set +a
.venv/bin/alembic upgrade head
.venv/bin/python -m app.cli import-course \
  --seed-dir /opt/project2/shared/seed \
  --assets-dir /opt/project2/shared/assets
.venv/bin/python -m app.cli publish-questions

# 5. 前端构建
cd /opt/project2/app-v2/frontend
export PATH=/opt/project2/runtime/node/bin:$PATH
npm ci
npm run build

# 6. 安装和启动
sudo project2-apply-service
sudo systemctl restart project2

# 7. Nginx 切流
sudo project2-apply-nginx

# 8. 验收
curl -sS https://yidongxun.com/api/v1/health
curl -sS -o /dev/null -w '%{http_code}\n' https://yidongxun.com/
curl -sS -o /dev/null -w '%{http_code}\n' https://paihangbang.xyz/
```

---

## 24. 交接结论

本部署方案采用同服务器、独立数据库、独立进程、Nginx 切流的替换方式：

- 不影响 `ranking`
- 旧 English Forest 保留可回滚
- 新项目 MySQL 独立
- 域名继续指向同一服务器，只在 Nginx 内切换上游
- 新 FastAPI 使用 8002
- 新 Next.js 使用 8003
- 旧服务使用 8001，切换后可停止

正式开工前必须先解决：

1. 新项目 Git 工作树未提交。
2. 新项目缺少 `pymysql[rsa]` 生产驱动。
3. `english_forest` MySQL 数据库和账号尚未创建。
4. 生产 `SECRET_KEY` 和 `.env` 尚未准备。
5. 旧 LocalStorage 用户数据是否能迁移尚未确认。

以上全部确认后，再执行域名切流。
