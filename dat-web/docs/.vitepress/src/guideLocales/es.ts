import type { SharedGuideLocale } from './types'

export const esGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: 'Bibliotecas',
    intro: 'Selecciona el cliente DAT correspondiente al lenguaje de tu aplicación. Todos los clientes usan las mismas especificaciones de DAT y certificados, y ofrecen gestión local de certificados y sincronización con DAT CMS.',
    criteriaTitle: 'Cómo elegir',
    criteriaBody: 'Un servicio que emite DAT debe poder usar certificados completos. Un servicio que solo verifica y descifra debe usar certificados ECDSA exclusivos para verificación y el rol verify-only de CMS.',
    flowTitle: 'Estructura de las guías',
    flowBody: 'Cada guía de biblioteca explica la instalación, el flujo más sencillo de emisión y verificación, la conexión a DAT CMS, la política de sincronización, el cierre y el tratamiento de errores.',
  },
  library: {
    titleSuffix: 'Biblioteca',
    install: 'Instalación',
    quickTitle: 'Inicio rápido',
    quickIntro: 'Este flujo completo obtiene certificados de CMS, crea un DAT con datos JSON y lo verifica.',
    stepTitle: 'Paso a paso',
    connectTitle: '1. Conectar con CMS',
    connectBody: 'Un servicio emisor usa un token para certificados completos. La sincronización inmediata al iniciar evita emitir antes de que los certificados estén disponibles.',
    issueTitle: '2. Emitir un DAT',
    issueBody: 'Este ejemplo guarda JSON público en `plain` e información protegida del usuario en formato JSON en `secure`.',
    parseTitle: '3. Verificar un DAT',
    parseBody: '`parse` comprueba la caducidad y la firma, y después descifra `secure`. Usa únicamente el payload devuelto tras una verificación correcta.',
    functionsTitle: 'Funciones principales',
    functionHeader: 'Función',
    purposeHeader: 'Propósito',
    dataTitle: 'Áreas de datos',
    plainBody: 'bytes firmados pero no cifrados.',
    secureBody: 'bytes cifrados.',
    payloadBody: 'confía en él únicamente cuando `parse` termine correctamente.',
    optionsTitle: 'Opciones además de JSON',
    optionsBody: 'Los ejemplos usan el conocido formato JSON. Para procesar más rápido, los datos binarios pueden evitar la serialización y el análisis de JSON, además de reducir el tamaño de los datos.',
    formatsBody: 'Guarda valores simples como texto o coloca datos estructurados en formatos binarios como Protobuf o MessagePack dentro de `plain` y `secure`.',
    verifyTitle: 'Servicios exclusivos para verificación',
    verifyBody: 'Un servicio que no emite DAT usa la opción verify-only y un token verify-only, y solo llama a `parse`.',
    lifecycleTitle: 'Cierre y errores',
    errorsBefore: 'Usa los ',
    errorsLink: 'códigos de error y las clasificaciones de reintento',
    errorsAfter: ' en lugar de los mensajes de error.',
  },
  guides: {
    rust: {
      binaryNote: 'Como `issue` acepta actualmente strings, codifica los bytes arbitrarios como Base64Url o Hex y vuelve a decodificarlos después de la verificación.',
      lifecycle: 'La tarea de sincronización automática termina cuando se libera el último `Arc<DatCmsManager>`.',
      apiPurposes: ['Sincroniza los certificados inmediatamente.', 'Crea un DAT con el certificado emisor actual.', 'Verifica un DAT y devuelve su payload.', 'Devuelve el último error de sincronización.'],
    },
    java: {
      binaryNote: 'La sobrecarga `ByteArray` guarda y recupera bytes directamente sin un formato adicional.',
      lifecycle: '`DatCmsManager` implementa `AutoCloseable`; ciérralo con `use` o `close()`.',
      apiPurposes: ['Sincroniza los certificados inmediatamente e informa de cualquier fallo.', 'Crea un DAT y devuelve un DatResult.', 'Verifica un DAT y devuelve un Payload.', 'Devuelve el último error de sincronización en segundo plano.'],
    },
    javascript: {
      binaryNote: 'Pasa un `Uint8Array` o `ArrayBuffer` y recupera los bytes originales mediante `plainBytes` y `secureBytes`.',
      lifecycle: 'Llama a `stop()` al cerrar para liberar temporizadores y solicitudes en curso.',
      apiPurposes: ['Sincroniza los certificados inmediatamente.', 'Crea una string DAT de forma asíncrona.', 'Verifica un DAT y devuelve un DatPayload.', 'Devuelve el último error de sincronización.'],
    },
    python: {
      binaryNote: 'Pasa `bytes` directamente y recupéralos mediante `plain_bytes` y `secure_bytes`.',
      lifecycle: 'Cuando la sincronización automática esté activa, llama a `stop()` al cerrar.',
      apiPurposes: ['Sincroniza los certificados inmediatamente.', 'Crea una string DAT.', 'Verifica un DAT y devuelve un DatPayload.', 'Devuelve el último error de sincronización.'],
    },
    csharp: {
      binaryNote: 'Usa la sobrecarga `byte[]`, junto con `PlainBytes` y `SecureBytes`.',
      lifecycle: 'Usa `await using` para liberar el gestor y la sincronización en segundo plano.',
      apiPurposes: ['Sincroniza los certificados inmediatamente.', 'Crea una string DAT.', 'Verifica un DAT y devuelve un Payload.', 'Devuelve el último error de sincronización.'],
    },
    go: {
      binaryNote: 'Las strings de Go pueden contener bytes. Pasa un segmento de bytes como `string` y vuelve a convertir el resultado a `[]byte`.',
      lifecycle: 'Cuando la sincronización automática esté activa, usa `defer cms.Close()` para garantizar la liberación.',
      apiPurposes: ['Sincroniza los certificados inmediatamente.', 'Devuelve una string DAT y un error.', 'Devuelve un Payload verificado y un error.', 'Devuelve el último error de sincronización.'],
    },
    ruby: {
      binaryNote: 'Pasa strings binarias y recupéralas mediante `plain_bytes` y `secure_bytes`.',
      lifecycle: 'Cuando la sincronización automática esté activa, llama a `stop` para detener el hilo en segundo plano.',
      apiPurposes: ['Sincroniza los certificados inmediatamente.', 'Crea una string DAT.', 'Verifica un DAT y devuelve un DatPayload.', 'Devuelve el último error de sincronización.'],
    },
    c: {
      binaryNote: 'La API de emisión C actual acepta strings terminadas en NUL. Codifica bytes arbitrarios como Base64Url o Hex y lee el resultado usando las longitudes del payload.',
      lifecycle: 'Libera `dat`, `payload` y `cms` con sus respectivas funciones de limpieza.',
      apiPurposes: ['Sincroniza los certificados inmediatamente.', 'Asigna y devuelve una string DAT.', 'Asigna y devuelve un payload verificado.', 'Devuelve el último error de sincronización.'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* Usa plain_bytes y secure_bytes con sus respectivas longitudes. */`,
      binary: `/* Codifica primero los datos que contienen NUL, porque issue acepta strings de C. */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'DAT CMS crea certificados, los almacena en una base de datos y entrega los certificados adecuados a los servicios emisores y verificadores. El comportamiento del protocolo se describe en la ',
    specLink: 'especificación de DAT CMS',
    introAfter: '.',
    configTitle: 'Crear una configuración de ejecución',
    dockerTitle: 'Ejecutar con Docker',
    dockerBody: 'Ejecuta el contenedor como usuario no root. Si usas SQLite, monta un directorio de datos con permiso de escritura. Proporciona los tokens y las contraseñas de la base de datos mediante un mecanismo de inyección de secretos, no mediante el historial de comandos.',
    databaseTitle: 'Base de datos',
    databaseBody1: 'Usa `DB_URI` para configurar una conexión SQLite, PostgreSQL o MySQL. MariaDB se conecta mediante el protocolo MySQL. CMS almacena en caché los resultados de las consultas de certificados como una instantánea y sigue sirviendo la última instantánea correcta si falla temporalmente una actualización del almacén.',
    databaseBody2: '`DB_CACHE_SECS` establece el intervalo de actualización de la instantánea y `DB_QUERY_TIMEOUT_SECS` limita las consultas de actualización. Si no existe ninguna instantánea correcta y no puede leerse el almacén, el servicio devuelve `DAT_STORE_UNAVAILABLE`.',
    rolesTitle: 'Roles de acceso',
    roleHeaders: ['Variable de entorno', 'Permiso', 'Usado por'],
    roleRows: [
      ['Registrar certificados y obtener la versión protegida', 'Operaciones'],
      ['Obtener certificados completos', 'Servicios emisores de DAT'],
      ['Obtener certificados exclusivos para verificación', 'Servicios de verificación y descifrado'],
    ],
    rolesNote: 'Cada variable acepta tokens alfanuméricos separados por comas. Si la lista de tokens de un rol está vacía, sus endpoints quedan abiertos y se registra una advertencia.',
    certificateTitle: 'Generación de certificados',
    certificateBody: 'El rol master registra un certificado indicando el algoritmo de firma, el algoritmo de cifrado, el retraso de propagación, el periodo de emisión y el TTL. Durante el retraso de propagación, los servicios sincronizan el certificado nuevo antes de que pueda emitir.',
    clientTitle: 'Integración del cliente',
    clientSteps: [
      'Usa el token completo y el endpoint de certificados completos para los servicios emisores.',
      'Usa el token de verificación y la opción verify-only para los servicios verificadores.',
      'Comprueba el resultado de la primera sincronización; si el inicio debe fallar, llama a la API de sincronización inmediata.',
      'Cuando la sincronización automática esté activa, cierra el gestor al finalizar la aplicación.',
    ],
    libraryBefore: 'Consulta las ',
    libraryLink: 'guías de las bibliotecas',
    libraryAfter: ' para conocer el builder y el cierre de cada lenguaje.',
    operationsTitle: 'Comprobaciones operativas',
    operationsItems: [
      '`/health` y `/version/api` informan del estado sin autenticación.',
      '`/version` exige el master token si ese rol está configurado.',
      'Recopila los registros de la salida estándar y la salida de error estándar.',
      'Reenvía las señales de cierre y deja tiempo para que la base de datos y el scheduler se cierren.',
    ],
    kubernetesTitle: 'Kubernetes',
    kubernetesBody: 'Ajusta el puerto del contenedor y los probes al puerto del servicio, y monta el directorio de datos con permiso de escritura para el usuario no root. Inyecta los tokens y los datos de conexión a la base de datos mediante Secrets.',
  },
}
