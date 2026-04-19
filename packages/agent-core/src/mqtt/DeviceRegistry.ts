import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import { logger } from '../logger.js'
import type { DeviceConfig } from '../types.js'

export class DeviceRegistry {
  private devices = new Map<string, DeviceConfig>()

  load(configDir: string): void {
    const devicesDir = path.join(configDir, 'devices')
    if (!fs.existsSync(devicesDir)) {
      logger.warn({ devicesDir }, 'Devices config dir not found, starting empty')
      return
    }

    const files = fs.readdirSync(devicesDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    for (const file of files) {
      const raw = fs.readFileSync(path.join(devicesDir, file), 'utf8')
      const parsed = YAML.parse(raw) as DeviceConfig | DeviceConfig[]
      const list = Array.isArray(parsed) ? parsed : [parsed]
      for (const device of list) {
        this.devices.set(device.id, device)
        logger.debug({ id: device.id, type: device.type, room: device.room }, 'Device loaded')
      }
    }
    logger.info({ count: this.devices.size }, 'Device registry loaded')
  }

  get(id: string): DeviceConfig | undefined {
    return this.devices.get(id)
  }

  getAll(): DeviceConfig[] {
    return Array.from(this.devices.values())
  }

  getByRoom(room: string): DeviceConfig[] {
    return this.getAll().filter((d) => d.room === room)
  }

  getByType(type: string): DeviceConfig[] {
    return this.getAll().filter((d) => d.type === type)
  }

  getRooms(): string[] {
    return [...new Set(this.getAll().map((d) => d.room))]
  }

  /** Called when a device announces itself via home/{room}/{type}/{id}/config */
  register(device: DeviceConfig): void {
    this.devices.set(device.id, device)
    logger.info({ id: device.id }, 'Device auto-registered')
  }
}
