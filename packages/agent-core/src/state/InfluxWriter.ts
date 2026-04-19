import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client'
import { config } from '../config.js'
import { logger } from '../logger.js'

export class InfluxWriter {
  private writeApi: WriteApi

  constructor() {
    const db = new InfluxDB({ url: config.influxdb.url, token: config.influxdb.token })
    this.writeApi = db.getWriteApi(config.influxdb.org, config.influxdb.bucket, 'ms')
    this.writeApi.useDefaultTags({ host: 'domhouse' })
  }

  writeSensorValue(deviceId: string, room: string, field: string, value: number | boolean): void {
    const point = new Point('sensor')
      .tag('device_id', deviceId)
      .tag('room', room)
      .tag('field', field)

    if (typeof value === 'boolean') {
      point.booleanField('value', value)
    } else {
      point.floatField('value', value)
    }

    this.writeApi.writePoint(point)
  }

  writeDeviceStateChange(deviceId: string, room: string, state: string): void {
    const point = new Point('device_state')
      .tag('device_id', deviceId)
      .tag('room', room)
      .stringField('state', state)

    this.writeApi.writePoint(point)
  }

  writeSystemStateChange(state: string): void {
    const point = new Point('system_state')
      .stringField('state', state)

    this.writeApi.writePoint(point)
  }

  async flush(): Promise<void> {
    await this.writeApi.flush()
  }

  async close(): Promise<void> {
    await this.writeApi.close()
  }
}
