<template>
  <div>
    <h1>Register vin</h1>

    <ScanToVinmonopolet @wine="wineFromVinmonopoletScan" v-if="showCamera" />

    <div class="button-container">
      <button class="vin-button" @click="showCamera = !showCamera">
        {{ showCamera ? "Skjul camera" : "Legg til vin med camera" }}
      </button>

      <button class="vin-button" @click="manualyFillInnWine">
        Legg til en vin manuelt
      </button>

      <button class="vin-button" @click="showImportLink = !showImportLink">
        {{ showImportLink ? "Skjul importer fra link" : "Importer fra link" }}
      </button>
    </div>

    <div v-if="showImportLink" class="import-from-link">
      <label>Importer vin fra vinmonopolet link:</label>
      <input
        type="text"
        placeholder="Vinmonopol lenke"
        ref="vinmonopoletLinkInput"
        autocapitalize="none"
        @input="addWineByUrl"
      />

      <div v-if="linkError" class="error">
        {{ linkError }}
      </div>
    </div>

    <div v-if="wines.length > 0" class="wine-edit-container">
      <h2>Dagens registrerte viner</h2>

      <div>
        <button class="vin-button" @click="sendWines">Send inn dagens viner</button>
      </div>

      <div class="wines">
        <wine v-for="wine in wines" :key="wine.id" :wine="wine">
          <template v-slot:default>
            <div v-if="editingWine == wine" class="wine-edit">
              <div class="label-div" v-for="key in Object.keys(wine)" :key="key">
                <label>{{ key }}</label>
                <input type="text" v-model="wine[key]" :placeholder="key" />
              </div>
            </div>
          </template>

          <template v-slot:bottom>
            <div class="button-container row small">
              <button v-if="editingWine == wine && wine._id" class="vin-button warning" @click="updateWine(wine)">
                Oppdater vin
              </button>

              <button class="vin-button" @click="editingWine = editingWine == wine ? false : wine">
                {{ editingWine == wine ? "Lukk" : "Rediger" }}
              </button>

              <button class="danger vin-button" @click="deleteWine(wine)">
                Slett
              </button>
            </div>
          </template>
        </wine>
      </div>
    </div>

    <div class="button-container" v-if="wines.length > 0"></div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from "vuex";
import ScanToVinmonopolet from "@/ui/ScanToVinmonopolet";
import Wine from "@/ui/Wine";

export default {
  components: { ScanToVinmonopolet, Wine },
  data() {
    return {
      editingWine: undefined,
      showCamera: false,
      showImportLink: false,
      linkError: undefined
    };
  },
  watch: {
    wines() {
      this.$emit("counter", this.wines.length);
    }
  },
  created() {
    this.fetchWines();
  },
  computed: {
    ...mapGetters("admin", ["wines"]),
  },
  methods: {
    ...mapActions("admin", ["fetchWines"]),
    wineFromVinmonopoletScan(wineResponse) {
      if (this.wines.map(wine => wine.name).includes(wineResponse.name)) {
        this.toastText = "Vinen er allerede lagt til.";
        this.showToast = true;
        return;
      }

      this.toastText = "Fant og la til vin:<br>" + wineResponse.name;
      this.showToast = true;

      this.wines.unshift(wineResponse);
    },
    manualyFillInnWine() {
      fetch("/api/lottery/wine/schema")
        .then(resp => resp.json())
        .then(response => response.schema)
        .then(wineSchema => {
          this.editingWine = wineSchema;
          this.wines.unshift(wineSchema);
        });
    },
    addWineByUrl(event) {
      const url = event.target.value;
      this.linkError = null;

      if (!url.includes("vinmonopolet.no")) {
        this.linkError = "Dette er ikke en gydlig vinmonopolet lenke.";
        return;
      }
      const id = url.split("/").pop();

      fetch(`/api/vinmonopolet/wine/by-id/${id}`)
        .then(resp => resp.json())
        .then(response => {
          const { wine } = response;
          this.wines.unshift(wine);
          this.$refs.vinmonopoletLinkInput.value = "";
        });
    },
    sendWines() {
      const filterOutExistingWines = wine => wine["_id"] == null;

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          wines: this.wines.filter(filterOutExistingWines)
        })
      };

      fetch("/api/lottery/wines", options).then(resp => {
        try {
          if (resp.ok == false) {
            throw resp;
          }

          resp.json().then(response => {
            if (response.success == false) {
              throw response;
            } else {
              this.$toast.info({
                title: "Viner sendt inn!",
                timeout: 4000
              });
            }
          });
        } catch (error) {
          this.$toast.error({
            title: "Feil oppsto ved innsending!",
            description: error.message,
            timeout: 4000
          });
        }
      });
    },
    updateWine(updatedWine) {
      const options = {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wine: updatedWine })
      };

      fetch(`/api/lottery/wine/${updatedWine._id}`, options)
        .then(resp => resp.json())
        .then(response => {
          this.editingWine = null;

          if (response.success) {
            this.$toast.info({
              title: response.message
            });
          } else {
            this.$toast.error({
              title: response.message
            });
          }
        });
    },
    deleteWine(deletedWine) {
      this.wines = this.wines.filter(wine => wine.name != deletedWine.name);

      if (deletedWine._id == null) return;

      const options = { method: "DELETE" };
      fetch(`/api/lottery/wine/${deletedWine._id}`, options)
        .then(resp => resp.json())
        .then(response => {
          this.editingWine = null;

          this.$toast.info({
            title: response.message
          });
        });
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/media-queries.scss";
@import "@/styles/variables.scss";

h1 {
  text-align: center;
}

.button-container {
  margin: 1.5rem 0 0;
  flex-wrap: wrap;
}

.row {
  margin: 0.25rem 0;
}

.import-from-link {
  width: 70%;
  max-width: 800px;
  margin: 1.5rem auto 0;
  display: flex;
  flex-direction: column;

  label {
    display: inline-block;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0px;
    font-weight: 600;
  }

  input {
    font-size: 1.5rem;
    min-height: 2rem;
    line-height: 2rem;
    border: none;
    border-bottom: 1px solid black;
    width: 100%;
  }

  .error {
    margin-top: 0.5rem;
    padding: 1.25rem;
    background-color: $light-red;
    color: $red;
    font-size: 1.3rem;

    @include mobile {
      font-size: 1.1rem;
    }
  }
}

.wine-edit-container {
  max-width: 1500px;
  padding: 2rem;
  margin: 0 auto;

  .wines {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;

    > div {
      margin: 1rem;
    }
  }

  label {
    margin-top: 0.7rem;
    width: 100%;
  }

  .button-container {
    margin-top: 1rem;

    button:not(:last-child) {
      margin-right: 0.5rem;
    }
  }
}
</style>
