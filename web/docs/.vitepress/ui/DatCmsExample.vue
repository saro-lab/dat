<template>
  <div>
    <h1>{{t('dat_cms')}}</h1>
    <div class="text-sm font-bold">
      <a href="https://github.com/saro-lab/dat-cms" target="_blank">
        Github
      </a>
      /
      <a href="https://github.com/saro-lab/dat-cms/releases" target="_blank">
        {{t('download')}}
      </a>
    </div>
    <div class="mt-3 mb-0">
      <div class="font-bold mt-3 text-sm">{{t('server')}}</div>
      <div class="g-radio-group">
        <div v-for="oe in operatingEnvironmentList">
          <input type="radio" :id="`oe-${oe}`" name="oe" :value="oe" v-model="operatingEnvironment" @change="makeCode">
          <label :for="`oe-${oe}`">{{oe}}</label>
        </div>
      </div>
      <div class="g-radio-group">
        <div v-for="modeName in modeList">
          <input type="radio" :id="`modeName-${modeName}`" name="modeName" :value="modeName" v-model="mode" @change="makeCode">
          <label :for="`modeName-${modeName}`">{{t(modeName)}}</label>
        </div>
      </div>
      <div class="g-radio-group">
        <div v-for="logConsoleName in logConsoleList">
          <input type="radio" :id="`logConsoleName-${logConsoleName}`" name="logConsoleName" :value="logConsoleName" v-model="logConsole"  @change="makeCode">
          <label :for="`logConsoleName-${logConsoleName}`">Console {{logConsoleName}}</label>
        </div>
        <div v-for="logFileName in logFileList">
          <input type="radio" :id="`logFileName-${logFileName}`" name="logFileName" :value="logFileName" v-model="logFile"  @change="makeCode">
          <label :for="`logFileName-${logFileName}`">{{t('log_file')}} {{logFileName}}</label>
        </div>
      </div>
      <div v-if="!isKubernetes" class="flex">
        <input class="mt-3 mr-2" type="text" inputmode="numeric" :placeholder="`PORT (${t('default')}: 8088)`" v-model="port"  @input="makeCode"/>
        <input class="mt-3 flex-1" type="text" :placeholder="`HOSTNAME (${t('default')}: Auto)`" v-model="hostname"  @input="makeCode"/>
      </div>
    </div>

    <div v-if="isKubernetes" class="my-3">
      <div class="flex">
        <input class="mt-3 mr-2 flex-1" type="text" :placeholder="t('kube_namespace')" v-model="kubeNamespace"  @input="makeCode"/>
        <input class="mt-3" type="text" inputmode="numeric" :placeholder="`replicas (${t('default')}: 2)`" v-model="kubeReplicas"  @input="makeCode"/>
      </div>
      <LogBox v-model="logList"/>
    </div>

    <div v-if="(['Binary', 'Docker', 'Podman']).includes(operatingEnvironment)" class="mb-3 mt-1.5">
      <div class="g-radio-group">
        <div v-for="(bash, i) in binaryBashList">
          <input type="radio" :id="`bash-${bash}`" name="bash" :value="bash" v-model="binaryBash" @change="makeCode">
          <label :for="`bash-${bash}`">{{binaryBashNameList[i]}}</label>
        </div>
      </div>
    </div>


    <div>
      <CodeBox :lang="codeLang" :code="code" />
      <LogBox v-model="logList"/>
      <CodeBox class="mt-3" lang="bash" :code="curlCommand" />
    </div>

    <div class="my-3">
      <div class="font-bold mt-3 text-sm">{{t('db')}}</div>
      <div class="g-radio-group">
        <div v-for="(dbName, i) in dbList">
          <input type="radio" :id="`dbName-${dbName}`" name="dbName" :value="dbName" v-model="db"  @change="makeCode">
          <label :for="`dbName-${dbName}`">{{i == 0 ? t('none') : dbNameList[i]}}</label>
        </div>
      </div>
      <div v-if="db != ''">
        <div class="mt-3 ml-1 text-xs">
          {{t('see')}}: <a href="https://www.sea-ql.org/SeaORM/docs/install-and-config/connection/" target="_blank">SeaORM connection</a>
        </div>
        <div v-if="db == 'sqlite'">
          <input class="mt-3 w-full" type="text" :placeholder="t('sqlite_path')" v-model="dbFilePath" @input="makeCode" />
        </div>
        <div v-else>
          <div class="flex">
            <input class="mt-3 mr-2 flex-1" type="text" :placeholder="t('username')" v-model="dbUsername" @input="makeCode" />
            <input class="mt-3 flex-1" type="text"  :placeholder="t('password')" v-model="dbPassword" @input="makeCode" />
          </div>
          <div class="flex">
            <input class="mt-3 mr-2 flex-1" type="text" :placeholder="t('host')" v-model="dbHost" @input="makeCode" />
            <input class="mt-3 mr-2" type="text" inputmode="numeric" :placeholder="t('port')" v-model="dbPort" @input="makeCode" />
          </div>
          <div>
            <input class="mt-3 w-full" type="text" :placeholder="t('db')" v-model="dbDatabase" @input="makeCode" />
          </div>
        </div>
      </div>
      <div>
        <input class="mt-3 w-full" type="text" inputmode="numeric" :placeholder="`${t('api_cache')} (${t('default')}: 60)`" v-model="dbCacheSecs" @input="makeCode" />
      </div>
    </div>

    <div class="my-3">
      <div class="font-bold text-sm">{{t('cert')}}</div>
      <div class="pl-1">
        <div class="font-bold mt-3 text-sm">{{t('sig_alg')}}</div>
        <div class="g-radio-group">
          <div v-for="sa in signAlgList">
            <input type="radio" :id="`sa-${sa}`" name="sa" :value="sa" v-model="certSignAlg"  @change="makeCode">
            <label :for="`sa-${sa}`">{{sa}}</label>
          </div>
        </div>
        <div class="font-bold mt-3 text-sm">{{t('crypto_alg')}}</div>
        <div class="g-radio-group">
          <div v-for="ca in cryptoAlgList">
            <input type="radio" :id="`ca-${ca}`" name="ca" :value="ca" v-model="certCryptoAlg"  @change="makeCode">
            <label :for="`ca-${ca}`">{{ca}}</label>
          </div>
        </div>

        <div class="font-bold mt-4 text-sm">
          <span class="align-middle!">{{t('cert_issue_delay')}} ({{t('seconds')}})</span>
          <span translate="no" class="material-symbols-outlined text-lg! align-middle! ml-1 g-link" @click="showDetail = !showDetail">help</span>
        </div>
        <blockquote v-if="showDetail" class="my-1! py-3! text-xs leading-relaxed" v-html="help('cms_help_cert_issue_delay')"></blockquote>
        <div>
          <input class="mt-1 min-w-1/5 w-full" inputmode="numeric" type="text" :placeholder="propagationDelayDefault" v-model="propagationDelay" @input="makeCode" />
        </div>

        <div class="font-bold mt-4 text-sm">
          <span class="align-middle!">{{t('dat_issue_dur')}} ({{t('seconds')}})</span>
          <span translate="no" class="material-symbols-outlined text-lg! align-middle! ml-1 g-link" @click="showDetail = !showDetail">help</span>
        </div>
        <blockquote v-if="showDetail" class="my-1! py-3! text-xs leading-relaxed" v-html="help('cms_help_dat_issue_dur')"></blockquote>
        <div>
          <input class="mt-1 min-w-1/5 w-full" inputmode="numeric" type="text" :placeholder="datIssuanceDurationDefault" v-model="datIssuanceDuration" @input="makeCode" />
        </div>

        <div class="font-bold mt-4 text-sm">
          <span class="align-middle!">{{t('dat_ttl')}} ({{t('seconds')}})</span>
          <span translate="no" class="material-symbols-outlined text-lg! align-middle! ml-1 g-link" @click="showDetail = !showDetail">help</span>
        </div>
        <blockquote v-if="showDetail" class="my-1! py-3! text-xs leading-relaxed" v-html="help('cms_help_dat_ttl')"></blockquote>
        <div>
          <input class="mt-1 min-w-1/5 w-full" inputmode="numeric" type="text" :placeholder="datTtlDefault" v-model="datTtl" @input="makeCode" />
        </div>

        <div class="font-bold mt-4 text-sm">{{t('cert_cron')}}</div>
        <blockquote v-if="showDetail" class="my-1! py-3! text-xs leading-relaxed" v-html="help('cms_help_cert_cron')"></blockquote>
        <div class="flex">
          <input class="mt-1 flex-1" type="text" :placeholder="cronDefault" v-model="cron" @input="makeCode" />
        </div>
      </div>

    </div>

    <div class="my-3">
      <div class="font-bold mt-3 mb-2 text-sm">{{t('access_control')}}</div>
      <div class="pl-0.5">
        <div class="text-sm pl-1">{{t('master_token')}}: {{t('master_token_desc')}}</div>
        <input class="mt-1 w-full" type="text" :placeholder="t('alnum_only')" v-model="tokenMaster" @input="makeCode" />
        <div class="text-sm mt-3 pl-1">{{t('full_cert_token')}}: {{t('full_cert_token_desc')}}</div>
        <input class="mt-1 w-full" type="text" :placeholder="t('alnum_only')" v-model="tokenCertFull" @input="makeCode" />
        <div class="text-sm mt-3 pl-1">{{t('verify_cert_token')}}: {{t('verify_cert_token_desc')}}</div>
        <input class="mt-1 w-full" type="text" :placeholder="t('alnum_only')" v-model="tokenCertVerify" @input="makeCode" />
      </div>
    </div>



  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import { CronExpressionParser } from 'cron-parser';
