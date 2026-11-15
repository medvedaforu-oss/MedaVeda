#!/usr/bin/env python3
"""Measure an exact AAB and retain its embedded R8 mapping; never inspect runtime user data."""
import argparse
import hashlib
import json
import re
import struct
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('bundle', type=Path)
parser.add_argument('--manifest', type=Path, help='XML from bundletool dump manifest')
parser.add_argument('--release-config', type=Path,
                    help='Resolved production Expo config JSON for this exact build; required with --manifest')
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--mapping-dir', type=Path)
parser.add_argument('--expect-optimized', action='store_true')
parser.add_argument('--min-version-code', type=int)
args = parser.parse_args()
if args.manifest and not args.release_config:
    parser.error('--manifest requires --release-config; permission presence cannot establish disabled payments')
if args.release_config and not args.manifest:
    parser.error('--release-config requires --manifest')

# Reviewed source/library permission inventory. New permissions require review,
# rather than silently broadening this list. BILLING is required by retained IAP.
BILLING_PERMISSION = 'com.android.vending.BILLING'
ALLOWED_PERMISSIONS = {
    BILLING_PERMISSION,
    'android.permission.INTERNET',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.VIBRATE',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.WAKE_LOCK',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.ACCESS_WIFI_STATE',
    'android.permission.DETECT_SCREEN_CAPTURE',
    # expo-notifications -> Firebase Messaging / ShortcutBadger; exact names
    # corroborated by the retained v13 manifest-merger report, not wildcards.
    'com.google.android.c2dm.permission.RECEIVE',
    'android.permission.READ_APP_BADGE',
    'com.sec.android.provider.badge.permission.READ',
    'com.sec.android.provider.badge.permission.WRITE',
    'com.htc.launcher.permission.READ_SETTINGS',
    'com.htc.launcher.permission.UPDATE_SHORTCUT',
    'com.sonyericsson.home.permission.BROADCAST_BADGE',
    'com.sonymobile.home.permission.PROVIDER_INSERT_BADGE',
    'com.anddoes.launcher.permission.UPDATE_COUNT',
    'com.majeur.launcher.permission.UPDATE_BADGE',
    'com.huawei.android.launcher.permission.CHANGE_BADGE',
    'com.huawei.android.launcher.permission.READ_SETTINGS',
    'com.huawei.android.launcher.permission.WRITE_SETTINGS',
    'com.oppo.launcher.permission.READ_SETTINGS',
    'com.oppo.launcher.permission.WRITE_SETTINGS',
    'me.everything.badger.permission.BADGE_COUNT_READ',
    'me.everything.badger.permission.BADGE_COUNT_WRITE',
    # expo-secure-store -> AndroidX Biometric; expo-application -> Install Referrer.
    'android.permission.USE_BIOMETRIC',
    'android.permission.USE_FINGERPRINT',
    'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
    # AndroidX receiver isolation; not a general device-data permission.
    'in.medveda.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
}

def validate_release(manifest, config):
    android = '{http://schemas.android.com/apk/res/android}'
    # Include sdk-qualified forms so an unexpected permission cannot hide there.
    permissions = {e.get(android+'name') for e in manifest
                   if e.tag == 'uses-permission' or e.tag.startswith('uses-permission-sdk-')}
    unexpected = permissions - ALLOWED_PERMISSIONS
    if unexpected:
        raise ValueError('Unexpected release permissions: ' + ', '.join(sorted(str(p) for p in unexpected)))
    if BILLING_PERMISSION not in permissions:
        raise ValueError('Missing required retained Google Play Billing permission')
    config = config.get('expo', config)
    extra = config.get('extra', {})
    if manifest.get('package') != 'in.medveda.app' or config.get('android', {}).get('package') != 'in.medveda.app':
        raise ValueError('Release manifest/config must use in.medveda.app')
    if extra.get('medvedaPaymentProvider') != 'disabled':
        raise ValueError('Production release requires disabled payments; standalone Play/Razorpay sales are forbidden')
    if extra.get('medvedaDistribution') != 'standard' or extra.get('medvedaBuildTarget') != 'production':
        raise ValueError('Release requires standard production distribution')
    if any(extra.get(key) is not False for key in ['medvedaIndiaUcbEnrolled', 'medvedaUcbTestAccepted']):
        raise ValueError('Release enrollment/acceptance flags must remain explicitly false')
    expected_runtime = str(config.get('version')) + '-disabled-notes-choice-v1'
    if config.get('android', {}).get('runtimeVersion') != expected_runtime:
        raise ValueError('Release requires the disabled-payment Android runtime')
    return {
        'billingIntegration': 'retained-required',
        'paymentProvider': 'disabled',
        'permissions': sorted(permissions),
        'scope': 'Manifest/config checks only; compiled payment guards, standalone-path rejection, native behavior and Play policy approval require separate evidence.',
    }

# Method-table references prove API presence, not execution or a Play warning's call site.
DEPRECATED_WINDOW_METHODS = {
    'setStatusBarColor', 'getStatusBarColor', 'setNavigationBarColor',
    'getNavigationBarColor', 'setDecorFitsSystemWindows',
    'setStatusBarContrastEnforced', 'setNavigationBarContrastEnforced',
}

