# Homepage 中文说明

这是一个基于 Homepage 的自托管主页仪表盘 fork。它保留了原项目的高性能静态主页、服务与书签展示、Docker/Kubernetes/Proxmox 等集成能力，并在此基础上加入了中文后台、单密码登录、配置文件表单式编辑、背景图片上传、Bangumi 追番管理，以及顶部搜索框的服务/书签搜索能力。

## 主要功能

### 主页展示

- 服务卡片与书签卡片展示。
- 支持分组、嵌套分组、Tab、折叠、布局排序、图标、描述和自定义链接。
- 支持主题、配色、背景图片、背景透明度、背景模糊、背景饱和度、背景亮度和组件模糊。
- 支持 PWA、favicon、自定义 CSS/JS、多语言和中文界面。

### 搜索与快速启动

- 顶部搜索框支持 Google、DuckDuckGo、Bing、Baidu、Brave 和自定义搜索引擎。
- 支持多个搜索引擎手动切换，选择结果会保存在浏览器本地。
- 支持搜索建议。
- 顶部搜索框可以同时显示匹配到的服务和书签结果。
- Quick Launch 支持服务/书签搜索、URL 直达、互联网搜索和移动端入口。

### 后台管理

后台入口为：

```text
/admin
```

后台包含：

- `视觉设置`：编辑标题、主题、配色、背景图片、背景 opacity、blur、saturate、brightness 和组件模糊程度。
- `服务与书签`：用表单方式编辑 `services.yaml` 和 `bookmarks.yaml`。
- `追番管理`：编辑 Bangumi/AutoBangumi 追番条目的隐藏状态、播出星期、播出时间、首播日期和首集编号。

后台保存后会写回 `/app/config` 中的 YAML/JSON 配置文件，并通过重新验证让主页持久生效。

### 登录与公网访问保护

仓库内置 NextAuth 登录保护。启用后，主页和后台都会要求登录。

单密码登录需要设置：

```env
HOMEPAGE_AUTH_ENABLED=true
HOMEPAGE_AUTH_PASSWORD=your-password
HOMEPAGE_AUTH_SECRET=your-random-secret
HOMEPAGE_ALLOWED_HOSTS=your.domain.com
HOMEPAGE_EXTERNAL_URL=https://your.domain.com
```

也支持 OIDC 登录：

```env
HOMEPAGE_AUTH_ENABLED=true
HOMEPAGE_AUTH_SECRET=your-random-secret
HOMEPAGE_EXTERNAL_URL=https://your.domain.com
HOMEPAGE_OIDC_ISSUER=https://auth.example.com/realms/homepage
HOMEPAGE_OIDC_CLIENT_ID=homepage
HOMEPAGE_OIDC_CLIENT_SECRET=client-secret
```

如果要部署到公网，建议同时使用反向代理、HTTPS 和正确的 `HOMEPAGE_ALLOWED_HOSTS`。

### Bangumi 追番

本 fork 增加了 Bangumi 信息小组件和管理接口：

- 主页显示追番时间小组件。
- 后台可编辑哪些追番隐藏、哪些追番需要补充时间。
- 支持 AutoBangumi 到达 webhook。
- 管理 API 支持登录态或管理 token。

常用环境变量：

```env
HOMEPAGE_BANGUMI_ADMIN_TOKEN=change-me
HOMEPAGE_BANGUMI_WEBHOOK_TOKEN=change-me
HOMEPAGE_AUTOBANGUMI_URL=http://autobangumi:7892
HOMEPAGE_AUTOBANGUMI_USERNAME=username
HOMEPAGE_AUTOBANGUMI_PASSWORD=password
```

### 服务集成

仓库当前包含 100+ 服务集成，源码中 `src/widgets/*/widget.js` 检索到 158 个服务 widget。常见类型包括：

