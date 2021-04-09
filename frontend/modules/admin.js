import Vuex from 'vuex';

const checkIfAdmin = (context, resp) => {
  const isAdmin = resp.headers.get("vinlottis-admin") == "true" || false;
  context.commit("SET_ADMIN", isAdmin);
  console.log('isAdmin', isAdmin)
  return resp;
};

const store = {
  namespaced: true,
  state: {
    attendees: [],
    wines: [],
    winners: [],
    attendeeCounter: 2,
    isAdmin: false
  },
  getters: {
    attendees: state => state.attendees,
    wines: state => state.wines,
    winners: state => state.winners,
    isAdmin: state => state.isAdmin,
  },
  mutations: {
    SET_ATTENDEES(state, attendees) {
      state.attendees = attendees;
    },
    SET_WINES(state, wines) {
      state.wines = wines;
    },
    SET_WINNERS(state, winners) {
      state.winners = winners;
    },
    SET_ADMIN(state, isAdmin) {
      state.isAdmin = isAdmin;
    },
  },
  actions: {
    fetchAttendees(context) {
      return fetch("/api/lottery/attendees")
        .then(resp => checkIfAdmin(context, resp))
        .then(resp => resp.json())
        .then(response => context.commit('SET_ATTENDEES', response.attendees))
    },
    fetchWines(context) {
      return fetch("/api/lottery/wines")
        .then(resp => checkIfAdmin(context, resp))
        .then(resp => resp.json())
        .then(response => (context.commit("SET_WINES", response.wines)));
    },
    fetchWinners(context) {
      return fetch("/api/lottery/winners")
        .then(resp => checkIfAdmin(context, resp))
        .then(resp => resp.json())
        .then(response => (context.commit("SET_WINNERS", response.winners)));
    }
  }
}

export default store;