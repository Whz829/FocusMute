use std::{
    cmp::Reverse,
    collections::{BTreeSet, HashMap},
    thread,
    time::Duration,
};

use tauri::{AppHandle, Emitter};

use crate::{
    audio::AudioController,
    config::AppConfig,
    models::{ListMode, LogLevel, ProcessSnapshot},
    process_icon::extract_process_icon_data_url,
    state::AppState,
    system::{process_lookup, ProcessInfo, ProcessProbe},
};

const SNAPSHOT_EVENT: &str = "focusmute://snapshot";

pub fn spawn_engine(app: AppHandle, state: AppState) {
    thread::spawn(move || {
        let mut process_probe = ProcessProbe::new();
        let mut icon_cache = HashMap::<String, Option<String>>::new();
        let audio = AudioController::new();

        if let Err(error) = &audio {
            state.push_log(
                LogLevel::Error,
                "音频引擎初始化失败",
                error.to_string(),
                None,
                None,
            );
        }

        loop {
            if state.is_quitting() {
                break;
            }

            let config = state.config();
            let system_snapshot = process_probe.sample();
            let process_map = process_lookup(&system_snapshot);
            let previous_managed = state.muted_by_app();

            let (processes, managed, error_message) = match &audio {
                Ok(audio) => build_runtime(
                    audio,
                    &config,
                    &process_map,
                    system_snapshot.foreground_pid,
                    system_snapshot.foreground_exe_name.as_deref(),
                    previous_managed,
                    &mut icon_cache,
                    &state,
                ),
                Err(error) => (
                    build_process_snapshots(
                        &process_map,
                        HashMap::new(),
                        &config,
                        system_snapshot.foreground_pid,
                        system_snapshot.foreground_exe_name.as_deref(),
                        &mut icon_cache,
                    ),
                    BTreeSet::new(),
                    Some(error.to_string()),
                ),
            };

            let snapshot = state.set_runtime(
                processes,
                managed,
                system_snapshot.foreground_pid,
                error_message,
            );
            let _ = app.emit(SNAPSHOT_EVENT, snapshot);

            thread::sleep(Duration::from_millis(config.polling_interval_ms));
        }
    });
}

fn build_runtime(
    audio: &AudioController,
    config: &AppConfig,
    process_map: &HashMap<u32, ProcessInfo>,
    foreground_pid: Option<u32>,
    foreground_exe_name: Option<&str>,
    previous_managed: BTreeSet<u32>,
    icon_cache: &mut HashMap<String, Option<String>>,
    state: &AppState,
) -> (Vec<ProcessSnapshot>, BTreeSet<u32>, Option<String>) {
    let current_sessions = match audio.enumerate_sessions() {
        Ok(sessions) => sessions,
        Err(error) => {
            return (
                build_process_snapshots(
                    process_map,
                    HashMap::new(),
                    config,
                    foreground_pid,
                    foreground_exe_name,
                    icon_cache,
                ),
                BTreeSet::new(),
                Some(error.to_string()),
            );
        }
    };

    let mut session_map = current_sessions
        .into_iter()
        .map(|session| (session.pid, session.muted))
        .collect::<HashMap<_, _>>();
    let mut managed = BTreeSet::new();

    let current_state = session_map
        .iter()
        .map(|(pid, muted)| (*pid, *muted))
        .collect::<Vec<_>>();

    for (pid, is_muted) in current_state {
        let Some(process) = process_map.get(&pid) else {
            continue;
        };

        let desired = should_auto_mute(config, process, foreground_pid, foreground_exe_name);
        let was_managed = previous_managed.contains(&pid);

        if desired {
            if is_muted {
                managed.insert(pid);
                continue;
            }

            if audio.set_mute_for_pid(pid, true).unwrap_or(false) {
                session_map.insert(pid, true);
                managed.insert(pid);
                state.push_log(
                    LogLevel::Info,
                    if was_managed { "重新静音" } else { "后台静音" },
                    format!("{} 已离开前台，系统已自动将其静音。", process.name),
                    Some(process.name.clone()),
                    Some(pid),
                );
            }
        } else if was_managed {
            if is_muted {
                let _ = audio.set_mute_for_pid(pid, false);
                session_map.insert(pid, false);
            }

            state.push_log(
                LogLevel::Info,
                "恢复声音",
                format!("{} 已回到前台或不再命中策略，声音已恢复。", process.name),
                Some(process.name.clone()),
                Some(pid),
            );
        }
    }

    let processes = build_process_snapshots(
        process_map,
        session_map,
        config,
        foreground_pid,
        foreground_exe_name,
        icon_cache,
    );
    (processes, managed, None)
}

