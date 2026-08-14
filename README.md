# ds-balance

DeepSeek Harness Web GUI 侧边栏余额显示插件。

在 DeepSeek Harness Web GUI(以下简称 dsh web)的侧边栏中,DeepSeek 图标下方、新会话按钮上方,显示当前账户余额:

> **余额 ¥xx.xx**

每 60 秒自动刷新;侧边栏收起时自动隐藏。

## 功能特性

- **余额实时显示** — 调用 DeepSeek 官方余额接口 `GET https://api.deepseek.com/user/balance`,60 秒缓存
- **密钥不出宿主进程** — API Key 由 dsh 的 credentials 服务在 Node 宿主侧解析,浏览器端永远接触不到密钥
- **零配置代理** — 插件在 dsh web 内部注册 `/ds-balance` 路由,浏览器只访问本机地址
- **自动适配布局** — 侧边栏收起/展开、拖动调宽时自动跟随;60 秒数据轮询
- **纯插件无侵入** — 不修改 dsh 任何文件,通过官方 `cordis.patch.yml` 加载机制挂载,可完整卸载

## 工作原理

```
浏览器 (React overlay)
   │  fetch /ds-balance            (每 60s,本机 loopback)
   ▼
dsh web 宿主进程 (插件宿主端)
   │  通过 credentials 服务解析 DEEPSEEK_API_KEY
   ▼
GET https://api.deepseek.com/user/balance   (Authorization: Bearer <key>)
   ▼
{ ok: true, balance: { balance_infos: [...] } }
```

- **宿主端**(`lib/index.js`):注册 `/ds-balance` 路由,带 60 秒缓存与 10 秒超时;密钥只存在于宿主进程内存中
- **客户端**(`lib/client.js`):注册 `shell.overlay` 槽位,渲染固定定位的余额框,轮询并格式化余额

## 安装

### 前置条件

- 目标电脑已安装并**运行过一次** DeepSeek Harness(`npx @deepseek-ai/dsh web`),浏览器能打开 `http://127.0.0.1:3080`
- dsh 版本为 0.1.0-rc.6(同系列版本通用)
- 有一个 DeepSeek 开放平台 API Key

> 首次运行 dsh web 会自动初始化用户目录 `%USERPROFILE%\.dsh\`,下面的路径都基于它。
> 整个过程不需要管理员权限;插件不携带、不要求你提供除 Key 以外的任何信息。

### 手动安装步骤

**第 1 步:复制插件包**

把本仓库中的 **ds-balance 包内容**(`package.json` + `lib\` 目录)复制到 web profile 的 node_modules:

```powershell
# 假设仓库解压在 C:\ds-balance
Copy-Item -Recurse -Force C:\ds-balance\lib  $env:USERPROFILE\.dsh\profiles\web\node_modules\ds-balance\lib
Copy-Item -Force C:\ds-balance\package.json $env:USERPROFILE\.dsh\profiles\web\node_modules\ds-balance\package.json
```

> `node_modules\ds-balance` 目录不存在时会自动创建。插件不声明任何运行时依赖(peer 依赖 `react` / `@deepseek-ai/dsh-client-runtime` 由 dsh web 自带),无需 pnpm 安装。

**第 2 步:启用插件(修改 cordis.patch.yml)**

编辑 `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`。

**首次安装**:文件内容通常是一个空数组 `[]`(前后有注释)。把顶层 `[]` **整体替换**为下面的内容(注意:必须替换,不能追加 —— 该文件要求是单个 YAML 文档,顶层是一个数组):

```yaml
# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; `!!js` expressions allowed).
- insert:
    - id: ds-balance
      name: ds-balance
```

**已存在其他条目**:把 `- insert:` 下面的条目并进去即可,例如原本有:

```yaml
- insert:
    - id: some-plugin
      name: some-plugin
```

则改为(多个条目用 `-` 分行并列):

```yaml
- insert:
    - id: some-plugin
      name: some-plugin
    - id: ds-balance
      name: ds-balance
```

> 加载器按 `id` 去重,重复出现同 id 时后面的配置会覆盖前面的,所以 `ds-balance` 条目只保留一份即可。

**第 3 步:配置 API Key**

编辑 `%USERPROFILE%\.dsh\.credentials.yaml`,确保存在一行(没有就加):

```yaml
DEEPSEEK_API_KEY: sk-你的key
```

> - 每台电脑使用自己的 Key;插件/文档不会收集或传输你的 Key
> - 如果 dsh 是通过环境变量注入 `DEEPSEEK_API_KEY` 启动的,则本步可跳过

**第 4 步:重启 dsh web**

插件只在启动时加载,必须重启:

1. 关闭正在运行的 dsh web 窗口(或按 Ctrl+C)
2. 重新执行 `npx @deepseek-ai/dsh web`
3. 等控制台出现监听地址后,浏览器打开 `http://127.0.0.1:3080`

**第 5 步:完成**

侧边栏 DeepSeek 图标下方、"新会话"按钮上方出现余额框:

> **余额 ¥xx.xx**

即安装成功。若只修改了插件前端代码(不改 `cordis.patch.yml`),则只需浏览器**硬刷新**(Ctrl+Shift+R),无需重启 dsh web。

### 验证安装

| 检查项 | 方法 | 预期 |
|---|---|---|
| 余额框 | 浏览器侧边栏 | "余额 ¥xx.xx",每 60 秒刷新 |
| 接口可用 | 浏览器访问 `http://127.0.0.1:3080/ds-balance` | `{"ok":true,"balance":{...}}` |
| 无密钥泄漏 | 浏览器 F12 → Network 看 `/ds-balance` 请求 | 请求头只有本机地址,无任何 Key 字段 |

