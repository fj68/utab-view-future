import Home from './Home'
import Round from './round/Index'
import round_routes from './round/routes'
import Adjudicator from './Adjudicator'
import Debater from './Debater'

export default [
    {
        path: 'adjudicator',
        component: Adjudicator
    }, {
        path: 'debater',
        component: Debater
    }, {
        path: 'home',
        component: Home
    }, {
        path: 'audience',
        redirect: 'home'
    }, {
        path: 'debater',
        redirect: 'home'
    }, {
        path: 'rounds/:r_str',
        props: true,
        component: Round,
        children: round_routes
    }, {
        path: '',
        redirect: 'home'
    }
]
