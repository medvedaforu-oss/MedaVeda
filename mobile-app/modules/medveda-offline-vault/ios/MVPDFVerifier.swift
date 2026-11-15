import Foundation
import CryptoKit

struct VaultUnavailable: LocalizedError {
  var errorDescription: String? { "Offline vault unavailable" }
}

struct MVPDFMetadata {
  let owner: String
  let note: String
  let version: UInt64
  let length: UInt64
  let keyEpoch: UInt32
  let identity: String

  func encoded() throws -> Data {
    func valid(_ value: String, _ max: Int) -> Bool {
      let bytes = Array(value.utf8)
      return !bytes.isEmpty && bytes.count <= max && bytes.allSatisfy {
        (65...90).contains($0) || (97...122).contains($0) || (48...57).contains($0)
          || [UInt8(95), 46, 58, 45].contains($0)
      }
    }
    guard valid(owner, 128), valid(note, 128), valid(identity, 256),
      version > 0, keyEpoch > 0, (5...104857600).contains(length) else { throw VaultUnavailable() }
    func text(_ s: String) -> Data { let b = Data(s.utf8); return be(UInt16(b.count)) + b }
    return text(owner) + text(note) + be(version) + be(length) + be(keyEpoch) + text(identity)
  }
}

private func be<T: FixedWidthInteger>(_ value: T) -> Data {
  var big = value.bigEndian
  return withUnsafeBytes(of: &big) { Data($0) }
}
private func ascii(_ s: String) -> Data { Data(s.utf8) }

/// Bounded MVPDF/1 verification only; no plaintext output or renderer admission API.
/// Trusted caller must bind expected owner and current native epoch in `admission`.
enum MVPDFVerifier {
  static func verify(_ input: InputStream, expected: MVPDFMetadata, ownerKey: SymmetricKey,
                     admission: () throws -> Void) throws -> String {
    do { return try checked(input, expected: expected, ownerKey: ownerKey, admission: admission) }
    catch { throw VaultUnavailable() }
  }
  private static func checked(_ input: InputStream, expected: MVPDFMetadata,
                             ownerKey: SymmetricKey, admission: () throws -> Void) throws -> String {
    let metadata = try expected.encoded()
    try admission()
    guard ownerKey.bitCount == 256 else { throw VaultUnavailable() }
    input.open(); defer { input.close() }
    func exact(_ count: Int) throws -> Data {
      guard (0...262160).contains(count) else { throw VaultUnavailable() }
      var bytes = [UInt8](repeating: 0, count: count)
      var at = 0
      while at < count {
        let n = bytes.withUnsafeMutableBufferPointer {
          input.read($0.baseAddress!.advanced(by: at), maxLength: count - at)
        }
        guard n > 0 else { throw VaultUnavailable() }; at += n
      }
      return Data(bytes)
    }
    func number(_ b: Data) -> UInt64 { b.reduce(UInt64(0)) { ($0 << 8) | UInt64($1) } }
    func open(_ key: SymmetricKey, _ nonce: Data, _ aad: Data, _ sealed: Data) throws -> Data {
      guard sealed.count >= 16 else { throw VaultUnavailable() }
      let box = try AES.GCM.SealedBox(nonce: AES.GCM.Nonce(data: nonce),
        ciphertext: sealed.dropLast(16), tag: sealed.suffix(16))
      return try AES.GCM.open(box, using: key, authenticating: aad)
    }
    func record(_ kind: UInt8, _ counter: UInt64, _ size: UInt32) -> Data {
      Data([kind]) + be(counter) + be(size)
    }
    let outer = try exact(92)
    guard outer.prefix(8) == ascii("MVPDF001"),
      number(outer.subdata(in: 24..<28)) == UInt64(expected.keyEpoch) else { throw VaultUnavailable() }
    let prefix = outer.subdata(in: 28..<32)
    var dekBytes = try open(ownerKey, outer.subdata(in: 32..<44),
      ascii("MVPDF/1/wrap") + outer.prefix(32) + metadata, outer.subdata(in: 44..<92))
    defer { dekBytes.resetBytes(in: 0..<dekBytes.count) }
    guard dekBytes.count == 32 else { throw VaultUnavailable() }
    let dek = SymmetricKey(data: dekBytes)
    let encodedLength = try exact(4)
    guard number(encodedLength) == UInt64(metadata.count + 16), metadata.count + 16 <= 65536 else {
      throw VaultUnavailable()
    }
    let encryptedMetadata = try exact(metadata.count + 16)
    guard try open(dek, prefix + be(UInt64(0)), ascii("MVPDF/1/meta") + outer,
      encryptedMetadata) == metadata else { throw VaultUnavailable() }
    let headerHash = Data(SHA256.hash(data: outer + encodedLength + encryptedMetadata))
    var digest = SHA256()
    var total: UInt64 = 0, count: UInt64 = 0
    var last: UInt32 = 0
    while total < expected.length {
      try admission()
      let size = UInt32(min(UInt64(262144), expected.length - total)); count += 1
      let rec = try exact(13)
      guard rec == record(1, count, size) else { throw VaultUnavailable() }
      var plaintext = try open(dek, prefix + be(count),
        ascii("MVPDF/1/data") + headerHash + metadata + rec, exact(Int(size) + 16))
      defer { plaintext.resetBytes(in: 0..<plaintext.count) }
      guard plaintext.count == Int(size), total != 0 || plaintext.prefix(5) == ascii("%PDF-") else {
        throw VaultUnavailable()
      }
      digest.update(data: plaintext); total += UInt64(size); last = size
    }
    let rec = try exact(13)
    guard rec == record(2, count + 1, 52) else { throw VaultUnavailable() }
    let hash = Data(digest.finalize())
    let manifest = try open(dek, prefix + be(count + 1),
      ascii("MVPDF/1/final") + headerHash + metadata + rec, exact(68))
    guard manifest == be(count) + be(total) + be(last) + hash else { throw VaultUnavailable() }
    var trailing: UInt8 = 0
    guard input.read(&trailing, maxLength: 1) == 0 else { throw VaultUnavailable() }
    try admission()
    return hash.map { String(format: "%02x", $0) }.joined()
  }
}
