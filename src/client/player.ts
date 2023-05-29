import { Color } from 'three'
import { Effect } from './effect'

export type Player = ReturnType<typeof createPlayer>

export const createPlayer = (name: string, color?: Color) => {
    return {
        name,
        score: 0,
        color: color || new Color('rgba(255, 255, 255)'),
        effects: [] as Effect[],
    }
}
