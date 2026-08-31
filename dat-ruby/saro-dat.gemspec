# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "saro-dat"
  spec.version       = "4.7.0"
  spec.authors       = ["marker"]
  spec.email         = ["j@saro.me"]

  spec.summary       = "DAT (Data Access Token) Ruby implementation"
  spec.description   = "Ported from Python dat library"
  spec.homepage      = "https://dat.saro.me/libs/gems-saro-dat"
  spec.license       = "MIT"
  spec.required_ruby_version = ">= 2.7.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/saro-lab/dat"

  spec.metadata["keywords"] = "dat, distributed, access, token, web, session, security, authentication"

  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    Dir["lib/**/*", "CHANGELOG.md", "LICENSE", "README.md"].select { |file| File.file?(file) }.sort
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{\Aexe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_dependency "openssl", "~> 4.0.2"
  spec.add_dependency "base64"
  spec.add_dependency "logger"

  spec.add_development_dependency "minitest", "= 5.26.1"
  spec.add_development_dependency "benchmark"
  spec.add_development_dependency "parallel", "~> 1.28.0"
end
