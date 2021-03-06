<template lang="pug">
  .router-view-content
    section.page-header
      h1 {{ from.name }}
      h3 {{ target_round.name }}
    section(v-if="!sent")
      h3 Select Judges to evaluate
        el-checkbox-group.judge-selection(v-model="adjudicators_to_evaluate")
          el-checkbox-button(v-for="result in results", :label="result.id", :key="result.id") {{ entity_name_by_id(result.id) }}
      .ev-card-container
        el-card.ev-card(v-for="result in results", :key="result.id", v-if="result_visible(result)")
          div(slot="header").ev-card-header-container
            span.ev-card-title {{ entity_name_by_id(result.id) }}
            //span.ev-card-subtitle subtitle
          el-form
            el-form-item(label="Matter", required, v-if="target_round.user_defined_data.score_by_matter_manner")
              number-box(v-model="result.matter", :min="style.adjudicator_range.from", :max="style.adjudicator_range.to", :step="style.adjudicator_range.unit")
            el-form-item(label="Manner", required, v-if="target_round.user_defined_data.score_by_matter_manner")
              number-box(v-model="result.manner", :min="style.adjudicator_range.from", :max="style.adjudicator_range.to", :step="style.adjudicator_range.unit")
            el-form-item(label="Total", v-if="target_round.user_defined_data.score_by_matter_manner")
              input-label(:value="result.matter+result.manner")
            el-form-item(label="Score", required, v-if="!target_round.user_defined_data.score_by_matter_manner")
              number-box(:value="result.matter+result.manner", @input="$event => { result.manner = $event/2; result.matter = $event/2 }", :min="style.adjudicator_range.from", :max="style.adjudicator_range.to", :step="style.adjudicator_range.unit")
            el-input(type="textarea", :rows="3", v-model="result.comment", :placeholder="'Write your comment for '+entity_name_by_id(result.id)+', if any'")
      section.buttons
        el-button(@click="on_prev") #[el-icon(name="arrow-left")] Back
        el-button(type="primary" @click="dialog.check.visible = true", :disabled="adjudicators_to_evaluate.length === 0") Send #[i.fa.fa-paper-plane]
    section(v-if="sent")
      h2 Thank you! Your evaluation sheet was successfully sent.
      el-button.home-button(@click="on_home") #[i.fa.fa-home] Home

    el-dialog(title="Confirmation", :visible.sync="dialog.check.visible")
      .dialog-body
        .outer-table-tr.check__label
          p.declaration If this is correct, press Send button.
          el-card.check-card(v-for="result in results", :key="result.id")
            div(slot="header")
              h3.adjudicator-name {{ entity_name_by_id(result.id) }}
            el-form.card-body
              el-form-item(label="Matter", v-if="target_round.user_defined_data.score_by_matter_manner")
                span {{ result.matter }}
              el-form-item(label="Manner", v-if="target_round.user_defined_data.score_by_matter_manner")
                span {{ result.manner }}
              el-form-item(label="Total", v-if="target_round.user_defined_data.score_by_matter_manner")
                span {{ result.manner + result.matter }}
              el-form-item(label="Score", v-if="!target_round.user_defined_data.score_by_matter_manner")
                span {{ result.manner + result.matter }}
              el-form-item(label="Comment")
                span {{ result.comment !== '' ? result.comment : 'None' }}
      .dialog-footer(slot="footer")
        el-button(@click="dialog.check.visible = false") Cancel
        el-button(type="primary", :loading="dialog.check.sending", @click="on_send") #[i.fa.fa-paper-plane] Send
</template>

<script>
/* @flow */
import { mapState, mapGetters, mapActions } from 'vuex'
import { smartphone } from 'assets/js/media-query.js'
import number_box from 'components/number-box'
import input_label from 'components/input-label'

export default {
  components: {
    'number-box': number_box,
    'input-label': input_label
  },
  props: ['r_str', 'from_id_str'],
  data () {
    return {
      adjudicators_to_evaluate: [],
      results: [],
      active_a_id: '',
      dialog: {
        check: {
          visible: false,
          sending: false
        }
      }
    }
  },
  computed: {
    from () {
      let from_id = parseInt(this.from_id_str, 10)
      return this.entity_by_id[from_id]
    },
    ...mapGetters([
      'target_tournament',
      'target_round',
      'entity_by_id',
      'entity_name_by_id',
      'evaluation_sheet_by_id',
      'style'
    ]),
    smartphone: smartphone,
    evaluation_sheet () {
      return this.evaluation_sheet_by_id(this.from_id_str)
    },
    sent () {
      return this.evaluation_sheet.done
    },
    converted_results () {
      let results = this.results.filter(r => this.adjudicators_to_evaluate.includes(r.id))
      let converted_results = []
      for (let result of results) {
        converted_results.push({
          id: result.id,
          from_id: result.from_id,
          r: result.r,
          score: result.matter + result.manner,
          comment: result.comment,
          user_defined_data: {
            r: result.r,
            matter: result.matter,
            manner: result.manner
          }
        })
      }
      return converted_results
    }
  },
  methods: {
    ...mapActions([
      'send_raw_results'
    ]),
    on_prev () {
      this.$router.back()
    },
    on_send () {
      this.dialog.check.sending = true
      this.send_raw_results({
        tournament: this.target_tournament,
        raw_results: this.converted_results,
        label: 'adjudicators',
        label_singular: 'adjudicator'
      }).then(() => {
          this.dialog.check.sending = false
          this.dialog.check.visible = false
        })
    },
    on_home () {
      this.$router.push('/home')
    },
    result_visible(result) {
      return this.adjudicators_to_evaluate.includes(result.id)
    }
  },
  mounted () {
    for (let id of this.evaluation_sheet.adjudicators) {
      this.results.push({
        id,
        from_id: this.evaluation_sheet.from_id,
        r: this.evaluation_sheet.r,
        teams: this.evaluation_sheet.teams,
        is_chair: this.evaluation_sheet.chairs.includes(id),
        comment: '',
        matter: this.style.adjudicator_range.default,
        manner: this.style.adjudicator_range.default,
        evaluated: true
      })
    }
  }
}
</script>

<style lang="stylus">
  @import "./evaluation"

  .check-card
    width 90%
    margin auto
    margin-top 2rem
    .el-card__header
      background-color rgba(59, 193, 215, 1)

  h3.adjudicator-name
    font-color white
    font-weight unset
    text-align center

  p.declaration
    font-size 1.3rem
    text-align center

  .judge-selection
    text-align center

  .home-button
    width 100%
</style>
