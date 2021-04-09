<template>
  <div class="page-container">
    <h1>Trekk vinnere</h1>

    <div class="draw-winner-container">
      <div v-if="drawingWinner == false" class="draw-container">
        <input type="number" v-model="winnersToDraw" />
        <button class="vin-button no-margin" @click="startDrawingWinners">Trekk vinnere</button>
      </div>

      <div v-if="wines.length" class="wines-left">
        <span>Antall vin igjen: {{ winnersToDraw }} av {{ wines.length }}</span>
      </div>

      <div v-if="drawingWinner == true">
        <p>Trekker vinner {{ winners.length }} av {{ wines.length }}.</p>
        <p>Neste trekning om {{ secondsLeft }} sekunder av {{ drawTime }}</p>

        <div class="button-container draw-winner-actions">
          <button class="vin-button danger" @click="stopDraw">
            Stopp trekning
          </button>
          <button
            class="vin-button"
            :class="{ 'pulse-button': secondsLeft == 0 }"
            :disabled="secondsLeft > 0"
            @click="drawWinner"
          >
            Trekk neste
          </button>
        </div>
      </div>
    </div>

    <div class="prize-distribution">
      <h2>Prisutdeling</h2>

      <div class="button-container">
        <button class="vin-button" @click="startPrizeDistribution">Start automatisk prisutdeling med SMS</button>
      </div>
    </div>

    <h2 v-if="winners.length > 0">Vinnere</h2>
    <div class="winners" v-if="winners.length > 0">
      <div :class="winner.color + '-raffle'" class="raffle-element" v-for="(winner, index) in winners" :key="index">
        <span>{{ winner.name }}</span>
        <span>Phone: {{ winner.phoneNumber }}</span>
        <span>Rød: {{ winner.red }}</span>
        <span>Blå: {{ winner.blue }}</span>
        <span>Grønn: {{ winner.green }}</span>
        <span>Gul: {{ winner.yellow }}</span>

        <div class="button-container">
          <button class="vin-button small" @click="editingWinner = editingWinner == winner ? false : winner">
            {{ editingWinner == winner ? "Lukk" : "Rediger" }}
          </button>
        </div>

        <div v-if="editingWinner == winner" class="edit">
          <div class="label-div" v-for="key in Object.keys(winner)" :key="key">
            <label>{{ key }}</label>
            <input type="text" v-model="winner[key]" :placeholder="key" />
          </div>

          <div v-if="editingWinner == winner" class="button-container column">
            <button class="vin-button small" @click="notifyWinner(winner)">
              Send SMS
            </button>
            <button class="vin-button small warning" @click="updateWinner(winner)">
              Oppdater
            </button>
            <button class="vin-button small danger" @click="deleteWinner(winner)">
              Slett
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="button-container margin-md" v-if="winners.length > 0">
      <button class="vin-button danger" v-if="winners.length > 0" @click="deleteAllWinners">
        Slett virtuelle vinnere
      </button>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";

