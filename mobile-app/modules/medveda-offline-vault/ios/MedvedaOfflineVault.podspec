Pod::Spec.new do |s|
  s.name = 'MedvedaOfflineVault'
  s.version = '0.1.0'
  s.summary = 'Dormant MEDVEDA offline vault control foundation'
  s.description = 'No content operations enabled; native acceptance pending.'
  s.license = { :type => 'Proprietary' }
  s.author = 'MEDVEDA'
  s.homepage = 'https://medveda.in'
  s.source = { :path => '.' }
  s.platform = :ios, '16.4'
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.swift'
  s.test_spec 'Security' do |t|
    t.source_files = 'Tests/*.swift'
    t.resources = 'Tests/reference.mvp'
  end
end
