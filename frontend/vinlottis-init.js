import Vue from "vue";
import VueRouter from "vue-router";
import { routes } from "@/router.js";
import Vinlottis from "@/Vinlottis";

import * as Sentry from "@sentry/browser";
import { Vue as VueIntegration } from "@sentry/integrations";

import Toast from "@/plugins/Toast";
import store from "@/store";

Vue.use(VueRouter);

// Plugins
Vue.use(Toast);

const ENV = window.location.href.includes("localhost") ? "development" : "production";
if (ENV !== "development") {
  Sentry.init({
    dsn: "https://7debc951f0074fb68d7a76a1e3ace6fa@o364834.ingest.sentry.io/4905091",
    integrations: [new VueIntegration({ Vue })],
    beforeSend: event => {
      console.error(event);
      return event;
    }
  });
}

// Add global GA variables
window.ga =
  window.ga ||
  function() {
    window.ga.q = window.ga.q || [];
    window.ga.q.push(arguments);
  };
ga.l = 1 * new Date();

// Initiate
ga("create", __GA_TRACKINGID__, {
  allowAnchor: false,
  cookieExpires: __GA_COOKIELIFETIME__, // Time in seconds
  cookieFlags: "SameSite=Strict; Secure"
});
ga("set", "anonymizeIp", true); // Enable IP Anonymization/IP masking
ga("send", "pageview");

if (ENV == "development") window[`ga-disable-${__GA_TRACKINGID__}`] = true;

const router = new VueRouter({
  routes: routes
});

new Vue({
  el: "#app",
  router,
  store,
  components: { Vinlottis },
  template: "<Vinlottis/>",
  render: h => h(Vinlottis)
});
