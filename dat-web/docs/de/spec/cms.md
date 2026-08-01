# CMS-Synchronisierung und Zertifikatsbetrieb

## 1. Überblick

Der **DAT CMS (Certificate Management Service)** ist der Server, der die clusterweit gemeinsam genutzten Zertifikate erzeugt und verteilt.

Jede Anwendung bezieht über den CMS-Client (`DatCmsManager`) regelmäßig die Zertifikatsliste; diese Synchronisierung **automatisiert das Key-Rolling**. Auch ohne dass ein Betreiber Schlüssel manuell austauscht, werden Zertifikate nach einem festen Zeitplan neu erzeugt, und alte laufen von selbst ab.

<ArchFlow
    :user="{label: 'Nutzer', icon: 'person'}"
    :cms="{label: 'DAT CMS', icon: 'workspace_premium', note: ['Zertifikate je Gültigkeitsfenster', 'Abgelaufene werden aufgeräumt']}"
    :service="{servers: [
        {label: 'Login-Server', kind: 'issuer', icon: 'login',
         request: 'Anmeldeanfrage', response: 'Stellt DAT mit Zertifikat aus', sync: 'Sync der ausstellenden Zertifikate'},
        {label: 'Content-Server', kind: 'verifier', icon: 'apps',
         request: 'Inhaltsanfrage mit DAT', response: 'Prüft DAT und liefert aus', sync: 'Sync der reinen Prüfzertifikate'},
    ]}"
/>

Nur der Login-Server erhält Zertifikate, mit denen er ausstellen darf; die Content-Server erhalten reine Prüfzertifikate. **Ein Content-Server muss nur das CMS kennen und braucht den Login-Server nicht zu kennen.**

---

## 2. Synchronisierungsprotokoll

### 2.1. Anfrage und Antwort

<FlowDiagram
    title="Ein Synchronisierungszyklus"
    :legend="{req: 'Anfrage', res: 'Antwort', sync: 'Zertifikatssynchronisierung'}"
    :actors="[
        {id: 'app', label: 'Anwendung', kind: 'issuer'},
        {id: 'cms', label: 'DAT CMS', kind: 'cms'},
    ]"
    :steps="[
        {from: 'app', label: 'vorhandene version = N', kind: 'note'},
        {from: 'app', to: 'cms', label: 'GET /v1/certs?version=N (Authorization: Token)', kind: 'req'},
        {from: 'cms', label: 'Server-version = M, Zertifikate neuer als N auswählen', kind: 'note'},
        {from: 'cms', to: 'app', label: 'Zeile 1: M / ab Zeile 2: Zertifikatsliste', kind: 'res'},
        {from: 'app', label: 'Ist die Liste leer, version beibehalten und beenden', kind: 'note'},
        {from: 'app', label: 'version = M nur bei erfolgreichem import(clear = true)', kind: 'note'},
    ]"
/>

| Endpunkt | Zweck |
| --- | --- |
| `GET /v1/certs?version=N` | Vollständige Zertifikate (inkl. privatem Signaturschlüssel) |
| `GET /v1/certs/verify-only?version=N` | Zertifikate ausschließlich zur Verifizierung |
| `GET /v1/certs.json`, `/v1/certs/verify-only.json` | Derselbe Inhalt im JSON-Format |
| `POST /v1/cert/{sig-alg}/{crypto-alg}/{delay}/{duration}/{ttl}` | Zertifikat manuell erzeugen (Master-Token erforderlich) |
| `GET /health` | Statusprüfung |

Der Antwortkörper ist Klartext: **die erste Zeile enthält die aktuelle version des Servers**, ab der zweiten Zeile folgt pro Zeile ein Zertifikat.

```
1712345678
1a.1712345000.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
2b.1712348600.3600.1800.ECDSA-P256.IV-AES256-GCM.<sig-key>.<crypto-key>
```

### 2.2. Versionscursor

Der Client merkt sich die zuletzt erfolgreich verarbeitete version und sendet sie mit der nächsten Anfrage mit. Der Server wählt nur die Zertifikate aus, die neuer als dieser Wert sind, und gibt sie zurück.

* Liegt die version des Clients **hinter der des Servers** → es werden nur die danach entstandenen Zertifikate zurückgegeben.
* Liegt die version des Clients **vor der des Servers** (Serverwechsel, DB-Initialisierung usw.) → der Cursor wird auf `0` zurückgesetzt und der **vollständige Satz** zurückgegeben.
* Der Client rückt die version **nur dann vor, wenn der Import erfolgreich war.** So wird verhindert, dass der Cursor durch eine fehlgeschlagene Antwort weiterrückt und Zertifikate dauerhaft verloren gehen.

