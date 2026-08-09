import { localeCodes } from './locales'

export default {
  paths: () => localeCodes.map((lang) => ({ params: { lang } })),
}
