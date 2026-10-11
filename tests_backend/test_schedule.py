"""Regression tests for pure weekly calendar logic."""

import unittest
from datetime import datetime
import importlib.util
import ast
from pathlib import Path
from zoneinfo import ZoneInfo

_MODULE = Path(__file__).parents[1] / "custom_components/bubble_climate_scheduler/schedule.py"
_SPEC = importlib.util.spec_from_file_location("pure_schedule", _MODULE)
schedule = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(schedule)
ScheduleError, active_slot, validate_program, validate_target = (
    schedule.ScheduleError, schedule.active_slot, schedule.validate_program, schedule.validate_target
)
validate_single_target_mode = schedule.validate_single_target_mode
next_boundary = schedule.next_boundary
target_needs_update = schedule.target_needs_update
program_status = schedule.program_status
availability_action = schedule.availability_action
snapshot_entity_state = schedule.snapshot_entity_state
restore_entity_state = schedule.restore_entity_state


def slot(slot_id="a", days=None, start="09:00", end="10:00", temperature=21):
    return {"id": slot_id, "days": days or [1], "start": start, "end": end, "temperature": temperature}


class ScheduleTests(unittest.TestCase):
    def test_schema_and_ids_and_target(self):
        valid = validate_program([slot()], True)
        self.assertTrue(valid["enabled"])
        self.assertEqual(valid["slots"][0]["temperature"], 21.0)
        for slots in ([slot(), slot()], [slot(temperature=True)], [slot(temperature=float("nan"))], [slot(temperature="21")]):
            with self.subTest(slots=slots), self.assertRaises(ScheduleError):
                validate_program(slots)
        with self.assertRaises(ScheduleError):
            validate_program([slot(days=[0])])

    def test_same_day_overlap_and_half_open(self):
        with self.assertRaises(ScheduleError):
            validate_program([slot("a", start="09:00", end="10:01"), slot("b", start="10:00", end="11:00")])
        validate_program([slot("a", end="10:00"), slot("b", start="10:00", end="11:00")])

    def test_overnight_overlap_and_sunday_wrap(self):
        with self.assertRaises(ScheduleError):
            validate_program([slot("night", [7], "23:00", "02:00"), slot("early", [1], "01:00", "03:00")])
        program = validate_program([slot("night", [7], "23:00", "02:00")])
        self.assertEqual(active_slot(program["slots"], datetime(2026, 10, 12, 1, 59))["id"], "night")
        self.assertIsNone(active_slot(program["slots"], datetime(2026, 10, 12, 2, 0)))
        self.assertEqual(active_slot(program["slots"], datetime(2026, 10, 11, 23, 0))["id"], "night")

    def test_active_half_open(self):
        program = validate_program([slot()])
        self.assertIsNone(active_slot(program["slots"], datetime(2026, 10, 12, 8, 59)))
        self.assertEqual(active_slot(program["slots"], datetime(2026, 10, 12, 9, 0))["id"], "a")
        self.assertIsNone(active_slot(program["slots"], datetime(2026, 10, 12, 10, 0)))

    def test_bad_time_and_empty(self):
        for bad in ("24:00", "9:00", "10:60", "10:00:00"):
            with self.subTest(bad=bad), self.assertRaises(ScheduleError):
                validate_program([slot(start=bad)])
        with self.assertRaises(ScheduleError):
            validate_program([slot(start="09:00", end="09:00")])

    def test_range_step_and_fail_closed(self):
        self.assertEqual(validate_target(20, 5, 30, 0.5), 20)
        for target, low, high, step in ((4, 5, 30, 0.5), (30.5, 5, 30, 0.5), (20.1, 5, 30, 0.5), (float("inf"), 5, 30, 0.5), (20, 5, 30, 0)):
            with self.subTest(target=target, step=step), self.assertRaises(ScheduleError):
                validate_target(target, low, high, step)

    def test_single_target_mode_fails_closed(self):
        validate_single_target_mode("heat", "heat")
        for state_mode, attribute_mode in (("heat_cool", "heat"), ("heat", "heat_cool")):
            with self.subTest(state_mode=state_mode, attribute_mode=attribute_mode), self.assertRaises(ScheduleError):
                validate_single_target_mode(state_mode, attribute_mode)

    def test_target_comparison_uses_small_numeric_tolerance(self):
        self.assertFalse(target_needs_update(20.0001, 20, 0.5))
        self.assertTrue(target_needs_update(20.2, 20, 0.5))
        self.assertTrue(target_needs_update(20.5, 20, 0.5))
        self.assertTrue(target_needs_update(None, 20, 0.5))

    def test_disabled_program_has_no_actionable_slot_or_boundary(self):
        slots = validate_program([slot()], False)["slots"]
        current, boundary = program_status(slots, False, datetime(2026, 10, 12, 9, 30))
        self.assertIsNone(current)
        self.assertIsNone(boundary)
        current, boundary = program_status(slots, True, datetime(2026, 10, 12, 9, 30))
        self.assertEqual(current["id"], "a")
        self.assertEqual(boundary, datetime(2026, 10, 12, 10, 0))

    def test_availability_transitions_require_retry_only_during_active_slot(self):
        self.assertEqual(availability_action(True, True, "heat", "unavailable"), "pending")
        self.assertEqual(availability_action(True, True, "unavailable", "heat"), "retry")
        self.assertIsNone(availability_action(True, False, "unavailable", "heat"))
        self.assertIsNone(availability_action(False, True, "unavailable", "heat"))
        self.assertIsNone(availability_action(True, True, "heat", "heat"))

    def test_entity_snapshot_rolls_back_mapping_and_set_state(self):
        programs = {"climate.room": {"enabled": True, "slots": [{"id": "old"}]}}
        errors = {"climate.room": "old error"}
        applied = {"climate.room": "old"}
        logged = {"climate.room": "old log"}
        pending = {"climate.room"}
        snapshot = snapshot_entity_state(
            "climate.room", (programs, errors, applied, logged), (pending,)
        )
        programs["climate.room"]["slots"].clear()
        errors.pop("climate.room")
        applied["climate.room"] = "new"
        logged.pop("climate.room")
        pending.clear()
        restore_entity_state(snapshot)
        self.assertEqual(programs["climate.room"]["slots"], [{"id": "old"}])
        self.assertEqual(errors["climate.room"], "old error")
        self.assertEqual(applied["climate.room"], "old")
        self.assertEqual(logged["climate.room"], "old log")
        self.assertIn("climate.room", pending)

        missing = snapshot_entity_state("climate.new", (programs, errors), (pending,))
        programs["climate.new"] = {"enabled": True}
        errors["climate.new"] = "failed"
        pending.add("climate.new")
        restore_entity_state(missing)
        self.assertNotIn("climate.new", programs)
        self.assertNotIn("climate.new", errors)
        self.assertNotIn("climate.new", pending)

    def test_config_flow_exports_home_assistant_expected_class(self):
        path = Path(__file__).parents[1] / "custom_components/bubble_climate_scheduler/config_flow.py"
        module = ast.parse(path.read_text(encoding="utf-8"))
        flow_classes = [node for node in module.body if isinstance(node, ast.ClassDef) and node.name == "ConfigFlow"]
        self.assertEqual(len(flow_classes), 1)
        self.assertTrue(any(isinstance(base, ast.Attribute) and base.attr == "ConfigFlow" for base in flow_classes[0].bases))
        aborts = [node for node in ast.walk(flow_classes[0]) if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "async_abort"]
        self.assertTrue(any(any(keyword.arg == "reason" and isinstance(keyword.value, ast.Constant) and keyword.value.value == "single_instance_allowed" for keyword in call.keywords) for call in aborts))

    def test_empty_enabled_and_input_bounds(self):
        self.assertEqual(validate_program([], False)["slots"], [])
        with self.assertRaises(ScheduleError):
            validate_program([], True)
        with self.assertRaises(ScheduleError):
            validate_program([slot("bad id")])
        with self.assertRaises(ScheduleError):
            validate_program([slot("x" * 65)])
        with self.assertRaises(ScheduleError):
            validate_program([slot(str(index)) for index in range(51)])

    def test_next_boundary_regular_and_overnight_week_wrap(self):
        program = validate_program([slot("morning", [1], "09:00", "10:00")])
        self.assertEqual(next_boundary(program["slots"], datetime(2026, 10, 12, 8, 30)), datetime(2026, 10, 12, 9, 0))
        self.assertEqual(next_boundary(program["slots"], datetime(2026, 10, 12, 9, 30)), datetime(2026, 10, 12, 10, 0))
        overnight = validate_program([slot("sun", [7], "23:00", "02:00")])
        self.assertEqual(next_boundary(overnight["slots"], datetime(2026, 10, 11, 23, 30)), datetime(2026, 10, 12, 2, 0))
        self.assertEqual(next_boundary(overnight["slots"], datetime(2026, 10, 12, 1, 0)), datetime(2026, 10, 12, 2, 0))

    def test_next_boundary_zoneinfo_dst(self):
        tz = ZoneInfo("Europe/Rome")
        slots = validate_program([slot("dst", [7], "02:30", "04:00")])["slots"]
        now = datetime(2026, 3, 29, 1, 30, tzinfo=tz)
        boundary = next_boundary(slots, now)
        self.assertEqual(boundary.hour, 3)
        self.assertEqual(boundary.minute, 0)
        self.assertEqual(boundary.tzinfo, tz)
        # Weekly evaluation follows local wall-clock time on both sides of DST.
        self.assertIsNone(active_slot(slots, datetime(2026, 3, 29, 1, 59, tzinfo=tz)))
        self.assertEqual(active_slot(slots, datetime(2026, 3, 29, 3, 0, tzinfo=tz))["id"], "dst")

    def test_next_boundary_autumn_fold_uses_physical_time(self):
        tz = ZoneInfo("Europe/Rome")
        slots = validate_program([slot("fold", [7], "02:30", "04:00")])["slots"]
        now = datetime(2026, 10, 25, 2, 45, tzinfo=tz, fold=0)
        boundary = next_boundary(slots, now)
        self.assertEqual(boundary.astimezone(ZoneInfo("UTC")), datetime(2026, 10, 25, 1, 0, tzinfo=ZoneInfo("UTC")))
        self.assertEqual(boundary.hour, 2)
        self.assertEqual(boundary.minute, 0)
        self.assertEqual(boundary.fold, 1)


if __name__ == "__main__":
    unittest.main()
