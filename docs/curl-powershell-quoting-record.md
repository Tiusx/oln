# Windows PowerShell 下 curl POST 请求的引号地狱：一次「静默失败」排查实录

> 排障记录 · 关键词：`PowerShell`、`curl`、`cmd /c`、引号转义、`Could not resolve host`、`Malformed input to a URL function`

## 一句话结论

在 Windows PowerShell 里用 `cmd /c "curl ... -H \"Content-Type: application/json\" -d '{...}'"` 发 JSON POST，会因为 PowerShell 与 cmd 两层对引号/转义的处理不一致，把 `-H` 的参数拆烂，导致 `curl: (6) Could not resolve host: application`、`curl: (3) URL rejected`，命令**看似执行但静默失败**。根治办法是**用 `curl --json @文件`**（curl ≥ 7.82）或**把 JSON body 写进文件、用 `-d @绝对路径`、并去掉 `-H` 引号**。

---

## 背景

本地调试 Cloudflare Worker 的 CMS，需要向 `http://127.0.0.1:8787/admin/api/auth/seed` 发一个 JSON POST 来创建管理员账号：

```bash
curl -X POST http://127.0.0.1:8787/admin/api/auth/seed \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"admin","password":"admin"}'
```

在类 Unix shell（bash/zsh）里这是最普通的一条命令，一打就过。但在 **Windows PowerShell** 里，同样的命令换来的是连绵不断的诡异失败。

---

## 症状：命令"执行了"，却没有任何输出

在 PowerShell 里尝试了多种写法，结果几乎都是**静默无输出**（哪怕加了 `-s -i` 也没有 `HTTP/1.1` 回显）：

```powershell
# 写法一：不输出
cmd /c "curl -s -X POST http://127.0.0.1:8787/admin/api/auth/seed" -H "Content-Type: application/json" -d "{\"usernameOrEmail\":\"admin\",\"password\":\"admin\"}"
```

直到去掉 `-s`（静默）和 `2>&1`（合并错误流）之后，真实原因才浮出水面：

```
cmd : curl: (3) URL rejected: Malformed input to a URL function
cmd : curl: (6) Could not resolve host: application
curl: (3) URL rejected: Port number was not a decimal number between 0 and 65535
```

这三个错误信息合起来非常说明问题：

- `Could not resolve host: application` —— `application` 被当成了**主机名**！
- `Port number was not a decimal number` —— 连 URL 里的端口都被解析错乱。

也就是说：**命令参数在到达 curl 之前，已经被 PowerShell 拆得七零八落**，`-H "Content-Type: application/json"` 里的 `application/json` 变成了一个独立参数，又被 curl 误当成 URL/主机名。

---

## 根因：PowerShell → cmd 两层引号转义

这个项目里因为**执行策略**禁用了 `npm.ps1`，所以所有命令都习惯性地包一层 `cmd /c "..."`。问题就出在这两层：

1. **外层是 PowerShell**：`cmd /c "..."` 的整个字符串由 PowerShell 解析一层。
2. **内层是 cmd**：cmd 再解析一遍传给 `curl`。
3. **curl 最终收到的是字符串**：curl 自己还要按 POSIX 规则切分。

你写的 `\"`、`{...}`、`"..."` 经过这三层，各自对转义符 `\`、反引号 `` ` ``、双引号 `"` 的解释**完全不同**，最终拼错。

尤其致命的是内联 JSON：`-d '{"usernameOrEmail":"admin",...}'` 这种带 `{}` 和一堆 `"` 的字符串，是跨 shell 引号转义的**噩梦级案例**。$/, `\"` 等在 PowerShell/cmd 里各有语义，极易被拆散。

---

## 解法

### 方案 A（推荐）：用 `curl --json`，自带 JSON 头，绕开 `-H` 和引号

curl ≥ 7.82 提供 `--json <data>`，它等效于 `-H "Content-Type: application/json" -d <data>`，**不需要手写 `-H`**，也就绕开了最难的引号点。body 放文件更稳：

```powershell
# 1. 把 JSON 写进文件（Here-String，PowerShell 自带引号隔离）
Set-Content -Path seed.json -Value '{"usernameOrEmail":"admin","password":"admin"}'

# 2. 用 --json + 绝对路径
cmd /c "curl -s --json @C:\Users\22135\seed.json http://127.0.0.1:8787/admin/api/auth/seed"
```

关键点：
- `--json @绝对路径` 从文件读取 body，**避免内联字符串的一切转义**。
- 用**绝对路径**（`@C:\Users\...\seed.json`），避免相对路径因工作目录不同而找不到文件。

### 方案 B：`-d @文件` + 绝对路径，去掉 `-H`

如果你用的 curl 版本较老不支持 `--json`，退一步：把 body 放文件，用 `-d @绝对路径`，并且**不要手写 `-H "Content-Type: application/json"`**（那正是被拆炸的元凶）：

```powershell
cmd /c "curl -s -X POST http://127.0.0.1:8787/admin/api/auth/seed -d @C:\Users\22135\seed.json"
```

> 不带 `-H` 时 curl 会按 `application/x-www-form-urlencoded` 发，但很多手写服务端（尤其只 `request.json()` 的）并不在意 Content-Type，能通。

### 方案 C：彻底避开 `cmd /c`，用本机 `Invoke-RestMethod`

与其在 `cmd /c` 的引号迷宫里挣扎，不如直接用 PowerShell 原生 cmdlet（注意：如果执行策略限制，可先用 `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` 放开当前会话）：

```powershell
$body = @{ usernameOrEmail = 'admin'; password = 'admin' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:8787/admin/api/auth/seed' `
  -Method Post -ContentType 'application/json' -Body $body
```

不需要 `-H`、不需要反斜杠转义、不需要 `cmd /c`，PowerShell 自己处理一切。

---

## 诊断技巧：不要过早 `-s`

这次之所以拖了很久，一个重要原因是**加了 `-s`（静默）过早**。`-s` 会吞掉 curl 自己的**错误输出**（`Could not resolve host` 等），同时又因为连接其实没建立起来，`-i` 也没有任何 HTTP 头可回显——于是命令「静默无输出」，看起来像「请求成功但没返回」，实则压根没连上。

正确的排查次序：

1. **先去掉 `-s`**，或改用 `curl -v`（verbose），让连接过程和错误全部暴露：
   ```powershell
   cmd /c "curl -v http://127.0.0.1:8787/api/public/config" 2>&1
   ```
2. 确认**能连上**（看到 `Trying 127.0.0.1:8787...` + `HTTP/1.1 200`）之后，再加回 `-s` 收敛输出。
3. 若确认是**引号/参数问题**，再套用上面的方案 A/B/C。

---

## 复盘 / 经验总结

1. **「静默无输出」不等于「成功了」**。先 `curl -v` 或去掉 `-s`，确认真的 `HTTP 2xx` 再谈结果。
2. **Windows PowerShell + `cmd /c` 是引号转义的两层嵌套**。凡是内联 `"`, `\`, `{}` 的命令，都要警惕被拆烂。
3. **高信号错误特征**：看到 `Could not resolve host: application`、`Malformed input to a URL function`、`Port number was not a decimal`，几乎可以断定是**参数在到达 curl 前被错误切分**，不是网络也不是服务器问题。
4. **JSON body 永远写文件最稳**。`--json @path` 或 `-d @absolute_path`，让 curl 从文件读，绕开所有引号转义。
5. **能用平台原生方式就别绕 `cmd`**：PowerShell 下优先 `Invoke-RestMethod`；bash 下才用 curl 内联。

---

*记录时间：2026-08-30*
