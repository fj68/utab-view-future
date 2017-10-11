import ballot from 'pages/tournament/round/ballot/adjudicator/stores'
import math from 'assets/js/math.js'

const API_BASE_URL = 'http://localhost/api'
//const API_BASE_URL = location.protocol+'//pda.herokuapp.com/api'

function find_tournament (state, payload) {
    return state.tournaments.find(t => t.name === payload.tournament.name)
}

function treat_reponse (promise, commit) {
    return promise.then(response => response.json())
        .catch(() => {
            commit('errors', { errors: ['Network Error'] })
            throw new Error('Network Error')
        })
        .then(response => {
            if (response.errors.length > 0) {
                commit('errors', response)
                throw response.errors
            } else {
                return response.data
            }
        })
}

function fetch_data (commit, method, url, data=null) {
    let request = { method }
    if (data !== null) {
        request.body = JSON.stringify(data)
        request.headers = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
    }
    return treat_reponse(fetch(url, request), commit)
}

function select_by_key_factory (label, key="id") {
    function select_by_key (state, getters) {
        return function (key_str) {
            let targets = getters.target_tournament[label]
            return targets.find(t => t[key] === parseInt(key_str, 10))
        }
    }
    return select_by_key
}

function results_factory(label) {
    return function (state, getters) {
        let tournament = getters.target_tournament
        if (tournament === undefined) {
            return []
        }
        return function (r_str) {
            return tournament[label].filter(res => res.r === parseInt(r_str, 10)).sort((r1, r2) => r1.from_id > r2.from_id)
        }
    }
}

function replace_factory(label) {
    return function (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament[label] = payload[label]
    }
}

function add_one_factory(label, label_singular) {
    return function (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament[label].push(payload[label_singular])
    }
}

function add_ones_factory(label) {
    return function (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament[label] = tournament[label].concat(payload[label])
    }
}

function delete_factory(label, label_singular, keys=['id']) {
    console.log("preparing")
    return function (state, payload) {
        let tournament = find_tournament(state, payload)
        let fit = tournament[label]
        for (let key of keys) {
            fit = fit.filter(e => e[key] !== payload[label_singular][key])
        }
        tournament[label] = fit
    }
}

function update_factory(label, label_singular, keys=['id']) {
    return function (state, payload) {
        let tournament = find_tournament(state, payload)
        let fit = tournament[label]
        for (let key of keys) {
            fit = fit.filter(e => e[key] !== payload[label_singular][key])
        }
        tournament[label] = fit
        tournament[label].push(payload[label])
    }
}