export default {
  data() {
    return {
      drawingWinner: false,
      secondsLeft: 20,
      drawTime: 20,
      editingWinner: undefined
    };
  },
  created() {
    this.fetchWinners();
  },
  watch: {
    winners(val) {
      this.$emit("counter", val.length);
    }
  },
  computed: {
    winnersToDraw() {
      if (this.wines.length == undefined || this.winners.length == undefined) {
        return 0;
      }

      return this.wines.length - this.winners.length;
    },
    ...mapGetters("admin", ["winners", "wines"])
  },
  methods: {
    ...mapActions("admin", ["fetchWinners", "fetchWines"]),
    countdown() {
      if (this.drawingWinner == false) {
        return;
      }

      if (this.secondsLeft > 0) {
        this.secondsLeft -= 1;

        setTimeout(_ => {
          this.countdown();
        }, 1000);
      } else {
        if (this.winners.length == this.wines.length) {
          this.drawingWinner = false;
        }
      }
    },
    startDrawingWinners() {
      if (window.confirm("Er du sikker på at du vil trekke vinnere?")) {
        this.drawWinner();
      }
    },
    drawWinner() {
      if (this.winnersToDraw <= 0) {
        this.$toast.error({ title: "No more wines to draw" });
        return;
      }
      this.secondsLeft = this.drawTime;
      this.drawingWinner = true;

      fetch("/api/lottery/draw")
        .then(resp => resp.json())
        .then(response => {
          const { winner, color, success, message } = response;

          if (success == false) {
            this.$toast.error({ title: message });
            return;
          }

          winner.color = color;
          this.winners.push(winner);
          this.countdown();
        })
        .catch(error => {
          if (error) {
            this.$toast.error({ title: error.message });
          }
          this.drawingWinner = false;
        });
    },
    stopDraw() {
      this.drawingWinner = false;
      this.secondsLeft = this.drawTime;
    },
    startPrizeDistribution() {
      if (!window.confirm("Er du sikker på at du vil starte prisutdeling?")) {
        return;
      }

      this.drawingWinner = false;

      const options = { method: "POST" };
      fetch(`/api/lottery/prize-distribution/start`, options)
        .then(resp => resp.json())
        .then(response => {
          if (response.success) {
            this.$toast.info({
              title: `Startet prisutdeling. SMS'er sendt ut!`
            });
          } else {
            this.$toast.error({
              title: `Klarte ikke starte prisutdeling`,
              description: response.message
            });
          }
        });
    },
    notifyWinner(winner) {
      const options = { method: "POST" };

      fetch(`/api/lottery/messages/winner/${winner.id}`, options)
        .then(resp => resp.json())
        .then(response => {
          if (response.success) {
            this.$toast.info({
              title: `Sendte sms til vinner ${winner.name}.`
            });
          } else {
            this.$toast.error({
              title: `Klarte ikke sende sms til vinner ${winner.name}`,
              description: response.message
            });
          }
        });
    },
    updateWinner(winner) {
      const options = {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner })
      };

      fetch(`/api/lottery/winner/${winner.id}`, options)
        .then(resp => resp.json())
        .then(response => {
          if (response.success) {
            this.$toast.info({
              title: `Oppdaterte vinner ${winner.name}.`
            });
          } else {
            this.$toast.error({
              title: `Klarte ikke oppdatere vinner ${winner.name}`,
              description: response.message
            });
          }
        });
    },
    deleteWinner(winner) {
      if (winner._id != null && window.confirm(`Er du sikker på at du vil slette vinner ${winner.name}?`)) {
        const options = { method: "DELETE" };

        fetch(`/api/lottery/winner/${winner.id}`, options)
          .then(resp => resp.json())
          .then(response => {
            if (response.success) {
              this.winners = this.winners.filter(w => w.id != winner.id);

              this.$toast.info({
                title: `Slettet vinner ${winner.name}.`
              });
            } else {
              this.$toast.error({
                title: `Klarte ikke slette vinner ${winner.name}`,
                description: response.message
              });
            }
          });
      }
    },
    deleteAllWinners() {
      if (window.confirm("Er du sikker på at du vil slette alle vinnere?")) {
        const options = { method: "DELETE" };

        fetch("/api/lottery/winners", options)
          .then(resp => resp.json())
          .then(response => {
            if (response.success) {
              this.winners = [];
              this.$toast.info({
                title: "Slettet alle vinnere."
              });
            } else {
              this.$toast.error({
                title: "Klarte ikke slette vinnere",
                description: response.message
              });
            }
          });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.wines-left {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
  font-size: 1.2rem;
}

.draw-container {
  display: flex;
  justify-content: center;

  input {
    font-size: 1.7rem;
    padding: 7px;
    margin: 0;
    width: 10rem;
    height: 3rem;
    border: 1px solid rgba(#333333, 0.3);
  }
}

.button-container {
  margin-top: 1rem;
}

.draw-winner-actions {
  justify-content: left;
}

.winners {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;

  .raffle-element {
    width: 220px;
    height: 100%;
    min-height: 250px;
    font-size: 1.1rem;
    padding: 1rem;
    font-weight: 500;
    // text-align: center;

    -webkit-mask-size: cover;
    -moz-mask-size: cover;
    mask-size: cover;
    flex-direction: column;

    span:first-of-type {
      font-weight: 600;
    }

    span.active {
      margin-top: 3rem;
    }

    .edit {
      padding: 1rem;
    }
  }
}
</style>
