# FocusMute

FocusMute 是一个面向 Windows 的桌面程序，用来自动静音后台进程，并在进程重新回到前台时恢复声音。项目采用 `Tauri 2 + React + TypeScript + Rust`，Rust 负责系统层音频控制与进程轮询，React 负责现代桌面界面。

## 项目方案

### 目标

- 自动识别当前前台窗口
- 对后台音频进程执行静音
- 当前台切回时自动恢复
- 提供白名单 / 黑名单两种策略模式
- 支持开机自启动
- 支持最小化到托盘
- 实时展示当前被静音的进程和操作日志
- 提取并展示进程图标

### 技术选型

- 桌面壳层：`Tauri 2`
- 前端：`React 19 + TypeScript + Zustand + Framer Motion`
- 后端：`Rust`
- 系统能力：
  - 进程枚举：`sysinfo`
  - 前台窗口识别：`Win32 GetForegroundWindow / GetWindowThreadProcessId`
  - 音频会话控制：`Windows Core Audio API (IAudioSessionManager2 / ISimpleAudioVolume)`
  - 开机自启动：`tauri-plugin-autostart`
  - 系统托盘：`Tauri tray-icon`

### 方案说明

- Rust 后台维护一个轮询引擎，每个周期同步：
  - 当前前台 PID
  - 当前运行进程列表
  - 当前系统音频会话
- 引擎根据策略决定哪些后台进程应被静音：
  - 白名单模式：除白名单外，后台音频进程都静音
  - 黑名单模式：仅黑名单中的后台音频进程静音
- 为避免误恢复用户手动静音的程序，应用只会恢复“自己曾经静音过”的进程
- 所有状态通过 Tauri event 推送给前端，界面实时刷新

## 界面功能

- 状态总览卡片
- 运行进程表格
- 每个进程的音频状态 / 前台状态 / 策略状态
- 白名单 / 黑名单管理
- 自动静音、自启动、托盘最小化开关
- 浅色 / 深色主题
- 实时日志面板

## 目录结构

```text
FocusMute/
├─ src/                          React 前端
│  ├─ components/                界面模块
│  ├─ hooks/                     Tauri 事件订阅
│  ├─ lib/                       前端工具函数
│  ├─ stores/                    Zustand 状态管理
│  ├─ App.tsx                    主界面
│  ├─ index.css                  全局样式
│  └─ types.ts                   前后端共享数据结构定义
├─ src-tauri/                    Rust / Tauri 桌面层
│  ├─ capabilities/              Tauri 权限声明
│  ├─ icons/                     应用图标
│  ├─ src/
│  │  ├─ audio.rs                Windows 音频会话控制
│  │  ├─ commands.rs             Tauri 命令
│  │  ├─ config.rs               配置读写与规则归一化
│  │  ├─ engine.rs               后台静音轮询引擎
│  │  ├─ main.rs                 Tauri 启动入口
│  │  ├─ models.rs               序列化模型
│  │  ├─ state.rs                共享状态与日志
│  │  └─ system.rs               前台窗口与进程采样
│  ├─ build.rs
│  └─ tauri.conf.json
├─ package.json
└─ vite.config.ts
```

## 开发环境

- Windows 10 / 11
- Node.js 22+
- Rust 1.94+
- WebView2 Runtime

你的机器上 Python 是 `conda base`，但本项目核心不依赖 Python。

## 安装依赖

```powershell
npm install
```

## 开发运行

```powershell
npm run tauri dev
```

## 生产打包

```powershell
npm run tauri build
```

打包产物默认会出现在：

```text
src-tauri/target/release/bundle/
```

如果只想验证本地能否打包，也可以运行：

```powershell
npm run tauri build -- --debug
```

## 已验证命令

本项目当前已经验证通过：

```powershell
npm run build
cargo check
npm run tauri build -- --debug
```

## 当前实现说明

- 已实现后台进程自动静音 / 前台恢复
- 已实现白名单与黑名单切换
- 已实现开机自启动开关
- 已实现托盘驻留与点击托盘恢复窗口
- 已实现托盘图标随自动静音开关切换
- 已实现实时静音进程列表与日志
- 已实现进程图标提取与展示
- 已实现浅色 / 深色模式 UI

## 后续可扩展项

- 进程图标提取
- 更细粒度的规则，如按窗口标题或路径匹配
- 可配置轮询频率
- 配置导入 / 导出
- 开机静默启动与首次引导
