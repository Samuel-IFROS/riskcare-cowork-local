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
from unittest.mock import MagicMock, patch

from app.agent.toolkit.pyautogui_toolkit import PyAutoGUIToolkit


def _create_toolkit(tmp_path):
    with patch(
        "app.agent.toolkit.pyautogui_toolkit."
        "BasePyAutoGUIToolkit.__init__",
        return_value=None,
    ):
        toolkit = PyAutoGUIToolkit(
            api_task_id="test_task",
            screenshots_dir=str(tmp_path),
        )

    toolkit.pyautogui = MagicMock()
    toolkit.screen_width = 1920
    toolkit.screen_height = 1080
    toolkit._get_safe_coordinates = lambda x, y: (x, y)
    return toolkit


def test_list_recorded_actions_empty(tmp_path):
    toolkit = _create_toolkit(tmp_path)

    result = toolkit.list_recorded_actions()

    assert result == "No recorded actions found."


def test_replay_recorded_actions_success(tmp_path):
    toolkit = _create_toolkit(tmp_path)
    recording_path = toolkit._get_recording_path("demo_recording")
    recording_data = {
        "name": "demo_recording",
        "events": [
            {"type": "mouse_move", "delay": 0.0, "x": 100, "y": 200},
            {
                "type": "mouse_click",
                "delay": 0.0,
                "x": 100,
                "y": 200,
                "button": "left",
                "pressed": True,
            },
            {"type": "key_down", "delay": 0.0, "key": "ctrl_l"},
            {"type": "key_up", "delay": 0.0, "key": "ctrl_l"},
        ],
    }
    recording_path.write_text(
        json.dumps(recording_data),
        encoding="utf-8",
    )

    with patch(
        "app.agent.toolkit.pyautogui_toolkit.time.sleep", return_value=None
    ):
        result = toolkit.replay_recorded_actions(
            "demo_recording",
            speed_multiplier=2.0,
            repeat_count=1,
            initial_delay_seconds=0.0,
        )

    assert "Replay complete" in result
    toolkit.pyautogui.moveTo.assert_called_once_with(100, 200, duration=0)
    toolkit.pyautogui.mouseDown.assert_called_once_with(
        x=100,
        y=200,
        button="left",
    )
    toolkit.pyautogui.keyDown.assert_called_once_with("ctrl")
    toolkit.pyautogui.keyUp.assert_called_once_with("ctrl")


def test_record_user_actions_writes_file(tmp_path):
    toolkit = _create_toolkit(tmp_path)

    class FakeKey:
        def __init__(self, name=None, char=None):
            self.name = name
            self.char = char

    class FakeButton:
        def __init__(self, name):
            self.name = name

    class FakeMouseListener:
        def __init__(self, on_move=None, on_click=None, on_scroll=None):
            self._on_move = on_move
            self._on_click = on_click
            self._on_scroll = on_scroll

        def start(self):
            if self._on_move:
                self._on_move(11, 22)
            if self._on_click:
                self._on_click(11, 22, FakeButton("left"), True)
                self._on_click(11, 22, FakeButton("left"), False)
            if self._on_scroll:
                self._on_scroll(11, 22, 0, 1)

        def stop(self):
            return None

        def join(self, timeout=None):
            return None

    class FakeKeyboardListener:
        def __init__(self, on_press=None, on_release=None):
            self._on_press = on_press
            self._on_release = on_release

        def start(self):
            if self._on_press:
                self._on_press(FakeKey(char="a"))
            if self._on_release:
                self._on_release(FakeKey(name="enter"))

        def stop(self):
            return None

        def join(self, timeout=None):
            return None

    class FakeMouseModule:
        Listener = FakeMouseListener

    class FakeKeyboardModule:
        Listener = FakeKeyboardListener

    toolkit._get_pynput_modules = (
        lambda: (FakeKeyboardModule, FakeMouseModule, None)
    )

    result = toolkit.record_user_actions(
        "macro_demo",
        duration_seconds=0.05,
    )

    assert "Recorded " in result
    recording_path = toolkit._get_recording_path("macro_demo")
    assert recording_path.exists()

    data = json.loads(recording_path.read_text(encoding="utf-8"))
    event_types = [event["type"] for event in data["events"]]
    assert "mouse_move" in event_types
    assert "mouse_click" in event_types
    assert "mouse_scroll" in event_types
    assert "key_down" in event_types
    assert "key_up" in event_types


