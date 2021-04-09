<template>
  <div class="page-container">
    <h1>Legg til deltaker</h1>

    <div class="attendee-registration-container">
      <div class="row flex">
        <div class="label-div">
          <label for="name" ref="name">Navn</label>
          <input id="name" type="text" placeholder="Navn" v-model="name" />

          <ul class="autocomplete" v-if="autocompleteAttendees.length">
            <a
              v-for="attendee in autocompleteAttendees"
              tabindex="0"
              @keydown.enter="setName(attendee)"
              @keydown.space="setName(attendee)"
            >
              <li @click="setName(attendee)">
                {{ attendee }}
              </li>
            </a>
          </ul>
        </div>

        <div class="label-div">
          <label for="phoneNumber">Telefonnummer</label>
          <input
            id="phoneNumber"
            ref="phone"
            type="phone"
            pattern="[0-9]"
            placeholder="Telefonnummer"
            v-model="phoneNumber"
          />
        </div>

        <div class="label-div">
          <label for="randomColors">Tilfeldig farger?</label>
          <input id="randomColors" type="checkbox" placeholder="Tilfeldig farger" v-model="randomColors" />
        </div>
      </div>

      <div v-if="!randomColors">
        <div class="row flex">
          <div class="label-div" v-for="color in colors">
            <label :for="color.key">{{ color.name }}</label>
            <input :id="color.key" type="number" :placeholder="color.name" v-model="color.value" />
          </div>
        </div>
      </div>

      <button class="vin-button" @click="sendAttendee">Send deltaker</button>

      <div v-if="randomColors">
        <RaffleGenerator @colors="setWithRandomColors" :generateOnInit="true" :compact="true" />
      </div>
    </div>

    <Attendees :attendees="attendees" :admin="isAdmin" />

    <div v-if="attendees.length" class="button-container" style="margin-top: 2rem;">
      <button class="vin-button danger" @click="deleteAllAttendees">
        Slett alle deltakere
      </button>
    </div>
  </div>
</template>

<script>
import io from "socket.io-client";
import { mapGetters, mapActions } from "vuex";
import Attendees from "@/ui/Attendees";
import RaffleGenerator from "@/ui/RaffleGenerator";

export default {
  components: {
    Attendees,
    RaffleGenerator
  },
  data() {
    return {
      red: {
        name: "Rød",
        key: "red",
        value: 0
      },
      blue: {
        name: "Blå",
        key: "blue",
        value: 0
      },
      green: {
        name: "Grønn",
        key: "green",
        value: 0
      },
      yellow: {
        name: "Gul",
        key: "yellow",
        value: 0
      },
      name: null,
      phoneNumber: null,
      raffles: 0,
      randomColors: false,
      autocompleteAttendees: [],
      socket: null,
      previousAttendees: []
    };
  },
  watch: {
    randomColors(val) {
      if (val == false) {
        this.colors.map(color => (color.value = 0));
      }
    },
    name(newVal, oldVal) {
      if (newVal == "" || newVal == null) {
        this.autocompleteAttendees = [];
        return;
      }

      if (this.autocompleteAttendees.includes(newVal)) {
        this.autocompleteAttendees = [];
        return;
      }

      if (this.previousAttendees.length == 0) {
        fetch(`/api/history`)
          .then(resp => resp.json())
          .then(response => (this.previousAttendees = response.winners));
      }

      this.autocompleteAttendees = this.previousAttendees
        .filter(attendee => attendee.name.toLowerCase().includes(newVal))
        .map(attendee => attendee.name);
    }
  },
  created() {
    this.fetchAttendees();
  },
  computed: {
    colors() {
      return [this.red, this.blue, this.green, this.yellow];
    },
    ...mapGetters("admin", ["attendees", "isAdmin"])
  },
  methods: {
    ...mapActions("admin", ["fetchAttendees"]),
    setName(name) {
      this.name = name;
      this.$refs.phone.focus();
    },
    setWithRandomColors(colors) {
      Object.keys(colors).forEach(color => (this[color].value = colors[color]));
    },
    sendAttendee: async function() {
      const { red, blue, green, yellow } = this;

      if (red.value == 0 && blue.value == 0 && green.value == 0 && yellow.value == 0) {
        this.$toast.error({ title: "Ingen farger valgt!" });
        return;
      }
      if (this.name == 0 && this.phoneNumber) {
        this.$toast.error({ title: "Ingen navn eller tlf satt!" });
        return;
      }

      const attendee = {
        name: this.name,
        phoneNumber: Number(this.phoneNumber),
        red: Number(red.value),
        blue: Number(blue.value),
        green: Number(green.value),
        yellow: Number(yellow.value),
        raffles: Number(this.raffles)
      };

      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendee })
      };

      return fetch("/api/lottery/attendee", options)
        .then(resp => resp.json())
        .then(response => {
          if (response.success == true) {
            this.$toast.info({
              title: `Sendt inn deltaker: ${this.name}`,
              timeout: 4000
            });

            this.name = "";
            this.phoneNumber = null;
            this.yellow.value = 0;
            this.green.value = 0;
            this.red.value = 0;
            this.blue.value = 0;
            this.randomColors = false;

            this.$refs.name.focus();
            this.fetchAttendees();
          } else {
            this.$toast.error({
              title: `Klarte ikke sende deltaker`,
              description: response.message,
              timeout: 4000
            });
          }
        });
    },
    deleteAllAttendees() {
      if (window.confirm("Er du sikker på at du vil slette alle deltakere?")) {
        const options = { method: "DELETE" };

        fetch("/api/lottery/attendees", options)
          .then(resp => resp.json())
          .then(response => {
            if (response.success) {
              this.$toast.info({
                title: "Slettet alle deltakere."
              });

              this.fetchAttendees();
            } else {
              this.$toast.error({
                title: "Klarte ikke slette deltakere",
                description: response.message
              });
            }
          });
      }
    }
  }
};
</script>
<style lang="scss">
// global styling for disabling height of attendee class
@import "@/styles/media-queries.scss";

.attendee {
  max-height: unset;

  .raffle-element {
    margin: 0;

    @include mobile {
      margin: 10px 0;
    }
  }
}
</style>

<style lang="scss" scoped>
@import "@/styles/global.scss";
@import "@/styles/media-queries.scss";

.attendee-registration-container {
  margin-bottom: 2rem;
}

.row.flex .label-div {
  margin-right: 1rem;
  margin-bottom: 1rem;
}

.autocomplete {
  position: absolute;
  top: 100%;
  margin: 0;
  list-style: none;
  padding: 0;
  z-index: 10;
  background-color: white;
  border: 1px solid #e1e4e8;

  & li {
    padding: 1rem;
    font-size: 1.1rem;

    &:hover {
      background-color: #e1e4e8;
    }
  }
}

hr {
  width: 90%;
  margin: 2rem auto;
  color: grey;
}

.page-container {
  padding: 0 1.5rem 3rem;

  @include desktop {
    max-width: 60vw;
    margin: 0 auto;
  }
}

#randomColors {
  width: 40px;
  height: 40px;
  border: none;
  cursor: pointer;

  &:checked::after {
    content: "✅";
  }

  &::after {
    font-size: 2.1rem;
    content: "❌";
  }
}
</style>
