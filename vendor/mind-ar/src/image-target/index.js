import { UI } from '../ui/ui.js'
import { Compiler } from './compiler.js'
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
