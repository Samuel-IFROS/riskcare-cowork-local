# ========= Copyright 2025-2026 @ Eigent.ai All Rights Reserved. =========
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ========= Copyright 2025-2026 @ Eigent.ai All Rights Reserved. =========

import json
import logging
import os
import re
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from camel.toolkits import PyAutoGUIToolkit as BasePyAutoGUIToolkit
from camel.toolkits.function_tool import FunctionTool

from app.agent.toolkit.abstract_toolkit import AbstractToolkit
from app.component.environment import env
from app.service.task import Agents
from app.utils.listen.toolkit_listen import auto_listen_toolkit

logger = logging.getLogger("pyautogui_toolkit")


@auto_listen_toolkit(BasePyAutoGUIToolkit)
class PyAutoGUIToolkit(BasePyAutoGUIToolkit, AbstractToolkit):
    agent_name: str = Agents.browser_agent
    _KEY_ALIASES = {
        "ctrl_l": "ctrl",
        "ctrl_r": "ctrl",
        "alt_l": "alt",
        "alt_r": "alt",
        "shift_l": "shift",
        "shift_r": "shift",
        "caps_lock": "capslock",
        "num_lock": "numlock",
        "scroll_lock": "scrolllock",
        "page_up": "pageup",
        "page_down": "pagedown",
        "print_screen": "printscreen",
        "return": "enter",
        "windows": "win",
        "cmd": "win",
        "cmd_l": "win",
        "cmd_r": "win",
    }

    def __init__(
        self,
        api_task_id: str,
        timeout: float | None = None,
        screenshots_dir: str | None = None,
    ):
        if screenshots_dir is None:
            screenshots_dir = env(
                "file_save_path", os.path.expanduser("~/Downloads")
            )
        self._pyautogui_unavailable_reason: str | None = None
        try:
            super().__init__(timeout, screenshots_dir)
        except ImportError as exc:
            self._pyautogui_unavailable_reason = str(exc)
            logger.warning(
                "PyAutoGUI runtime unavailable, replay actions disabled: %s",
                exc,
            )
            self.pyautogui = None
            self.screen_width = 0
            self.screen_height = 0
            self.safe_margin = 0.1
            self.safe_min_x = 0
            self.safe_max_x = 0
            self.safe_min_y = 0
            self.safe_max_y = 0
            self.screen_center = (0, 0)
            self.screenshots_dir = os.path.expanduser(screenshots_dir)
        self.api_task_id = api_task_id
        self._recordings_dir = Path(screenshots_dir) / "recordings"
        self._recordings_dir.mkdir(parents=True, exist_ok=True)

    @classmethod
    def get_can_use_tools(cls, api_task_id: str) -> list[FunctionTool]:
        try:
            return cls(api_task_id=api_task_id).get_tools()
        except Exception as exc:
            logger.warning(
                "PyAutoGUIToolkit unavailable: %s", exc, exc_info=True
            )
            return []

    def _sanitize_recording_name(self, recording_name: str) -> str:
        safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "_", recording_name.strip())
        if safe_name:
            return safe_name
        return f"recording_{int(time.time())}"

    def _get_recording_path(self, recording_name: str) -> Path:
        safe_name = self._sanitize_recording_name(recording_name)
        self._recordings_dir.mkdir(parents=True, exist_ok=True)
        return self._recordings_dir / f"{safe_name}.json"

    def _get_pyautogui_runtime_error(self) -> str | None:
        if getattr(self, "pyautogui", None) is not None:
            return None
        details = self._pyautogui_unavailable_reason or "pyautogui missing"
        return (
            "Error: GUI automation runtime is unavailable for replay. "
            "Install `pyautogui` and restart backend. "
            f"Details: {details}"
        )

    def _serialize_key(self, key: Any) -> str | None:
        key_char = getattr(key, "char", None)
        if isinstance(key_char, str) and key_char != "":
            return key_char

        key_name = getattr(key, "name", None)
        if isinstance(key_name, str) and key_name != "":
            return key_name

        key_text = str(key)
        if key_text.startswith("Key."):
            key_text = key_text[4:]
        if len(key_text) >= 2 and key_text[0] == "'" and key_text[-1] == "'":
            key_text = key_text[1:-1]
        return key_text or None

    def _normalize_key_for_pyautogui(self, key: str | None) -> str | None:
        if not key:
            return None
        lowered = key.strip().lower()
        if lowered == "":
            return None
        return self._KEY_ALIASES.get(lowered, lowered)

    def _normalize_mouse_button(
        self,
        button_name: str,
    ) -> Literal["left", "middle", "right"]:
        lowered = button_name.strip().lower()
        if lowered == "middle":
            return "middle"
        if lowered == "right":
            return "right"
        return "left"

    def _get_pynput_modules(self) -> tuple[Any, Any, str | None]:
        try:
            from pynput import keyboard, mouse

            return keyboard, mouse, None
        except Exception as exc:
            return None, None, str(exc)

    def _to_int(self, value: Any, default: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    def _matches_trigger_key(
        self,
        key_text: str | None,
        trigger_key: str | None,
    ) -> bool:
        if key_text is None or trigger_key is None:
            return False
        return (
            self._normalize_key_for_pyautogui(key_text)
            == self._normalize_key_for_pyautogui(trigger_key)
        )

    def record_user_actions(
        self,
        recording_name: str,
        duration_seconds: float = 15.0,
        start_trigger_key: str | None = None,
        stop_trigger_key: str | None = None,
        start_wait_timeout_seconds: float = 300.0,
        max_recording_seconds: float = 600.0,
        capture_mouse_moves: bool = True,
        capture_mouse_clicks: bool = True,
        capture_mouse_scroll: bool = True,
        capture_keyboard: bool = True,
        mouse_move_sampling_ms: int = 16,
        mouse_move_min_distance: int = 3,
    ) -> str:
        r"""Record keyboard/mouse actions with timing and save as JSON."""
        use_stop_trigger = (
            self._normalize_key_for_pyautogui(stop_trigger_key) is not None
        )
        use_start_trigger = (
            self._normalize_key_for_pyautogui(start_trigger_key) is not None
        )

        if use_stop_trigger:
            if max_recording_seconds <= 0:
                return "Error: max_recording_seconds must be greater than 0."
            if max_recording_seconds > 3600:
                return (
                    "Error: max_recording_seconds cannot exceed 3600 seconds."
                )
        else:
            if duration_seconds <= 0:
                return "Error: duration_seconds must be greater than 0."
            if duration_seconds > 600:
                return "Error: duration_seconds cannot exceed 600 seconds."

        if use_start_trigger:
            if start_wait_timeout_seconds <= 0:
                return (
                    "Error: start_wait_timeout_seconds "
                    "must be greater than 0."
                )
            if start_wait_timeout_seconds > 3600:
                return (
                    "Error: start_wait_timeout_seconds "
                    "cannot exceed 3600 seconds."
                )

        if not any(
            [
                capture_mouse_moves,
                capture_mouse_clicks,
                capture_mouse_scroll,
                capture_keyboard,
            ]
        ):
            return "Error: enable at least one input source to record."

        keyboard_module, mouse_module, import_error = (
            self._get_pynput_modules()
        )
        if import_error is not None:
            return (
                "Error: unable to import pynput for recording. "
                f"Please install `pynput`. Details: {import_error}"
            )

        event_lock = threading.Lock()
        events: list[dict[str, Any]] = []

        start_monotonic = 0.0
        last_event_monotonic = 0.0
        move_sampling_seconds = max(0.0, mouse_move_sampling_ms / 1000.0)
        move_min_distance = max(0, mouse_move_min_distance)
        last_move_x: int | None = None
        last_move_y: int | None = None
        last_move_time = 0.0
        stop_event = threading.Event()

        def append_event(event_type: str, payload: dict[str, Any]) -> None:
            nonlocal last_event_monotonic
            now_monotonic = time.monotonic()
            delay = max(0.0, now_monotonic - last_event_monotonic)
            last_event_monotonic = now_monotonic
            event = {
                "type": event_type,
                "delay": round(delay, 4),
                **payload,
            }
            with event_lock:
                events.append(event)

        def on_move(x: int, y: int) -> None:
            nonlocal last_move_x, last_move_y, last_move_time
            if not capture_mouse_moves:
                return

            x_val = int(x)
            y_val = int(y)
            now_monotonic = time.monotonic()

            if last_move_x is not None and last_move_y is not None:
                delta_x = abs(x_val - last_move_x)
                delta_y = abs(y_val - last_move_y)
                moved_enough = (
                    delta_x >= move_min_distance
                    or delta_y >= move_min_distance
                )
                waited_enough = (
                    now_monotonic - last_move_time
                    >= move_sampling_seconds
                )
                if not moved_enough and not waited_enough:
                    return

            last_move_x = x_val
            last_move_y = y_val
            last_move_time = now_monotonic
            append_event("mouse_move", {"x": x_val, "y": y_val})

        def on_click(x: int, y: int, button: Any, pressed: bool) -> None:
            if not capture_mouse_clicks:
                return
            button_name = getattr(button, "name", str(button))
            if button_name.startswith("Button."):
                button_name = button_name.replace("Button.", "", 1)
            append_event(
                "mouse_click",
                {
                    "x": int(x),
                    "y": int(y),
                    "button": str(button_name).lower(),
                    "pressed": bool(pressed),
                },
            )

        def on_scroll(x: int, y: int, dx: int, dy: int) -> None:
            if not capture_mouse_scroll:
                return
            append_event(
                "mouse_scroll",
                {
                    "x": int(x),
                    "y": int(y),
                    "dx": int(dx),
                    "dy": int(dy),
                },
            )

        def on_press(key: Any) -> None:
            key_text = self._serialize_key(key)
            if key_text is None:
                return

            if self._matches_trigger_key(key_text, stop_trigger_key):
                stop_event.set()
                return

            if not capture_keyboard:
                return
            append_event("key_down", {"key": key_text})

        def on_release(key: Any) -> None:
            key_text = self._serialize_key(key)
            if key_text is None:
                return

            if self._matches_trigger_key(key_text, stop_trigger_key):
                return

            if not capture_keyboard:
                return
            append_event("key_up", {"key": key_text})

        if use_start_trigger:
            start_event = threading.Event()

            def on_start_press(key: Any) -> bool | None:
                key_text = self._serialize_key(key)
                if self._matches_trigger_key(key_text, start_trigger_key):
                    start_event.set()
                    return False
                return None

            start_listener = keyboard_module.Listener(on_press=on_start_press)
            try:
                start_listener.start()
                started = start_event.wait(timeout=start_wait_timeout_seconds)
            finally:
                try:
                    start_listener.stop()
                except Exception:
                    logger.debug(
                        "Start-listener stop failed", exc_info=True
                    )
                try:
                    start_listener.join(timeout=1.0)
                except Exception:
                    logger.debug(
                        "Start-listener join failed", exc_info=True
                    )

            if not started:
                return (
                    "Error: start trigger key was not pressed in time. "
                    f"Expected key: '{start_trigger_key}'."
                )

        start_monotonic = time.monotonic()
        last_event_monotonic = start_monotonic
        last_move_time = start_monotonic

        mouse_listener = mouse_module.Listener(
            on_move=on_move if capture_mouse_moves else None,
            on_click=on_click if capture_mouse_clicks else None,
            on_scroll=on_scroll if capture_mouse_scroll else None,
        )
        keyboard_listener = None
        if capture_keyboard or use_stop_trigger:
            keyboard_listener = keyboard_module.Listener(
                on_press=on_press,
                on_release=on_release,
            )

        listeners = [mouse_listener]
        if keyboard_listener is not None:
            listeners.append(keyboard_listener)

        try:
            for listener in listeners:
                listener.start()

            if use_stop_trigger:
                end_time = start_monotonic + max_recording_seconds
                while not stop_event.is_set() and time.monotonic() < end_time:
                    time.sleep(0.02)
            else:
                end_time = start_monotonic + duration_seconds
                while time.monotonic() < end_time:
                    time.sleep(0.02)
        finally:
            for listener in listeners:
                try:
                    listener.stop()
                except Exception:
                    logger.debug("Listener stop failed", exc_info=True)
            for listener in listeners:
                try:
                    listener.join(timeout=1.0)
                except Exception:
                    logger.debug("Listener join failed", exc_info=True)

        recording_path = self._get_recording_path(recording_name)
        recording = {
            "name": self._sanitize_recording_name(recording_name),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "duration_seconds": round(time.monotonic() - start_monotonic, 3),
            "screen_size": {
                "width": self.screen_width,
                "height": self.screen_height,
            },
            "trigger_keys": {
                "start": self._normalize_key_for_pyautogui(start_trigger_key),
                "stop": self._normalize_key_for_pyautogui(stop_trigger_key),
            },
            "events": events,
        }

        try:
            with recording_path.open("w", encoding="utf-8") as file:
                json.dump(recording, file, ensure_ascii=False, indent=2)
        except Exception as exc:
            logger.error("Failed to save recording: %s", exc, exc_info=True)
            return f"Error: failed to save recording: {exc}"

        if use_stop_trigger:
            if stop_event.is_set():
                return (
                    f"Recorded {len(events)} events over "
                    f"{recording['duration_seconds']}s into {recording_path}. "
                    f"Stopped by key '{stop_trigger_key}'."
                )
            return (
                f"Recorded {len(events)} events over "
                f"{recording['duration_seconds']}s into {recording_path}. "
                "Stopped by max recording timeout."
            )

        return (
            f"Recorded {len(events)} events over "
            f"{recording['duration_seconds']}s into {recording_path}."
        )

    def list_recorded_actions(self) -> str:
        r"""List saved action recordings."""
        recording_names = self.get_recording_names()
        if len(recording_names) == 0:
            return "No recorded actions found."

        lines = ["Recorded actions:"]
        for name in recording_names:
            lines.append(f"- {name}")
        return "\n".join(lines)

    def get_recording_names(self) -> list[str]:
        self._recordings_dir.mkdir(parents=True, exist_ok=True)
        files = sorted(
            self._recordings_dir.glob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        return [file.stem for file in files]

    def get_recording(self, recording_name: str) -> dict[str, Any] | None:
        try:
            return self._load_recording(recording_name)
        except Exception as exc:
            logger.error("Failed to get recording: %s", exc, exc_info=True)
            return None

    def delete_recording(self, recording_name: str) -> str:
        recording_path = self._get_recording_path(recording_name)
        if not recording_path.exists():
            return "Error: recording was not found."

        try:
            recording_path.unlink()
            return f"Deleted recording '{recording_path.stem}'."
        except Exception as exc:
            logger.error("Failed to delete recording: %s", exc, exc_info=True)
            return f"Error: failed to delete recording: {exc}"

    def rename_recording(self, old_name: str, new_name: str) -> str:
        old_path = self._get_recording_path(old_name)
        new_path = self._get_recording_path(new_name)

        if not old_path.exists():
            return "Error: source recording was not found."
        if new_path.exists():
            return "Error: target recording already exists."

        try:
            old_path.rename(new_path)
            return f"Renamed recording '{old_path.stem}' to '{new_path.stem}'."
        except Exception as exc:
            logger.error("Failed to rename recording: %s", exc, exc_info=True)
            return f"Error: failed to rename recording: {exc}"

    def _load_recording(self, recording_name: str) -> dict[str, Any] | None:
        recording_path = self._get_recording_path(recording_name)
        if not recording_path.exists():
            return None

        with recording_path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def _replay_single_event(self, event: dict[str, Any]) -> bool:
        pyautogui_instance = getattr(self, "pyautogui", None)
        if pyautogui_instance is None:
            return False

        event_type = str(event.get("type", "")).strip().lower()

        if event_type == "mouse_move":
            x = self._to_int(event.get("x"))
            y = self._to_int(event.get("y"))
            safe_x, safe_y = self._get_safe_coordinates(x, y)
            pyautogui_instance.moveTo(safe_x, safe_y, duration=0)
            return True

        if event_type == "mouse_click":
            x = self._to_int(event.get("x"))
            y = self._to_int(event.get("y"))
            button = self._normalize_mouse_button(str(event.get("button", "")))
            safe_x, safe_y = self._get_safe_coordinates(x, y)
            pressed = bool(event.get("pressed", True))
            if pressed:
                pyautogui_instance.mouseDown(
                    x=safe_x, y=safe_y, button=button
                )
            else:
                pyautogui_instance.mouseUp(
                    x=safe_x, y=safe_y, button=button
                )
            return True

        if event_type == "mouse_scroll":
            x = self._to_int(event.get("x"))
            y = self._to_int(event.get("y"))
            dy = self._to_int(event.get("dy"))
            safe_x, safe_y = self._get_safe_coordinates(x, y)
            pyautogui_instance.scroll(dy, x=safe_x, y=safe_y)
            return True

        if event_type == "key_down":
            key = self._normalize_key_for_pyautogui(str(event.get("key")))
            if key is None:
                return False
            pyautogui_instance.keyDown(key)
            return True

        if event_type == "key_up":
            key = self._normalize_key_for_pyautogui(str(event.get("key")))
            if key is None:
                return False
            pyautogui_instance.keyUp(key)
            return True

        return False

    def replay_recorded_actions(
        self,
        recording_name: str,
        speed_multiplier: float = 1.0,
        repeat_count: int = 1,
        initial_delay_seconds: float = 2.0,
    ) -> str:
        r"""Replay a previously recorded action sequence."""
        if speed_multiplier <= 0:
            return "Error: speed_multiplier must be greater than 0."
        if repeat_count <= 0:
            return "Error: repeat_count must be at least 1."
        if initial_delay_seconds < 0:
            return "Error: initial_delay_seconds cannot be negative."

        runtime_error = self._get_pyautogui_runtime_error()
        if runtime_error is not None:
            return runtime_error

        try:
            recording = self._load_recording(recording_name)
        except Exception as exc:
            logger.error("Failed to load recording: %s", exc, exc_info=True)
            return f"Error: failed to load recording: {exc}"

        if recording is None:
            safe_name = self._sanitize_recording_name(recording_name)
            return f"Error: recording '{safe_name}' was not found."

        events = recording.get("events")
        if not isinstance(events, list) or len(events) == 0:
            return "Error: recording has no events to replay."

        try:
            if initial_delay_seconds > 0:
                time.sleep(initial_delay_seconds)

            executed_events = 0
            for _ in range(repeat_count):
                for index, event in enumerate(events):
                    delay = float(event.get("delay", 0.0))
                    if delay > 0:
                        time.sleep(delay / speed_multiplier)
                    if self._replay_single_event(event):
                        executed_events += 1
                    else:
                        logger.debug(
                            "Skipped unsupported event at index %s: %s",
                            index,
                            event,
                        )

            return (
                f"Replay complete for '{recording['name']}'. "
                f"Executed {executed_events} events "
                f"({repeat_count} cycle(s), speed x{speed_multiplier})."
            )
        except Exception as exc:
            logger.error("Replay failed: %s", exc, exc_info=True)
            return f"Error: replay failed: {exc}"

    def get_tools(self) -> list[FunctionTool]:
        custom_tools = [
            FunctionTool(self.record_user_actions),
            FunctionTool(self.replay_recorded_actions),
            FunctionTool(self.list_recorded_actions),
        ]
        if getattr(self, "pyautogui", None) is None:
            return custom_tools
        return [*super().get_tools(), *custom_tools]
