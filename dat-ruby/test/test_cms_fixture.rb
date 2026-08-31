# frozen_string_literal: true

require 'json'
require_relative './test_helper'

class TestCmsFixture < Minitest::Test
  FIXTURE = JSON.parse(File.read(File.expand_path('fixtures/cms_v1_state_transitions.json', __dir__)))

  Response = Struct.new(:code, :body)
  Http = Struct.new(:response) do
    def request(*)
      response
    end
  end

  def body_for(case_data)
    case_data.fetch('input').fetch('body', []).map do |kind, value|
      case kind
      when 'ascii' then value.b
      when 'hex' then [value].pack('H*')
      else FIXTURE.fetch('certificates').fetch(value).fetch('wire_ascii').b
      end
    end.join
  end

  def make_manager(state_name)
    state = FIXTURE.fetch('states').fetch(state_name)
    manager = Saro::Dat::DatManager.new
    state.fetch('certificates').each do |key|
      manager.imports(FIXTURE.fetch('certificates').fetch(key).fetch('wire_ascii'), clear: false)
    end
    cms = Saro::Dat::DatCmsManager.allocate
    cms.instance_variable_set(:@uri, 'http://fixture.invalid/v1/certs')
    cms.instance_variable_set(:@token, '')
    cms.instance_variable_set(:@manager, manager)
    cms.instance_variable_set(:@version, state.fetch('version').to_i)
    cms.instance_variable_set(:@lock, Mutex.new)
    cms.instance_variable_set(:@lifecycle, Mutex.new)
    cms.instance_variable_set(:@connect_timeout_seconds, 0)
    cms.instance_variable_set(:@sync_timeout_seconds, 0)
    cms.instance_variable_set(:@logger, Logger.new(nil))
    cms
  end

  FIXTURE.fetch('cases').each do |case_data|
    define_method("test_g0_#{case_data.fetch('id')}") do
      cms = make_manager(case_data.fetch('initial'))
      want = case_data['expect'] || case_data.fetch('expect_by_profile').fetch('unbounded_decimal')
      input = case_data.fetch('input')
      if input.fetch('kind') == 'transport'
        with_http_start(->(*) { raise IOError, 'transport' }) { assert_fixture(cms, want) }
      else
        response = Response.new(input.fetch('status').to_s, body_for(case_data))
        with_http_start(->(*, &block) { block.call(Http.new(response)) }) { assert_fixture(cms, want) }
      end
      state = FIXTURE.fetch('states').fetch(want.fetch('state'))
      assert_equal state.fetch('version').to_i, cms.version
      assert_equal state.fetch('certificates').map { |key| FIXTURE.fetch('certificates').fetch(key).fetch('wire_ascii') },
                   cms.get_manager.exports.split("\n").reject(&:empty?)
    end
  end

  def assert_fixture(cms, want)
    if want['error']
      error = assert_raises(Saro::Dat::Error) { cms.sync_or_raise }
      assert_equal want.fetch('error').split('(').first, error.code
      assert_equal want.fetch('retry').to_sym, error.retry
    else
      cms.sync_or_raise
    end
  end

  def with_http_start(replacement)
    singleton = Net::HTTP.singleton_class
    original = Net::HTTP.method(:start)
    singleton.send(:define_method, :start, &replacement)
    yield
  ensure
    singleton.send(:define_method, :start, original)
  end
end
