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

## 快速开始

> 完整步骤见 **[docs/INSTALL.md](docs/INSTALL.md)**,卸载见 **[docs/UNINSTALL.md](docs/UNINSTALL.md)**。

1. 将本仓库 `ds-balance` 包目录复制到 `%USERPROFILE%\.dsh\profiles\web\node_modules\ds-balance\`
2. 编辑 `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`,把顶层 `[]` 替换为:

   ```yaml
   - insert:
       - id: ds-balance
         name: ds-balance
   ```

3. 确认 `%USERPROFILE%\.dsh\.credentials.yaml` 中有 `DEEPSEEK_API_KEY: sk-你的key`
4. 重启 dsh web(`npx @deepseek-ai/dsh web`),浏览器刷新 `http://127.0.0.1:3080`
5. 侧边栏出现 **余额 ¥xx.xx** 即成功;也可直接访问 `http://127.0.0.1:3080/ds-balance` 查看接口返回

## 目录结构

```
.
├── README.md            # 本文档
├── package.json         # 插件包元数据(dsh 客户端声明、peer 依赖)
├── lib/
│   ├── index.js         # 宿主端: /ds-balance 路由代理 + 缓存
│   └── client.js        # 客户端: 余额框 overlay + 轮询 + 几何跟踪
└── docs/
    ├── INSTALL.md       # 安装文档(前置条件、手动安装、验证、故障排查)
    └── UNINSTALL.md     # 卸载文档(完整卸载、验证、常见问题)
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
| 余额框位置错位/压住按钮 | 先硬刷新(Ctrl+Shift+R);若仍错位,确认 dsh 版本与几何假设(见 INSTALL.md 故障排查) |

## 已知限制

- 余额框的定位依赖 dsh 前端当前的 DOM 结构(侧边栏根、品牌行高度等),dsh 前端大版本改版后可能需要跟随适配
- 插件以普通目录形式放入 profile 的 `node_modules`,不受 pnpm 管理;之后若执行 `dsh plugin ...`(pnpm)操作,该目录可能被清理,需重新安装
- 余额查询走的是 API 计费账户余额,与"赠金/活动余额"无关,取 `balance_infos` 第一条

## 许可证

MIT
