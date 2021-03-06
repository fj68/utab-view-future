<template lang="pug">
  .router-view-content
    section.page-header
      h1 {{ target_round.name }}
      h3(v-if="draw_time && draw_time.updated") {{ draw_time.text }}
    section(v-if="draw_opened && sorted_rows.length > 0")
      el-table.draw(:data="sorted_rows", :row-class-name="payload => 'row-class-'+(payload.rowIndex%2)")
        el-table-column(label="Venue", align="center")
          template(slot-scope="scope")
            .venue {{ scope.row.venue ? entity_name_by_id(scope.row.venue) : '' }}
        el-table-column(:label="smartphone ? style.side_labels_short['gov'] : style.side_labels['gov']", align="center")
          template(slot-scope="scope")
            .team-gov {{ entity_name_by_id(scope.row.teams.gov) }}
        el-table-column(:label="smartphone ? style.side_labels_short['opp'] : style.side_labels['opp']", align="center")
          template(slot-scope="scope")
            .team-opp {{ entity_name_by_id(scope.row.teams.opp) }}
        el-table-column.adjudicator-container(label="Chair", v-if="allocation_opened", align="center")
          template(slot-scope="scope")
            .adjudicator(v-for="id in scope.row.chairs") {{ entity_name_by_id(id) }}
        el-table-column.adjudicator-container(label="Panel", v-if="allocation_opened", align="center")
          template(slot-scope="scope")
            .adjudicator(v-for="id in scope.row.panels") {{ entity_name_by_id(id) }}
        el-table-column.adjudicator-container(label="Trainee", v-if="allocation_opened", align="center")
          template(slot-scope="scope")
            .adjudicator(v-for="id in scope.row.trainees") {{ entity_name_by_id(id) }}
    section(v-else)
      p Draw for {{ target_round.name }} is not released.
</template>

<script>
import { smartphone } from 'assets/js/media-query.js'
import { mapState, mapGetters, mapActions } from 'vuex'
import link_list from 'components/link-list'
import link_list_item from 'components/link-list-item'

export default {
  props: ['r_str'],
  components: {
    'link-list': link_list,
    'link-list-item': link_list_item
  },
  computed: {
    sorted_rows () {
      let draw = this.target_draw
      let that = this
      return draw ? draw.allocation.slice()
        .sort(function (a, b) {
          let venue1 = that.entity_by_id[parseInt(a.venue, 10)]
          let venue2 = that.entity_by_id[parseInt(b.venue, 10)]
          let pr1 = venue1 !== undefined ? that.access_detail(venue1, that.r_str).priority : 1
          let pr2 = venue2 !== undefined ? that.access_detail(venue2, that.r_str).priority : 1
          return pr1 > pr2 ? 1 : -1
        }) : []
    },
    smartphone: smartphone,
    ...mapGetters([
      'access_detail',
      'entity_name_by_id',
      'target_round',
      'target_draw',
      'draw_time',
      'style',
      'target_tournament',
      'entity_by_id',
      'draw_opened',
      'allocation_opened'
    ])
  }
}
</script>

<style lang="stylus">

  .draw
    table.el-table__header
      letter-spacing 0.02rem
      font-family -apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
      font-color rgb(92, 92, 92)

    table.el-table__body
      font-family -apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;

    .row-class-0
      background-color white

    .row-class-1
      background-color #f6fcff

    .venue
      //

    .team-gov
      //color red

    .team-opp
      //color blue

    .adjudicator-container
      display flex
      flex-flow column wrap

    .adjudicator
      flex 1
</style>
