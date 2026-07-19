import asyncio
import secrets
import string
import time
import unittest
from concurrent.futures import ThreadPoolExecutor

from saro_dat import DatSignatureAlgorithm, DatCryptoAlgorithm, DatCertificate, DatManager, DatSignature, DatCrypto


def generate_base62(length: int) -> str:
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))


def run_issue(cert, plain, secure):
    return DatManager._issue(cert, plain, secure)


def run_parse(cert, dat_str):
    return DatManager._parse(cert, dat_str)


async def loops(multi_thread: bool, loop_size: int, certificates: list[DatCertificate], plain: str, secure: str):
    mode_name = "Multi-Thread" if multi_thread else "Single-Thread"
    print(f"\n--- {mode_name} ---")

    for cert in certificates:
        pre = f"{cert._signature_key.algorithm.value} {cert._crypto_key.algorithm.value}"

        start = time.perf_counter()
        last_dat = ""

        if multi_thread:
            # 파이썬의 GIL 우회를 위해 ProcessPoolExecutor 사용 (실제 멀티코어 활용)
            with ThreadPoolExecutor() as executor:
                futures = [executor.submit(run_issue, cert, plain, secure) for _ in range(loop_size)]
                for fut in futures:
                    last_dat = fut.result()
        else:
            for _ in range(loop_size):
                last_dat = DatManager._issue(cert, plain, secure)

        duration_ms = (time.perf_counter() - start) * 1000
        print(f"{pre} Issue * {loop_size} : {duration_ms:.0f}ms")

        # 2. Parse Benchmark
        start = time.perf_counter()
        last_payload = None

        if multi_thread:
            with ThreadPoolExecutor() as executor:
                futures = [executor.submit(run_parse, cert, last_dat) for _ in range(loop_size)]
                for fut in futures:
                    last_payload = fut.result()
        else:
            for _ in range(loop_size):
                last_payload = DatManager._parse(cert, last_dat)

        duration_ms = (time.perf_counter() - start) * 1000
        print(f"{pre} Parse * {loop_size} : {duration_ms:.0f}ms")

        # 검증
        assert last_payload.plain == plain
        assert last_payload.secure == secure


async def benchmark(loop_size: int):
    plain = generate_base62(100)
    secure = generate_base62(100)

    print("Performance Test (Plain, Secure)")
    print(f"Plain: {plain}")
    print(f"Secure: {secure}")

    certificates = []
    now = int(time.time())

    for sa in DatSignatureAlgorithm:
        for ca in DatCryptoAlgorithm:
            certificates.append(DatCertificate(0, DatSignature.generate(sa), DatCrypto.generate(ca), now - 10, now + 600, 60))

    await loops(True, loop_size, certificates, plain, secure)
    await loops(False, loop_size, certificates, plain, secure)


class TestBench(unittest.TestCase):
    def test(self):
        loop_size = 10000
        asyncio.run(benchmark(loop_size))


if __name__ == "__main__":
    unittest.main()
