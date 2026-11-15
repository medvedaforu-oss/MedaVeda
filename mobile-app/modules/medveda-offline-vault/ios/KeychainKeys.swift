import Foundation
import Security
import CryptoKit

/// Explicit opaque-alias key storage. No owner names, synchronization, replacement or deletion.
/// A later iOS coordinator MUST journal intent before create and reference only after readback.
final class KeychainKeys {
  private let lock = NSLock()
  private func query(_ alias: String) throws -> [String: Any] {
    guard alias == "registry" || (alias.utf8.count == 32 && alias.utf8.allSatisfy {
      (48...57).contains($0) || (97...102).contains($0)
    }) else { throw VaultUnavailable() }
    return [kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "in.medveda.offline.phase1b",
      kSecAttrAccount as String: alias, kSecAttrSynchronizable as String: false,
      kSecUseAuthenticationUI as String: kSecUseAuthenticationUIFail]
  }
  func create(_ alias: String) throws {
    lock.lock(); defer { lock.unlock() }
    do {
      var bytes = Data(count: 32)
      defer { bytes.resetBytes(in: 0..<bytes.count) }
      let status = bytes.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 32, $0.baseAddress!) }
      guard status == errSecSuccess else { throw VaultUnavailable() }
      var q = try query(alias)
      q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
      q[kSecValueData as String] = bytes
      // Duplicate item, locked device and other failures never invoke update/delete.
      guard SecItemAdd(q as CFDictionary, nil) == errSecSuccess else { throw VaultUnavailable() }
      let key = try lookupUnlocked(alias)
      let challenge = Data("MVKEYCHECK001".utf8)
      let sealed = try AES.GCM.seal(challenge, using: key)
      guard try AES.GCM.open(sealed, using: key) == challenge else { throw VaultUnavailable() }
    } catch { throw VaultUnavailable() }
  }
  func lookup(_ alias: String) throws -> SymmetricKey {
    lock.lock(); defer { lock.unlock() }
    do { return try lookupUnlocked(alias) } catch { throw VaultUnavailable() }
  }
  private func lookupUnlocked(_ alias: String) throws -> SymmetricKey {
    var q = try query(alias)
    q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: CFTypeRef?
    guard SecItemCopyMatching(q as CFDictionary, &result) == errSecSuccess,
      var bytes = result as? Data, bytes.count == 32 else { throw VaultUnavailable() }
    defer { bytes.resetBytes(in: 0..<bytes.count) }
    return SymmetricKey(data: bytes)
  }
}
