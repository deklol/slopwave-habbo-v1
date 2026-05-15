import type { HabboAlertDescriptor } from "./HabboAlertManager";
import type { HabboDelayRecord, HabboWindowRecord } from "./window/HabboWindowTypes";

export function serializeDelay(delay: HabboDelayRecord): Record<string, unknown> {
  return {
    id: delay.id,
    clientId: delay.clientId.toString(),
    method: delay.method.toString(),
    delayMs: delay.delayMs,
    ...(delay.argument !== undefined ? { argument: delay.argument } : {}),
    ...(delay.source !== undefined ? { source: delay.source } : {})
  };
}

export function serializeWindow(window: HabboWindowRecord): Record<string, unknown> {
  return {
    id: window.id.toString(),
    ...(window.template !== undefined ? { template: window.template } : {}),
    ...(window.title !== undefined ? { title: window.title } : {}),
    ...(window.x !== undefined ? { x: window.x } : {}),
    ...(window.y !== undefined ? { y: window.y } : {}),
    ...(window.locZ !== undefined ? { locZ: window.locZ } : {}),
    ...(window.contentResizeWidth !== undefined ? { contentResizeWidth: window.contentResizeWidth } : {}),
    ...(window.contentResizeHeight !== undefined ? { contentResizeHeight: window.contentResizeHeight } : {}),
    ...(window.mergedLayout !== undefined ? { mergedLayout: window.mergedLayout } : {}),
    registeredClients: window.registeredClients.map((client) => client.toString()),
    procedures: window.procedures.map((procedure) => ({
      handler: procedure.handler.toString(),
      clientId: procedure.clientId.toString(),
      event: procedure.event.toString()
    })),
    ...(window.focusedElement !== undefined ? { focusedElement: window.focusedElement } : {})
  };
}

export function serializeAlert(alert: HabboAlertDescriptor): Record<string, unknown> {
  return {
    id: alert.id,
    template: alert.template,
    title: alert.title,
    message: alert.message,
    link: alert.link,
    modal: alert.modal,
    ...(alert.titleKey !== undefined ? { titleKey: alert.titleKey } : {}),
    ...(alert.messageKey !== undefined ? { messageKey: alert.messageKey } : {}),
    ...(alert.linkKey !== undefined ? { linkKey: alert.linkKey } : {})
  };
}
