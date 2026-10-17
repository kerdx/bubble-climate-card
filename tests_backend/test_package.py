"""Packaging checks for the integration and its frontend asset."""

import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).parents[1]


class PackageTests(unittest.TestCase):
    def test_hacs_manifest_and_integration_domain_match(self):
        with (ROOT / "hacs.json").open(encoding="utf-8") as file:
            hacs = json.load(file)
        with (ROOT / "custom_components/bubble_climate_scheduler/manifest.json").open(encoding="utf-8") as file:
            manifest = json.load(file)
        self.assertEqual(manifest["domain"], "bubble_climate_scheduler")
        self.assertEqual(hacs["homeassistant"], "2025.1.0")
        self.assertNotIn("category", hacs)
        # The exact version is owned by the changelog-consistency test; here
        # only the semantic-version shape is enforced.
        self.assertRegex(str(manifest["version"]), r"^\d+\.\d+\.\d+$")
        self.assertEqual(manifest["issue_tracker"], "https://github.com/kerdx/bubble-climate-card/issues")
        self.assertTrue(manifest["config_flow"])
        self.assertTrue(manifest["single_config_entry"])
        integration_files = {
            path.name for path in (ROOT / "custom_components/bubble_climate_scheduler").iterdir()
        }
        self.assertIn("services.yaml", integration_files)

    def test_hacs_brand_icon_is_a_png(self):
        icon = ROOT / "custom_components/bubble_climate_scheduler/brand/icon.png"
        data = icon.read_bytes()
        self.assertTrue(data.startswith(b"\x89PNG\r\n\x1a\n"))
        self.assertEqual(int.from_bytes(data[16:20], "big"), 256)
        self.assertEqual(int.from_bytes(data[20:24], "big"), 256)

    def test_services_documentation_covers_registered_services(self):
        services = ROOT / "custom_components/bubble_climate_scheduler/services.yaml"
        self.assertTrue(services.is_file())
        text = services.read_text(encoding="utf-8")
        for service in ("save_program", "set_enabled", "delete_program"):
            self.assertIn(f"{service}:", text)

    def test_card_source_has_no_duplicate_copies(self):
        """Guard against reintroducing a second copy of the card source.

        The installed card ships one file (www/bubble-climate-card.js).
        Development copies drift apart silently, so any duplicate file
        anywhere in the repository fails packaging.
        """
        served = ROOT / "custom_components/bubble_climate_scheduler/www/bubble-climate-card.js"
        self.assertTrue(served.is_file())
        copies = sorted(
            path for path in ROOT.rglob("bubble-climate-card.js")
            if ".git" not in path.parts and "__pycache__" not in path.parts
        )
        self.assertEqual([served.relative_to(ROOT)], [path.relative_to(ROOT) for path in copies])

    def test_card_tests_import_the_shipped_source(self):
        """The JavaScript tests must read the shipped card, not a stray copy."""
        test_source = (ROOT / "bubble-climate-card.test.js").read_text(encoding="utf-8").replace("\\", "/")
        served_relation = "custom_components/bubble_climate_scheduler/www/bubble-climate-card.js"
        self.assertIn(served_relation, test_source)
        self.assertNotIn("'./bubble-climate-card.js'", test_source)
        self.assertNotIn('"./bubble-climate-card.js"', test_source)

    def test_config_and_storage_versions_have_migration_support(self):
        const = (ROOT / "custom_components/bubble_climate_scheduler/const.py").read_text(encoding="utf-8")
        flow = (ROOT / "custom_components/bubble_climate_scheduler/config_flow.py").read_text(encoding="utf-8")
        integration = (ROOT / "custom_components/bubble_climate_scheduler/__init__.py").read_text(encoding="utf-8")
        schedule = (ROOT / "custom_components/bubble_climate_scheduler/schedule.py").read_text(encoding="utf-8")
        self.assertIn("STORAGE_VERSION = 1", const)
        self.assertIn("CONFIG_ENTRY_VERSION = 1", const)
        self.assertIn("VERSION = CONFIG_ENTRY_VERSION", flow)
        # Home Assistant calls this hook only for entries with a version that
        # differs from the current one, so the wiring must already exist.
        self.assertIn("def async_migrate_entry", integration)
        self.assertIn("entry.version", integration)
        # Stored payloads must migrate or fail loudly, never silently vanish.
        self.assertIn("def migrate_storage_data", schedule)
        self.assertIn("migrate_storage_data(stored, stored_version, STORAGE_VERSION)", integration)

    def test_manifest_version_matches_changelog(self):
        """The manifest version must match the newest CHANGELOG section."""
        with (ROOT / "custom_components/bubble_climate_scheduler/manifest.json").open(encoding="utf-8") as file:
            manifest = json.load(file)
        changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        headings = [line for line in changelog.splitlines() if line.startswith("## ")]
        match = re.fullmatch(r"## v([0-9]+\.[0-9]+\.[0-9]+)\s*", headings[0])
        self.assertIsNotNone(headings[0] and match, f"CHANGELOG must start with '## vX.Y.Z', found: {headings[0]!r}")
        self.assertEqual(manifest["version"], match.group(1))

    def test_manifest_keys_sorted_like_hassfest(self):
        """hassfest requires: domain, name, then the remaining keys sorted."""
        with (ROOT / "custom_components/bubble_climate_scheduler/manifest.json").open(encoding="utf-8") as file:
            manifest = json.load(file)
        keys = list(manifest)
        self.assertEqual(keys[:2], ["domain", "name"])
        self.assertEqual(keys[2:], sorted(keys[2:]))

    def test_service_exceptions_are_translated_in_every_language(self):
        """Exceptions raised by the services carry keys both languages define."""
        # Every ScheduleValidationError code that can reach a service caller;
        # keep this list in sync with the raise sites in schedule.py/init.py.
        service_error_codes = {
            "invalid_program", "invalid_time", "invalid_temperature",
            "invalid_hvac_mode", "unsupported_hvac_mode", "entity_validation_failed",
            "no_program", "invalid_enabled", "invalid_slots", "too_many_slots",
            "empty_enabled_program", "invalid_away_temperature", "invalid_slot_schema",
            "invalid_slot_id", "duplicate_slot_id", "invalid_days", "duplicate_days",
            "same_start_end", "slots_overlap", "climate_range_unavailable",
            "climate_range_invalid", "target_outside_limits", "target_off_step",
            "heat_cool_unsupported",
        }
        exceptions = {}
        for language in ("en", "it"):
            translations = json.load(
                (ROOT / f"custom_components/bubble_climate_scheduler/translations/{language}.json").open(encoding="utf-8")
            )
            exceptions[language] = translations.get("exceptions", {})
            self.assertTrue(
                service_error_codes <= set(exceptions[language]),
                f"exceptions section of {language}.json misses codes",
            )
        self.assertEqual(set(exceptions["en"]), set(exceptions["it"]))
        for language, messages in exceptions.items():
            for code, entry in messages.items():
                self.assertIn("message", entry, f"{language}.{code} has no message")

    def test_service_errors_carry_translation_metadata(self):
        """Raised validation errors keep English fallback plus translation keys."""
        integration = (ROOT / "custom_components/bubble_climate_scheduler/__init__.py").read_text(encoding="utf-8")
        self.assertIn("self.translation_domain = DOMAIN", integration)
        self.assertIn("self.translation_key = self.code", integration)
        self.assertIn("self.translation_placeholders", integration)

    def test_frontend_is_registered_as_an_integration_resource(self):
        with (ROOT / "custom_components/bubble_climate_scheduler/manifest.json").open(encoding="utf-8") as file:
            manifest = json.load(file)
        self.assertIn("frontend", manifest["dependencies"])

        const = (ROOT / "custom_components/bubble_climate_scheduler/const.py").read_text(encoding="utf-8")
        integration = (ROOT / "custom_components/bubble_climate_scheduler/__init__.py").read_text(encoding="utf-8")
        self.assertIn('FRONTEND_URL = "/bubble_climate_scheduler/bubble-climate-card.js"', const)
        self.assertIn('StaticPathConfig("/bubble_climate_scheduler", str(www_path)', integration)
        self.assertIn("add_extra_js_url(hass, FRONTEND_URL)", integration)
        self.assertIn("remove_extra_js_url(hass, FRONTEND_URL)", integration)
        self.assertTrue((ROOT / "custom_components/bubble_climate_scheduler/www/bubble-climate-card.js").is_file())


if __name__ == "__main__":
    unittest.main()