def dex_references(data):
    if data[:4] != b'dex\x0a':
        return []
    string_count, string_off = struct.unpack_from('<II', data, 0x38)
    type_count, type_off = struct.unpack_from('<II', data, 0x40)
    method_count, method_off = struct.unpack_from('<II', data, 0x58)
    strings = []
    for i in range(string_count):
        offset = struct.unpack_from('<I', data, string_off + 4*i)[0]
        while data[offset] & 0x80:
            offset += 1
        offset += 1  # skip utf16 length ULEB128
        strings.append(data[offset:data.index(0, offset)].decode('utf8', errors='replace'))
    types = [strings[struct.unpack_from('<I', data, type_off + 4*i)[0]] for i in range(type_count)]
    result = set()
    for i in range(method_count):
        owner, _, name = struct.unpack_from('<HHI', data, method_off + 8*i)
        if types[owner] == 'Landroid/view/Window;' and strings[name] in DEPRECATED_WINDOW_METHODS:
            result.add('android.view.Window.' + strings[name])
    return sorted(result)

with args.bundle.open('rb') as file:
    digest = hashlib.file_digest(file, 'sha256').hexdigest()
report = {'artifact': str(args.bundle), 'sha256': digest, 'aabBytes': args.bundle.stat().st_size}
with zipfile.ZipFile(args.bundle) as bundle:
    assert bundle.testzip() is None, 'AAB ZIP integrity failure'
    dex = []
    refs = set()
    for entry in bundle.infolist():
        if entry.filename.endswith('.dex'):
            data = bundle.read(entry)
            dex.append({'path': entry.filename, 'bytes': entry.file_size})
            refs.update(dex_references(data))
    report['dex'] = dex
    report['totalDexBytes'] = sum(entry['bytes'] for entry in dex)
    report['deprecatedWindowMethodReferences'] = sorted(refs)
    names = bundle.namelist()
    report['billingGroupInDependencyMetadata'] = any(b'com.android.billingclient' in bundle.read(n) for n in names if n.endswith('/dependencies.pb'))
    r8 = next((name for name in names if name.endswith('/r8.json')), None)
    mapping = next((name for name in names if name.endswith('/proguard.map')), None)
    report['r8Metadata'] = json.loads(bundle.read(r8)) if r8 else None
    report['mappingEntry'] = mapping
    metadata = 'BUNDLE-METADATA/com.android.tools.build.gradle/app-metadata.properties'
    report['gradleMetadata'] = bundle.read(metadata).decode() if metadata in names else None
    if args.expect_optimized:
        assert r8 and mapping, 'Release must contain R8 metadata and exact mapping'
    if mapping:
        data = bundle.read(mapping)
        classes = re.findall(rb'^([^ #\s].*?) -> (.*?):$', data, re.M)
        report['mappedClasses'] = len(classes)
        report['renamedClasses'] = sum(a != b for a, b in classes)
        report['billingMappedClasses'] = sum(b'com.android.billingclient.' in a for a, _ in classes)
        report['pdfiumCoreKeptByName'] = any(a == b'io.legere.pdfiumandroid.PdfiumCore' and a == b for a, b in classes)
        report['mappingSha256'] = hashlib.sha256(data).hexdigest()
        if args.mapping_dir:
            args.mapping_dir.mkdir(parents=True, exist_ok=True)
            (args.mapping_dir / 'mapping.txt').write_bytes(data)
            (args.mapping_dir / 'r8.json').write_bytes(bundle.read(r8))
if args.manifest:
    manifest = ET.parse(args.manifest).getroot()
    android = '{http://schemas.android.com/apk/res/android}'
    activity = next(e for e in manifest.findall('./application/activity') if e.get(android+'name', '').endswith('MainActivity'))
    sdk = manifest.find('uses-sdk')
    report['manifest'] = {
        'package': manifest.get('package'), 'versionName': manifest.get(android+'versionName'),
        'versionCode': int(manifest.get(android+'versionCode')),
        'minSdk': sdk.get(android+'minSdkVersion'), 'targetSdk': sdk.get(android+'targetSdkVersion'),
        'activity': {key: activity.get(android+key) for key in ['screenOrientation','resizeableActivity','windowSoftInputMode','configChanges']},
        'permissions': [e.get(android+'name') for e in manifest if e.tag == 'uses-permission' or e.tag.startswith('uses-permission-sdk-')],
    }
    report['otherOrientationRestrictions'] = [{'activity': e.get(android+'name'), 'orientation': e.get(android+'screenOrientation')} for e in manifest.findall('./application/activity') if e.get(android+'screenOrientation') not in [None, '-1', 'unspecified', '4', '10', '13', 'sensor', 'fullSensor', 'fullUser']]
    assert report['manifest']['package'] == 'in.medveda.app'
    if args.min_version_code is not None:
        assert report['manifest']['versionCode'] > args.min_version_code
    if args.expect_optimized:
        assert activity.get(android+'resizeableActivity') == 'true', 'MainActivity must be resizable'
        assert activity.get(android+'screenOrientation') in [None, '-1', 'unspecified'], 'MainActivity must not lock orientation'
    report['releaseValidation'] = validate_release(manifest, json.loads(args.release_config.read_text()))
    report['releaseValidation']['releaseConfigSha256'] = hashlib.sha256(args.release_config.read_bytes()).hexdigest()
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
