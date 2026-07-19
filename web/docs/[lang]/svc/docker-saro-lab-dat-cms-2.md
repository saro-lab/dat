
# DAT CMS

- {{t('dat_cms')}}

## API

#### {{t('cms_certs')}}

```shell
# generate certificate
curl -X POST http://localhost:8088/v1/cert

# get certificates
curl http://localhost:8088/v1/certs

# get certificates (verifying)
curl http://localhost:8088/v1/certs/verifying
```
#### {{t('cms_status')}}
```shell
curl http://localhost:8088/health
curl http://localhost:8088/version
curl http://localhost:8088/version/api
```
#### {{t('debug')}} ({{t('cms_debug_mode_only')}})
```shell
DAT=$(curl -s -X POST http://localhost:8088/debug/dat -d \
'plain data 평문 데이터
secure data 암호 데이터')

DAT_PARSE=$(curl -s http://localhost:8088/debug/dat/"$DAT")

echo "\n"
echo "====================================================="
echo "DAT:"
echo "-----------------------------------------------------"
echo "$DAT"
echo "====================================================="
echo "DAT Parse:"
echo "-----------------------------------------------------"
echo "$DAT_PARSE"
echo "====================================================="
```

## Docker
```shell
# Docker example
# Single Server
docker run -d --name dat-cms -p 8088:80 \
  -e SINGLE_SERVER="HMAC-SHA512-MFS,IV-AES256-GCM" \
  sarolab/dat-cms

# Podman example
# Single Server With Debug Mode
podman run -d --name dat-cms -p 8088:80 \
  -e SINGLE_SERVER="HMAC-SHA512-MFS,IV-AES256-GCM" \
  -e DEBUG=1 \
  sarolab/dat-cms
```

## {{t('cms_binary')}}
> https://github.com/saro-lab/dat-cms/releases
#### Linux, Mac
```shell
cp ./download-filename ./dat-cms
chmod +x dat-cms
export PORT=8088
export SINGLE_SERVER=CRON
# export DB_URI=postgresql://username:password@host:port/database
./dat-cms
```
#### Windows CMD
```shell
copy download-filename dat-cms.exe

set PORT=8088
set SINGLE_SERVER=CRON
:: set DB_URI=postgresql://username:password@host:port/database
dat-cms.exe
```
#### Windows PowerShell
```shell
cp download-filename dat-cms.exe

$env:PORT="8088"
# $env:DB_URI="postgresql://username:password@host:port/database"
$env:SINGLE_SERVER="CRON"
.\dat-cms.exe
```

## Kubernetes
```shell
vi dat.yml
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dat
  namespace: yournamespace
  labels:
    app: dat
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dat
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 100
  template:
    metadata:
      labels:
        app: dat
    spec:
      imagePullSecrets:
        - name: nexus-registry-secret
      containers:
        - name: publisher-cms
          image: sarolab/dat-cms:###VERSION###
          ports:
            - containerPort: 80
#          env:
#            - name: DB_URI
#              value: "postgresql://username:password@host-not-local:port/database"
          volumeMounts:
            - name: logs
              mountPath: /logs
          readinessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 80
            initialDelaySeconds: 30
            periodSeconds: 10
      terminationGracePeriodSeconds: 30
      volumes:
        - name: logs
          hostPath:
            path: /mnt/server/logs/prod
            type: DirectoryOrCreate
---
apiVersion: v1
kind: Service
metadata:
  name: dat
  namespace: yournamespace
  labels:
    app: dat
spec:
  selector:
    app: dat
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dat-cronjob
  namespace: yournamespace
spec:
  schedule: "*/10 * * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      backoffLimit: 0
      template:
        spec:
          containers:
            - name: curl-worker
              image: curlimages/curl:latest
              imagePullPolicy: IfNotPresent
              args:
                - /bin/sh
                - -c
                - "curl -X POST http://dat/cert"
          restartPolicy: Never
```

```
kubectl apply -f dat.yml
curl http://dat.yournamespace.svc.cluster.local/version 
```



## {{t('cms_opt_env')}}
- `HOSTNAME`
    - {{t('cms_opt_hostname_desc')}}
      `logs/dat-<HOSTNAME>.<yyyy-MM-dd>.log`
    - {{t('default')}}: localhost
- `PORT`
    - {{t('cms_opt_port_desc')}}
    - {{t('default')}}:
        - `RELEASE BUILD` 80
        - `DEBUG BUILD` 8088
- `DB_URI`
    - {{t('cms_opt_db_uri_desc')}}
    - {{t('cms_supported')}}:
        - `mysql` mysql://user:password@host:port/database
            - {{t('msg_mariadb')}}
        - `postgres` postgres://user:password@host:port/database
        - `sqlite` sqlite://path/to/database.db
    - {{t('default')}}: sqlite:./data/data.db
- `DEBUG (1, 0)`
    - {{t('cms_opt_debug_desc')}}
    - {{t('default')}}:
        - `RELEASE BUILD` 0
        - `DEBUG BUILD` 1
- `LOG_CONSOLE (1, 0)`
    - {{t('cms_opt_log_console_desc')}}
    - {{t('default')}}: 0 ({{t('cms_no_out')}})
- `LOG_FILE (TEXT, JSON)`
    - `logs/dat-<HOSTNAME>.<yyyy-MM-dd>.log`
    - {{t('cms_value')}}:
        - TEXT: {{t('cms_log_text_desc')}}
        - JSON: {{t('cms_log_json_desc')}}
    - {{t('default')}}: `<Empty>` ({{t('cms_no_log_file')}})
- `SINGLE_SERVER`
  > signature_algorithm, crypto_algorithm, cron, certificate_propagation_delay_seconds, dat_issuance_duration_seconds, dat_ttl_seconds<br/>
  {{t('cms_ex')}} HMAC-SHA512-MFS, IV-AES256-GCM<br/> 
  {{t('cms_ex')}} HMAC-SHA512-MFS, IV-AES256-GCM, 0 0/30 * * * *, 1200, 10800, 600<br/>
  
  [{{t('cms_k8s_multi_pods_example')}}](doc/k8s-example.yml)
    - `CRON`
        - {{t('cms_schedule')}}: `0 0/10 * * * *`
        - {{t('cms_set_default_value')}}: `CERT_GAP, ISSUE_DUR, DAT_TTL`
    - {{t('default')}}:
        - `RELEASE BUILD` `<Empty>` ({{t('cms_disabled')}})
        - `DEBUG BUILD` "HMAC-SHA512-MFS,IV-AES256-GCM,0 0/30 * * * *,1200,10800,600"

## {{t('see')}}
- Github: https://github.com/saro-lab/dat-cms




<script setup lang="ts">
import { onMounted } from 'vue';
import { findLibrary } from '../../.vitepress/src/libs';
import { useTranslate } from '../../.vitepress/src/langs';

const { t } = useTranslate();

const lib = findLibrary('Cargo', 'dat');
const ver = lib.version;

onMounted(() => {
    document.querySelectorAll('.language-yaml code .line > span').forEach(e => {
        if (e?.innerText?.indexOf('###VERSION###') > -1) {
            e.innerText = e.innerText.replace('###VERSION###', ver);
        }
    })
})
</script>


-- SINGLE_SERVER="CRON:0 0/10 * * * *,POST:/cert/HMAC-SHA512-MFS/IV-AES256-GCM/3600/222/111"