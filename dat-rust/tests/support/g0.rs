use std::collections::BTreeMap;

#[derive(Debug)]
pub enum Json {
    Null,
    Bool,
    Number(String),
    String(String),
    Array(Vec<Json>),
    Object(BTreeMap<String, Json>),
}

impl Json {
    pub fn get(&self, key: &str) -> &Json {
        self.as_object()
            .get(key)
            .unwrap_or_else(|| panic!("missing JSON key {key:?}"))
    }

    pub fn as_object(&self) -> &BTreeMap<String, Json> {
        match self {
            Json::Object(value) => value,
            _ => panic!("expected JSON object, got {self:?}"),
        }
    }

    pub fn as_array(&self) -> &[Json] {
        match self {
            Json::Array(value) => value,
            _ => panic!("expected JSON array, got {self:?}"),
        }
    }

    pub fn as_str(&self) -> &str {
        match self {
            Json::String(value) | Json::Number(value) => value,
            _ => panic!("expected JSON string or number, got {self:?}"),
        }
    }

    pub fn as_u16(&self) -> u16 {
        self.as_str().parse().expect("expected JSON u16")
    }

    pub fn optional_str(&self) -> Option<&str> {
        match self {
            Json::Null => None,
            Json::String(value) => Some(value),
            _ => panic!("expected JSON string or null, got {self:?}"),
        }
    }
}

pub fn parse(input: &str) -> Json {
    let mut parser = Parser {
        input: input.as_bytes(),
        cursor: 0,
    };
    let value = parser.value();
    parser.whitespace();
    assert_eq!(parser.cursor, parser.input.len(), "trailing JSON data");
    value
}

struct Parser<'a> {
    input: &'a [u8],
    cursor: usize,
}

impl Parser<'_> {
    fn value(&mut self) -> Json {
        self.whitespace();
        match self.peek() {
            Some(b'{') => self.object(),
            Some(b'[') => self.array(),
            Some(b'"') => Json::String(self.string()),
            Some(b't') => {
                self.literal(b"true");
                Json::Bool
            }
            Some(b'f') => {
                self.literal(b"false");
                Json::Bool
            }
            Some(b'n') => {
                self.literal(b"null");
                Json::Null
            }
            Some(b'-' | b'0'..=b'9') => Json::Number(self.number()),
            byte => panic!("unexpected JSON byte {byte:?} at {}", self.cursor),
        }
    }

    fn object(&mut self) -> Json {
        self.take(b'{');
        let mut values = BTreeMap::new();
        self.whitespace();
        if self.consume(b'}') {
            return Json::Object(values);
        }
        loop {
            self.whitespace();
            let key = self.string();
            self.whitespace();
            self.take(b':');
            assert!(values.insert(key, self.value()).is_none());
            self.whitespace();
            if self.consume(b'}') {
                return Json::Object(values);
            }
            self.take(b',');
        }
    }

    fn array(&mut self) -> Json {
        self.take(b'[');
        let mut values = Vec::new();
        self.whitespace();
        if self.consume(b']') {
            return Json::Array(values);
        }
        loop {
            values.push(self.value());
            self.whitespace();
            if self.consume(b']') {
                return Json::Array(values);
            }
            self.take(b',');
        }
    }

    fn string(&mut self) -> String {
        self.take(b'"');
        let mut value = Vec::new();
        loop {
            match self.next().expect("unterminated JSON string") {
                b'"' => return String::from_utf8(value).expect("JSON string is UTF-8"),
                b'\\' => match self.next().expect("unterminated JSON escape") {
                    b'"' => value.push(b'"'),
                    b'\\' => value.push(b'\\'),
                    b'/' => value.push(b'/'),
                    b'b' => value.push(8),
                    b'f' => value.push(12),
                    b'n' => value.push(b'\n'),
                    b'r' => value.push(b'\r'),
                    b't' => value.push(b'\t'),
                    escape => panic!("unsupported JSON escape {escape:?}"),
                },
                byte if byte < 0x20 => panic!("control byte in JSON string"),
                byte => value.push(byte),
            }
        }
    }

    fn number(&mut self) -> String {
        let start = self.cursor;
        while matches!(
            self.peek(),
            Some(b'-' | b'+' | b'.' | b'e' | b'E' | b'0'..=b'9')
        ) {
            self.cursor += 1;
        }
        std::str::from_utf8(&self.input[start..self.cursor])
            .unwrap()
            .to_string()
    }

    fn literal(&mut self, literal: &[u8]) {
        assert_eq!(
            self.input.get(self.cursor..self.cursor + literal.len()),
            Some(literal)
        );
        self.cursor += literal.len();
    }

    fn whitespace(&mut self) {
        while matches!(self.peek(), Some(b' ' | b'\n' | b'\r' | b'\t')) {
            self.cursor += 1;
        }
    }

    fn peek(&self) -> Option<u8> {
        self.input.get(self.cursor).copied()
    }

    fn next(&mut self) -> Option<u8> {
        let value = self.peek()?;
        self.cursor += 1;
        Some(value)
    }

    fn take(&mut self, expected: u8) {
        assert_eq!(self.next(), Some(expected), "at byte {}", self.cursor);
    }

    fn consume(&mut self, expected: u8) -> bool {
        if self.peek() == Some(expected) {
            self.cursor += 1;
            true
        } else {
            false
        }
    }
}

pub fn expectation<'a>(case: &'a Json, profile: &str) -> &'a Json {
    let case = case.as_object();
    if let Some(expect) = case.get("expect") {
        expect
    } else {
        case.get("expect_by_profile")
            .expect("fixture case expectation")
            .get(profile)
    }
}

pub fn certificate_wire<'a>(fixture: &'a Json, name: &str) -> &'a str {
    fixture
        .get("certificates")
        .get(name)
        .get("wire_ascii")
        .as_str()
}

pub fn body(fixture: &Json, segments: &Json) -> Vec<u8> {
    let mut body = Vec::new();
    for segment in segments.as_array() {
        let segment = segment.as_array();
        assert_eq!(segment.len(), 2);
        match segment[0].as_str() {
            "ascii" => body.extend_from_slice(segment[1].as_str().as_bytes()),
            "certificate" => {
                body.extend_from_slice(certificate_wire(fixture, segment[1].as_str()).as_bytes())
            }
            "hex" => {
                let hex = segment[1].as_str().as_bytes();
                assert_eq!(hex.len() % 2, 0);
                for pair in hex.chunks_exact(2) {
                    body.push((hex_digit(pair[0]) << 4) | hex_digit(pair[1]));
                }
            }
            kind => panic!("unknown fixture body segment {kind:?}"),
        }
    }
    body
}

fn hex_digit(byte: u8) -> u8 {
    match byte {
        b'0'..=b'9' => byte - b'0',
        b'a'..=b'f' => byte - b'a' + 10,
        _ => panic!("invalid fixture hex digit"),
    }
}
