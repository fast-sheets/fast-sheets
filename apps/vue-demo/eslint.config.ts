import pluginVue from 'eslint-plugin-vue'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

export default withVueTs(pluginVue.configs['flat/essential'], vueTsConfigs.recommended)