::: tip Inkrementelle Anfrage, aber vollständiger Austausch in der Antwort
`?version=N` bedeutet „gib mir die Änderungen seit N", der Client jedoch **führt die erhaltene Liste nicht mit der bestehenden zusammen, sondern ersetzt sie (clear = true)**. Der Server ermittelt stets die Gesamtheit der gültigen Zertifikate und liefert sie aus; dank dieses Vorgehens bleibt ein im CMS zurückgezogenes (revoked) Zertifikat nicht beim Client zurück.
:::

### 2.3. Zugriffstoken

Das CMS unterteilt den Zugriff über drei Arten von Token.

| Token | Berechtigung |
| --- | --- |
| `{{t('master_token')}}` | {{t('master_token_desc')}} |
| `{{t('full_cert_token')}}` | {{t('full_cert_token_desc')}} |
| `{{t('verify_cert_token')}}` | {{t('verify_cert_token_desc')}} |

Grundsätzlich sollte einem Server, der nur verifiziert, ausschließlich das Verify-Cert-Token gegeben werden. Da der Verschlüsselungsschlüssel jedoch auch in der verify-only-Antwort enthalten ist, beachten Sie dazu bitte zusätzlich die Warnhinweise im Dokument [{{t('menu_spec_cert')}}](./dat-certificate#_5-verify-only-export).

---

## 3. Ausstellungsverzögerung von Zertifikaten (delay)

Wird ein neu erzeugtes Zertifikat sofort zur Ausstellung verwendet, kann ein anderer Knoten, der noch nicht synchronisiert hat, die damit signierten Tokens nicht verifizieren. Die **Ausstellungsverzögerung** ist der Wert, der dieses Zeitfenster beseitigt.

<CertTimeline
    title="Wozu der Verzögerungsabschnitt dient"
    caption="Während des Verzögerungsabschnitts holen alle Knoten das Zertifikat ab; erst danach beginnt die Ausstellung."
    :marks="['Erzeugung', 'Beginn der Ausstellung', 'Ende der Ausstellung', 'Endgültiger Ablauf']"
    :phases="[
        {label: 'Ausstellungsverzögerung', weight: 1.2, kind: 'delay', note: 'Warten auf die Synchronisierung aller Knoten'},
        {label: 'Ausstellung möglich', weight: 3, kind: 'issue', note: 'Ausstellung + Verifizierung'},
        {label: 'DAT TTL', weight: 1.5, kind: 'ttl', note: 'Nur Verifizierung'},
    ]"
/>

Nehmen wir beispielsweise an, das CMS erzeugt Zertifikat A und Server 1 und 2 synchronisieren im Abstand von 60 Sekunden. Holt Server 1 es zuerst ab und stellt mit A ein DAT aus, während Server 2 es noch nicht erhalten hat, kann Server 2 dieses DAT nicht verifizieren.

Setzt man die Verzögerung auf 180 Sekunden, bleibt das Zertifikat nach seiner Erzeugung 180 Sekunden lang nicht ausstellungsfähig, und in dieser Zeit schließen alle Server ihre Synchronisierung sicher ab. Mit Blick auf zeitweilige Netzwerkstörungen wird empfohlen, den Wert **mindestens drei- bis viermal so groß** wie das Synchronisierungsintervall der einzelnen Server zu wählen.

---

## 4. Beabsichtigtes Verhalten

Die folgenden Verhaltensweisen sind allesamt **so beabsichtigt** und keine Fehler. Da sie im Betrieb von den Erwartungen abweichen können, werden sie hier ausdrücklich festgehalten.

### 4.1. Auch nach Schließung des Ausstellungsfensters wird weiter mit dem zwischengespeicherten Zertifikat signiert

Die Anwendung verwendet weiterhin das zum Zeitpunkt der Synchronisierung gewählte Ausstellungszertifikat und prüft nicht bei jeder Ausstellung erneut `issuable()`.

**Grund:** Schließt sich das Ausstellungsfenster, während die Verbindung zum CMS unterbrochen ist, würde bei erneuter Prüfung in diesem Moment **die Anmeldung im gesamten Dienst stehen bleiben.** DAT hat sich hier für „auch ohne neues Zertifikat wird zunächst weiter ausgestellt" entschieden.

**Preis:** Zieht sich eine Netzwerkstörung in die Länge, können weiterhin Tokens mit einem Zertifikat ausgegeben werden, dessen Ausstellungsfenster bereits abgelaufen ist. Da diese Tokens jedoch bis zum endgültigen Ablauf des Zertifikats auf anderen Knoten normal verifiziert werden, wurde dieser Kompromiss dem Ausfall des Dienstes im Störungsfall vorgezogen.

