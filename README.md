# ds-balance

当前版本：V0.9.0

DeepSeek Harness Web 的 DeepSeek API 余额插件。在侧边栏底部“设置”旁（`sidebar.footer.action` 稳定 Slot）显示当前账户余额；侧边栏收起时显示紧凑的 `¥` 徽标和悬停提示。

## 功能

- 通过 DeepSeek 官方接口 `GET https://api.deepseek.com/user/balance` 查询余额。
- API Key 由 Harness credentials 服务在 Host 进程中解析，不发送到浏览器。
- 成功响应缓存 60 秒，请求超时为 10 秒。
- 浏览器每 60 秒轮询；失败时每 2 秒重试，最多 10 次。
- 组件注册到官方 `sidebar.footer.action` Slot，通过 Slot owner props 的 `wide` 区分展开/收起，不使用 portal、哈希类名或内部 DOM 插入。

## 工作原理

- `lib/index.js` 注入 WebServer 和 credentials，提供同源接口 `GET /ds-balance`（仅允许 GET，其余返回 405）。
- Host 使用 `DEEPSEEK_API_KEY` 请求 DeepSeek API，只把余额结果或错误码返回浏览器。
- `lib/client.js` 向 `sidebar.footer.action` 注册组件；展开状态显示完整余额，收起状态显示 `¥` 徽标。
- 样式由插件 Fiber 管理，卸载时自动移除。

## 环境要求

- DeepSeek Harness `0.1.0-rc.6` 同系列版本。
- 已初始化 `web` profile，并可打开默认地址 `http://127.0.0.1:3080`。
- `dsh plugin` 使用的 `pnpm` 已在 PATH 中；也可以通过 Corepack 提供 pnpm。
- 可用的 DeepSeek 开放平台 API Key。

## 安装

支持两种安装方式，任选其一。

### 方式一：在线安装（推荐）

直接以 GitHub 为源安装，包会以实体副本形式进入 profile，与本地目录无关：

```powershell
dsh plugin --profile web add github:95384/DSH-ds-balance
```

更新到最新版本：

```powershell
dsh plugin --profile web update ds-balance
```

### 方式二：本地安装（源码开发/调试）

克隆仓库并以本地目录安装：

```powershell
git clone https://github.com/95384/DSH-ds-balance.git
cd DSH-ds-balance
dsh plugin --profile web add .
```

本地安装以链接方式指向源码目录，修改源码后重启 `dsh web` 即可生效；**本地目录需保留**，删除后请改用在线安装。

### 通用说明

本包声明了 `dsh.bundle`，安装成功后会自动加入 profile 的 bundle 层并写入 Loader 条目，无需手动编辑 `cordis.patch.yml`。重启 `dsh web` 并刷新浏览器后生效。

### 配置 API Key

可以使用 Harness 已有的 credentials 设置；直接使用文件时，在 `~/.dsh/.credentials.yaml` 中设置：

```yaml
DEEPSEEK_API_KEY: sk-your-key
```

也可以在启动 `dsh web` 前提供同名环境变量。完成后重启 `dsh web` 并刷新浏览器。

## 验证

- 侧边栏底部“设置”旁显示“余额”和金额，收起时显示 `¥` 徽标。
- 访问 `http://127.0.0.1:3080/ds-balance`，成功时返回 `{"ok":true,"balance":...}`；非 GET 请求返回 405。
- 在浏览器 Network 面板检查 `/ds-balance` 请求，确认请求中没有 API Key。

## 卸载

执行：

```powershell
dsh plugin --profile web remove ds-balance
```

bundle 层会随依赖移除自动清理，无需手动编辑 `cordis.patch.yml`。最后重启 `dsh web` 并刷新浏览器。credentials 属于 Harness 用户配置，除非确定不再使用，否则不需要删除。

## 开发与验证

本项目没有构建步骤，生产入口直接位于 `lib/`。修改后可执行测试与语法检查：

```powershell
npm test
node --check lib/index.js
node --check lib/client.js
npm pack --dry-run
```

测试覆盖浏览器 bundle 的 `sidebar.footer.action` 注册契约（id、order、inject）。

Host 或 Loader 条目变化需要重启 `dsh web`。浏览器 bundle 更新后建议硬刷新，确保旧脚本缓存被替换。

## 兼容性与限制

- 余额来自 API 计费账户，并取 `balance_infos` 第一条记录。
- 余额组件挂载在官方 `sidebar.footer.action` Slot（list 型，additive），不依赖内部 DOM 或哈希类名；前端结构升级后仍应重新验证 Slot 名称与 owner props。
- 插件只支持 Web surface，不适用于 headless 或 TUI profile。
- Host/Client 插件接口与 Harness `0.1.0-rc.6` 对齐，升级 Harness 后应重新验证路由和侧边栏布局。

## 目录结构

```text
.
|-- README.md
|-- package.json
|-- cordis.patch.yml
|-- lib/
|   |-- index.js
|   \-- client.js
\-- test/
    \-- client.test.js
```

## 许可证

MIT，详见 `package.json`。
