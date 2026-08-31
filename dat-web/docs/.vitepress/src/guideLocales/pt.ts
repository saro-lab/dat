import type { SharedGuideLocale } from './types'

export const ptGuideLocale: SharedGuideLocale = {
  libraryIndex: {
    title: 'Bibliotecas',
    intro: 'Selecione o cliente DAT para a linguagem da sua aplicação. Todos os clientes usam as mesmas especificações de DAT e certificado e oferecem gerenciamento local de certificados e sincronização com o DAT CMS.',
    criteriaTitle: 'Como escolher',
    criteriaBody: 'Um serviço que emite DAT deve poder usar certificados completos. Um serviço que apenas verifica e descriptografa deve usar certificados ECDSA exclusivos para verificação e o papel verify-only do CMS.',
    flowTitle: 'Estrutura do guia',
    flowBody: 'Cada guia de biblioteca aborda instalação, o fluxo mais simples de emissão e verificação, conexão com o DAT CMS, política de sincronização, encerramento e tratamento de erros.',
  },
  library: {
    titleSuffix: 'Biblioteca',
    install: 'Instalação',
    quickTitle: 'Início rápido',
    quickIntro: 'Este fluxo completo obtém certificados do CMS, cria um DAT com dados JSON e o verifica.',
    stepTitle: 'Passo a passo',
    connectTitle: '1. Conectar ao CMS',
    connectBody: 'Um serviço emissor usa um token para certificados completos. A sincronização imediata na inicialização evita a emissão antes que os certificados estejam disponíveis.',
    issueTitle: '2. Emitir um DAT',
    issueBody: 'Este exemplo coloca JSON público em `plain` e informações protegidas do usuário em formato JSON em `secure`.',
    parseTitle: '3. Verificar um DAT',
    parseBody: '`parse` confere a expiração e a assinatura e depois descriptografa `secure`. Use apenas um payload retornado após uma verificação bem-sucedida.',
    functionsTitle: 'Funções principais',
    functionHeader: 'Função',
    purposeHeader: 'Finalidade',
    dataTitle: 'Áreas de dados',
    plainBody: 'bytes assinados, mas não criptografados.',
    secureBody: 'bytes criptografados.',
    payloadBody: 'confie nele somente depois que `parse` for bem-sucedido.',
    optionsTitle: 'Opções além de JSON',
    optionsBody: 'Os exemplos usam o conhecido JSON. Para um processamento mais rápido, dados binários podem evitar a serialização e o parse de JSON, além de reduzir o tamanho dos dados.',
    formatsBody: 'Armazene valores simples como texto ou coloque dados estruturados em formatos binários como Protobuf ou MessagePack em `plain` e `secure`.',
    verifyTitle: 'Serviços exclusivos para verificação',
    verifyBody: 'Um serviço que não emite DAT usa a opção verify-only e um token verify-only, e chama apenas `parse`.',
    lifecycleTitle: 'Encerramento e erros',
    errorsBefore: 'Use os ',
    errorsLink: 'códigos de erro e as classificações de nova tentativa',
    errorsAfter: ' em vez das mensagens de erro.',
  },
  guides: {
    rust: {
      binaryNote: 'Como `issue` atualmente aceita strings, codifique bytes arbitrários como Base64Url ou Hex e decodifique-os novamente após a verificação.',
      lifecycle: 'A tarefa de sincronização automática termina quando o último `Arc<DatCmsManager>` é descartado.',
      apiPurposes: ['Sincroniza os certificados imediatamente.', 'Cria um DAT com o certificado emissor atual.', 'Verifica um DAT e retorna seu payload.', 'Retorna o último erro de sincronização.'],
    },
    java: {
      binaryNote: 'O overload `ByteArray` armazena e recupera bytes diretamente sem um formato adicional.',
      lifecycle: '`DatCmsManager` implementa `AutoCloseable`; feche-o com `use` ou `close()`.',
      apiPurposes: ['Sincroniza os certificados imediatamente e informa falhas.', 'Cria um DAT e retorna um DatResult.', 'Verifica um DAT e retorna um Payload.', 'Retorna o último erro de sincronização em segundo plano.'],
    },
    javascript: {
      binaryNote: 'Passe um `Uint8Array` ou `ArrayBuffer` e recupere os bytes originais por `plainBytes` e `secureBytes`.',
      lifecycle: 'Chame `stop()` no encerramento para limpar timers e solicitações em andamento.',
      apiPurposes: ['Sincroniza os certificados imediatamente.', 'Cria uma string DAT de forma assíncrona.', 'Verifica um DAT e retorna um DatPayload.', 'Retorna o último erro de sincronização.'],
    },
    python: {
      binaryNote: 'Passe `bytes` diretamente e recupere-os por `plain_bytes` e `secure_bytes`.',
      lifecycle: 'Quando a sincronização automática estiver ativa, chame `stop()` no encerramento.',
      apiPurposes: ['Sincroniza os certificados imediatamente.', 'Cria uma string DAT.', 'Verifica um DAT e retorna um DatPayload.', 'Retorna o último erro de sincronização.'],
    },
    csharp: {
      binaryNote: 'Use o overload `byte[]`, além de `PlainBytes` e `SecureBytes`.',
      lifecycle: 'Use `await using` para liberar o gerenciador e a sincronização em segundo plano.',
      apiPurposes: ['Sincroniza os certificados imediatamente.', 'Cria uma string DAT.', 'Verifica um DAT e retorna um Payload.', 'Retorna o último erro de sincronização.'],
    },
    go: {
      binaryNote: 'Strings de Go podem conter bytes. Passe um slice de bytes como `string` e depois converta o resultado de volta para `[]byte`.',
      lifecycle: 'Quando a sincronização automática estiver ativa, use `defer cms.Close()` para garantir a limpeza.',
      apiPurposes: ['Sincroniza os certificados imediatamente.', 'Retorna uma string DAT e um erro.', 'Retorna um Payload verificado e um erro.', 'Retorna o último erro de sincronização.'],
    },
    ruby: {
      binaryNote: 'Passe strings binárias e recupere-as por `plain_bytes` e `secure_bytes`.',
      lifecycle: 'Quando a sincronização automática estiver ativa, chame `stop` para encerrar a thread em segundo plano.',
      apiPurposes: ['Sincroniza os certificados imediatamente.', 'Cria uma string DAT.', 'Verifica um DAT e retorna um DatPayload.', 'Retorna o último erro de sincronização.'],
    },
    c: {
      binaryNote: 'A API de emissão C atual aceita strings terminadas em NUL. Codifique bytes arbitrários como Base64Url ou Hex e leia o resultado usando os comprimentos do payload.',
      lifecycle: 'Libere `dat`, `payload` e `cms` com as respectivas funções de limpeza.',
      apiPurposes: ['Sincroniza os certificados imediatamente.', 'Aloca e retorna uma string DAT.', 'Aloca e retorna um payload verificado.', 'Retorna o último erro de sincronização.'],
      parse: `dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);
/* Use plain_bytes e secure_bytes com seus respectivos comprimentos. */`,
      binary: `/* Codifique primeiro os dados que contêm NUL, pois issue aceita strings C. */
const char *secure_hex = "00ff1080";
char *dat = NULL;
err = dat_cms_manager_issue(cms, "01", secure_hex, &dat);

dat_payload_t *payload = NULL;
err = dat_cms_manager_parse(cms, dat, &payload);`,
    },
  },
  cms: {
    introBefore: 'O DAT CMS cria certificados, armazena-os em um banco de dados e entrega os certificados adequados aos serviços emissores e verificadores. O comportamento do protocolo é descrito na ',
    specLink: 'especificação do DAT CMS',
    introAfter: '.',
    configTitle: 'Criar uma configuração de execução',
    dockerTitle: 'Executar com Docker',
    dockerBody: 'Execute o container como usuário não root. Ao usar SQLite, monte um diretório de dados com permissão de escrita. Forneça tokens e senhas do banco de dados por um mecanismo de injeção de secrets, não pelo histórico de comandos.',
    databaseTitle: 'Banco de dados',
    databaseBody1: 'Use `DB_URI` para configurar uma conexão SQLite, PostgreSQL ou MySQL. O MariaDB se conecta pelo protocolo MySQL. O CMS armazena em cache os resultados das consultas de certificados como um snapshot e continua servindo o último snapshot bem-sucedido quando uma atualização do armazenamento falha temporariamente.',
    databaseBody2: '`DB_CACHE_SECS` define o intervalo de atualização do snapshot, enquanto `DB_QUERY_TIMEOUT_SECS` limita as consultas de atualização. Se não existir um snapshot bem-sucedido e o armazenamento não puder ser lido, o serviço retorna `DAT_STORE_UNAVAILABLE`.',
    rolesTitle: 'Papéis de acesso',
    roleHeaders: ['Variável de ambiente', 'Permissão', 'Usado por'],
    roleRows: [
      ['Registrar certificados e obter a versão protegida', 'Operações'],
      ['Obter certificados completos', 'Serviços emissores de DAT'],
      ['Obter certificados exclusivos para verificação', 'Serviços de verificação e descriptografia'],
    ],
    rolesNote: 'Cada variável aceita tokens alfanuméricos separados por vírgulas. Se a lista de tokens de um papel estiver vazia, os endpoints desse papel serão abertos e um aviso será registrado.',
    certificateTitle: 'Geração de certificados',
    certificateBody: 'O papel master registra um certificado especificando o algoritmo de assinatura, o algoritmo de criptografia, o atraso de propagação, o período de emissão e o TTL. Durante o atraso de propagação, os serviços sincronizam o novo certificado antes que ele possa emitir.',
    clientTitle: 'Integração do cliente',
    clientSteps: [
      'Use o token completo e o endpoint de certificados completos nos serviços emissores.',
      'Use o token de verificação e a opção verify-only nos serviços verificadores.',
      'Confira o resultado da primeira sincronização; se a inicialização tiver de falhar, chame a API de sincronização imediata.',
      'Quando a sincronização automática estiver ativa, feche o gerenciador durante o encerramento da aplicação.',
    ],
    libraryBefore: 'Consulte os ',
    libraryLink: 'guias das bibliotecas',
    libraryAfter: ' para ver o builder e o comportamento de encerramento de cada linguagem.',
    operationsTitle: 'Verificações operacionais',
    operationsItems: [
      '`/health` e `/version/api` informam o status sem autenticação.',
      '`/version` exige o master token quando esse papel está configurado.',
      'Colete os logs da saída padrão e da saída de erro padrão.',
      'Encaminhe os sinais de encerramento e dê tempo para o banco de dados e o scheduler fecharem.',
    ],
    kubernetesTitle: 'Kubernetes',
    kubernetesBody: 'Ajuste a porta do container e as probes à porta do serviço, e monte o diretório de dados com acesso de escrita para o usuário não root. Injete tokens e detalhes da conexão com o banco de dados por Secrets.',
  },
}
