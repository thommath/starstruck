import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RedStar, Star, createRedStar, createStar } from './star'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import bloomVert from './shaders/bloom.vert.glsl'
import bloomFrag from './shaders/bloom.frag.glsl'
import Stats from 'stats.js'
import { Player, createPlayer } from './player'
import { fasterSpawning } from './effect'
import { runAI } from './ai'

export const ATTACK_DISTANCE = 70

const stats = new Stats()
stats.showPanel(0) // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom)

const ENTIRE_SCENE = 0,
    BLOOM_SCENE = 1

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = -250

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enablePan = true
controls.enableRotate = false

const player = createPlayer('Thomas', new THREE.Color('rgba(255, 255, 255)'))
player.effects.push(fasterSpawning(1))

const neutral = createPlayer('Neutral', new THREE.Color('rgba(200, 200, 100)'))
neutral.effects.push(fasterSpawning(20))

const ai = createPlayer('AI', new THREE.Color('rgba(255, 50, 50)'))

const redStars: RedStar[] = []
const spawnRedStar = (owner: Player, position: THREE.Vector3) => {
    const redStar = createRedStar(owner, position, scene)
    scene.add(redStar.data.mesh)
    redStars.push(redStar)
    return redStar
}

const stars: Star[] = []

const spawnStar = (redStar: RedStar) => {
    const star = createStar(redStar)
    scene.add(star.mesh)
    stars.push(star)
}

spawnRedStar(player, new THREE.Vector3(0, 0, 0))
spawnRedStar(ai, new THREE.Vector3(-200, -200, 0))

for (let i = 0; i < 100; i++) {
    const spawnPoint = new THREE.Vector3(Math.random() * -200, Math.random() * -200, 0)
    if (redStars.some((star) => star.data.mesh.position.distanceTo(spawnPoint) < 40)) {
        continue
    }
    spawnRedStar(neutral, spawnPoint)
}

for (let i = 0; i < 10; i++) {
    redStars.forEach(spawnStar)
}

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

let lastAiMove = 0
let lastTimestamp = 0
function animate(timeStamp: number) {
    if (lastTimestamp === 0) {
        lastTimestamp = timeStamp
    }
    stats.begin()
    const dt = Math.min((timeStamp - lastTimestamp) * 0.01, 10)
    lastTimestamp = timeStamp
    requestAnimationFrame(animate)

    redStars.forEach((redStar) => {
        redStar.data.mesh.rotation.x += redStar.data.rotation.x * dt * 0.05
        redStar.data.mesh.rotation.y += redStar.data.rotation.y * dt * 0.05
        redStar.data.mesh.rotation.z += redStar.data.rotation.z * dt * 0.05

        const childCount = stars.filter((star) => star.parent === redStar).length

        redStar.data.timeToSpawn -= dt

        const starType = redStar.data.owner.effects
            .filter((effect) => effect.type === 'StarProperties')
            .reduce((acc, cur) => cur.func(acc), redStar.data.starType)

        if (redStar.data.timeToSpawn < 0) {
            if (childCount < 200) {
                spawnStar(redStar)
            }
            redStar.data.timeToSpawn = starType.spawnDelay
        }
    })

    stars.forEach((star) => {
        star.mesh.rotation.x += star.rotation.x * dt * 0.1
        star.mesh.rotation.y += star.rotation.y * dt * 0.1
        star.mesh.rotation.z += star.rotation.z * dt * 0.1

        if (star.orbiting) {
            const vectorToOribit = star.mesh.position.clone().sub(star.orbiting.data.mesh.position)
            const directionToStar = vectorToOribit.normalize()
            star.vel.addScaledVector(directionToStar, -0.05 * dt)
            star.vel.clampLength(-2, 2)
        }
        if (star.attacking) {
            const vectorToOribit = star.mesh.position.clone().sub(star.attacking.data.mesh.position)
            const directionToStar = vectorToOribit.normalize()
            star.vel.addScaledVector(directionToStar, -0.65 * dt)
            star.vel.clampLength(-3, 3)
        }

        star.mesh.position.x += star.vel.x * dt
        star.mesh.position.y += star.vel.y * dt
        star.mesh.position.z += star.vel.z * dt

        if (
            star.orbiting &&
            star.mesh.position.distanceTo(star.orbiting.data.mesh.position) <
                star.orbiting.data.starType.radius
        ) {
            scene.remove(star.mesh)
            stars.splice(stars.indexOf(star), 1)
        }
        if (
            star.attacking &&
            star.mesh.position.distanceTo(star.attacking.data.mesh.position) <
                star.attacking.data.starType.radius
        ) {
            scene.remove(star.mesh)
            stars.splice(stars.indexOf(star), 1)

            const attackedStar = star.attacking

            if (attackedStar.data.owner === star.owner) {
                if (star.attacking === star.parent && star.attacking.data.health < 500) {
                    attackedStar.updateHealth(2, star.owner)
                } else {
                    spawnStar(star.attacking)
                }
                return
            }

            const defender = stars.find((s) => s.parent === attackedStar && s.orbiting)
            if (defender) {
                scene.remove(defender.mesh)
                stars.splice(stars.indexOf(defender), 1)
            } else {
                attackedStar.updateHealth(2, star.owner)
            }
        }
    })

    controls.update()

    render()

    if (timeStamp - lastAiMove > 500) {
        runAI(player, redStars, stars)
        runAI(ai, redStars, stars)
        lastAiMove = timeStamp
    }
    stats.end()
}

