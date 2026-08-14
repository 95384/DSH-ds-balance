# ds-usage 卸载文档

将 ds-usage 插件从 dsh web 中完整移除,恢复初始状态。

## 卸载步骤

### 第 1 步:从加载配置中移除插件条目

编辑 `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`:

- **只装了 ds-usage 一个插件**:把 `- insert:` 条目整体删除,恢复为:

  ```yaml
  # Your patch layer for this dsh profile, applied after every bundle layer:
  # a top-level YAML array of loader patch entries (id-targeted config
  # overrides, disables, and insert lists; `!!js` expressions allowed).
  []
  ```

  > 注意:文件要求是**单个 YAML 文档**且顶层为数组。只删条目、留空文件(或不留 `[]`)会导致加载配置解析失败,因此必须保留 `[]`。

- **装了多个插件**:只删除 ds-usage 那两行,保留其余条目:

  ```yaml
  - insert:
      - id: some-plugin
        name: some-plugin
      # ↓ 删除这两行
      - id: ds-usage
        name: ds-usage
  ```

### 第 2 步:删除插件文件

```powershell
Remove-Item -Recurse -Force $env:USERPROFILE\.dsh\profiles\web\node_modules\ds-usage
```

### 第 3 步:重启 dsh web

1. 关闭正在运行的 dsh web(或按 Ctrl+C)
2. 重新执行 `npx @deepseek-ai/dsh web`
3. 浏览器刷新 `http://127.0.0.1:3080`

### 第 4 步:验证卸载

| 检查项 | 方法 | 预期 |
|---|---|---|
| 接口已移除 | 浏览器访问 `http://127.0.0.1:3080/ds-usage` | 404(页面由前端 fallback 处理,不返回插件 JSON) |
| 余额框已消失 | 侧边栏 | 无余额框,布局恢复正常 |
| 加载配置完好 | 查看 `cordis.patch.yml` | 顶层是合法的 YAML 数组(`[]` 或其余插件条目) |

> 可选:卸载后删除备份文件 `cordis.patch.yml.bak`(如果安装脚本生成过)。

## 常见问题

| 现象 | 处理 |
|---|---|
| 卸载后侧边栏仍有余额框 | ① 浏览器硬刷新(Ctrl+Shift+R)清除旧 bundle 缓存;② 确认已重启 dsh web(第 3 步);③ 确认 `node_modules\ds-usage` 目录已删除 |
| 卸载后 dsh web 启动报 YAML 错误 | `cordis.patch.yml` 被改成了空文件或非数组结构 —— 按第 1 步恢复为 `[]`(或有效条目列表)后重启 |
| 以后想重新安装 | 重新执行安装文档(INSTALL.md)即可,与是否卸载过无关 |

## 说明

- 卸载只涉及两处:`cordis.patch.yml` 条目 + `node_modules\ds-usage` 目录,均不触碰 dsh 本体文件
- `.credentials.yaml` 中的 `DEEPSEEK_API_KEY` 属于 dsh 自身的凭据配置,卸载插件后请保留(其他功能可能也在用)
