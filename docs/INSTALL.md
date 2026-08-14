# ds-balance 安装文档

本文档面向目标电脑(已安装 DeepSeek Harness 的机器),介绍如何在 dsh web 上安装并启用 ds-balance 余额显示插件。

> 目标环境:Windows + dsh 0.1.0-rc.6,dsh web 可通过 `http://127.0.0.1:3080` 访问。
> 整个过程不需要管理员权限;插件不携带、不要求你提供任何密钥以外的信息。

## 目录

1. [前置条件](#1-前置条件)
2. [手动安装](#2-手动安装)
3. [验证安装](#3-验证安装)
4. [重复安装 / 升级](#4-重复安装--升级)
5. [故障排查](#5-故障排查)
6. [附录:一键安装脚本](#6-附录一键安装脚本)

---

## 1. 前置条件

- 目标电脑已安装并**运行过一次** DeepSeek Harness(`npx @deepseek-ai/dsh web`),浏览器能打开 `http://127.0.0.1:3080`
- dsh 版本为 0.1.0-rc.6(同系列版本通用)
- 有一个 DeepSeek 开放平台 API Key

> 首次运行 dsh web 会自动初始化用户目录 `%USERPROFILE%\.dsh\`,下面的路径都基于它。

## 2. 手动安装

### 第 1 步:复制插件包

把本仓库中的 **ds-balance 包内容**(`package.json` + `lib\` 目录)复制到 web profile 的 node_modules:

```powershell
# 假设仓库解压在 C:\ds-balance
Copy-Item -Recurse -Force C:\ds-balance\lib  $env:USERPROFILE\.dsh\profiles\web\node_modules\ds-balance\lib
Copy-Item -Force C:\ds-balance\package.json $env:USERPROFILE\.dsh\profiles\web\node_modules\ds-balance\package.json
```

> `node_modules\ds-balance` 目录不存在时会自动创建。插件不声明任何运行时依赖(peer 依赖 `react` / `@deepseek-ai/dsh-client-runtime` 由 dsh web 自带),无需 pnpm 安装。

### 第 2 步:启用插件(修改 cordis.patch.yml)

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

**重新安装 / 已存在其他条目**:把 `- insert:` 下面的条目并进去即可,例如原本有:

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

> 注意:加载器按 `id` 去重,重复出现同 id 时后面的配置会覆盖前面的,所以 `ds-balance` 条目只保留一份即可。

### 第 3 步:配置 API Key

编辑 `%USERPROFILE%\.dsh\.credentials.yaml`,确保存在一行(没有就加):

```yaml
DEEPSEEK_API_KEY: sk-你的key
```

> - 每台电脑使用自己的 Key;插件/文档不会收集或传输你的 Key
> - 配置后**无需**重启 dsh 也能生效(credentials 按次解析),但如果此时还没启动过插件,仍按第 4 步重启一次
> - 如果 dsh 是通过环境变量注入 `DEEPSEEK_API_KEY` 启动的,则第 3 步可跳过

### 第 4 步:重启 dsh web

插件只在启动时加载,必须重启:

1. 关闭正在运行的 dsh web 窗口(或按 Ctrl+C)
2. 重新执行 `npx @deepseek-ai/dsh web`
3. 等控制台出现监听地址后,浏览器打开 `http://127.0.0.1:3080`

### 第 5 步:完成

侧边栏 DeepSeek 图标下方、"新会话"按钮上方出现余额框:

> **余额 ¥xx.xx**

即安装成功。若只修改了插件前端代码(不改 `cordis.patch.yml`),则只需浏览器**硬刷新**(Ctrl+Shift+R),无需重启 dsh web。

## 3. 验证安装

| 检查项 | 方法 | 预期 |
|---|---|---|
| 余额框 | 浏览器侧边栏 | "余额 ¥xx.xx",每 60 秒刷新 |
| 接口可用 | 浏览器访问 `http://127.0.0.1:3080/ds-balance` | `{"ok":true,"balance":{...}}` |
| 无密钥泄漏 | 浏览器 F12 → Network 看 `/ds-balance` 请求 | 请求头只有本机地址,无任何 Key 字段 |

## 4. 重复安装 / 升级

- **重复安装**:直接重做第 1、2 步(复制覆盖 + 确认 patch 条目),然后重启 dsh web。操作幂等,可反复执行
- **升级**:用新版本覆盖 `node_modules\ds-balance` 内容,重启 dsh web(前端代码改动则硬刷新即可)

## 5. 故障排查

| 现象 | 排查步骤 |
|---|---|
| 侧边栏没有余额框 | ① 确认第 2 步的 patch 已生效:访问 `/ds-balance` —— 404 说明插件未加载,检查 patch 文件是否为单个 YAML 文档(顶层数组)且条目拼写正确;② 确认已重启 dsh web;③ 浏览器 F12 → Console 看报错,把报错发给作者 |
| 显示"余额不可用" | 访问 `/ds-balance` 看返回:`missing-api-key` → 检查第 3 步;`http-401` → Key 无效或账户状态异常;`http-429` → 请求过于频繁,稍后再试 |
| 显示"余额获取失败" | 宿主进程到 `api.deepseek.com` 网络异常(10 秒超时),60 秒后自动重试;持续失败检查 dsh web 控制台日志 |
| 余额长时间不更新 | 接口有 60 秒缓存,最多等 1 分钟;仍不更新则硬刷新页面 |
| 余额框错位/压住"新会话"按钮 | ① 硬刷新(Ctrl+Shift+R);② 确认 dsh 版本为 0.1.0-rc.6 —— 余额框几何依赖该版本的前端 DOM 结构(侧边栏根 + 品牌行布局),其他版本需适配;③ 仍错位则 F12 → Console 把报错发给作者 |
| 修改代码后刷新无变化 | 前端 bundle 每次请求实时读取,硬刷新即可;若改了 `package.json` 或 `cordis.patch.yml` 则需重启 dsh web |

## 6. 附录:一键安装脚本

仓库根目录提供 `install.ps1`(PowerShell 5.1+/7 均可),自动执行第 1、2 步(复制 + patch 合并,幂等):

```powershell
# 在仓库目录下执行:
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

脚本行为:

1. 复制 `lib` 与 `package.json` 到 `%USERPROFILE%\.dsh\profiles\web\node_modules\ds-balance\`
2. 读取 `cordis.patch.yml`:
   - 若顶层是空数组 `[]` → 替换为 `- insert: ...` 条目
   - 若已包含 `ds-balance` 条目 → 跳过(幂等)
   - 其他情况 → 在 `- insert:` 列表中补入 `- id: ds-balance / name: ds-balance`
3. 修改前自动备份为 `cordis.patch.yml.bak`

脚本**不会**修改 `.credentials.yaml`(Key 配置仍需按第 3 步手动完成),也不会帮你重启 dsh web。