const bloomLayer = new THREE.Layers()
bloomLayer.set(BLOOM_SCENE)

const params = {
    exposure: 1,
    bloomStrength: 2.5,
    bloomThreshold: 0,
    bloomRadius: 1,
    scene: 'Scene with Glow',
}
const renderScene = new RenderPass(scene, camera)
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,
    0.4,
    0.85
)
bloomPass.threshold = params.bloomThreshold
bloomPass.strength = params.bloomStrength
bloomPass.radius = params.bloomRadius

const bloomComposer = new EffectComposer(renderer)
bloomComposer.renderToScreen = false
bloomComposer.addPass(renderScene)
bloomComposer.addPass(bloomPass)

const finalPass = new ShaderPass(
    new THREE.ShaderMaterial({
        uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: bloomComposer.renderTarget2.texture },
        },
        vertexShader: bloomVert,
        fragmentShader: bloomFrag,
        defines: {},
    }),
    'baseTexture'
)
finalPass.needsSwap = true

const finalComposer = new EffectComposer(renderer)
finalComposer.addPass(renderScene)
finalComposer.addPass(finalPass)

function render() {
    camera.layers.set(BLOOM_SCENE)
    bloomComposer.render()
    camera.layers.set(ENTIRE_SCENE)
    finalComposer.render()
}

animate(0)

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let fromStar: undefined | RedStar
renderer.domElement.addEventListener('mousedown', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const intersections = raycaster.intersectObjects(redStars.map((star) => star.data.mesh))
    if (intersections.length > 0) {
        fromStar = redStars.find((star) => star.data.mesh === intersections[0].object)
    }
})
renderer.domElement.addEventListener('mouseup', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    const intersections = raycaster.intersectObjects(redStars.map((star) => star.data.mesh))
    if (intersections.length > 0) {
        const toStar = redStars.find((star) => star.data.mesh === intersections[0].object)

        if (
            fromStar &&
            toStar &&
            fromStar.data.mesh.position.distanceTo(toStar.data.mesh.position) < ATTACK_DISTANCE
        ) {
            stars
                .filter((star) => star.parent === fromStar)
                .forEach((star) => {
                    // star.owner = toStar
                    star.orbiting = undefined
                    star.attacking = toStar
                })
        }
    }
})
