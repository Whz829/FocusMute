use std::process::Command;

use rfd::FileDialog;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_autostart::ManagerExt;

use crate::{
    config::normalize_rule,
    desktop::update_tray_icon,
    models::{AppSnapshot, RuleListKind},
    state::AppState,
};

type CommandResult<T> = Result<T, String>;

#[tauri::command]
pub fn get_snapshot(state: State<'_, AppState>) -> AppSnapshot {
    state.snapshot()
}

#[tauri::command]
pub fn set_auto_mute_enabled(
    enabled: bool,
    app: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<AppSnapshot> {
    let snapshot = state
        .update_config(|config| config.auto_mute_enabled = enabled)
        .map_err(|error| error.to_string())?;
    update_tray_icon(&app, enabled).map_err(|error| error.to_string())?;
    Ok(snapshot)
}

#[tauri::command]
pub fn set_list_mode(
    mode: crate::models::ListMode,
    state: State<'_, AppState>,
) -> CommandResult<AppSnapshot> {
    state
        .update_config(|config| config.list_mode = mode)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn upsert_rule(
    kind: RuleListKind,
    value: String,
    state: State<'_, AppState>,
) -> CommandResult<AppSnapshot> {
    let normalized = normalize_rule(&value).ok_or_else(|| "请输入有效的 exe 名称".to_string())?;
    state
        .update_config(|config| match kind {
            RuleListKind::Whitelist => config.whitelist.push(normalized.clone()),
            RuleListKind::Blacklist => config.blacklist.push(normalized.clone()),
        })
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn remove_rule(
    kind: RuleListKind,
    value: String,
    state: State<'_, AppState>,
) -> CommandResult<AppSnapshot> {
    let normalized = normalize_rule(&value).ok_or_else(|| "请输入有效的 exe 名称".to_string())?;
    state
        .update_config(|config| match kind {
            RuleListKind::Whitelist => config.whitelist.retain(|item| item != &normalized),
            RuleListKind::Blacklist => config.blacklist.retain(|item| item != &normalized),
        })
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_launch_at_startup(
    enabled: bool,
    app: AppHandle,
    state: State<'_, AppState>,
) -> CommandResult<AppSnapshot> {
    if enabled {
        app.autolaunch().enable().map_err(|error| error.to_string())?;
    } else {
        app.autolaunch().disable().map_err(|error| error.to_string())?;
    }

    state
        .update_config(|config| config.launch_at_startup = enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_minimize_to_tray(
    enabled: bool,
    state: State<'_, AppState>,
) -> CommandResult<AppSnapshot> {
    state
        .update_config(|config| config.minimize_to_tray = enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_polling_interval_ms(
    value: u64,
    state: State<'_, AppState>,
) -> CommandResult<AppSnapshot> {
    let clamped = value.clamp(300, 3000);
    state
        .update_config(|config| config.polling_interval_ms = clamped)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn show_main_window(app: AppHandle) -> CommandResult<()> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "主窗口不存在".to_string())?;
    window.show().map_err(|error| error.to_string())?;
    let _ = window.unminimize();
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn hide_main_window(app: AppHandle) -> CommandResult<()> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "主窗口不存在".to_string())?;
    window.hide().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_process_path(path: String) -> CommandResult<()> {
    if path.trim().is_empty() {
        return Err("路径为空".to_string());
    }

    Command::new("explorer.exe")
        .arg(format!("/select,{}", path))
        .spawn()
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn pick_rule_executable() -> CommandResult<Option<String>> {
    let selected = FileDialog::new()
        .add_filter("Windows Executable", &["exe"])
        .pick_file();

    let exe_name = selected
        .and_then(|path| path.file_name().map(|name| name.to_string_lossy().to_string()));

    Ok(exe_name)
}
