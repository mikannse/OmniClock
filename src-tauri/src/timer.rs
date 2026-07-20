use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSegment {
    pub id: String,
    pub name: String,
    pub minutes: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerConfig {
    pub id: String,
    pub name: String,
    pub segments: Vec<TimerSegment>,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PomodoroSettings {
    pub work_minutes: u64,
    pub short_break_minutes: u64,
    pub long_break_minutes: u64,
    pub long_break_interval: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum PomodoroPhase {
    Working,
    ShortBreak,
    LongBreak,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TimerKind {
    Segmented { config: TimerConfig },
    Pomodoro {
        settings: PomodoroSettings,
        phase: PomodoroPhase,
    },
    Countdown {
        #[serde(rename = "totalSeconds")]
        total_seconds: u64,
    },
    Stopwatch,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum TimerStatus {
    Idle,
    Running,
    Paused,
}

struct TimerInstance {
    id: String,
    kind: TimerKind,
    status: TimerStatus,
    started_at: SystemTime,
    total_paused: Duration,
    pause_started_at: Option<SystemTime>,
    current_segment_index: usize,
    base_elapsed_seconds: u64,
    completed_pomodoros: u32,
    initial_seconds: u64,
    transition_handled: bool,
    last_reported_remaining: u64,
}

struct SpawnedGuard(Arc<AtomicBool>);

impl Drop for SpawnedGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

pub struct TimerManager {
    app: AppHandle,
    state: Arc<Mutex<HashMap<String, TimerInstance>>>,
    spawned: Arc<AtomicBool>,
}

impl TimerManager {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            state: Arc::new(Mutex::new(HashMap::new())),
            spawned: Arc::new(AtomicBool::new(false)),
        }
    }

    fn ensure_tick_loop(&self) {
        if self.spawned.swap(true, Ordering::SeqCst) {
            return;
        }
        let app = self.app.clone();
        let state = self.state.clone();
        let spawned = self.spawned.clone();
        tokio::spawn(async move {
            let _guard = SpawnedGuard(spawned);
            let mut idle_ticks = 0u32;
            loop {
                let sleep_duration = {
                    let guard = state.lock().await;
                    let mut has_running = false;
                    let mut min_sleep = Duration::from_secs(1);
                    for timer in guard.values() {
                        if timer.status == TimerStatus::Running {
                            has_running = true;
                            let elapsed = SystemTime::now()
                                .duration_since(timer.started_at)
                                .unwrap_or(Duration::ZERO)
                                .saturating_sub(timer.total_paused);
                            let elapsed_seconds = elapsed.as_secs();
                            let remaining = timer.initial_seconds.saturating_sub(elapsed_seconds);
                            let dur = if matches!(timer.kind, TimerKind::Stopwatch) {
                                Duration::from_millis(100)
                            } else if remaining > 0 && remaining <= 30 {
                                Duration::from_millis(100)
                            } else {
                                Duration::from_secs(1)
                            };
                            if dur < min_sleep {
                                min_sleep = dur;
                            }
                        }
                    }
                    if !has_running {
                        idle_ticks += 1;
                        if idle_ticks >= 3000 {
                            break;
                        }
                        Duration::from_millis(200)
                    } else {
                        idle_ticks = 0;
                        min_sleep
                    }
                };

                tokio::time::sleep(sleep_duration).await;

                let mut guard = state.lock().await;
                let mut to_remove: Vec<String> = Vec::new();
                for (id, timer) in guard.iter_mut() {
                    if timer.status != TimerStatus::Running {
                        continue;
                    }

                    let elapsed = SystemTime::now()
                        .duration_since(timer.started_at)
                        .unwrap_or(Duration::ZERO)
                        .saturating_sub(timer.total_paused);
                    let elapsed_seconds = elapsed.as_secs();
                    let remaining = timer.initial_seconds.saturating_sub(elapsed_seconds);

                    if remaining == 0 && !timer.transition_handled {
                        timer.transition_handled = true;
                        if let Err(e) = Self::emit_tick(&app, timer, 0) {
                            eprintln!("timer tick emit failed: {}", e);
                        }
                        Self::handle_transition(&app, timer);
                        if timer.status == TimerStatus::Idle {
                            to_remove.push(id.clone());
                        }
                    } else if matches!(timer.kind, TimerKind::Stopwatch)
                        || remaining != timer.last_reported_remaining
                    {
                        timer.last_reported_remaining = remaining;
                        if let Err(e) = Self::emit_tick(&app, timer, remaining) {
                            eprintln!("timer tick emit failed: {}", e);
                        }
                    }
                }
                for id in to_remove {
                    guard.remove(&id);
                }
            }
        });
    }

    fn emit_tick(
        app: &AppHandle,
        timer: &TimerInstance,
        remaining: u64,
    ) -> Result<(), tauri::Error> {
        match &timer.kind {
            TimerKind::Segmented { .. } => {
                let total = timer.base_elapsed_seconds + (timer.initial_seconds - remaining);
                app.emit(
                    "timer:tick",
                    serde_json::json!({
                        "timerId": timer.id,
                        "remainingSeconds": remaining,
                        "totalElapsedSeconds": total,
                        "currentSegmentIndex": timer.current_segment_index,
                        "warning": remaining <= 30 && remaining > 0,
                    }),
                )
            }
            TimerKind::Pomodoro { phase, .. } => {
                let total = timer.base_elapsed_seconds + (timer.initial_seconds - remaining);
                app.emit(
                    "pomodoro:tick",
                    serde_json::json!({
                        "timerId": timer.id,
                        "remainingSeconds": remaining,
                        "totalElapsedSeconds": total,
                        "phase": phase,
                        "completedPomodoros": timer.completed_pomodoros,
                        "warning": remaining <= 30 && remaining > 0,
                    }),
                )
            }
            TimerKind::Countdown { .. } => {
                app.emit(
                    "countdown:tick",
                    serde_json::json!({
                        "timerId": timer.id,
                        "timeLeft": remaining,
                    }),
                )
            }
            TimerKind::Stopwatch => {
                let paused_elapsed = SystemTime::now()
                    .duration_since(timer.started_at)
                    .unwrap_or(Duration::ZERO)
                    .saturating_sub(timer.total_paused);
                let elapsed_ms = timer.base_elapsed_seconds.saturating_mul(1000)
                    + u64::try_from(paused_elapsed.as_millis()).unwrap_or(u64::MAX);
                if let Err(e) = app.emit(
                    "stopwatch:tick",
                    serde_json::json!({
                        "timerId": timer.id,
                        "elapsedMs": elapsed_ms,
                    }),
                ) {
                    eprintln!("stopwatch tick emit failed: {}", e);
                }
                Ok(())
            }
        }
    }

    fn handle_transition(app: &AppHandle, timer: &mut TimerInstance) {
        match &mut timer.kind {
            TimerKind::Segmented { config } => {
                if timer.current_segment_index + 1 < config.segments.len() {
                    timer.base_elapsed_seconds = timer.base_elapsed_seconds.saturating_add(timer.initial_seconds);
                    timer.current_segment_index += 1;
                    let next_segment = &config.segments[timer.current_segment_index];
                    timer.initial_seconds = next_segment.minutes.saturating_mul(60);
                    timer.started_at = SystemTime::now();
                    timer.total_paused = Duration::ZERO;
                    timer.pause_started_at = None;
                    timer.transition_handled = false;

                    let _ = Self::emit_tick(app, timer, timer.initial_seconds);
                    timer.last_reported_remaining = timer.initial_seconds;

                    if let Err(e) = app.emit(
                        "timer:transition",
                        serde_json::json!({
                            "timerId": timer.id,
                            "type": "segment_end",
                            "currentSegmentIndex": timer.current_segment_index,
                            "remainingSeconds": timer.initial_seconds,
                            "totalElapsedSeconds": timer.base_elapsed_seconds,
                        }),
                    ) {
                        eprintln!("timer transition emit failed: {}", e);
                    }
                } else {
                    timer.status = TimerStatus::Idle;
                    let _ = Self::emit_tick(app, timer, 0);
                    timer.last_reported_remaining = 0;

                    if let Err(e) = app.emit(
                        "timer:transition",
                        serde_json::json!({
                            "timerId": timer.id,
                            "type": "timer_end",
                            "remainingSeconds": 0,
                            "totalElapsedSeconds": timer.base_elapsed_seconds,
                        }),
                    ) {
                        eprintln!("timer transition emit failed: {}", e);
                    }
                }
            }
            TimerKind::Pomodoro { settings, phase } => {
                timer.base_elapsed_seconds = timer.base_elapsed_seconds.saturating_add(timer.initial_seconds);

                let previous_phase = phase.clone();

                if *phase == PomodoroPhase::Working {
                    timer.completed_pomodoros += 1;
                    let next_completed = u64::from(timer.completed_pomodoros);
                    if settings.long_break_interval > 0 && next_completed.is_multiple_of(settings.long_break_interval) {
                        *phase = PomodoroPhase::LongBreak;
                        timer.initial_seconds = settings.long_break_minutes.saturating_mul(60);
                    } else {
                        *phase = PomodoroPhase::ShortBreak;
                        timer.initial_seconds = settings.short_break_minutes.saturating_mul(60);
                    }
                } else {
                    *phase = PomodoroPhase::Working;
                    timer.initial_seconds = settings.work_minutes.saturating_mul(60);
                }

                timer.started_at = SystemTime::now();
                timer.total_paused = Duration::ZERO;
                timer.pause_started_at = None;
                timer.transition_handled = false;

                let new_phase = phase.clone();

                let _ = Self::emit_tick(app, timer, timer.initial_seconds);
                timer.last_reported_remaining = timer.initial_seconds;

                if let Err(e) = app.emit(
                    "timer:transition",
                    serde_json::json!({
                        "timerId": timer.id,
                        "type": "phase_end",
                        "phase": new_phase,
                        "previousPhase": previous_phase,
                        "completedPomodoros": timer.completed_pomodoros,
                        "remainingSeconds": timer.initial_seconds,
                        "totalElapsedSeconds": timer.base_elapsed_seconds,
                    }),
                ) {
                    eprintln!("timer transition emit failed: {}", e);
                }
            }
            TimerKind::Countdown { .. } => {
                timer.status = TimerStatus::Idle;
                let _ = Self::emit_tick(app, timer, 0);
                timer.last_reported_remaining = 0;

                if let Err(e) = app.emit(
                    "timer:transition",
                    serde_json::json!({
                        "timerId": timer.id,
                        "type": "countdown_end",
                        "remainingSeconds": 0,
                        "totalElapsedSeconds": timer.base_elapsed_seconds,
                    }),
                ) {
                    eprintln!("timer transition emit failed: {}", e);
                }
            }
            TimerKind::Stopwatch => {
                // No transitions for stopwatch
            }
        }
    }

    pub async fn start(&self, id: String, kind: TimerKind) -> Result<(), String> {
        self.ensure_tick_loop();
        let mut guard = self.state.lock().await;
        guard.remove(&id);

        let initial_seconds = match &kind {
            TimerKind::Segmented { config } => config
                .segments
                .first()
                .map_or(0, |s| s.minutes.saturating_mul(60)),
            TimerKind::Pomodoro { settings, phase } => match phase {
                PomodoroPhase::Working => settings.work_minutes.saturating_mul(60),
                PomodoroPhase::ShortBreak => settings.short_break_minutes.saturating_mul(60),
                PomodoroPhase::LongBreak => settings.long_break_minutes.saturating_mul(60),
            },
            TimerKind::Countdown { total_seconds } => *total_seconds,
            TimerKind::Stopwatch => 0,
        };

        let instance = TimerInstance {
            id: id.clone(),
            kind,
            status: TimerStatus::Running,
            started_at: SystemTime::now(),
            total_paused: Duration::ZERO,
            pause_started_at: None,
            current_segment_index: 0,
            base_elapsed_seconds: 0,
            completed_pomodoros: 0,
            initial_seconds,
            transition_handled: false,
            last_reported_remaining: initial_seconds,
        };

        guard.insert(id.clone(), instance);

        if let Some(timer) = guard.get(&id) {
            let initial_remaining = match &timer.kind {
                TimerKind::Stopwatch => 0,
                _ => timer.initial_seconds,
            };
            if let Err(e) = Self::emit_tick(&self.app, timer, initial_remaining) {
                eprintln!("timer initial tick emit failed: {}", e);
            }
        }

        Ok(())
    }

    pub async fn pause(&self, id: &str) -> Result<(), String> {
        let mut guard = self.state.lock().await;
        if let Some(timer) = guard.get_mut(id) {
            if timer.status == TimerStatus::Running {
                timer.status = TimerStatus::Paused;
                timer.pause_started_at = Some(SystemTime::now());
            }
        }
        Ok(())
    }

    pub async fn resume(&self, id: &str) -> Result<(), String> {
        let mut guard = self.state.lock().await;
        if let Some(timer) = guard.get_mut(id) {
            if timer.status == TimerStatus::Paused {
                if let Some(pause_start) = timer.pause_started_at.take() {
                    timer.total_paused += SystemTime::now()
                        .duration_since(pause_start)
                        .unwrap_or(Duration::ZERO);
                }
                timer.status = TimerStatus::Running;
                let elapsed = SystemTime::now()
                    .duration_since(timer.started_at)
                    .unwrap_or(Duration::ZERO)
                    .saturating_sub(timer.total_paused);
                let elapsed_seconds = elapsed.as_secs();
                let remaining = timer.initial_seconds.saturating_sub(elapsed_seconds);
                if let Err(e) = Self::emit_tick(&self.app, timer, remaining) {
                    eprintln!("timer resume tick emit failed: {}", e);
                }
            }
        }
        Ok(())
    }

    pub async fn reset(&self, id: &str) -> Result<(), String> {
        let mut guard = self.state.lock().await;
        guard.remove(id);
        Ok(())
    }

    pub async fn jump_segment(&self, id: &str, index: usize) -> Result<(), String> {
        let mut guard = self.state.lock().await;
        if let Some(timer) = guard.get_mut(id) {
            if timer.status == TimerStatus::Idle {
                return Err("timer is idle".to_string());
            }
            if let TimerKind::Segmented { config } = &timer.kind {
                if index < config.segments.len() {
                    let now = SystemTime::now();
                    let total_paused = if let Some(pause_start) = timer.pause_started_at {
                        timer.total_paused
                            + now
                                .duration_since(pause_start)
                                .unwrap_or(Duration::ZERO)
                    } else {
                        timer.total_paused
                    };
                    let elapsed = now
                        .duration_since(timer.started_at)
                        .unwrap_or(Duration::ZERO)
                        .saturating_sub(total_paused);

                    timer.current_segment_index = index;
                    timer.initial_seconds = config.segments[index].minutes.saturating_mul(60);
                    timer.started_at = now;
                    timer.total_paused = Duration::ZERO;
                    timer.pause_started_at = None;
                    timer.base_elapsed_seconds = timer
                        .base_elapsed_seconds
                        .saturating_add(elapsed.as_secs());
                    timer.transition_handled = false;
                    timer.last_reported_remaining = timer.initial_seconds;
                }
            }
        }
        Ok(())
    }

    pub async fn skip(&self, id: &str) -> Result<(), String> {
        let mut guard = self.state.lock().await;
        if let Some(timer) = guard.get_mut(id) {
            if timer.status != TimerStatus::Running {
                return Err("timer is not running".to_string());
            }
            Self::handle_transition(&self.app, timer);
            if timer.status == TimerStatus::Idle {
                guard.remove(id);
            }
        }
        Ok(())
    }
}
