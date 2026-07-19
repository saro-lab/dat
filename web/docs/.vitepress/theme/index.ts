// https://vitepress.dev/guide/custom-theme
import Layout from './Layout.vue'
import type { Theme } from 'vitepress'
import './style.css'
import {watch} from "vue";
import { inBrowser } from 'vitepress'

export default {
  Layout,
  enhanceApp({ app, router, siteData }) {
      const win = inBrowser ? (window as any || null) : null;
      if (win) {
          win.dataLayer = win.dataLayer || [];
          win.gtag = function () {
              win.dataLayer.push(arguments);
          };
          win.gtag('js', new Date());
          win.gtag('config', 'G-N4K2L7KWJ9');

          watch(() => router.route.path, (to) => {
              win.gtag('event', 'page_view', {
                  page_title: document?.title || 'DAT',
                  page_location: location.href,
                  page_path: location.pathname
              });
          });
      }
  }
} satisfies Theme

