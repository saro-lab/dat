package test.java;

import me.saro.dat.DatUtils;
import me.saro.dat.crypto.DatCryptoAlgorithm;
import me.saro.dat.dat.DatCertificate;
import me.saro.dat.dat.DatManager;
import me.saro.dat.dat.Payload;
import me.saro.dat.signature.DatSignatureAlgorithm;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertThrows;

public class CertificateTest {

    public void unit(DatCertificate failCert, DatSignatureAlgorithm signatureAlgorithm, DatCryptoAlgorithm cryptoAlgorithm) {
        String plain = DatUtils.generateRandomBase62(30);
        String secure = DatUtils.generateRandomBase62(30);

        long id = (long) (Math.random() * Long.MAX_VALUE);
        DatCertificate newCert = generate(id, signatureAlgorithm, cryptoAlgorithm);
        String newCertStr = newCert.exports(false);

        DatCertificate readCert = DatCertificate.parse(newCertStr);
        System.out.println("Cert " + newCertStr);

        String dat = DatManager.issue(newCert, plain, secure).getOrThrow();
        String dat2 = DatManager.issue(newCert, plain.getBytes(StandardCharsets.UTF_8), secure.getBytes(StandardCharsets.UTF_8)).getOrThrow();

        Payload payload = DatManager.parse(readCert, dat).getOrThrow();
        Payload payload2 = DatManager.parse(readCert, dat2).getOrThrow();
        System.out.println("DAT " + dat);

        assert plain.equals(payload.getPlain());
        assert secure.equals(payload.getSecure());
        assert plain.equals(payload2.getPlain());
        assert secure.equals(payload2.getSecure());
        assert id == newCert.getCidLong();
        assert id == readCert.getCidLong();
        assertThrows(Exception.class, () -> DatManager.parse(failCert, dat).getOrThrow());
    }


    public DatCertificate generate(long id, DatSignatureAlgorithm signatureAlgorithm, DatCryptoAlgorithm cryptoAlgorithm) {
        return DatCertificate.generate(
                id,
                System.currentTimeMillis() - 10,
                200,
                100,
                signatureAlgorithm,
                cryptoAlgorithm
        );
    }

    @Test
    public void test() {
        var failCert = generate((long) (Math.random() * Long.MAX_VALUE),DatSignatureAlgorithm.ECDSA_P256, DatCryptoAlgorithm.IV_AES128_GCM);

        for (var signatureAlgorithm : DatSignatureAlgorithm.getEntries()) {
            for (var cryptoAlgorithm : DatCryptoAlgorithm.getEntries()) {
                for (var i = 0; i < 20; i++) {
                    unit(failCert, signatureAlgorithm, cryptoAlgorithm);
                }
            }
        }

    }
}
