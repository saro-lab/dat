const fallbackLocaleCodes: string[] = []

export default {
  paths: () => fallbackLocaleCodes.map((lang) => ({ params: { lang } })),
}
