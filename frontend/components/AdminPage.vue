<template>
  <div>
    <Tabs :tabs="tabs" />
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import Tabs from "@/ui/Tabs";
import RegisterWinePage from "@/components/admin/RegisterWinePage";
import archiveLotteryPage from "@/components/admin/archiveLotteryPage";
import registerAttendeePage from "@/components/admin/registerAttendeePage";
import DrawWinnerPage from "@/components/admin/DrawWinnerPage";
import PushPage from "@/components/admin/PushPage";

export default {
  components: {
    Tabs
  },
  data() {
    return {

    };
  },
  created() {
    this.fetchAttendees();
    this.fetchWines();
    this.fetchWinners();
  },
  computed: {
    ...mapGetters("admin", [
      "attendees",
      "wines",
      "winners"
    ]),
    tabs() {
      return [
        {
          name: "Vin",
          component: RegisterWinePage,
          slug: "vin",
          counter: this.wines.length
        },
        {
          name: "Legg til deltakere",
          component: registerAttendeePage,
          slug: "attendees",
          counter: this.attendees.length
        },
        {
          name: "Trekk vinner",
          component: DrawWinnerPage,
          slug: "draw",
          counter: this.winners.length
        },
        {
          name: "Arkiver lotteri",
          component: archiveLotteryPage,
          slug: "reg",
          counter: null
        },
        {
          name: "Push meldinger",
          component: PushPage,
          slug: "push"
        }
      ]
    }
  },
  methods: {
    ...mapActions("admin", [
      "fetchAttendees",
      "fetchWines",
      "fetchWinners"
    ]),
  }
};
</script>

<style lang="scss">
@import "@/styles/media-queries";

.page-container {
  padding: 0 1.5rem 3rem;

  h1 {
    text-align: center;
  }

  @include desktop {
    max-width: 60vw;
    margin: 0 auto;
  }
}
</style>