import LogBox, {LogItem} from "./LogBox.vue";
import {
  DatCryptoAlgorithm, DatCryptoAlgorithms, DatSignatureAlgorithm, DatSignatureAlgorithms,
} from "saro-dat";
import CodeBox from "./CodeBox.vue";
import {useTranslate} from "../src/langs";
const {t} = useTranslate();
// help texts contain {key} placeholders that resolve to site-wide translations
const help = (key: string) => t(key).replace(/\{(\w+)\}/g, (_, k) => t(k));

const logList = ref<LogItem[]>([]);

const code = ref('');
const codeLang = ref('bash');
const curlCommand = ref('');

const operatingEnvironmentList = ['Kubernetes', 'Docker', 'Podman', 'Binary'];
const operatingEnvironment = ref(operatingEnvironmentList[1]);

const isKubernetes = computed(() => operatingEnvironment.value == operatingEnvironmentList[0]);
const kubeNamespace = ref('yournamespace');
const kubeReplicas = ref('2');


const binaryBashList = ['bash', 'ps', 'cmd'];
const binaryBashNameList = ['Linux & macOS', 'Windows (PowerShell)', 'Windows (CMD)'];
const binaryBash = ref(binaryBashList[0]);

const hostname = ref('');
const port = ref('');

const showDetail = ref(false);
const signAlgList = DatSignatureAlgorithms;
const cryptoAlgList = DatCryptoAlgorithms;
const certSignAlg = ref<DatSignatureAlgorithm>('HMAC-SHA512-MFS');
const certCryptoAlg = ref<DatCryptoAlgorithm>('IV-AES256-GCM');

