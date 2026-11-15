#!/usr/bin/env bash
set -euo pipefail
cd /home/ganeshp8545/AyurPulse/mobile-app
EXPO_NO_DOTENV=1 CI=1 timeout 120 node node_modules/expo/bin/cli export --platform android --max-workers 1 --output-dir /tmp/medveda-fix4-bundle-final --source-maps
cd ..
python3 docs/audit/fix-4/inspect-bundle.py
