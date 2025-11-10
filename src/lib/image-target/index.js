import { UI } from '../ui/ui.js'
import { Compiler } from './compiler'
import { Controller } from './controller.js'

export { Controller, Compiler, UI }

if (!window.MINDAR) {
  window.MINDAR = {}
}

window.MINDAR.IMAGE = {
  Controller,
  Compiler,
  UI,
}