export default {
  state: {
    loading: true,
    auth: {
      session: null,
      href: {
        login: { to: '/login' },
        logout: { to: '/logout' }
      }
    },
    tournaments: [],
    errors: []
  },
  getters: {
    isAuth: state => true,//{ return (state.auth && state.auth.session) ? true: false },
    target_tournament (state) {
      return state.tournaments.find(t => t.name === state.route.params.tournament_name)
    },
    target_draw (state, getters) {
        return getters.target_tournament.draws.find(d => d.r === parseInt(state.route.params.r_str, 10))
    },
    target_score_sheets (state, getters) {
        let tournament = getters.target_tournament
        let draw = getters.target_draw
        let style = getters.style
        if (draw === undefined) {
            return []
        }
        let allocation = draw.allocation
        let r = draw.r
        let score_sheets = []
        let adjudicators_submitted = Array.from(new Set(getters.raw_team_results_by_r(r).map(res => res.from_id)))
        for (let square of allocation) {
            for (let from_id of [].concat(square.chairs).concat(square.panels)) {
                let score_sheet = {
                    r,
                    done: adjudicators_submitted.includes(from_id),
                    teams: square.teams,
                    from_id,
                    venue: square.venue,
                    is_chair: square.chairs.includes(from_id) ? true : false,
                    href: { to: String(from_id) }
                }
                score_sheets.push(score_sheet)
            }
        }
        return score_sheets
    },
    target_evaluation_sheets (state, getters) {
        let tournament = getters.target_tournament
        let draw = getters.target_draw
        if (draw === undefined) {
            return []
        }
        let allocation = draw.allocation
        let r = draw.r
        let evaluation_sheets = []
        let teams_submitted = Array.from(new Set(getters.raw_adjudicator_results_by_r(r).map(res => res.from_id)))
        for (let square of allocation) {
            for (let from_id of Object.values(square.teams)) {
                let evaluation_sheet = {
                    r,
                    done: teams_submitted.includes(from_id),
                    adjudicators: square.chairs.concat(square.panels),
                    from_id,
                    is_adjudicator: false,
                    venue: square.venue,
                    href: { to: String(from_id) }
                }
                evaluation_sheets.push(evaluation_sheet)
            }
            for (let from_id of square.chairs.concat(square.panels).concat(square.trainees)) {
                let evaluation_sheet = {
                    r,
                    done: teams_submitted.includes(from_id),
                    adjudicators: square.chairs.concat(square.panels).concat(square.trainees),
                    from_id,
                    is_adjudicator: true,
                    venue: square.venue,
                    href: { to: String(from_id) }
                }
                evaluation_sheets.push(evaluation_sheet)
            }
        }
        return evaluation_sheets
    },
    score_sheet_by_id (state, getters) {
        return function (from_id) {
            return getters.target_score_sheets.find(ss => ss.from_id === parseInt(from_id, 10))
        }
    },
    evaluation_sheet_by_id (state, getters) {
        return function (from_id) {
            return getters.target_evaluation_sheets.find(es => es.from_id === parseInt(from_id, 10))
        }
    },
    teams_by_speaker_id (state, getters) {
        return function (id) {
            let teams = getters.target_tournament.teams
            return teams.filter(team => getters.details_1(team).speakers.includes(id))
        }
    },
    round_by_r: select_by_key_factory('rounds', 'r'),
    draw_by_r: select_by_key_factory('draws', 'r'),
    team_by_id: select_by_key_factory('teams'),
    adjudicator_by_id: select_by_key_factory('adjudicators'),
    speaker_by_id: select_by_key_factory('speakers'),
    venue_by_id: select_by_key_factory('venues'),
    institution_by_id: select_by_key_factory('institutions'),
    unallocated_speakers (state, getters) {
        let tournament = getters.target_tournament
        let allocated_speakers = []
        for (let team of tournament.teams) {
            allocated_speakers = allocated_speakers.concat(team.details[0].speakers)
        }
        return tournament.speakers.filter(speaker => !allocated_speakers.includes(speaker.id))
    },
    raw_team_results_by_r: results_factory('raw_team_results'),
    raw_speaker_results_by_r: results_factory('raw_speaker_results'),
    raw_adjudicator_results_by_r: results_factory('raw_adjudicator_results'),
    details_1 (state, getters) {
        return function (entity) {
            return Object.assign(entity, entity.details.find(d => d.r === 1))
        }
    },
    style (state, getters) {
        let tournament = getters.target_tournament
        return tournament.style
    },
    compiled_sub_prize_results (state, getters) {
        return function (sub_prize) {
            let compiled_speaker_results = getters.target_tournament.compiled_speaker_results
            if (compiled_speaker_results.length === 0) {
                return []
            } else {
                let compiled_sub_prize_results = compiled_speaker_results.map(result => Object.assign({}, result))
                for (let result of compiled_sub_prize_results) {
                    let nums = []
                    for (let detail of result.details) {
                        let nums_sub = []
                        for (let user_defined_data of detail.user_defined_data_collection) {
                            nums_sub.push(Object.values(user_defined_data[sub_prize]).filter(tf => tf).length)
                        }
                        nums.push(math.average(nums_sub))
                    }
                    result[sub_prize] = math.sum(nums)
                }
                compiled_sub_prize_results.sort((r1, r2) => r1[sub_prize] < r2[sub_prize] ? 1 : -1)
                let ranking = 0
                let stay = 0
                let current_sub_prize = null
                for (let result of compiled_sub_prize_results) {
                    if (result[sub_prize] !== current_sub_prize) {
                        ranking += stay + 1
                        stay = 0
                        current_sub_prize = result[sub_prize]
                    } else {
                        stay += 1
                    }
                    result.ranking = ranking
                }
                return compiled_sub_prize_results
            }
        }
      }
  },
  mutations: {
    /* auth.session */
    session (state, payload) {
      state.auth.session = payload.session
    },
    /* tournaments */
    errors (state, payload) {
      state.errors = payload.errors
    },
    /* tournaments */
    tournaments (state, payload) {
      state.tournaments = payload.tournaments
    },
    /*add_tournaments (state, payload) {
      state.tournaments += payload.tournaments
    },*/
    add_tournament (state, payload) {
        let tournament = {
          id: payload.tournament.id,
          name: payload.tournament.name,
          href: payload.tournament.href,
          current_round_num: payload.tournament.current_round_num,
          total_round_num: payload.tournament.total_round_num,
          style: payload.tournament.style,
          rounds: [],
          teams: [],
          adjudicators: [],
          speakers: [],
          venues: [],
          draws: [],
          raw_team_results: [],
          raw_speaker_results: [],
          raw_adjudicator_results: [],
          compiled_team_results: [],
          compiled_speaker_results: [],
        }
        state.tournaments.push(tournament)
    },
    delete_tournament (state, payload) {
      state.tournaments = state.tournaments.filter(t => t.name !== payload.name)
    },
    /* tournaments */
    change_draw (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament.draws = tournament.draws.filter(draw => draw.r !== payload.draw.r)
        tournament.draws.push(payload.draw)
    },
    draws: replace_factory('draws'),
    rounds: replace_factory('rounds'),
    raw_results (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament['raw_'+payload.label_singular+'_results'] = payload.raw_results
    },
    compiled_team_results: replace_factory('compiled_team_results'),
    compiled_speaker_results: replace_factory('compiled_speaker_results'),
    add_raw_results (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament['raw_'+payload.label_singular+'_results'].concat(payload.raw_results)
    },
    add_raw_result (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament['raw_'+payload.label_singular+'_results'].push(payload.raw_result)
    },
    update_result (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament['raw_'+payload.label_singular+'_results'] = tournament['raw_'+payload.label_singular+'_results']
            .filter(res => res.id !== payload.raw_result.id || res.r !== payload.raw_result.r || res.from_id !== payload.raw_result.from_id)
        tournament['raw_'+payload.label_singular+'_results'].push(payload.raw_result)
    },
    delete_result (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament['raw_'+payload.label_singular+'_results'] = tournament['raw_'+payload.label_singular+'_results']
            .filter(res => res.id !== payload.raw_result.id || res.r !== payload.raw_result.r || res.from_id !== payload.raw_result.from_id)
    },
    entities (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament[payload.label] = payload[payload.label]
    },
    add_entities (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament[payload.label] = tournament[payload.label].concat(payload[payload.label])
    },
    delete_entity (state, payload) {
        let tournament = find_tournament(state, payload)
        tournament[payload.label] = tournament[payload.label].filter(e => e.id !== payload[payload.label_singular].id)
    },
    update_entity (state, payload) {
        let tournament = find_tournament(state, payload)
        console.log("preparing")
        //tournament[payload.label].filter(e => e.id === payload[payload.label].id) = payload[payload.label]
    },
    add_round: add_one_factory('rounds', 'round'),
    delete_round: delete_factory('rounds', 'round', ['r']),
    update_round: update_factory('rounds', 'round', ['r']),
    finish_loading (state) {
        state.loading = false
    },
    start_loading (state) {
        state.loading = true
    }
  },
  actions: {
      next_round (state, payload) {
          console.log("preparing")
      },
      send_create_round ({state, commit, dispatch}, payload) {
          return fetch_data(commit, 'POST', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/rounds', payload.round)
             .then(() => commit('add_round', payload))
      },
      send_update_round ({state, commit, dispatch}, payload) {
          return fetch_data(commit, 'PUT', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/rounds/'+payload.round.r, payload.round)
             .then(() => commit('update_round', payload))
      },
      send_delete_round ({state, commit, dispatch}, payload) {
          return fetch_data(commit, 'DELETE', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/rounds/'+payload.round.r, payload.round)
              .then(() => commit('delete_round', payload))
      },
      send_tournament ({state, commit, dispatch}, payload) {
          console.log(payload)
          console.log("hi")
         return fetch_data(commit, 'POST', API_BASE_URL+'/tournaments', payload.tournament)
            .then(() => commit('add_tournament', payload))
      },
      send_create_entities ({state, commit, dispatch}, payload) {
        return fetch_data(commit, 'POST', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/'+payload.label, payload[payload.label])
            .then(() => commit('add_entities', payload))
      },
      send_update_entity ({state, commit, dispatch}, payload) {
        return fetch_data(commit, 'PUT', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/'+payload.label+'/'+payload[payload.label_singular].id, payload[payload.label])
            .then(() => commit('update_entity', payload))
      },
      send_update_result ({state, commit, dispatch}, payload) {
        return fetch_data(commit, 'PUT', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/rounds/'+payload.raw_result.r+'/results/raw/'+payload.label+'/'+payload.raw_result.id+'/'+payload.raw_result.from_id,  payload.raw_result)
            .then(() => commit('update_result', payload))
      },
      send_delete_result ({state, commit, dispatch}, payload) {
        return fetch_data(commit, 'DELETE', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/rounds/'+payload.raw_result.r+'/results/raw/'+payload.label+'/'+payload.raw_result.id+'/'+payload.raw_result.from_id,  payload.raw_result)
            .then(() => commit('delete_result', payload))
      },
      send_raw_results ({state, commit, dispatch}, payload) {
        return fetch_data(commit, 'POST', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/results/raw/'+payload.label, payload.raw_results)
            .then(() => commit('add_raw_results', payload))
      },
      send_update_entity ({state, commit, dispatch}, payload) {
          console.log("preparing")
        return fetch_data(commit, 'PUT', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/'+payload.label+'/'+payload[payload.label_singular].id, payload[payload.label])
            .then(() => commit('update_entity', payload))
      },
      send_delete_entity ({state, commit, dispatch}, payload) {
        return fetch_data(commit, 'DELETE', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/'+payload.label+'/'+payload[payload.label_singular].id)
            .then(() => commit('delete_entity', payload))
      },
      request_compiled_team_results ({state, commit, dispatch}, payload) {
        return fetch_data(commit, 'PATCH', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/results/teams', payload.request)
            .then((compiled_team_results) => commit('compiled_team_results', { tournament: payload.tournament, compiled_team_results }))
      },
      request_compiled_speaker_results ({state, commit, dispatch}, payload) {
        return fetch_data(commit, 'PATCH', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/results/speakers', payload.request)
            .then((compiled_speaker_results) => commit('compiled_speaker_results', { tournament: payload.tournament, compiled_speaker_results }))
      },
      init_tournaments ({ commit }) {
        return fetch_data(commit, 'GET', API_BASE_URL+'/tournaments')
            .then(function (data) {
                let tournaments = []
                for (let t of data) {
                    let tournament = Object.assign({}, t)
                    tournament.href = { path: '/'+tournament.name }
                    tournament.rounds = []
                    tournament.teams = []
                    tournament.adjudicators = []
                    tournament.draws = []
                    tournament.speakers= []
                    tournament.institutions = []
                    tournament.venues = []
                    tournament.raw_speaker_results = []
                    tournament.raw_team_results = []
                    tournament.raw_adjudicator_results = []
                    tournament.compiled_speaker_results = []
                    tournament.compiled_team_results = []
                    tournaments.push(tournament)
                }
                commit('tournaments', { tournaments })
            })
    },
    init_draws ({ state, commit, dispatch }, payload) {
        return Promise.all(state.tournaments.map(t =>
            fetch_data(commit, 'GET', API_BASE_URL+'/tournaments/'+t.id+'/draws')
                .then(data => {
                    const draws = []
                    for (let draw_fetched of data) {
                        let draw = Object.assign({}, draw_fetched)
                        draws.push(draw)
                    }
                    commit('draws', { tournament: t, draws })
                })
        ))
    },
    init_rounds ({ state, commit, dispatch }, payload) {
        return Promise.all(state.tournaments.map(t =>
            fetch_data(commit, 'GET', API_BASE_URL+'/tournaments/'+t.id+'/rounds')
                .then(data => {
                    const rounds = []
                    for (let round_fetched of data) {
                        let round = Object.assign({}, round_fetched)
                        round.href = { path: '/'+t.name+'/rounds/'+round_fetched.r }
                        rounds.push(round)
                    }
                    commit('rounds', { tournament: t, rounds })
                })
            ))
    },
    init_raw_results ({ state, commit, dispatch }, payload) {
        let labels = ['teams', 'speakers', 'adjudicators']
        let labels_singular = ['team', 'speaker', 'adjudicator']
        let ps = []
        for (let t of state.tournaments) {
            for (let index of math.range(labels.length)) {
                let label = labels[index]
                let label_singular = labels_singular[index]
                ps.push(fetch_data(commit, 'GET', API_BASE_URL+'/tournaments/'+t.id+'/results/raw/'+label)
                    .then(data => {
                        let raw_results = data
                        commit('raw_results', { tournament: t, raw_results, label_singular })
                    }))
            }
        }
        return Promise.all(ps)
    },
    init_entities ({ state, commit, dispatch }, payload) {
        let labels = ['teams', 'adjudicators', 'speakers', 'venues', 'institutions']
        let ps = []
        for (let tournament of state.tournaments) {
            for (let index of math.range(5)) {
                let label = labels[index]
                ps.push(fetch_data(commit, 'GET', API_BASE_URL+'/tournaments/'+tournament.id+'/'+labels[index])
                    .then(data => {
                        let entities = data
                        let new_payload = { tournament }
                        new_payload[label] = entities
                        new_payload.label = label
                        commit('entities', new_payload)
                    }))
            }
        }
        return Promise.all(ps)
    },
    init_all ({ state, commit, dispatch }, payload) {
        return new Promise(async (resolve, reject) => {
            commit('start_loading')
            await dispatch('init_tournaments')
            await dispatch('init_rounds')
            await dispatch('init_draws')
            await dispatch('init_raw_results')
            await dispatch('init_entities')
            commit('finish_loading')
            resolve(true)
        })
    },
    request_draw ({ state, commit, dispatch }, payload) {
        let tournament = find_tournament(state, payload)
        return fetch_data(commit, 'PATCH', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/rounds/'+payload.r_str+'/draws')
    },
    submit_draw ({ state, commit, dispatch }, payload) {
        let tournament = find_tournament(state, payload)
        return fetch_data(commit, 'POST', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/rounds/'+payload.draw.r+'/draws', payload.draw).then(data => {
            let draw = data
            commit('change_draw', { tournament, draw })
        })
    },
    update_draw ({ state, commit, dispatch }, payload) {
        let tournament = find_tournament(state, payload)
        return fetch_data(commit, 'PUT', API_BASE_URL+'/tournaments/'+payload.tournament.id+'/rounds/'+payload.draw.r+'/draws', payload.draw).then(data => {
            let draw = data
            commit('change_draw', { tournament, draw })
        })
    },
    login ({ state, commit, dispatch }, payload) {
      return new Promise(async (resolve, reject) => {
        if (state.auth.session) {
          await dispatch('logout', { session: state.auth.session })
        }
        let session = null
        if (payload.user_name === "admin" && payload.password === "nimda") {
          setTimeout(() => {
            session = 'c0rjqc+as-wAJwkfj2jrdKSDqce2-qo'
            commit('session', { session })
            resolve(true)
          }, 1000)
        } else {
          setTimeout(() => {
            resolve(false)
          }, 1000)
        }
      })
    },
    logout ({ state, commit, dispatch }, payload) {
      return new Promise(async (resolve, reject) => {
        let session = 'c0rjqc+as-wAJwkfj2jrdKSDqce2-qo';
        setTimeout(() => {
          commit('session', { session: null })
          resolve(true)
        }, 1000)
      })
    }
  },
  modules: {
    ballot
  }
}
