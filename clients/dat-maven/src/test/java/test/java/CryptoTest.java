package test.java;

import me.saro.dat.DatUtils;
import me.saro.dat.crypto.DatCrypto;
import me.saro.dat.crypto.DatCryptoAlgorithm;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertThrows;

public class CryptoTest {

    public void unit(DatCryptoAlgorithm alg) {
        String tag = "Crypto " + alg;

        byte[] body = DatUtils.generateRandomBase62(100).getBytes();
        DatCrypto cryptoKey = DatCrypto.generate(alg);
        DatCrypto cryptoKeyFail = DatCrypto.generate(alg);
        byte[] cryptoKeyBytes = cryptoKey.toBytes();
        DatCrypto cryptoKeyFrom = DatCrypto.fromBytes(alg, cryptoKeyBytes);

        var encrypted = cryptoKeyFrom.encrypt(body);

        assert Arrays.equals(cryptoKey.decrypt(encrypted), body);
        assert Arrays.equals(cryptoKeyFrom.decrypt(encrypted), body);
        assertThrows(Exception.class, () -> cryptoKeyFail.decrypt(encrypted));
        System.out.println(tag + " PASS : " + DatUtils.encodeBase64Url(cryptoKeyBytes));
    }

    @Test
    public void test() {
        for (var algorithm : DatCryptoAlgorithm.getEntries()) {
            for (var i = 0; i < 20; i++) {
                unit(algorithm);
            }
        }
    }
}
