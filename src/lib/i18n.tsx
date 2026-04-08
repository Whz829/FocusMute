import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Language } from '../types'

const LANGUAGE_STORAGE_KEY = 'focusmute-language'

const copy = {
  zh: {
    app: {
      brandTagline: 'Windows 焦点音频控制器',
      refresh: '刷新状态',
      hideToTray: '隐藏到托盘',
      toggleTheme: '切换主题',
      syncing: '同步中',
    },
    nav: {
      home: { label: '首页', description: '总览自动静音状态、关键指标与常用控制。' },
      strategy: { label: '策略中心', description: '切换黑白名单模式，并维护程序规则。' },
      processes: { label: '进程控制台', description: '查看实时进程状态，并直接管理黑白名单。' },
      logs: { label: '日志', description: '查看后台静音、恢复和异常记录。' },
      settings: { label: '设置', description: '配置自启动、轮询间隔与托盘行为。' },
    },
    status: {
      autoMuteOn: '自动静音 开启',
      autoMuteOff: '自动静音 关闭',
      whitelistMode: '模式 白名单',
      blacklistMode: '模式 黑名单',
    },
    home: {
      metrics: {
        total: '运行进程',
        audio: '音频进程',
        muted: '当前静音',
        targeted: '策略命中',
      },
      quickControls: '快速控制',
      processBrief: '进程简览',
      autoMuteTitle: '自动静音',
      autoMuteEnabled: '后台命中策略时自动静音',
      autoMuteDisabled: '当前关闭',
      enabled: '已开启',
      disabled: '已关闭',
      minimizeTitle: '最小化到托盘',
      minimizeEnabled: '关闭窗口后继续在后台运行',
      minimizeDisabled: '关闭窗口时直接退出',
      modeLabel: '策略模式',
      whitelistMode: '白名单模式',
      blacklistMode: '黑名单模式',
    },
    processTable: {
      searchPlaceholder: '搜索进程名、exe 或 PID',
      audioOnly: '仅看音频进程',
      totalPrefix: '共',
      totalSuffix: '项',
      emptyTitle: '没有匹配的进程',
      emptyDescription: '尝试更换关键词，或关闭筛选条件后重试。',
      systemProcessPath: '系统进程或路径不可访问',
      pathUnavailable: '路径不可访问',
      iconAltSuffix: '图标',
      foreground: '前台',
      muted: '静音中',
      speaking: '正在发声',
      noAudio: '无音频',
      policyNone: '无策略',
      policyWhitelist: '白名单',
      policyBlacklist: '黑名单',
      policyHit: '命中策略',
      policyBackgroundMute: '后台静音',
      viewPath: '查看路径',
      hidePath: '收起路径',
      policyResult: '策略结果',
      matchedWhitelist: '命中白名单规则',
      matchedBlacklist: '命中黑名单规则',
      backgroundMutedByPolicy: '后台命中策略，已自动静音',
      autoMuteDisabled: '自动静音当前已关闭',
      foregroundDetail: '当前处于前台',
      notMatchedBlacklist: '未命中黑名单',
      ignored: '当前未触发自动静音',
      sameAppGroup: '与前台属于同一应用',
      removeWhitelist: '移出白名单',
      addWhitelist: '加入白名单',
      removeBlacklist: '移出黑名单',
      addBlacklist: '加入黑名单',
      whitelistShort: '白',
      blacklistShort: '黑',
    },
    strategy: {
      modeTitle: '策略模式',
      waiting: '等待后台引擎返回当前策略状态。',
      blacklistSummary: '只有黑名单中的程序会在后台时自动静音。',
      whitelistSummary: '除白名单外的音频程序都会在后台时自动静音。',
      whitelistMode: '白名单模式',
      blacklistMode: '黑名单模式',
      whitelistTitle: '白名单',
      whitelistDescription: '这些程序永远不会被自动静音，适合会议工具、播放器和告警类应用。',
      blacklistTitle: '黑名单',
      blacklistDescription: '只有这些程序会在后台被自动静音，适合浏览器、游戏平台和视频播放器。',
      inputPlaceholder: '例如 chrome.exe',
      pickExecutable: '从资源管理器选择',
      addRule: '添加',
      emptyRules: '暂无规则',
      removeRule: '移除',
    },
    logs: {
      emptyTitle: '还没有日志',
      emptyDescription: '后台进程被静音、恢复或引擎出现异常时，日志会显示在这里。',
    },
    settings: {
      languageTitle: '界面语言',
      languageDescription: '切换应用界面的显示语言。',
      languageZh: '中文',
      languageEn: 'English',
      autoMuteTitle: '自动静音',
      autoMuteDescription: '按当前策略自动静音后台进程，在它们回到前台时恢复声音。',
      trayTitle: '最小化到托盘',
      trayDescription: '关闭窗口时不退出进程，而是隐藏到系统托盘继续运行。',
      startupTitle: '开机自启动',
      startupDescription: 'Windows 登录后自动启动 FocusMute。',
      pollingTitle: '轮询间隔',
      pollingDescription: '间隔越短响应越快，但后台检测频率也会更高。',
      faster: '更灵敏',
      lowerCost: '更省资源',
    },
  },
  en: {
    app: {
      brandTagline: 'Windows focus audio controller',
      refresh: 'Refresh',
      hideToTray: 'Hide to tray',
      toggleTheme: 'Toggle theme',
      syncing: 'Syncing',
    },
    nav: {
      home: { label: 'Home', description: 'Overview of mute status, key metrics, and common controls.' },
      strategy: { label: 'Strategy', description: 'Switch list modes and manage program rules.' },
      processes: { label: 'Processes', description: 'Inspect live process state and manage list membership directly.' },
      logs: { label: 'Logs', description: 'Review mute, restore, and engine event history.' },
      settings: { label: 'Settings', description: 'Configure startup, polling interval, and tray behavior.' },
    },
    status: {
      autoMuteOn: 'Auto mute On',
      autoMuteOff: 'Auto mute Off',
      whitelistMode: 'Mode Whitelist',
      blacklistMode: 'Mode Blacklist',
    },
    home: {
      metrics: {
        total: 'Running',
        audio: 'Audio',
        muted: 'Muted',
        targeted: 'Targeted',
      },
      quickControls: 'Quick Controls',
      processBrief: 'Process Brief',
      autoMuteTitle: 'Auto Mute',
      autoMuteEnabled: 'Mute apps automatically when they match the active policy in background',
      autoMuteDisabled: 'Currently disabled',
      enabled: 'Enabled',
      disabled: 'Disabled',
      minimizeTitle: 'Minimize to Tray',
      minimizeEnabled: 'Keep running in the background after closing the window',
      minimizeDisabled: 'Exit when the window is closed',
      modeLabel: 'Policy mode',
      whitelistMode: 'Whitelist',
      blacklistMode: 'Blacklist',
    },
    processTable: {
      searchPlaceholder: 'Search by process, exe, or PID',
      audioOnly: 'Audio only',
      totalPrefix: '',
      totalSuffix: 'items',
      emptyTitle: 'No matching processes',
      emptyDescription: 'Try another keyword or disable filters and try again.',
      systemProcessPath: 'System process or path unavailable',
      pathUnavailable: 'Path unavailable',
      iconAltSuffix: 'icon',
      foreground: 'Foreground',
      muted: 'Muted',
      speaking: 'Playing',
      noAudio: 'No audio',
      policyNone: 'No policy',
      policyWhitelist: 'Whitelist',
      policyBlacklist: 'Blacklist',
      policyHit: 'Policy hit',
      policyBackgroundMute: 'Background mute',
      viewPath: 'View path',
      hidePath: 'Hide path',
      policyResult: 'Policy Result',
      matchedWhitelist: 'Matched whitelist rule',
      matchedBlacklist: 'Matched blacklist rule',
      backgroundMutedByPolicy: 'Muted automatically by policy in background',
      autoMuteDisabled: 'Auto mute is currently disabled',
      foregroundDetail: 'Currently in foreground',
      notMatchedBlacklist: 'Not in blacklist',
      ignored: 'Not muted by current policy',
      sameAppGroup: 'Same app group as active window',
      removeWhitelist: 'Remove from whitelist',
      addWhitelist: 'Add to whitelist',
      removeBlacklist: 'Remove from blacklist',
      addBlacklist: 'Add to blacklist',
      whitelistShort: 'W',
      blacklistShort: 'B',
    },
    strategy: {
      modeTitle: 'Policy Mode',
      waiting: 'Waiting for the engine to report the current strategy state.',
      blacklistSummary: 'Only blacklisted programs are muted when they go to background.',
      whitelistSummary: 'All audio programs except the whitelist are muted when they go to background.',
      whitelistMode: 'Whitelist',
      blacklistMode: 'Blacklist',
      whitelistTitle: 'Whitelist',
      whitelistDescription: 'These programs are never muted automatically. Good for meeting tools, players, and alerts.',
      blacklistTitle: 'Blacklist',
      blacklistDescription: 'Only these programs are muted automatically in background. Good for browsers, launchers, and video players.',
      inputPlaceholder: 'For example chrome.exe',
      pickExecutable: 'Pick from Explorer',
      addRule: 'Add',
      emptyRules: 'No rules yet',
      removeRule: 'Remove',
    },
    logs: {
      emptyTitle: 'No logs yet',
      emptyDescription: 'Mute, restore, and engine exception events will appear here.',
    },
    settings: {
      languageTitle: 'Language',
      languageDescription: 'Switch the application UI language.',
      languageZh: '中文',
      languageEn: 'English',
      autoMuteTitle: 'Auto Mute',
      autoMuteDescription: 'Automatically mute background processes by the active strategy and restore them when they return to foreground.',
      trayTitle: 'Minimize to Tray',
      trayDescription: 'Closing the window hides the app to the system tray instead of exiting.',
      startupTitle: 'Launch at Startup',
      startupDescription: 'Start FocusMute automatically after Windows sign-in.',
      pollingTitle: 'Polling Interval',
      pollingDescription: 'Shorter intervals react faster but increase background checks.',
      faster: 'Faster',
      lowerCost: 'Lower load',
    },
  },
} as const

type Copy = (typeof copy)[Language]

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  text: Copy
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function resolveInitialLanguage(): Language {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return stored === 'en' ? 'en' : 'zh'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(resolveInitialLanguage)

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN'
  }, [language])

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      text: copy[language],
    }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider')
  }
  return context
}
