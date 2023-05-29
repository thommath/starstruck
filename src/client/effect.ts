import { StarProperties } from './star'

export type Effect = {
    type: string
    func: (obj: any) => any
}

export type StarPropertiesEffect = {
    type: 'StarProperties'
    func: (properties: StarProperties) => StarProperties
}

export const fasterSpawning: (modifier: number) => StarPropertiesEffect = (modifier = 0.8) => ({
    type: 'StarProperties',
    func: (properties) => {
        return {
            ...properties,
            spawnDelay: properties.spawnDelay * modifier,
        }
    },
})
