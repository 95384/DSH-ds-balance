<#
.SYNOPSIS
  ds-usage 一键安装脚本(幂等,可反复运行)

.DESCRIPTION
  1. 复制插件文件(lib + package.json)到 dsh web profile 的 node_modules
  2. 把 ds-usage 条目写入 cordis.patch.yml(自动备份为 .bak)
  不会修改 .credentials.yaml(API Key 需手动配置),不会重启 dsh web。

.PARAMETER ProfileDir
  目标 profile 目录,默认 %USERPROFILE%\.dsh\profiles\web

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\install.ps1
#>
param(
  [string]$ProfileDir = (Join-Path $env:USERPROFILE '.dsh\profiles\web')
)

$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$pkgDir = Join-Path $ProfileDir 'node_modules\ds-usage'
$patchPath = Join-Path $ProfileDir 'cordis.patch.yml'

Write-Host '[1/3] 复制插件文件 -> ' $pkgDir
New-Item -ItemType Directory -Force -Path (Join-Path $pkgDir 'lib') | Out-Null
Copy-Item -Force (Join-Path $src 'package.json') (Join-Path $pkgDir 'package.json')
Copy-Item -Force (Join-Path $src 'lib\index.js') (Join-Path $pkgDir 'lib\index.js')
Copy-Item -Force (Join-Path $src 'lib\client.js') (Join-Path $pkgDir 'lib\client.js')

if (-not (Test-Path $patchPath)) {
  throw "找不到 $patchPath —— 请先运行过一次 dsh web 再安装"
}

Write-Host '[2/3] 检查 cordis.patch.yml'
$content = Get-Content $patchPath -Raw -Encoding UTF8
$CRLF = [Environment]::NewLine
if ($content -match 'id:\s*ds-usage') {
  Write-Host '      已包含 ds-usage 条目,跳过(幂等)'
} else {
  Copy-Item $patchPath "${patchPath}.bak" -Force
  Write-Host "      已备份 -> ${patchPath}.bak"
  if ($content -match '(?m)^\s*\[\]\s*$') {
    # 模板:顶层空数组,整体替换为 insert 条目(保持单个 YAML 文档)
    $new = $content -replace '(?m)^\s*\[\]\s*$', ("- insert:" + $CRLF + "    - id: ds-usage" + $CRLF + "      name: ds-usage")
  } elseif ($content -match '(?m)^\s*- insert:') {
    # 已有 insert 块:在其后补入条目(缩进 4 空格,与 dsh 模板一致)
    $new = $content -replace '(?m)^(\s*- insert:)[^\S\n]*$', ("`$1" + $CRLF + "    - id: ds-usage" + $CRLF + "      name: ds-usage")
  } else {
    # 无 insert 块(非标准文件):末尾追加
    $new = $content.TrimEnd() + $CRLF + $CRLF + "- insert:" + $CRLF + "    - id: ds-usage" + $CRLF + "      name: ds-usage" + $CRLF
  }
  # 无 BOM 的 UTF-8 写入,避免编码问题
  [System.IO.File]::WriteAllText($patchPath, $new, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host '      已写入 ds-usage 条目'
}

Write-Host '[3/3] 完成。接下来:'
Write-Host '  1. 确认 .credentials.yaml 中有 DEEPSEEK_API_KEY(没有则手动添加)'
Write-Host '  2. 重启 dsh web(npx @deepseek-ai/dsh web)'
Write-Host '  3. 浏览器打开 http://127.0.0.1:3080 并刷新'