const cronDefault = '0 0/30 * * * *';
const cron = ref(cronDefault);
const propagationDelayDefault = '1200';
const propagationDelay = ref(propagationDelayDefault);
const datIssuanceDurationDefault = '10800';
const datIssuanceDuration = ref(datIssuanceDurationDefault);
const datTtlDefault = '600';
const datTtl = ref(datTtlDefault);
const dbNameList = ['None', 'SQLite', 'PostgreSQL', 'MySQL', 'MariaDB'];
const dbList = ['', 'sqlite', 'postgres', 'mysql', 'mariadb'];
const db = ref(dbList[0]);
const dbUsername = ref('');
const dbPassword = ref('');
const dbHost = ref('');
const dbPort = ref('');
const dbDatabase = ref('');
const dbFilePath = ref('');
const dbCacheSecs = ref('');

const tokenMaster = ref('');
const tokenCertFull = ref('');
const tokenCertVerify = ref('');

const modeList = ['production', 'debug'];
const mode = ref(modeList[0]);
const logConsoleList = ['ON', 'OFF'];
const logConsole = ref(logConsoleList[0]);
const logFileList = ['OFF', 'TEXT', 'JSON'];
const logFile = ref('OFF');




async function makeCode() {
  logList.value = [];

  const options: string[] = [];

  const _env = operatingEnvironment.value.toLowerCase();
  const _isKube = isKubernetes.value;
  const _isDockerLike = _env == 'docker' || _env == 'podman';
  const _isBinary = _env == 'binary';
  const _isDebug = mode.value == 'debug';
  let _port = port.value.trim().replace('8088', '');
  if (_port != '' && !(Number(_port) >= 80 && Number(_port) < 65535)) {
    addError(`${t('ignored')}: ${t('err_invalid_port')}`);
    _port = '';
  }
  if (!_isKube) {
    if (hostname.value.trim()) {
      options.push(`HOSTNAME="${hostname.value.replace(/"/g, '').trim()}"`)
    }
    if (_isDockerLike) {

    } else {
      if (_port) {
        options.push(`PORT="${_port}"`)
      }
    }

  }
  if (_isDebug) {
    options.push(`DEBUG="1"`)
  }
  if (logConsole.value == "OFF") {
    options.push(`LOG_CONSOLE="0"`)
  }
  let _useLogFile = logFile.value != "OFF";
  if (_useLogFile) {
    options.push(`LOG_FILE="${logFile.value}"`)
  }

  let _db = db.value.toLowerCase();
  if (_db) {
    if (_db == 'mariadb') {
      _db = 'mysql';
      addInfo(t('msg_mariadb'));
    }
    let _dbUrl = `${_db}:`;
    if (_db == 'sqlite') {
      let _dbFilePath = dbFilePath.value.trim().replace(/[\s"'!@#$^&*]+/g, '');
      if (!_dbFilePath) {
        _dbFilePath = './data/data.db';
      }
      _dbUrl += _dbFilePath;
    } else {
      let _dbUsername = dbUsername.value.trim().replace(/["']+/g, '');
      let _dbPassword = dbPassword.value.trim().replace(/["']+/g, '');
      let _dbHost = dbHost.value.trim().replace(/["']+/g, '');
      let _dbPort = dbPort.value.trim();
      let _dbDatabase = dbDatabase.value.trim().replace(/["']+/g, '');

      if (!_dbUsername) {
        _dbUsername = 'username';
      }
      if (!_dbPassword) {
        _dbPassword = 'password';
      }
      if (!_dbHost) {
        _dbHost = 'localhost';
      }
      if (_dbPort != '' && !(Number(_dbPort) >= 80 && Number(_dbPort) < 65535)) {
        addError(`${t('ignored')}: ${t('err_invalid_db_port')}`);
        _dbPort = '';
      }
      if (!_dbPort) {
        if (_db == 'postgres') {
          _dbPort = '5432';
        } else if (_db == 'mysql') {
          _dbPort = '3306';
        }
      }
      if (!_dbDatabase) {
        _dbDatabase = 'database';
      }

      _dbUrl += `${encodeURIComponent(_dbUsername)}:${encodeURIComponent(_dbPassword)}@${encodeURIComponent(_dbHost)}:${_dbPort}/${encodeURIComponent(_dbDatabase)}`;
    }

    options.push(`DB_URI="${_dbUrl}"`);
  }
  let _dbCacheSecs = dbCacheSecs.value.trim();
  if (!!_dbCacheSecs) {
    if (Number(_dbCacheSecs) >= 0 && Number(_dbCacheSecs) < 3600) {
      options.push(`DB_CACHE_SECS="${_dbCacheSecs}"`)
    } else {
      addError(`${t('ignored')}: ${t('err_invalid_db_cache')} - ${t('default')}: 60`);
    }
  }

  let _tokenMaster = tokenMaster.value.trim();
  if (!!_tokenMaster) {
    if ((/^[a-z0-9]+$/i).test(_tokenMaster)) {
      options.push(`TOKEN_MASTER="${_tokenMaster}"`)
    } else {
      addError(`${t('ignored')}: ${t('err_invalid_token')} (${t('master_token')})`);
      _tokenMaster = '';
    }
  }
  let _tokenCertFull = tokenCertFull.value.trim();
  if (!!_tokenCertFull) {
    if ((/^[a-z0-9]+$/i).test(_tokenCertFull)) {
      options.push(`TOKEN_CERT_FULL="${_tokenCertFull}"`)
    } else {
      addError(`${t('ignored')}: ${t('err_invalid_token')} (${t('full_cert_token')})`);
      _tokenCertFull = '';
    }
  }
  let _tokenCertVerify = tokenCertVerify.value.trim();
  if (!!_tokenCertVerify) {
    if ((/^[a-z0-9]+$/i).test(_tokenCertVerify)) {
      options.push(`TOKEN_CERT_VERIFY="${_tokenCertVerify}"`)
    } else {
      addError(`${t('ignored')}: ${t('err_invalid_token')} (${t('verify_cert_token')})`);
      _tokenCertVerify = '';
    }
  }

  let _cron = cron.value.trim();
  let _sa = certSignAlg.value;
  let _ca = certCryptoAlg.value;
  if (!!_cron) {
    try {
      CronExpressionParser.parse(_cron)
    } catch (e) {
      addError(`${t('ignored')}: ${t('err_invalid_cron')}`);
      _cron = '';
    }
  }
  _cron = _cron || cronDefault;
  let _cronDelay = propagationDelay.value;
  if (_cronDelay.length) {
    if (!(Number(_cronDelay) >= 0 && !isNaN(Number(_cronDelay)))) {
      addError(`${t('ignored')}: ${t('err_invalid_delay')}`);
      _cronDelay = '';
    }
  }
  _cronDelay = _cronDelay.length ? _cronDelay : propagationDelayDefault;
  let _cronDur = datIssuanceDuration.value;
  if (_cronDur.length) {
    if (!(Number(_cronDur) >= 0 && !isNaN(Number(_cronDur)))) {
      addError(`${t('ignored')}: ${t('err_invalid_issue_dur')}`);
      _cronDur = '';
    }
  }
  _cronDur = _cronDur.length ? _cronDur : datIssuanceDurationDefault;
  let _cronDatTtl = datTtl.value;
  if (_cronDatTtl.length) {
    if (!(Number(_cronDatTtl) >= 0 && !isNaN(Number(_cronDatTtl)))) {
      addError(`${t('ignored')}: ${t('err_invalid_dat_ttl')}`);
      _cronDatTtl = '';
    }
  }
  _cronDatTtl = _cronDatTtl.length ? _cronDatTtl : datTtlDefault;

  if (!_isKube) {
    // CRON:0 0/10 * * * *,POST:/cert/HMAC-SHA512-MFS/IV-AES256-GCM/3600/222/111
    let singleNode = `${_sa},${_ca},${_cron},${_cronDelay},${_cronDur},${_cronDatTtl}`;
    options.push(`SINGLE_NODE="${singleNode}"`);
  }

  let _kubeNamespace = kubeNamespace.value.trim();
  if (_isKube) {
    let _kubeNamespace2 = _kubeNamespace.toLowerCase().replace(/[^a-z0-9\-]/g, '');
    if (_kubeNamespace != _kubeNamespace2) {
      _kubeNamespace = _kubeNamespace2;
      if (_kubeNamespace) {
        addError(`${t('err_invalid_kube_ns')} (a-z, 0-9, -)`);
      }
    }
    if (!_kubeNamespace) {
      _kubeNamespace = 'yournamespace';
      addError(`${t('ignored')}: ${t('err_invalid_kube_ns')} - ${t('default')}: yournamespace`);
    }
  }

  let curlAuthMaster = _tokenMaster ? `-H "Authorization: ${_tokenMaster}" ` : '';
  let curlAuthCertFull = _tokenCertFull ? `-H "Authorization: ${_tokenCertFull}" ` : '';
  let curlAuthCertVerify = _tokenCertVerify ? `-H "Authorization: ${_tokenCertVerify}" ` : '';
  let curlHost = `http://localhost:${_port || '8088'}`;
  if (_isKube) {
    curlHost = `http://dat.${_kubeNamespace}.svc.cluster.local`;
  }
  let _apiVer = 'v1';
  let curlPathGen = `/${_apiVer}/cert/${_sa}/${_ca}/${_cronDelay}/${_cronDur}/${_cronDatTtl}`;
  let _curlCommand = `# basic`;
  _curlCommand += `\ncurl ${curlHost}/health`;
  _curlCommand += `\ncurl ${curlAuthMaster}${curlHost}/version`;
  if (!_isKube) {
    _curlCommand += `\n\n# generate certificate`;
    _curlCommand += `\ncurl ${curlAuthMaster}-X POST ${curlHost}${curlPathGen}`;
  }
  _curlCommand += `\n\n# get certificate list`;
  _curlCommand += `\ncurl ${curlAuthCertFull}${curlHost}/${_apiVer}/certs`;
  _curlCommand += `\n# with version - to reduce network traffic`;
  _curlCommand += `\ncurl ${curlAuthCertFull}"${curlHost}/${_apiVer}/certs?version=0"`;
  _curlCommand += `\n# json`;
  _curlCommand += `\ncurl ${curlAuthCertFull}"${curlHost}/${_apiVer}/certs.json?version=0"`;
  if (_sa.startsWith('ECDSA-')) {
    _curlCommand += `\n\n# get certificate list (verify-only)`;
    _curlCommand += `\ncurl ${curlAuthCertVerify}${curlHost}/${_apiVer}/certs/verify-only`;
    _curlCommand += `\n# with version - to reduce network traffic`;
    _curlCommand += `\ncurl ${curlAuthCertVerify}"${curlHost}/${_apiVer}/certs/verify-only?version=0"`;
    _curlCommand += `\n# json`;
    _curlCommand += `\ncurl ${curlAuthCertVerify}"${curlHost}/${_apiVer}/certs/verify-only.json?version=0"`;
  }
  if (_isKube) {
    _curlCommand += `\n\n# kubernetes: manual generate certificate`;
    _curlCommand += `\nkubectl create job --from=cronjob/dat-cronjob dat-manual-run -n ${_kubeNamespace}`;
    _curlCommand += `\n\n# kubernetes: delete`;
    _curlCommand += `\n# kubectl delete deployment/dat service/dat cronjob/dat-cronjob -n ${_kubeNamespace}`;
  }
  curlCommand.value = _curlCommand;

  if (_isDockerLike) {
    codeLang.value = 'bash';
    let _bash = binaryBash.value;
    let _ln = `\\`;
    if (_bash === 'ps') {
      _ln = "`";
    } else if (_bash === 'cmd') {
      _ln = `^`;
    }
    let dockerOptions = options.map(e => `  -e ${e} ${_ln}\n`).join('');
    code.value = `${_env} run -d --name dat-cms -p ${_port || '8088'}:80 ${_ln}\n${dockerOptions}  sarolab/dat-cms`
  } else if (_isBinary) {
    codeLang.value = 'bash';
    let _bash = binaryBash.value;
    let _code = ``;
    if (_bash === 'bash') {
      _code = options.map(e => `${e} \\\n`).join('');
      _code += './dat-cms';
    } else if (_bash === 'ps') {
      codeLang.value = 'powershell';
      _code = options.map(e => `$env:${e}\n`).join('');
      _code += '.\\dat-cms.exe';
    } else if (_bash === 'cmd') {
      codeLang.value = 'bat';
      _code = options.map(e => `set ${e.replace(/"/g, '')}\n`).join('');
      _code += 'dat-cms.exe';
    }

    code.value = _code;
  } else if (isKubernetes) {
    let _kubeReplicas = kubeReplicas.value;
    if (!(Number(_kubeReplicas) > 0 && Number(_kubeReplicas) <= 12)) {
      addError(`${t('ignored')}: ${t('err_invalid_kube_replicas')} - ${t('default')}: 2`);
      _kubeReplicas = '2';
    }
    let curlInKube = `curl ${curlAuthMaster}-X POST http://dat${curlPathGen}`;
    codeLang.value = 'yaml';

    let volumeMounts = '';
    let volumes = '';
    if (_useLogFile) {
      volumeMounts = `\n#          volumeMounts:
#            - name: logs
#              mountPath: /logs`;
      volumes = `\n#      volumes:
#        - name: logs
#          hostPath:
#            path: /your-log-volume-path
#            type: DirectoryOrCreate`;
    }

    let k8sOptions = options.map(e => (
`\n            - name: ${e.split('=')[0]}
              value: ${e.split('=')[1]}`
    )).join('');
    k8sOptions = k8sOptions ? `\n          env:${k8sOptions}` : '';
    code.value = (`apiVersion: apps/v1
kind: Deployment
metadata:
  name: dat
  namespace: ${_kubeNamespace}
  labels:
    app: dat
spec:
  replicas: ${_kubeReplicas}
  selector:
    matchLabels:
      app: dat
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    metadata:
      labels:
        app: dat
    spec:
      imagePullSecrets:
        - name: nexus-registry-secret
      containers:
        - name: publisher-cms
          image: sarolab/dat-cms:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 80${k8sOptions}${volumeMounts}
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
      terminationGracePeriodSeconds: 30${volumes}
---
apiVersion: v1
kind: Service
metadata:
  name: dat
  namespace: ${_kubeNamespace}
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
  namespace: ${_kubeNamespace}
spec:
  schedule: "${_cron}"
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
                - "${curlInKube}"
          restartPolicy: Never`);
  }


}

function addError(msg: string) {
  logList.value.push(LogItem.error(msg));
}

function addInfo(msg: string) {
  logList.value.push(LogItem.info(msg));
}

onMounted(() => {
  let s = (location.search || '?').substring(1).split('&');
  if (s.indexOf('binary') != -1) {
    operatingEnvironment.value = operatingEnvironmentList[3];
  }
  makeCode();
});

</script>


<style scoped>
@reference 'tailwindcss';
@custom-variant light (&:where(html.light *));
@custom-variant dark (&:where(html.dark *));
@variant dark (&:where(.dark, .dark *));
.click-here-bg {
  animation: blink-red 0.3s ease-in-out 2;
}
@keyframes blink-red {
  50% { background-color: #e74c3c; }
}
.cert-group {
  > div {
    @apply p-1 text-xs font-normal border-2 box-border border-transparent cursor-pointer;
    span {
      @apply opacity-40 font-bold;
    }
    .warn {
      @apply text-[#e74c3c] font-bold;
    }
  }
  .sel {
    @apply border-[#3377ff33] bg-[#3377ff11]
    dark:border-[#00ff7733] dark:bg-[#00ff7711];
  }
}
blockquote b {
  @apply text-[#f33];
}
</style>
