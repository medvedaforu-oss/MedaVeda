import ExpoModulesCore
import Foundation

public final class MedvedaOfflineVaultModule: Module {
  // Invalidation token only; iOS coordinator/renderer admission remains unimplemented.
  private var invalidated = true
  public func definition() -> ModuleDefinition {
    Name("MedvedaOfflineVault")
    Function("capabilities") {
      ["format": "MVPDF/1", "bridgeVersion": 1, "platformSupported": false,
       "contentEnabled": false, "nativeAccepted": false] as [String: Any]
    }
    Function("invalidate") { self.invalidated = true }
    OnAppEntersBackground { self.invalidated = true }
    OnDestroy { self.invalidated = true }
  }
}
