package test.java;

import me.saro.dat.DatUtils;
import me.saro.dat.Unixtime;
import me.saro.dat.crypto.DatCryptoAlgorithm;
import me.saro.dat.dat.DatCertificate;
import me.saro.dat.dat.DatManager;
import me.saro.dat.dat.Payload;
import me.saro.dat.signature.DatSignatureAlgorithm;

import java.util.List;
import java.util.stream.IntStream;

public class BenchTest {

    private IntStream stream(boolean multiThread, int loop) {
        IntStream stream = IntStream.range(0, loop);
        return multiThread ? stream.parallel() : stream.sequential();
    }

    public void loop(boolean multiThread, int loop, List<DatCertificate> certificates, String plain, String secure) {

        System.out.println("\n" + (multiThread ? "Multi-Thread " : "Single-Thread "));

        for (DatCertificate certificate : certificates) {
            String pre = certificate.getSignature$me_saro_dat().algorithm() + " " +
                    certificate.getCrypto$me_saro_dat().algorithm() + " ";

            long time = System.currentTimeMillis();
            List<String> dats = stream(multiThread, loop)
                    .mapToObj(i -> DatManager.issue(certificate, plain, secure).getOrThrow())
                    .toList();
            System.out.println(pre + "Issue * " + dats.size() + " : " + (System.currentTimeMillis() - time) + "ms");

            time = System.currentTimeMillis();
            String dat = dats.get(0);
            List<Payload> payloads = stream(multiThread, loop)
                    .mapToObj(i -> DatManager.parse(certificate, dat).getOrThrow())
                    .toList();

            System.out.println(pre + "Parse * " + payloads.size() + " : " + (System.currentTimeMillis() - time) + "ms");

            assert plain.equals(payloads.get(0).getPlain());
            assert secure.equals(payloads.get(0).getSecure());
        }
    }
    
    //@Test
    public void test() {
        int loop = 10000;
        long now = Unixtime.now();
        String plain = DatUtils.generateRandomBase62(100);
        String secure = DatUtils.generateRandomBase62(100);

        System.out.println("Plain : " + plain);
        System.out.println("Secure : " + secure);

        List<DatCertificate> certificates = DatSignatureAlgorithm.getEntries().stream().flatMap(sa ->
            DatCryptoAlgorithm.getEntries().stream().map(ca ->
                    DatCertificate.generate(0, now - 10, 200, 100, sa, ca)
            )
        ).toList();

        loop(true, loop, certificates, plain, secure);
        loop(false, loop, certificates, plain, secure);
    }
}