### 重复安装 / 升级

- **重复安装**:直接重做第 1、2 步(复制覆盖 + 确认 patch 条目),然后重启 dsh web。操作幂等,可反复执行
- **升级**:用新版本覆盖 `node_modules\ds-balance` 内容,重启 dsh web(前端代码改动则硬刷新即可)

### 安装故障排查

| 现象 | 排查步骤 |
|---|---|
| 侧边栏没有余额框 | ① 访问 `/ds-balance` —— 404 说明插件未加载:检查 patch 文件是否为单个 YAML 文档(顶层数组)且条目拼写正确;② 确认已重启 dsh web;③ 浏览器 F12 → Console 看报错,把报错发给作者 |
| 重启后 dsh web 启动报 YAML 错误 | `cordis.patch.yml` 被改成了空文件或非数组结构 —— 恢复为 `[]`(或有效条目列表)后重启 |

## 卸载

### 卸载步骤

**第 1 步:从加载配置中移除插件条目**

编辑 `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`:

- **只装了 ds-balance 一个插件**:把 `- insert:` 条目整体删除,恢复为:

  ```yaml
  # Your patch layer for this dsh profile, applied after every bundle layer:
  # a top-level YAML array of loader patch entries (id-targeted config
  # overrides, disables, and insert lists; `!!js` expressions allowed).
  []
  ```

  > 注意:文件要求是**单个 YAML 文档**且顶层为数组。只删条目、留空文件(或不留 `[]`)会导致加载配置解析失败,因此必须保留 `[]`。

- **装了多个插件**:只删除 ds-balance 那两行,保留其余条目:

  ```yaml
  - insert:
      - id: some-plugin
        name: some-plugin
      # ↓ 删除这两行
      - id: ds-balance
        name: ds-balance
  ```

**第 2 步:删除插件文件**

```powershell
Remove-Item -Recurse -Force $env:USERPROFILE\.dsh\profiles\web\node_modules\ds-balance
```

**第 3 步:重启 dsh web**

1. 关闭正在运行的 dsh web(或按 Ctrl+C)
2. 重新执行 `npx @deepseek-ai/dsh web`
3. 浏览器刷新 `http://127.0.0.1:3080`

**第 4 步:验证卸载**

| 检查项 | 方法 | 预期 |
|---|---|---|
| 接口已移除 | 浏览器访问 `http://127.0.0.1:3080/ds-balance` | 404(页面由前端 fallback 处理,不返回插件 JSON) |
| 余额框已消失 | 侧边栏 | 无余额框,布局恢复正常 |
| 加载配置完好 | 查看 `cordis.patch.yml` | 顶层是合法的 YAML 数组(`[]` 或其余插件条目) |

### 卸载常见问题

| 现象 | 处理 |
|---|---|
| 卸载后侧边栏仍有余额框 | ① 浏览器硬刷新(Ctrl+Shift+R)清除旧 bundle 缓存;② 确认已重启 dsh web;③ 确认 `node_modules\ds-balance` 目录已删除 |
| 以后想重新安装 | 重新执行上文[安装](#安装)即可,与是否卸载过无关 |

> 卸载只涉及两处:`cordis.patch.yml` 条目 + `node_modules\ds-balance` 目录,均不触碰 dsh 本体文件。`.credentials.yaml` 中的 `DEEPSEEK_API_KEY` 属于 dsh 自身的凭据配置,卸载插件后请保留(其他功能可能也在用)。

## 目录结构

```
.
├── README.md            # 本文档(含安装/卸载说明)
├── package.json         # 插件包元数据(dsh 客户端声明、peer 依赖)
└── lib/
    ├── index.js         # 宿主端: /ds-balance 路由代理 + 缓存
    └── client.js        # 客户端: 余额框 overlay + 轮询 + 几何跟踪
```

## 兼容性

| 项目 | 要求 |
|---|---|
| dsh | 0.1.0-rc.6(deepseek-harness),同系列版本通用 |
| dsh web 访问地址 | `http://127.0.0.1:3080`(默认) |
| 浏览器 | 需支持 CSS `:has()`(Chrome 105+ / Edge 105+ / Firefox 121+ / Safari 15.4+) |
| API Key | DeepSeek 开放平台 API Key(写入 `.credentials.yaml`) |

## 常见问题

| 现象 | 原因与处理 |
|---|---|
| 显示"余额不可用" | API Key 缺失、无效或账户不可用。检查 `.credentials.yaml`;直接访问 `/ds-balance` 看返回的 `error`(`missing-api-key` / `http-401`) |
| 显示"余额获取失败" | 宿主进程网络异常(10 秒超时)。稍后自动重试;持续失败查看 dsh web 控制台日志 |
| 余额不是最新 | 接口有 60 秒缓存,等待至多 1 分钟即刷新 |
| 余额框位置错位/压住按钮 | 先硬刷新(Ctrl+Shift+R);若仍错位,确认 dsh 版本为 0.1.0-rc.6 —— 余额框几何依赖该版本的前端 DOM 结构(侧边栏根 + 品牌行布局),其他版本需适配;仍错位则 F12 → Console 把报错发给作者 |

## 已知限制

- 余额框的定位依赖 dsh 前端当前的 DOM 结构(侧边栏根、品牌行高度等),dsh 前端大版本改版后可能需要跟随适配
- 插件以普通目录形式放入 profile 的 `node_modules`,不受 pnpm 管理;之后若执行 `dsh plugin ...`(pnpm)操作,该目录可能被清理,需重新安装
- 余额查询走的是 API 计费账户余额,与"赠金/活动余额"无关,取 `balance_infos` 第一条

## 许可证

MIT
