export type SharedLibraryGuideText = {
  binaryNote: string
  lifecycle: string
  apiPurposes: string[]
  parse?: string
  binary?: string
}

export type SharedGuideLocale = {
  libraryIndex: {
    title: string
    intro: string
    criteriaTitle: string
    criteriaBody: string
    flowTitle: string
    flowBody: string
  }
  library: {
    titleSuffix: string
    install: string
    quickTitle: string
    quickIntro: string
    stepTitle: string
    connectTitle: string
    connectBody: string
    issueTitle: string
    issueBody: string
    parseTitle: string
    parseBody: string
    functionsTitle: string
    functionHeader: string
    purposeHeader: string
    dataTitle: string
    plainBody: string
    secureBody: string
    payloadBody: string
    optionsTitle: string
    optionsBody: string
    formatsBody: string
    verifyTitle: string
    verifyBody: string
    lifecycleTitle: string
    errorsBefore: string
    errorsLink: string
    errorsAfter: string
  }
  guides: Record<string, SharedLibraryGuideText>
  cms: {
    introBefore: string
    specLink: string
    introAfter: string
    configTitle: string
    dockerTitle: string
    dockerBody: string
    databaseTitle: string
    databaseBody1: string
    databaseBody2: string
    rolesTitle: string
    roleHeaders: [string, string, string]
    roleRows: [[string, string], [string, string], [string, string]]
    rolesNote: string
    certificateTitle: string
    certificateBody: string
    clientTitle: string
    clientSteps: [string, string, string, string]
    libraryBefore: string
    libraryLink: string
    libraryAfter: string
    operationsTitle: string
    operationsItems: [string, string, string, string]
    kubernetesTitle: string
    kubernetesBody: string
  }
}
