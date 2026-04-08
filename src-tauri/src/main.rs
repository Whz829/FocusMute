#![cfg_attr(target_os = "windows", windows_subsystem = "windows")]

mod audio;
mod commands;
mod config;
mod desktop;
mod engine;
mod models;
mod process_icon;
mod state;
mod system;

use std::{fs, path::PathBuf};

use commands::{
    get_snapshot, hide_main_window, open_process_path, pick_rule_executable, remove_rule, set_auto_mute_enabled,
    set_launch_at_startup, set_list_mode, set_minimize_to_tray, set_polling_interval_ms,
    show_main_window, upsert_rule,
};
use config::AppConfig;
use desktop::{tray_image, update_tray_icon};
use models::ListMode;
use state::AppState;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::ManagerExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::Builder::new().args(["--autostart"]).build())
        .setup(|app| {
            let config_path = resolve_config_path(app)?;
            let mut config = AppConfig::load(&config_path)?;
            if let Ok(enabled) = app.autolaunch().is_enabled() {
                config.launch_at_startup = enabled;
                let _ = config.save(&config_path);
            }

            let state = AppState::new(config_path, config);
            build_tray(app, &state)?;
            maybe_hide_from_autostart(app, &state)?;
            engine::spawn_engine(app.handle().clone(), state.clone());
            app.manage(state);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                if state.config().minimize_to_tray && !state.is_quitting() {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            set_auto_mute_enabled,
            set_list_mode,
            upsert_rule,
            remove_rule,
            set_launch_at_startup,
            set_minimize_to_tray,
            set_polling_interval_ms,
            show_main_window,
            hide_main_window,
            open_process_path,
            pick_rule_executable
        ])
        .run(tauri::generate_context!())
        .expect("error while running FocusMute");
}

fn resolve_config_path(app: &tauri::App) -> anyhow::Result<PathBuf> {
    let dir = app.path().app_config_dir()?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("focusmute.json"))
}

fn maybe_hide_from_autostart(app: &tauri::App, state: &AppState) -> anyhow::Result<()> {
    let launched_from_autostart = std::env::args().any(|arg| arg == "--autostart");
    if launched_from_autostart && state.config().minimize_to_tray {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
    }
    Ok(())
}

fn build_tray(app: &tauri::App, state: &AppState) -> anyhow::Result<()> {
    let config = state.config();
    let show_item = MenuItem::with_id(app, "show", "打开 FocusMute", true, None::<&str>)?;
    let auto_mute_item = CheckMenuItem::with_id(
        app,
        "toggle_auto_mute",
        "开启自动静音",
        true,
        config.auto_mute_enabled,
        None::<&str>,
    )?;
    let whitelist_item = CheckMenuItem::with_id(
        app,
        "mode_whitelist",
        "白名单模式",
        true,
        config.list_mode == ListMode::Whitelist,
        None::<&str>,
    )?;
    let blacklist_item = CheckMenuItem::with_id(
        app,
        "mode_blacklist",
        "黑名单模式",
        true,
        config.list_mode == ListMode::Blacklist,
        None::<&str>,
    )?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &show_item,
            &separator,
            &auto_mute_item,
            &whitelist_item,
            &blacklist_item,
            &separator,
            &quit_item,
        ],
    )?;
    let app_handle = app.handle().clone();
    let state_clone = state.clone();
    let auto_mute_item_handle = auto_mute_item.clone();
    let whitelist_item_handle = whitelist_item.clone();
    let blacklist_item_handle = blacklist_item.clone();

    TrayIconBuilder::with_id("focusmute-tray")
        .icon(tray_image(config.auto_mute_enabled)?)
        .tooltip(if config.auto_mute_enabled {
            "FocusMute - 自动静音已开启"
        } else {
            "FocusMute - 自动静音已关闭"
        })
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "show" => {
                let _ = focus_main_window(app);
            }
            "toggle_auto_mute" => {
                let next_value = !state_clone.config().auto_mute_enabled;
                if state_clone
                    .update_config(|config| config.auto_mute_enabled = next_value)
                    .is_ok()
                {
                    let _ = auto_mute_item_handle.set_checked(next_value);
                    let _ = update_tray_icon(app.app_handle(), next_value);
                }
            }
            "mode_whitelist" => {
                if state_clone
                    .update_config(|config| config.list_mode = ListMode::Whitelist)
                    .is_ok()
                {
                    let _ = whitelist_item_handle.set_checked(true);
                    let _ = blacklist_item_handle.set_checked(false);
                }
            }
            "mode_blacklist" => {
                if state_clone
                    .update_config(|config| config.list_mode = ListMode::Blacklist)
                    .is_ok()
                {
                    let _ = whitelist_item_handle.set_checked(false);
                    let _ = blacklist_item_handle.set_checked(true);
                }
            }
            "quit" => {
                state_clone.mark_quitting();
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(move |_tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = focus_main_window(&app_handle);
            }
        })
        .build(app)?;

    update_tray_icon(&app.handle(), config.auto_mute_enabled)?;
    Ok(())
}

fn focus_main_window<R: tauri::Runtime, M: Manager<R>>(app: &M) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
    Ok(())
}
