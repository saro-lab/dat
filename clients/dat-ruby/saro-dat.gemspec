# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "saro-dat"
  spec.version       = "4.3.4"
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

  # Specify which files should be added to the gem when it is released.
  # The `git ls-files -z` loads the files in the RubyGem that have been added into git.
  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    `git ls-files -z`.split("\x0").reject { |f| f.match(%r{\A(?:test|spec|features|_pypi)/}) }
  end
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{\Aexe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_dependency "openssl", "~> 4.0.2"
  spec.add_dependency "base64"
  spec.add_dependency "logger"

  spec.add_development_dependency "minitest", "~> 5.0"
  spec.add_development_dependency "benchmark"
  spec.add_development_dependency "parallel"
end
