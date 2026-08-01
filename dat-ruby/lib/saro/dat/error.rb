# frozen_string_literal: true

module Saro
  module Dat
    # DAT 통합 오류 코드 (error.pre2.md).
    #
    # 코드 문자열은 모든 공식 클라이언트와 CMS 서버가 공유하는 공개 계약이다. 메시지는 자유롭게 바꿔도
    # 되지만 코드는 바꾸지 않는다.
    #
    # - 분류는 원인이다. "어느 함수에서 났는가"가 아니라 "무엇이 잘못됐는가"다.
    # - *_UNKNOWN 은 각 영역의 폴백 전용이다. "알 수 없는 X" 라는 뜻으로 쓰지 않는다.
    # - 하위 원인은 버리지 않고 #cause 로 보존한다.
    module ErrorCode
      # TOKEN : DAT 토큰 문자열
      TOKEN_MALFORMED = "DAT_TOKEN_MALFORMED"
      TOKEN_EXPIRED   = "DAT_TOKEN_EXPIRED"
      TOKEN_UNKNOWN   = "DAT_TOKEN_UNKNOWN"

      # CERT : 인증서
      CERT_MALFORMED        = "DAT_CERT_MALFORMED"
      CERT_EXPIRED          = "DAT_CERT_EXPIRED"
      CERT_NOT_YET_ISSUABLE = "DAT_CERT_NOT_YET_ISSUABLE"
      CERT_ISSUANCE_ENDED   = "DAT_CERT_ISSUANCE_ENDED"
      CERT_VERIFY_ONLY      = "DAT_CERT_VERIFY_ONLY"
      CERT_NOT_FOUND        = "DAT_CERT_NOT_FOUND"
      CERT_NOT_SYNCED       = "DAT_CERT_NOT_SYNCED"
      CERT_DUPLICATE_CID    = "DAT_CERT_DUPLICATE_CID"
      CERT_UNKNOWN          = "DAT_CERT_UNKNOWN"

      # SIG : 서명
      SIG_MISMATCH   = "DAT_SIG_MISMATCH"
      SIG_MALFORMED  = "DAT_SIG_MALFORMED"
      SIG_KEY_MISSING = "DAT_SIG_KEY_MISSING"
      SIG_BACKEND    = "DAT_SIG_BACKEND"
      SIG_UNKNOWN    = "DAT_SIG_UNKNOWN"

      # CRYPTO : secure 페이로드
      CRYPTO_TAG_MISMATCH = "DAT_CRYPTO_TAG_MISMATCH"
      CRYPTO_DATA_INVALID = "DAT_CRYPTO_DATA_INVALID"
      CRYPTO_BACKEND      = "DAT_CRYPTO_BACKEND"
      CRYPTO_UNKNOWN      = "DAT_CRYPTO_UNKNOWN"

      # KEY : 키 재료
      KEY_INVALID                 = "DAT_KEY_INVALID"
      KEY_VERIFY_ONLY_UNSUPPORTED = "DAT_KEY_VERIFY_ONLY_UNSUPPORTED"
      KEY_UNKNOWN                 = "DAT_KEY_UNKNOWN"

      # MANAGER : 매니저 보유 상태
      MANAGER_NO_CERTIFICATE          = "DAT_MANAGER_NO_CERTIFICATE"
      MANAGER_NO_ISSUABLE_CERTIFICATE = "DAT_MANAGER_NO_ISSUABLE_CERTIFICATE"
      MANAGER_DISPOSED                = "DAT_MANAGER_DISPOSED"
      MANAGER_UNKNOWN                 = "DAT_MANAGER_UNKNOWN"

      # CMS : 서버 응답·전송
      CMS_UNREACHABLE      = "DAT_CMS_UNREACHABLE"
      CMS_UNAUTHORIZED     = "DAT_CMS_UNAUTHORIZED"
      CMS_FORBIDDEN        = "DAT_CMS_FORBIDDEN"
      CMS_ENDPOINT_NOT_FOUND = "DAT_CMS_ENDPOINT_NOT_FOUND"
      CMS_SERVER_ERROR     = "DAT_CMS_SERVER_ERROR"
      CMS_HTTP_STATUS      = "DAT_CMS_HTTP_STATUS"
      CMS_MALFORMED        = "DAT_CMS_MALFORMED"
      CMS_IMPORT_FAILED    = "DAT_CMS_IMPORT_FAILED"
      CMS_VERSION_RESET    = "DAT_CMS_VERSION_RESET"
      CMS_NOT_SYNCED       = "DAT_CMS_NOT_SYNCED"
      CMS_SYNC_IN_PROGRESS = "DAT_CMS_SYNC_IN_PROGRESS"
      CMS_NOT_SUPPORTED    = "DAT_CMS_NOT_SUPPORTED"
      CMS_UNKNOWN          = "DAT_CMS_UNKNOWN"

      # CONFIG : 호출자가 넘긴 값
      CONFIG_ALG_UNSUPPORTED   = "DAT_CONFIG_ALG_UNSUPPORTED"
      CONFIG_URI_INVALID       = "DAT_CONFIG_URI_INVALID"
      CONFIG_ARGUMENT_INVALID  = "DAT_CONFIG_ARGUMENT_INVALID"
      CONFIG_UNKNOWN           = "DAT_CONFIG_UNKNOWN"

      # INTERNAL : 실행 환경
      INTERNAL_UNAVAILABLE = "DAT_INTERNAL_UNAVAILABLE"
      INTERNAL_UNKNOWN     = "DAT_INTERNAL_UNKNOWN"

      # 재시도 분류. 애매하면 :permanent 다 — 영구 오류에 대한 무한 재시도가
      # 이 체계 이전의 실제 결함이었다.
      TRANSIENT = [
        CERT_NOT_YET_ISSUABLE, CERT_NOT_SYNCED, MANAGER_NO_CERTIFICATE,
        CMS_UNREACHABLE, CMS_SERVER_ERROR, CMS_NOT_SYNCED
      ].freeze

      STATE = [CMS_VERSION_RESET, CMS_SYNC_IN_PROGRESS].freeze

      # 위조·변조 시도의 직접 증거.
      SECURITY = [SIG_MISMATCH, CRYPTO_TAG_MISMATCH].freeze
    end

    # DAT 의 단일 오류 타입.
    #
    # 예전에는 정의만 되어 있고 아무도 쓰지 않았다. 대신 ArgumentError 와
    # RuntimeError 가 같은 조건에 뒤섞여 던져져서(예: "Invalid DAT: Format" 이
    # DatManager#parse 에서는 ArgumentError, DatManager._parse 에서는
    # RuntimeError) 호출부가 어느 쪽을 잡아야 할지 알 수 없었다.
    class Error < StandardError
      # 공개 계약인 오류 코드. 모든 공식 클라이언트에서 동일하다.
      attr_reader :code
      # 사람이 읽는 설명. 자유롭게 바꿔도 된다.
      attr_reader :detail

      def initialize(code, detail = nil, cause: nil)
        @code = code
        @detail = detail
        @explicit_cause = cause
        super(detail ? "#{code}: #{detail}" : code)
      end

      # Ruby 는 rescue 안에서 raise 하면 #cause 를 자동으로 채운다. 그 동작은
      # 그대로 두고, 명시적으로 넘긴 하위 원인이 있으면 그쪽을 우선한다.
      # DAT_MANAGER_NO_ISSUABLE_CERTIFICATE 의 사유 코드가 이 경로로 실린다.
      def cause
        @explicit_cause || super
      end

      # :transient  - 같은 입력으로 재시도하면 해소될 수 있다. 백오프 후 재시도.
      # :permanent  - 설정·입력·배포를 고쳐야 한다. 재시도하지 않는다.
      # :state      - 오류가 아닌 상태 신호. 흐름 제어에만 쓴다.
      #
      # 중간값을 두지 않는다 — 호출부가 분기할 수 없기 때문이다.
      def retry
        if @code == ErrorCode::MANAGER_NO_ISSUABLE_CERTIFICATE
          # 발급창 시작 전이면 기다리면 풀린다. 나머지 사유는 안 풀린다.
          c = cause
          return :transient if c.is_a?(Error) && c.code == ErrorCode::CERT_NOT_YET_ISSUABLE
          return :permanent
        end
        return :transient if ErrorCode::TRANSIENT.include?(@code)
        return :state if ErrorCode::STATE.include?(@code)
        :permanent
      end

      # 위조·변조 시도의 직접 증거. 다른 실패와 같은 경로로 로깅하지 않는다.
      def security_event?
        ErrorCode::SECURITY.include?(@code)
      end

      def inspect
        "#<Saro::Dat::Error #{@code}#{@detail ? " #{@detail.inspect}" : ''}>"
      end

      class << self
        # 어떤 예외에서든 DAT 오류 코드를 꺼낸다. DAT 오류가 아니면 nil 이다.
        def code_of(e)
          e.is_a?(Error) ? e.code : nil
        end

        # DAT 오류가 아닌 것을 감싼다. 이미 Error 면 그대로 둔다.
        # 원본은 cause 로 반드시 보존한다.
        def wrap(code, detail, e)
          return e if e.is_a?(Error)
          new(code, detail, cause: e)
        end
      end
    end
  end
end
