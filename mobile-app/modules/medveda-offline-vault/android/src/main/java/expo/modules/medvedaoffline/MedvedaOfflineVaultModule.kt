package expo.modules.medvedaoffline

import android.os.Build
import `in`.medveda.offline.AndroidVaultLifecycle
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Inert bridge: no disk/Keystore work at registration or lifecycle events.
 * No owner/key/file/URL/lease handles cross JS. Native test harness owns the controller.
 */
class MedvedaOfflineVaultModule:Module() {

  override fun definition()=ModuleDefinition {
    Name("MedvedaOfflineVault")
    Function("capabilities") {
      mapOf("format" to "MVPDF/1","platformSupported" to (Build.VERSION.SDK_INT>=28),
        "contentEnabled" to false,"nativeAccepted" to false,"bridgeVersion" to 1)
    }
    Function("invalidate") {AndroidVaultLifecycle.invalidate()}
    OnActivityEntersBackground {AndroidVaultLifecycle.invalidate()}
    OnActivityDestroys {AndroidVaultLifecycle.invalidate()}
    OnDestroy {AndroidVaultLifecycle.invalidate()}
  }
}