- 媒体服务：Plex、Jellyfin、Emby、Tautulli、Immich、Navidrome。
- 下载与索引：qBittorrent、Transmission、Deluge、SABnzbd、NZBGet、Radarr、Sonarr、Lidarr、Readarr、Prowlarr、Bazarr。
- 系统与监控：Unraid、Proxmox、TrueNAS、Glances、Grafana、Prometheus、Uptime Kuma、Gatus。
- 网络与反代：Pi-hole、AdGuard Home、Traefik、Nginx Proxy Manager、Caddy、OpenWrt、pfSense、OPNsense。
- 自动化与服务：Home Assistant、Nextcloud、Gitea、GitLab、Portainer、Paperless-ngx、Wallos、Mealie。
- 自定义：Custom API、iframe、MCP、Ping、Site Monitor。

所有 widget 的请求都会通过服务端代理，避免在浏览器中直接暴露服务 API key。

## 配置文件

常用配置位于容器内：

```text
/app/config
```

主要文件：

- `settings.yaml`：主页标题、主题、背景、布局、Quick Launch、全局行为。
- `services.yaml`：服务分组与服务卡片。
- `bookmarks.yaml`：书签分组。
- `widgets.yaml`：顶部信息组件，例如搜索、天气、资源、时间、Bangumi。
- `docker.yaml`：Docker 集成配置。
- `kubernetes.yaml`：Kubernetes 集成配置。
- `proxmox.yaml`：Proxmox 集成配置。

后台目前主要写回：

- `settings.yaml`
- `services.yaml`
- `bookmarks.yaml`
- Bangumi 相关配置文件

## Docker Compose 示例

```yaml
services:
  homepage:
    image: local/homepage-garess:codex-homepage-admin-editor
    container_name: homelab-homepage
    ports:
      - "8088:3000"
    environment:
      HOMEPAGE_ALLOWED_HOSTS: "your.domain.com,10.0.0.2:8088,localhost:3000"
      HOMEPAGE_AUTH_ENABLED: "true"
      HOMEPAGE_AUTH_PASSWORD: "change-me"
      HOMEPAGE_AUTH_SECRET: "replace-with-a-long-random-secret"
      HOMEPAGE_EXTERNAL_URL: "https://your.domain.com"
    volumes:
      - /mnt/user/appdata/homelab-homepage/config:/app/config
      - /mnt/user/appdata/homelab-homepage/backgrounds:/app/public/backgrounds
      - /mnt/user/appdata/homelab-homepage/icons:/app/public/icons
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped
```

在 Unraid Docker 页面中，可以把上面的环境变量配置成模板字段，方便直接修改登录密码、允许访问域名和外部 URL。

## 本地开发

安装依赖：

```bash
pnpm install
```

启动开发服务器：

```bash
pnpm dev
```

构建生产版本：

```bash
pnpm build
```

运行测试：

```bash
pnpm test
```

## 重要路由

- `/`：主页。
- `/admin`：后台入口。
- `/admin/visual`：视觉设置。
- `/admin/content`：服务与书签编辑。
- `/admin/bangumi`：追番管理。
- `/auth/signin`：登录页。
- `/api/healthcheck`：健康检查。
- `/api/revalidate`：重新验证并刷新配置。
- `/api/search/searchSuggestion`：搜索建议。
- `/api/services`：服务数据。
- `/api/bookmarks`：书签数据。
- `/api/widgets`：信息组件数据。

## 安全建议

- 公网访问时必须启用登录保护。
- 设置强密码和足够长的 `HOMEPAGE_AUTH_SECRET`。
- 正确配置 `HOMEPAGE_ALLOWED_HOSTS`，避免 Host header 校验失败或暴露到非预期域名。
- 使用 HTTPS 反向代理。
- 不要把整个 `/app/public` 目录挂载出去，只挂载需要的 `backgrounds`、`icons` 等子目录。
- 服务 API key、token、密码应只写在服务器配置文件或环境变量中，不要写进前端代码。

## 相关源码入口

- 主页：`src/pages/index.jsx`
- 登录：`src/pages/auth/signin.jsx`
- 登录 API：`src/pages/api/auth/[...nextauth].js`
- 中间件保护：`src/middleware.js`
- 后台页面：`src/pages/admin`
- 后台组件：`src/components/admin`
- 服务 widget：`src/widgets`
- 信息 widget：`src/components/widgets`
- 配置读取与写回：`src/utils/config`
- Bangumi 工具：`src/utils/bangumi`