### 4.2. Ein unter derselben CID erneuertes Zertifikat wird verworfen

Trifft ein Zertifikat mit einer CID ein, die bereits vorhanden ist, wird **das neu eingetroffene ignoriert**.

**Grund:** Die CID ist der unveränderliche Bezeichner eines Zertifikats. Zeigt dieselbe CID auf unterschiedliche Schlüssel, lässt sich für bereits ausgestellte und im Umlauf befindliche Tokens nicht mehr feststellen, mit welchem Schlüssel sie verifiziert werden müssen.

::: warning Schlüsselwechsel immer mit neuer CID
Wird bei gleichbleibender CID nur der Schlüssel ausgetauscht und verteilt, **kommt dies beim Client niemals an, und es tritt auch kein Fehler auf.** Stellen Sie beim Schlüsselwechsel ein Zertifikat mit neuer CID aus.
:::

### 4.3. Gibt es keine neuen Zertifikate, bleibt die bestehende Liste erhalten

Enthält die Antwort kein einziges Zertifikat, **lässt der Client seine Liste unverändert.** Er leert sie nicht.

**Grund:** Würde man im schlimmsten Moment — der Zertifikatsserver ist ausgefallen oder die Antwort ist fehlerhaft — die vorhandenen Zertifikate löschen, würden augenblicklich **alle Token-Verifizierungen fehlschlagen**. Kommt nichts Neues an, ist es sicherer, mit dem Bestehenden weiterzuarbeiten.

### 4.4. Im Modus SINGLE_NODE wird bei jedem Start ein Zertifikat erzeugt

Läuft das CMS im Einzelknotenmodus, **erzeugt es bei jedem Start ein Zertifikat**, unabhängig davon, ob bereits ein ausstellungsfähiges Zertifikat existiert.

**Grund:** Der Einzelknotenmodus dient dazu, das CMS ohne zusätzliche Infrastruktur eigenständig zu betreiben. Unmittelbar nach dem Start muss daher ein ausstellungsfähiges Zertifikat vorhanden sein.

**Hinweis:** Bei wiederholten Neustarts sammeln sich die Zertifikate an. Da jedes Zertifikat nach Überschreiten seiner Ablaufzeit jedoch aus der Liste fällt, wächst deren Zahl nicht unbegrenzt.

### 4.5. Existiert kein ausstellungsfähiges Zertifikat, wird ohne Verzögerung sofort ausgestellt

Existiert zum Zeitpunkt der Zertifikatserzeugung kein einziges ausstellungsfähiges Zertifikat, **überspringt das CMS den Verzögerungsabschnitt** und schlägt die Verzögerungszeit dem Ausstellungszeitraum zu.

**Grund:** Würde die Verzögerung eingehalten, könnte der gesamte Cluster während dieser Zeit kein einziges Token ausstellen. Beim Erststart oder bei der Wiederherstellung nach einem Totalausfall muss sofort ausgestellt werden können. In diesem Fall wird eine Warnung im Serverprotokoll hinterlassen.

---

## 5. Rückzug und Ablauf von Zertifikaten

* Ein Zertifikat bleibt **bis zum Zeitpunkt seines endgültigen Ablaufs (`start + duration + ttl`)** in der Verteilungsliste. Es verschwindet nicht schon dann, wenn das Ausstellungsfenster schließt.
* Ein kurz vor Ende des Ausstellungsfensters ausgegebenes DAT lebt noch um seine TTL weiter; deshalb kann auch ein Verifizierungsserver, der erst nach diesem Zeitpunkt erstmals startet, das Zertifikat beziehen und dieses Token verifizieren.
* Ein Zertifikat, dessen endgültiger Ablauf überschritten ist, fällt aus der Liste und wird bei der anschließenden Aufräumarbeit auch aus dem Speicher entfernt.

---

## 6. Bereitstellung

Die Ausführungsoptionen des CMS-Servers, die Bereitstellung per Docker, Kubernetes und Binärdatei sowie die Umgebungsvariablen werden in einem eigenen Dokument behandelt.

- [{{t('menu_svc_cms')}} Bereitstellungsanleitung](../svc/docker-saro-lab-dat-cms)

<script setup lang="ts">
import {useTranslate} from "../../.vitepress/src/langs";
import ArchFlow from "../../.vitepress/ui/ArchFlow.vue";
import FlowDiagram from "../../.vitepress/ui/FlowDiagram.vue";
import CertTimeline from "../../.vitepress/ui/CertTimeline.vue";
const {t} = useTranslate();
</script>