fn build_process_snapshots(
    process_map: &HashMap<u32, ProcessInfo>,
    session_map: HashMap<u32, bool>,
    config: &AppConfig,
    foreground_pid: Option<u32>,
    foreground_exe_name: Option<&str>,
    icon_cache: &mut HashMap<String, Option<String>>,
) -> Vec<ProcessSnapshot> {
    let mut processes = process_map
        .values()
        .map(|process| {
            let has_audio_session = session_map.contains_key(&process.pid);
            let is_muted = session_map.get(&process.pid).copied().unwrap_or(false);
            let is_foreground = Some(process.pid) == foreground_pid;
            let (policy_targeted, policy_reason) = policy_reason(
                config,
                process,
                foreground_pid,
                foreground_exe_name,
                has_audio_session,
            );

            ProcessSnapshot {
                pid: process.pid,
                name: process.name.clone(),
                exe_name: process.exe_name.clone(),
                exe_path: process.exe_path.clone(),
                icon_data_url: resolve_process_icon(process, icon_cache),
                in_whitelist: config.whitelist.contains(&process.exe_name),
                in_blacklist: config.blacklist.contains(&process.exe_name),
                has_audio_session,
                is_muted,
                is_foreground,
                policy_targeted,
                policy_reason,
            }
        })
        .collect::<Vec<_>>();

    processes.sort_by_cached_key(|process| {
        (
            Reverse(process.is_foreground),
            Reverse(process.has_audio_session),
            Reverse(process.is_muted),
            process.name.to_ascii_lowercase(),
            process.exe_name.to_ascii_lowercase(),
            process.pid,
        )
    });

    processes
}

fn resolve_process_icon(
    process: &ProcessInfo,
    icon_cache: &mut HashMap<String, Option<String>>,
) -> Option<String> {
    let path = process.exe_path.as_ref()?;
    let key = path.to_ascii_lowercase();

    if let Some(cached) = icon_cache.get(&key) {
        return cached.clone();
    }

    let extracted = extract_process_icon_data_url(path).ok();
    icon_cache.insert(key, extracted.clone());
    extracted
}

fn should_auto_mute(
    config: &AppConfig,
    process: &ProcessInfo,
    foreground_pid: Option<u32>,
    foreground_exe_name: Option<&str>,
) -> bool {
    if !config.auto_mute_enabled || Some(process.pid) == foreground_pid {
        return false;
    }

    if foreground_exe_name.is_some_and(|name| name == process.exe_name) {
        return false;
    }

    match config.list_mode {
        ListMode::Whitelist => !config.whitelist.contains(&process.exe_name),
        ListMode::Blacklist => config.blacklist.contains(&process.exe_name),
    }
}

fn policy_reason(
    config: &AppConfig,
    process: &ProcessInfo,
    foreground_pid: Option<u32>,
    foreground_exe_name: Option<&str>,
    has_audio_session: bool,
) -> (bool, String) {
    if !has_audio_session {
        return (false, "无音频会话".into());
    }

    if !config.auto_mute_enabled {
        return (false, "自动静音已关闭".into());
    }

    if Some(process.pid) == foreground_pid {
        return (false, "当前前台进程".into());
    }

    if foreground_exe_name.is_some_and(|name| name == process.exe_name) {
        return (false, "与前台属于同一应用".into());
    }

    match config.list_mode {
        ListMode::Whitelist => {
            if config.whitelist.contains(&process.exe_name) {
                (false, "位于白名单中".into())
            } else {
                (true, "后台运行且不在白名单".into())
            }
        }
        ListMode::Blacklist => {
            if config.blacklist.contains(&process.exe_name) {
                (true, "命中黑名单".into())
            } else {
                (false, "未命中黑名单".into())
            }
        }
    }
}
