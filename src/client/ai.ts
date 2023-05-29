import { ATTACK_DISTANCE } from './client'
import { Player } from './player'
import { RedStar, Star } from './star'

const distanceBetweenStars = (starA: RedStar, starB: RedStar): number => {
    return starA.data.mesh.position.distanceTo(starB.data.mesh.position)
}

export const runAI = (player: Player, redStars: RedStar[], stars: Star[]) => {
    const myRedStars = redStars.filter((red) => red.data.owner === player)
    const myStars = stars.filter((star) => star.owner === player)

    const starsInRange = redStars.filter((otherStar) =>
        (otherStar.data.owner !== player || otherStar.data.health < 50) && 
        myRedStars.some((redStar) => distanceBetweenStars(otherStar, redStar) < ATTACK_DISTANCE)
    )

    const distanceToAllMyStars = (star: RedStar) =>
        myRedStars
            .map((myStar) => distanceBetweenStars(star, myStar))
            .reduce((acc, cur) => acc + cur, 0)

    if (starsInRange.length) {
        const orderedStarsInRange = starsInRange.sort((a, b) =>
            a.data.health - b.data.health === 0
                ? distanceToAllMyStars(a) - distanceToAllMyStars(b)
                : a.data.health - b.data.health
        )

        myRedStars.forEach((star) => {
            const children = myStars.filter((smallStar) => smallStar.parent === star)

            const starToAttack = orderedStarsInRange.find(
                (starToAttack) => distanceBetweenStars(star, starToAttack) < ATTACK_DISTANCE
            )
            if (starToAttack) {
                children.forEach((smallStar) => {
                    smallStar.attacking = starToAttack
                    smallStar.orbiting = undefined
                })
                return
            }

            let starToMoveTo: undefined | RedStar = undefined
            if (star.data.health < 100) {
                starToMoveTo = star
            } else {
                const otherStarsInRange = redStars
                    .filter((otherStar) => distanceBetweenStars(otherStar, star) < ATTACK_DISTANCE)
                    .sort(
                        (a, b) =>
                            distanceBetweenStars(a, orderedStarsInRange[0]) -
                            distanceBetweenStars(b, orderedStarsInRange[0])
                    )
                starToMoveTo = otherStarsInRange[0]
            }

            if (starToMoveTo) {
                children.forEach((smallStar) => {
                    smallStar.attacking = starToMoveTo
                    smallStar.orbiting = undefined
                })
            }
        })
    }
}
