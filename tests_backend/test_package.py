"""Packaging checks for the integration and its frontend asset."""

import json
from pathlib import Path
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
        self.assertEqual(manifest["version"], "0.1.2")
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

    def test_served_frontend_matches_development_source(self):
        source = ROOT / "bubble-climate-card.js"
        served = ROOT / "custom_components/bubble_climate_scheduler/www/bubble-climate-card.js"
        self.assertEqual(source.read_bytes(), served.read_bytes())

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
