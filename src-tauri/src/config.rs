use std::{fs, path::Path};

use anyhow::Context;
use serde::{Deserialize, Serialize};

use crate::models::ListMode;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub auto_mute_enabled: bool,
    pub list_mode: ListMode,
    pub whitelist: Vec<String>,
    pub blacklist: Vec<String>,
    pub minimize_to_tray: bool,
    pub launch_at_startup: bool,
    pub polling_interval_ms: u64,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            auto_mute_enabled: true,
            list_mode: ListMode::Whitelist,
            whitelist: vec!["spotify.exe".into(), "wechat.exe".into()],
            blacklist: vec!["chrome.exe".into(), "msedge.exe".into()],
            minimize_to_tray: true,
            launch_at_startup: false,
            polling_interval_ms: 900,
        }
    }
}

impl AppConfig {
    pub fn load(path: &Path) -> anyhow::Result<Self> {
        if !path.exists() {
            return Ok(Self::default());
        }

        let raw = fs::read_to_string(path)
            .with_context(|| format!("failed to read config from {}", path.display()))?;
        let mut config: Self = serde_json::from_str(&raw)
            .with_context(|| format!("failed to parse config from {}", path.display()))?;
        config.sanitize();
        Ok(config)
    }

    pub fn save(&self, path: &Path) -> anyhow::Result<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)
                .with_context(|| format!("failed to create config directory {}", parent.display()))?;
        }

        let raw = serde_json::to_string_pretty(self).context("failed to serialize config")?;
        fs::write(path, raw).with_context(|| format!("failed to write config to {}", path.display()))
    }

    pub fn sanitize(&mut self) {
        sanitize_rules(&mut self.whitelist);
        sanitize_rules(&mut self.blacklist);
        self.polling_interval_ms = self.polling_interval_ms.clamp(300, 5000);
    }
}

pub fn normalize_rule(value: &str) -> Option<String> {
    let trimmed = value.trim().trim_matches('"').trim_matches('\'');
    if trimmed.is_empty() {
        return None;
    }

    let basename = trimmed
        .rsplit(['\\', '/'])
        .next()
        .unwrap_or(trimmed)
        .to_ascii_lowercase();

    if basename.ends_with(".exe") {
        Some(basename)
    } else {
        Some(format!("{basename}.exe"))
    }
}

pub fn sanitize_rules(list: &mut Vec<String>) {
    let mut normalized = list
        .iter()
        .filter_map(|item| normalize_rule(item))
        .collect::<Vec<_>>();
    normalized.sort();
    normalized.dedup();
    *list = normalized;
}
