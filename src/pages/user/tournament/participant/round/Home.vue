<template lang="pug">
  .router-view-content
    section.page-header
      h1 {{ target_round.name }}
    section
      link-list
        legend(slot="legend") Audience
        router-link(to="draw")
          link-list-item Draw &amp; Allocation
      link-list
        legend(slot="legend") Debaters
        router-link(to="evaluation")
          link-list-item Judge Evaluation Sheet
      link-list
        legend(slot="legend") Adjudicators
        router-link(to="ballot")
          link-list-item Score Sheet
</template>

<script>
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
    ...mapGetters([
      'target_round'
    ])
  }
}
</script>
