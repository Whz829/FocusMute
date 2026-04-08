use std::{collections::BTreeSet, path::PathBuf, sync::Arc};

use anyhow::Context;
use chrono::Utc;
use parking_lot::Mutex;

use crate::{
    config::AppConfig,
    models::{AppSettingsSnapshot, AppSnapshot, LogEntry, LogLevel, ProcessSnapshot},
};

#[derive(Clone)]
pub struct AppState {
    inner: Arc<Mutex<InnerState>>,
}

struct InnerState {
    config_path: PathBuf,
    config: AppConfig,
    processes: Vec<ProcessSnapshot>,
    logs: Vec<LogEntry>,
    muted_by_app: BTreeSet<u32>,
    foreground_pid: Option<u32>,
    last_updated: String,
    last_error: Option<String>,
    next_log_id: u64,
    quitting: bool,
}

impl AppState {
    pub fn new(config_path: PathBuf, config: AppConfig) -> Self {
        Self {
            inner: Arc::new(Mutex::new(InnerState {
                config_path,
                config,
                processes: Vec::new(),
                logs: Vec::new(),
                muted_by_app: BTreeSet::new(),
                foreground_pid: None,
                last_updated: now_rfc3339(),
                last_error: None,
                next_log_id: 1,
                quitting: false,
            })),
        }
    }

    pub fn config(&self) -> AppConfig {
        self.inner.lock().config.clone()
    }

    pub fn muted_by_app(&self) -> BTreeSet<u32> {
        self.inner.lock().muted_by_app.clone()
    }

    pub fn snapshot(&self) -> AppSnapshot {
        let state = self.inner.lock();
        AppSnapshot {
            settings: AppSettingsSnapshot {
                auto_mute_enabled: state.config.auto_mute_enabled,
                list_mode: state.config.list_mode.clone(),
                whitelist: state.config.whitelist.clone(),
                blacklist: state.config.blacklist.clone(),
                minimize_to_tray: state.config.minimize_to_tray,
                launch_at_startup: state.config.launch_at_startup,
                polling_interval_ms: state.config.polling_interval_ms,
            },
            processes: state.processes.clone(),
            muted_pids: state.muted_by_app.iter().copied().collect(),
            foreground_pid: state.foreground_pid,
            logs: state.logs.clone(),
            last_updated: state.last_updated.clone(),
            last_error: state.last_error.clone(),
        }
    }

    pub fn update_config<F>(&self, apply: F) -> anyhow::Result<AppSnapshot>
    where
        F: FnOnce(&mut AppConfig),
    {
        let (path, config) = {
            let mut state = self.inner.lock();
            apply(&mut state.config);
            state.config.sanitize();
            (state.config_path.clone(), state.config.clone())
        };

        config
            .save(&path)
            .with_context(|| format!("failed to persist config to {}", path.display()))?;

        Ok(self.snapshot())
    }

    pub fn set_runtime(
        &self,
        processes: Vec<ProcessSnapshot>,
        muted_by_app: BTreeSet<u32>,
        foreground_pid: Option<u32>,
        last_error: Option<String>,
    ) -> AppSnapshot {
        let mut state = self.inner.lock();
        state.processes = processes;
        state.muted_by_app = muted_by_app;
        state.foreground_pid = foreground_pid;
        state.last_error = last_error;
        state.last_updated = now_rfc3339();
        drop(state);
        self.snapshot()
    }

    pub fn push_log(
        &self,
        level: LogLevel,
        action: impl Into<String>,
        message: impl Into<String>,
        process_name: Option<String>,
        pid: Option<u32>,
    ) {
        let mut state = self.inner.lock();
        let entry = LogEntry {
            id: state.next_log_id,
            timestamp: now_rfc3339(),
            level,
            action: action.into(),
            process_name,
            pid,
            message: message.into(),
        };
        state.next_log_id += 1;
        state.logs.insert(0, entry);
        state.logs.truncate(200);
    }

    pub fn is_quitting(&self) -> bool {
        self.inner.lock().quitting
    }

    pub fn mark_quitting(&self) {
        self.inner.lock().quitting = true;
    }
}

fn now_rfc3339() -> String {
    Utc::now().to_rfc3339()
}
