import { requireOptionalNativeModule } from 'expo-modules-core';

export type VaultCapabilities = {
  format: 'MVPDF/1';
  bridgeVersion: 1;
  platformSupported: boolean;
  contentEnabled: false;
  nativeAccepted: false;
};
type ControlBridge = {
  capabilities(): VaultCapabilities;
  invalidate(): void;
};
// No import from existing application code. Lookup itself performs no key/file work.
export function nativeVaultControl(): ControlBridge | null {
  return requireOptionalNativeModule<ControlBridge>('MedvedaOfflineVault');
}
