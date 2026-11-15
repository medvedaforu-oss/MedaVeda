import XCTest
import CryptoKit
@testable import MedvedaOfflineVault

final class ContainerTests: XCTestCase {
  // Deterministic independent Node vector, synthetic root only; no keychain calls.
  func testIndependentVectorAndEveryByteTampering() throws {
    let source = try XCTUnwrap(Bundle(for: ContainerTests.self).url(forResource: "reference", withExtension: "mvp"))
    let bytes = try Data(contentsOf: source)
    let metadata = MVPDFMetadata(owner: "owner-a", note: "note-1", version: 3,
      length: 5, keyEpoch: 1, identity: "sha256:synthetic-v3")
    let key = SymmetricKey(data: Data(repeating: 0x42, count: 32))
    XCTAssertEqual(try MVPDFVerifier.verify(InputStream(data: bytes), expected: metadata,
      ownerKey: key, admission: {}), "38523c087796e5d5dd1cf9bad1fb026781a838dd9dd2cf8af58b9f6502a46778")
    for index in bytes.indices {
      var changed = bytes; changed[index] ^= 1
      XCTAssertThrowsError(try MVPDFVerifier.verify(InputStream(data: changed),
        expected: metadata, ownerKey: key, admission: {}))
    }
    for length in 0..<bytes.count {
      XCTAssertThrowsError(try MVPDFVerifier.verify(InputStream(data: bytes.prefix(length)),
        expected: metadata, ownerKey: key, admission: {}))
    }
    XCTAssertThrowsError(try MVPDFVerifier.verify(InputStream(data: bytes + Data([0])),
      expected: metadata, ownerKey: key, admission: {}))
    XCTAssertThrowsError(try MVPDFVerifier.verify(InputStream(data: bytes), expected: metadata,
      ownerKey: key, admission: { throw VaultUnavailable() }))
  }
}
