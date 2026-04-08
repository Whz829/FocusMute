use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ListMode {
    Whitelist,
    Blacklist,
}

impl Default for ListMode {
    fn default() -> Self {
        Self::Whitelist
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RuleListKind {
    Whitelist,
    Blacklist,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Info,
    Warning,
    Error,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessSnapshot {
    pub pid: u32,
    pub name: String,
    pub exe_name: String,
    pub exe_path: Option<String>,
    pub icon_data_url: Option<String>,
    pub in_whitelist: bool,
    pub in_blacklist: bool,
    pub has_audio_session: bool,
    pub is_muted: bool,
    pub is_foreground: bool,
    pub policy_targeted: bool,
    pub policy_reason: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub id: u64,
    pub timestamp: String,
    pub level: LogLevel,
    pub action: String,
    pub process_name: Option<String>,
    pub pid: Option<u32>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsSnapshot {
    pub auto_mute_enabled: bool,
    pub list_mode: ListMode,
    pub whitelist: Vec<String>,
    pub blacklist: Vec<String>,
    pub minimize_to_tray: bool,
    pub launch_at_startup: bool,
    pub polling_interval_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSnapshot {
    pub settings: AppSettingsSnapshot,
    pub processes: Vec<ProcessSnapshot>,
    pub muted_pids: Vec<u32>,
    pub foreground_pid: Option<u32>,
    pub logs: Vec<LogEntry>,
    pub last_updated: String,
    pub last_error: Option<String>,
}
