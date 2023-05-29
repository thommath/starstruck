import {
    IcosahedronGeometry,
    Mesh,
    Scene,
    ShaderMaterial,
    Vector2,
    FrontSide,
    PointLight,
    Color,
    Vector3,
} from 'three'
import starVert from './shaders/verttest.glsl'
import starFragment from './shaders/fragtest.glsl'
import { Player } from './player'

export type Star = {
    mesh: Mesh<IcosahedronGeometry, ShaderMaterial>
    vel: Vector3
    rotation: Vector3
    orbiting?: RedStar
    attacking?: RedStar
    parent: RedStar
    owner: Player
}

const geometry = new IcosahedronGeometry(2, 30)
const distance = 15
export const createStar = (redStar: RedStar): Star => {
    const material = new ShaderMaterial({
        uniforms: {
            time: { value: 1.0 },
            resolution: { value: new Vector2() },
            color: { value: redStar.data.owner.color },
        },

        vertexShader: starVert,
        fragmentShader: starFragment,

        side: FrontSide,
    })

    const cube = new Mesh(geometry, material)
    cube.layers.enable(1)

    let pos = new Vector3(Math.random(), Math.random(), Math.random())
        .subScalar(0.5)
        .normalize()
        .multiplyScalar(distance + Math.random() * 5)

    const randvec = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
    const vel = randvec
        .cross(pos)
        .normalize()
        .multiplyScalar(1 + Math.random() * 0.0)

    pos.add(redStar.data.mesh.position)

    cube.translateX(pos.x)
    cube.translateY(pos.y)
    cube.translateZ(pos.z)

    return {
        mesh: cube,
        vel: vel,
        rotation: new Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        orbiting: redStar,
        attacking: undefined,
        parent: redStar,
        owner: redStar.data.owner,
    }
}

export type RedStar = ReturnType<typeof createRedStar>

export type StarProperties = {
    spawnDelay: number
    radius: number
    maxStars: number
}

const smallStar: StarProperties = {
    spawnDelay: 10,
    radius: 5,
    maxStars: 50,
}
const mediumStar: StarProperties = {
    spawnDelay: 5,
    radius: 8,
    maxStars: 100,
}
const largeStar: StarProperties = {
    spawnDelay: 2,
    radius: 12,
    maxStars: 200,
}

export type RedStarData = {
    vel: Vector3
    rotation: Vector3
    owner: Player
    health: number
    mesh: Mesh
    starType: StarProperties
    timeToSpawn: number
}

export const createRedStar = (owner: Player, position: Vector3, scene: Scene) => {
    const pos = position || new Vector3(0, 0, 0)

    const redStarData: RedStarData = {
        vel: new Vector3(0, 0, 0),
        rotation: new Vector3(Math.random(), Math.random(), Math.random()).normalize(),
        owner,
        health: 50,
        mesh: undefined as any as Mesh,
        starType: smallStar,
        timeToSpawn: smallStar.spawnDelay,
    }

    const createMesh = () => {
        const geometry = new IcosahedronGeometry(redStarData.starType.radius, 70)
        const material = new ShaderMaterial({
            uniforms: {
                time: { value: 1.0 },
                resolution: { value: new Vector2() },
                color: { value: redStarData.owner.color },
            },

            vertexShader: starVert,
            fragmentShader: starFragment,

            side: FrontSide,
        })
        let cube = new Mesh(geometry, material)
        cube.layers.enable(1)
        cube.translateX(pos.x)
        cube.translateY(pos.y)
        cube.translateZ(pos.z)
        return cube
    }

    const updateMesh = () => {
        scene.remove(redStarData.mesh)
        redStarData.mesh = createMesh()
        scene.add(redStarData.mesh)
    }

    const setOwner = (owner: Player) => {
        if (redStarData.owner !== owner) {
            redStarData.owner = owner
            updateMesh()
        }
    }

    const updateHealth = (delta: number, owner: Player) => {
        if (owner != redStarData.owner) {
            redStarData.health -= delta
        } else {
            redStarData.health += delta
        }

        if (redStarData.health < 0) {
            setOwner(owner)
            redStarData.health = 20
        }

        if (redStarData.health < 100) {
            if (redStarData.starType != smallStar) {
                redStarData.starType = smallStar
                redStarData.timeToSpawn = redStarData.starType.spawnDelay
                updateMesh()
            }
        } else if (redStarData.health < 200) {
            if (redStarData.starType != mediumStar) {
                redStarData.starType = mediumStar
                redStarData.timeToSpawn = redStarData.starType.spawnDelay
                updateMesh()
            }
        } else {
            if (redStarData.starType != largeStar) {
                redStarData.starType = largeStar
                redStarData.timeToSpawn = redStarData.starType.spawnDelay
                updateMesh()
            }
        }
    }

    redStarData.mesh = createMesh()
    return {
        data: redStarData,
        createMesh,
        setOwner,
        updateHealth,
    }
}
