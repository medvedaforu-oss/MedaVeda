"""Exercise the actual inspector CLI with synthetic ZIP/XML/config, never a native build."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile

INSPECTOR = Path(__file__).with_name('inspect-android-bundle.py')
ANDROID = '{http://schemas.android.com/apk/res/android}'
BILLING = 'com.android.vending.BILLING'
CONFIG = {
    'version': '1.2.2',
    'android': {'package': 'in.medveda.app', 'runtimeVersion': '1.2.2-disabled-notes-choice-v1'},
    'extra': {'medvedaPaymentProvider': 'disabled', 'medvedaDistribution': 'standard',
              'medvedaBuildTarget': 'production', 'medvedaIndiaUcbEnrolled': False,
              'medvedaUcbTestAccepted': False},
}

class ValidatorTests(unittest.TestCase):
    def inspect(self, permissions=(BILLING, 'android.permission.INTERNET'), config=None,
                with_config=True, permission_tag='uses-permission', package='in.medveda.app'):
        with tempfile.TemporaryDirectory(prefix='medveda-validator-') as directory:
            root = Path(directory)
            bundle, xml, cfg, output = [root / n for n in ['fixture.aab', 'manifest.xml', 'config.json', 'report.json']]
            # Synthetic fixture, not an installable/release AAB.
            with zipfile.ZipFile(bundle, 'w') as archive:
                archive.writestr('fixture.txt', 'synthetic validator input only')
            manifest = ET.Element('manifest', {'package': package, ANDROID+'versionCode': '14', ANDROID+'versionName': '1.2.2'})
            ET.SubElement(manifest, 'uses-sdk', {ANDROID+'minSdkVersion': '24', ANDROID+'targetSdkVersion': '36'})
            for permission in permissions:
                ET.SubElement(manifest, permission_tag, {ANDROID+'name': permission})
            application = ET.SubElement(manifest, 'application')
            ET.SubElement(application, 'activity', {ANDROID+'name': '.MainActivity'})
            ET.ElementTree(manifest).write(xml)
            cfg.write_text(json.dumps(CONFIG if config is None else config))
            command = [sys.executable, str(INSPECTOR), str(bundle), '--manifest', str(xml), '--output', str(output)]
            if with_config:
                command += ['--release-config', str(cfg)]
            result = subprocess.run(command, capture_output=True, text=True, timeout=10)
            report = json.loads(output.read_text()) if output.exists() else None
            return result, report

    def rejected(self, reason, **kwargs):
        result, report = self.inspect(**kwargs)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(reason, result.stderr)
        self.assertIsNone(report, 'rejected inputs must not produce an acceptance report')

    def test_required_billing_and_disabled_config_pass(self):
        result, report = self.inspect()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(report['releaseValidation']['billingIntegration'], 'retained-required')
        self.assertEqual(report['releaseValidation']['paymentProvider'], 'disabled')
        self.assertIn(BILLING, report['manifest']['permissions'])
        self.assertIn('Play policy approval require separate evidence', report['releaseValidation']['scope'])

    def test_missing_required_billing_fails(self):
        self.rejected('Missing required retained Google Play Billing permission', permissions=('android.permission.INTERNET',))

    def test_unexpected_permissions_fail(self):
        for permission in ['android.permission.CAMERA', 'android.permission.RECORD_AUDIO',
                           'android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE',
                           'android.permission.READ_MEDIA_IMAGES', 'com.example.NEW_PERMISSION']:
            with self.subTest(permission=permission):
                self.rejected('Unexpected release permissions', permissions=(BILLING, permission))

    def test_sdk_qualified_unexpected_permission_fails(self):
        self.rejected('Unexpected release permissions', permissions=(BILLING, 'android.permission.CAMERA'), permission_tag='uses-permission-sdk-23')

    def test_reviewed_library_permissions_pass(self):
        permissions = (BILLING, *('android.permission.'+p for p in [
            'INTERNET', 'POST_NOTIFICATIONS', 'VIBRATE', 'RECEIVE_BOOT_COMPLETED',
            'WAKE_LOCK', 'ACCESS_NETWORK_STATE', 'ACCESS_WIFI_STATE', 'DETECT_SCREEN_CAPTURE']),
            'in.medveda.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
            'com.google.android.c2dm.permission.RECEIVE',
            'com.sec.android.provider.badge.permission.READ',
            'com.htc.launcher.permission.UPDATE_SHORTCUT',
            'android.permission.USE_BIOMETRIC',
            'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE')
        result, _ = self.inspect(permissions=permissions)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_enabled_or_unspecified_provider_fails(self):
        for provider in ['play', 'razorpay', '', None]:
            with self.subTest(provider=provider):
                config = copy.deepcopy(CONFIG)
                config['extra']['medvedaPaymentProvider'] = provider
                self.rejected('requires disabled payments', config=config)

    def test_missing_config_fails(self):
        self.rejected('--manifest requires --release-config', with_config=False)

    def test_nonproduction_or_purchase_acceptance_flags_fail(self):
        for key, value in [('medvedaDistribution', 'play-alpha-validation'),
                           ('medvedaDistribution', 'non-play-internal-test'),
                           ('medvedaBuildTarget', 'production-isolated-test'),
                           ('medvedaIndiaUcbEnrolled', True), ('medvedaUcbTestAccepted', True),
                           ('medvedaUcbTestAccepted', 'false')]:
            with self.subTest(key=key, value=value):
                config = copy.deepcopy(CONFIG)
                config['extra'][key] = value
                self.rejected('Release', config=config)

    def test_wrong_runtime_fails(self):
        config = copy.deepcopy(CONFIG)
        config['android']['runtimeVersion'] = '1.2.2-play-notes-choice-v1'
        self.rejected('disabled-payment Android runtime', config=config)

    def test_wrong_package_fails(self):
        config = copy.deepcopy(CONFIG)
        config['android']['package'] = 'in.medveda.razorpaytest'
        self.rejected('must use in.medveda.app', config=config)

    def test_expo_wrapped_config_passes(self):
        result, _ = self.inspect(config={'expo': CONFIG})
        self.assertEqual(result.returncode, 0, result.stderr)

if __name__ == '__main__':
    unittest.main(verbosity=2)