def test_record_user_actions_with_trigger_keys_and_get_recording(tmp_path):
    toolkit = _create_toolkit(tmp_path)

    class FakeKey:
        def __init__(self, name=None, char=None):
            self.name = name
            self.char = char

    class FakeMouseListener:
        def __init__(self, on_move=None, on_click=None, on_scroll=None):
            self._on_move = on_move
            self._on_click = on_click
            self._on_scroll = on_scroll

        def start(self):
            if self._on_move:
                self._on_move(55, 66)

        def stop(self):
            return None

        def join(self, timeout=None):
            return None

    class FakeKeyboardListener:
        def __init__(self, on_press=None, on_release=None):
            self._on_press = on_press
            self._on_release = on_release

        def start(self):
            # Start-listener only has on_press
            if self._on_press and self._on_release is None:
                self._on_press(FakeKey(name="f8"))
                return

            # Recording-listener has on_press + on_release
            if self._on_press:
                self._on_press(FakeKey(char="b"))
                self._on_press(FakeKey(name="f9"))
            if self._on_release:
                self._on_release(FakeKey(char="b"))
                self._on_release(FakeKey(name="f9"))

        def stop(self):
            return None

        def join(self, timeout=None):
            return None

    class FakeMouseModule:
        Listener = FakeMouseListener

    class FakeKeyboardModule:
        Listener = FakeKeyboardListener

    toolkit._get_pynput_modules = (
        lambda: (FakeKeyboardModule, FakeMouseModule, None)
    )

    result = toolkit.record_user_actions(
        recording_name="macro_hotkeys",
        start_trigger_key="f8",
        stop_trigger_key="f9",
        max_recording_seconds=1.0,
        capture_mouse_clicks=False,
        capture_mouse_scroll=False,
    )

    assert "Recorded " in result
    assert "Stopped by key 'f9'" in result

    recording = toolkit.get_recording("macro_hotkeys")
    assert recording is not None
    assert recording["trigger_keys"]["start"] == "f8"
    assert recording["trigger_keys"]["stop"] == "f9"

    event_types = [event["type"] for event in recording["events"]]
    assert "key_down" in event_types
    assert "key_up" in event_types
    assert "mouse_move" in event_types

    recorded_keys = [event.get("key") for event in recording["events"]]
    assert "f9" not in recorded_keys


def test_get_recording_returns_none_when_missing(tmp_path):
    toolkit = _create_toolkit(tmp_path)

    result = toolkit.get_recording("macro_does_not_exist")

    assert result is None


def test_rename_and_delete_recording(tmp_path):
    toolkit = _create_toolkit(tmp_path)
    source_path = toolkit._get_recording_path("macro_origen")
    source_path.write_text(
        json.dumps({"name": "macro_origen", "events": []}),
        encoding="utf-8",
    )

    rename_result = toolkit.rename_recording("macro_origen", "macro_nuevo")
    assert "Renamed recording" in rename_result

    new_path = toolkit._get_recording_path("macro_nuevo")
    assert new_path.exists()
    assert not source_path.exists()

    delete_result = toolkit.delete_recording("macro_nuevo")
    assert "Deleted recording" in delete_result
    assert not new_path.exists()


def test_get_can_use_tools_returns_empty_on_missing_dependency():
    with patch.object(
        PyAutoGUIToolkit,
        "__init__",
        side_effect=ImportError("missing required modules"),
    ):
        tools = PyAutoGUIToolkit.get_can_use_tools("task-id")
    assert tools == []


def test_replay_returns_explicit_error_when_pyautogui_missing(tmp_path):
    with patch(
        "app.agent.toolkit.pyautogui_toolkit."
        "BasePyAutoGUIToolkit.__init__",
        side_effect=ImportError("Missing required modules: pyautogui"),
    ):
        toolkit = PyAutoGUIToolkit(
            api_task_id="test_task",
            screenshots_dir=str(tmp_path),
        )

    result = toolkit.replay_recorded_actions("macro_demo")

    assert result.startswith("Error:")
    assert "pyautogui" in result


def test_file_management_works_when_pyautogui_missing(tmp_path):
    with patch(
        "app.agent.toolkit.pyautogui_toolkit."
        "BasePyAutoGUIToolkit.__init__",
        side_effect=ImportError("Missing required modules: pyautogui"),
    ):
        toolkit = PyAutoGUIToolkit(
            api_task_id="test_task",
            screenshots_dir=str(tmp_path),
        )

    source_path = toolkit._get_recording_path("macro_origen")
    source_path.write_text(
        json.dumps({"name": "macro_origen", "events": []}),
        encoding="utf-8",
    )

    rename_result = toolkit.rename_recording("macro_origen", "macro_nuevo")
    assert "Renamed recording" in rename_result
    assert "macro_nuevo" in toolkit.get_recording_names()

    delete_result = toolkit.delete_recording("macro_nuevo")
    assert "Deleted recording" in delete_result
