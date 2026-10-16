import type { StateInstance } from 'lib/core/State.ts'

export const getPlugins = (state: StateInstance) => Object.values(state.plugins)
