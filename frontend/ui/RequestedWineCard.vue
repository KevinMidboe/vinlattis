<template>
  <Wine :wine="wine">
    <template v-slot:top>
      <div class="flex justify-end">
        <div class="requested-count cursor-pointer" @click="request">
          <span>{{ requestedElement.count }}</span>
          <i class="icon icon--heart" :class="{ active: locallyRequested }" />
        </div>
      </div>
    </template>

    <template v-slot:default>
      <button @click="deleteWine(wine)" v-if="showDeleteButton == true" class="vin-button small danger width-100">
        Slett vinen
      </button>
    </template>

    <template v-slot:bottom>
      <div class="float-left request">
        <i class="icon icon--heart request-icon" :class="{ active: locallyRequested }"></i>
        <a aria-role="button" tabindex="0" class="link" @click="request" :class="{ active: locallyRequested }">
          {{ locallyRequested ? "Anbefalt" : "Anbefal" }}
        </a>
      </div>
    </template>
  </Wine>
</template>

<script>
import { deleteRequestedWine, requestNewWine } from "@/api";
import Wine from "@/ui/Wine";

export default {
  components: {
    Wine
  },
  data() {
    return {
      wine: this.requestedElement.wine,
      locallyRequested: false
    };
  },
  props: {
    requestedElement: {
      required: true,
      type: Object
    },
    showDeleteButton: {
      required: false,
      type: Boolean,
      default: false
    }
  },
  methods: {
    request() {
      if (this.locallyRequested) return;

      this.locallyRequested = true;
      this.requestedElement.count = this.requestedElement.count + 1;
      requestNewWine(this.wine);
    },
    async deleteWine() {
      const wine = this.wine;
      if (window.confirm("Er du sikker på at du vil slette vinen?")) {
        let response = await deleteRequestedWine(wine);
        if (response["success"] == true) {
          this.$emit("wineDeleted", wine);
        } else {
          alert("Klarte ikke slette vinen");
        }
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "@/styles/variables";

.requested-count {
  display: flex;
  align-items: center;
  margin-top: -0.5rem;
  background-color: rgb(244, 244, 244);
  border-radius: 1.1rem;
  padding: 0.25rem 1rem;
  font-size: 1.25em;

  span {
    padding-right: 0.5rem;
    line-height: 1.25em;
  }

  .icon--heart {
    color: grey;
  }
}

.active {
  &.link {
    border-color: $link-color;
  }

  &.icon--heart {
    color: $link-color;
  }
}

.request {
  display: flex;
  align-items: center;

  &-icon {
    font-size: 1.5rem;
    color: grey;
  }

  a {
    margin-left: 0.5rem;
  }
}
</style>
