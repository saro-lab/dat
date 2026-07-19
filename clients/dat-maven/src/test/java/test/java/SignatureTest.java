package test.java;

import me.saro.dat.DatUtils;
import me.saro.dat.signature.DatSignature;
import me.saro.dat.signature.DatSignatureAlgorithm;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SignatureTest {

    public void unit(DatSignatureAlgorithm alg) {
        String tag = "Signature " + alg;
        byte[] body = DatUtils.generateRandomBase62(100).getBytes();
        DatSignature signatureKey = DatSignature.generate(alg);
        DatSignature signatureKeyFail = DatSignature.generate(alg);
        byte[] keyBytes = signatureKey.exportKey(false);
        byte[] verifyingKeyBytes = signatureKey.exportKey(signatureKey.supportVerifyOnly());
        DatSignature signatureKeyFrom = DatSignature.fromKey(alg, keyBytes);
        DatSignature verifyKeyFrom = DatSignature.fromKey(alg, verifyingKeyBytes);

        var sign = signatureKeyFrom.sign(body);

        assertTrue(signatureKey.verify(body, sign));
        assertTrue(signatureKeyFrom.verify(body, sign));
        assertTrue(verifyKeyFrom.verify(body, sign));
        assertFalse(signatureKeyFail.verify(body, sign));
        System.out.println(tag + " PASS : " + DatUtils.encodeBase64Url(keyBytes));
    }

    @Test
    public void test() {
        for (var algorithm : DatSignatureAlgorithm.getEntries()) {
            for (var i = 0; i < 20; i++) {
                unit(algorithm);
            }
        }
    }
}
