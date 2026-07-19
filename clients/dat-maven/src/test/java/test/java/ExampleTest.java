package test.java;

import me.saro.dat.Unixtime;
import me.saro.dat.crypto.DatCryptoAlgorithm;
import me.saro.dat.dat.DatCertificate;
import me.saro.dat.dat.DatManager;
import me.saro.dat.dat.Payload;
import me.saro.dat.signature.DatSignatureAlgorithm;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

public class ExampleTest {

    @Test
    public void selfTest() {
        // Singleton Manager
        DatManager manager = DatManager.newInstance();

        long unixTime = Unixtime.now();

        DatCertificate certificate = DatCertificate.generate(
                0,
        unixTime - 10,
                200,
                100,
                DatSignatureAlgorithm.ECDSA_P256,
                DatCryptoAlgorithm.IV_AES128_GCM
        );

        manager.imports(List.of(certificate), false);


        // example data
        String plainData = "plain data 유니코드 !!! ABCD";
        String secureData = ">! secure data 암호화 데이터 @@@@";

        System.out.println("plain : " + plainData);
        System.out.println("secure : " + secureData);

        // issue dat
        String dat = manager.issue(plainData, secureData).getOrThrow();
        System.out.println("dat : " + dat);

        // parse dat
        Payload payload = manager.parse(dat).getOrThrow();

        String payloadPlain = payload.getPlain();
        String payloadSecure = payload.getSecure();

        System.out.println("payload plain : " + payloadPlain);
        System.out.println("payload secure : " + payloadSecure);

        assert plainData.equals(payloadPlain);
        assert secureData.equals(payloadSecure);
    }

    // @Test
    public void useDatCms() throws IOException, InterruptedException {
        // BEFORE: install dat-cms
        // See: https://dat.saro.me/svc/docker-saro-lab-dat-cms

        // Singleton Manager
        DatManager manager = DatManager.newInstance();

        // get certificate from dat-cms
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://localhost:8088/certificates"))
                .build();
        String body = client.send(request, HttpResponse.BodyHandlers.ofString()).body();
        System.out.println("get certificate :");
        System.out.println(body);

        // import certificate
        manager.imports(body, false);
        System.out.println("certificate " + manager.exportsIds().size() + " imported.");

        // example data
        String plainData = "plain data 유니코드 !!! ABCD";
        String secureData = ">! secure data 암호화 데이터 @@@@";

        System.out.println("plain : " + plainData);
        System.out.println("secure : " + secureData);

        // issue dat
        String dat = manager.issue(plainData, secureData).getOrThrow();
        System.out.println("dat : " + dat);

        // parse dat
        Payload payload = manager.parse(dat).getOrThrow();

        String payloadPlain = payload.getPlain();
        String payloadSecure = payload.getSecure();

        System.out.println("payload plain : " + payloadPlain);
        System.out.println("payload secure : " + payloadSecure);

        assert plainData.equals(payloadPlain);
        assert secureData.equals(payloadSecure);
    }


    //@Test
    public void useDatFormat() {


        // Singleton Manager
        DatManager manager = DatManager.newInstance();

        String format = "0.P256.I5P_FNPSCiQrw12CXj8qYkBH_v3wFYmXBtTpmED59bs.AES128GCMN.SVz-zzee5hz9OzEHxQgEaA.1.17781627851.1800\n" +
                "1.P256.mIA7RLJERhLD95pOpq9zxNLd98haUIbDzRR8IeWZA8c.AES128GCMN.6SnRhvQB3yh-PotQ8e_6nw.1.17781627851.1800\n" +
                "2.P256.wRS5kklcIMdUJpCixUA4_pZNpaI1X34DK2txUGPqjd0.AES128GCMN.mCEWOK2jOWzES7LnQJtczw.1.17781627851.1800\n" +
                "3.P256.YeX4JWaYQQh8HKctWsh6NuYtElCFRlRH1OyBOsGzdTM.AES128GCMN.42CSIN_0Zu-tpZqRvnMY7A.1.17781627851.1800\n" +
                "4.P256.9o5N5hd6m3xHwUQhESm2-ghz1zQM9F_KI3LGqIlvvoA.AES128GCMN.ePrjtPJr25dgopD6-TgJxg.1.17781627851.1800\n" +
                "5.P256.C9s4V_BWxxVtmoeIXsKcV4YKVmDdHcAWwVzvsEUzA0E.AES128GCMN.Kk0cQ9HLHWvfbJMAsKPXAg.1.17781627851.1800\n" +
                "6.P256.iEqgUQRHxmFJOT1rVGK9fGleGKSsbCDo6hK7EZxVExU.AES128GCMN.u6YbhAZ5L7d6r1W3oStBjA.1.17781627851.1800\n" +
                "7.P256.1hKGy6NQgrtvOBmb4YRZIJwoU1EPYTQPIDOkhBTx8PQ.AES128GCMN.MP0pBCEVCyeeyge6r1-VSw.1.17781627851.1800\n" +
                "8.P256.iOEL5ERwtTmmmp7A4sVhDkTedhi4e6F53wG2xDRDEoE.AES128GCMN.VgojardW72K2jkbqNafegw.1.17781627851.1800\n" +
                "9.P256.VPGAAvJhJ1KXkdPvz1AiWEHiCVR9u8KME0AOUso3-vI.AES128GCMN.Mfx6GnQZUzC0N4q0eB6PXQ.1.17781627851.1800";

        // import
        manager.imports(format, false);


        // example data
        String plainData = "plain data 유니코드 !!!";
        String secureData = ">! secure data 암호화 데이터";

        System.out.println("plain : " + plainData);
        System.out.println("secure : " + secureData);

        // to dat
        String dat = manager.issue(plainData, secureData).getOrThrow();
        System.out.println("dat : " + dat);

        // dat to payload
        Payload payload = manager.parse(dat).getOrThrow();

        String payloadPlain = payload.getPlain();
        String payloadSecure = payload.getSecure();

        System.out.println("payload plain : " + payloadPlain);
        System.out.println("payload secure : " + payloadSecure);

        assert plainData.equals(payloadPlain);
        assert secureData.equals(payloadSecure);
    }
}
