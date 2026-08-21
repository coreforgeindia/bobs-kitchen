import cheeseSandwich from './images/cheese_sandwich.png'
import chickenJalfreziSnackPack from './images/chicken-jalfrezi-snack-pack.png'
import chickenSnackPack from './images/chicken-snack-pack.jpg'
import chickenBurger from './images/chicken_burger.png'
import chickenJalfreziRoll from './images/chicken_jalfrezi_wrap.png'
import chickenTikkaSandwich from './images/chicken_tikka_sandwich.png'
import crunchyPaneerRoll from './images/crunchy_paneer_wrap.png'
import paneerTikkaSandwich from './images/paneer_tikka_sandwich.png'
import periPeriFries from './images/peri_peri_fries.png'
import tawaChickenRoll from './images/tawa_grilled_chicken_wrap.png'
import vegBurger from './images/veg_burger.png'
import vegSnackPack from './images/veg-snack-pack.jpg'
import potatoSmilies from './images/image.png'

const source = (asset: { src: string }) => asset.src

export const assets = {
  cheeseSandwich: source(cheeseSandwich),
  chickenJalfreziSnackPack: source(chickenJalfreziSnackPack),
  chickenSnackPack: source(chickenSnackPack),
  chickenBurger: source(chickenBurger),
  chickenJalfreziRoll: source(chickenJalfreziRoll),
  chickenTikkaSandwich: source(chickenTikkaSandwich),
  crunchyPaneerRoll: source(crunchyPaneerRoll),
  paneerTikkaSandwich: source(paneerTikkaSandwich),
  periPeriFries: source(periPeriFries),
  tawaChickenRoll: source(tawaChickenRoll),
  vegBurger: source(vegBurger),
  vegSnackPack: source(vegSnackPack),
  potatoSmilies: source(potatoSmilies),
} as const

export type AssetName = keyof typeof assets