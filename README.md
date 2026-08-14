# ds-balance

DeepSeek Harness Web 的 DeepSeek API 余额插件。在侧边栏“新会话”按钮之后显示当前账户余额；侧边栏收起时显示紧凑的 `¥` 徽标和悬停提示。

## 功能

- 通过 DeepSeek 官方接口 `GET https://api.deepseek.com/user/balance` 查询余额。
- API Key 由 Harness credentials 服务在 Host 进程中解析，不发送到浏览器。
- 成功响应缓存 60 秒，请求超时为 10 秒。
- 浏览器每 60 秒轮询；失败时每 2 秒重试，最多 10 次。
- 使用 React portal 进入侧边栏现有 flex 布局，跟随展开、收起和宽度变化。

## 工作原理

- `lib/index.js` 注入 WebServer 和 credentials，提供同源接口 `GET /ds-balance`。
- Host 使用 `DEEPSEEK_API_KEY` 请求 DeepSeek API，只把余额结果或错误码返回浏览器。
- `lib/client.js` 向 `shell.overlay` 注册组件，在侧边栏流式布局中创建挂载点并渲染余额。
- 展开状态显示完整余额，收起状态显示 `¥` 徽标。

## 环境要求

- DeepSeek Harness `0.1.0-rc.6` 同系列版本。
- 已初始化 `web` profile，并可打开默认地址 `http://127.0.0.1:3080`。
- `dsh plugin` 使用的 `pnpm` 已在 PATH 中；也可以通过 Corepack 提供 pnpm。
- 可用的 DeepSeek 开放平台 API Key。

## 安装

克隆仓库并进入项目目录：

```powershell
git clone https://github.com/95384/DSH-ds-balance.git
cd DSH-ds-balance
```

把项目安装为 `web` profile 的本地依赖：

```powershell
dsh plugin --profile web add .
```

本包不是 bundle；命令提示“installed as a plain dependency”属于预期行为。随后编辑 `~/.dsh/profiles/web/cordis.patch.yml`，在顶层 patch 列表中加入 Loader 条目：

```yaml
- insert:
    - id: ds-balance
      name: ds-balance
```

如果文件中已有其他 `insert`，把 `ds-balance` 合并到现有 `insert` 数组，不要创建第二个 YAML 文档。没有其他 patch 时，文件必须是上述数组或 `[]`，不能留空。

配置 API Key。可以使用 Harness 已有的 credentials 设置；直接使用文件时，在 `~/.dsh/.credentials.yaml` 中设置：

```yaml
DEEPSEEK_API_KEY: sk-your-key
```

也可以在启动 `dsh web` 前提供同名环境变量。完成后重启 `dsh web` 并刷新浏览器。

## 验证

- 侧边栏展开时显示“余额”和金额，收起时显示 `¥` 徽标。
- 访问 `http://127.0.0.1:3080/ds-balance`，成功时返回 `{"ok":true,"balance":...}`。
- 在浏览器 Network 面板检查 `/ds-balance` 请求，确认请求中没有 API Key。

## 卸载

先从 `~/.dsh/profiles/web/cordis.patch.yml` 删除 `ds-balance` Loader 条目，再执行：

```powershell
dsh plugin --profile web remove ds-balance
```

如果删除后没有其他 patch，保留合法的顶层空数组 `[]`。最后重启 `dsh web` 并刷新浏览器。credentials 属于 Harness 用户配置，除非确定不再使用，否则不需要删除。

## 开发与验证

本项目没有构建步骤，生产入口直接位于 `lib/`。修改后可执行语法检查：

```powershell
node --check lib/index.js
node --check lib/client.js
npm pack --dry-run
```

Host 或 Loader 条目变化需要重启 `dsh web`。浏览器 bundle 更新后建议硬刷新，确保旧脚本缓存被替换。

## 兼容性与限制

- 余额来自 API 计费账户，并取 `balance_infos` 第一条记录。
- 余额组件依赖当前 Harness 侧边栏 DOM 和样式类，例如 `.hHd-Xa_root` 与 `.hHd-Xa_collapsed`；前端结构升级后可能需要适配。
- 插件只支持 Web surface，不适用于 headless 或 TUI profile。
- Host/Client 插件接口与 Harness `0.1.0-rc.6` 对齐，升级 Harness 后应重新验证路由和侧边栏布局。

## 目录结构

```text
.
|-- README.md
|-- package.json
\-- lib/
    |-- index.js
    \-- client.js
```

## 许可证

MIT，详见 `package.json`。
