A Game of Hives - Premium Glossy GTAC Die
==========================================

3D model: a_game_of_hives_dice_gtac_glossy.glb
File format: glTF 2.0 binary GLB, standalone with embedded texture
Dimensions: 1 x 1 x 1 game unit; Y-up; origin at centre

Face artwork: original print-and-play dice net supplied by GTAC.
Colour palette: official GTAC Brand and Style Guide v1.02, pp. 12-13.

Full-colour glossy faces and contrasting icons:
  Two improvement ? faces: Cobalt Blue  #4C34E5  (white icon)
  Pesticides:            Sodium Flame #FF6D3A  (Onyx icon)
  Extreme Weather:       Plum         #821E50  (white icon)
  Varroa mite:           Cadmium Yellow #FFCD1F (Onyx icon)
  Climate Change:        Chlorophyll Green #00BC74 (Onyx icon)
  Rounded ceramic shell: Eggshell #F9F6E7

Physically based glTF material:
  KHR_materials_clearcoat clearcoatFactor=0.92, clearcoatRoughnessFactor=0.075
  metallicFactor=0.055, roughnessFactor=0.19

This makes the die respond to scene lighting as a high-gloss finished object.
For attractive reflections in Three.js, use an environment map and directional
or area lighting. The preview has its own simulated studio lighting.

Face outward normals when die is unrotated:
  +Z Extreme Weather
  -Z Climate Change / Habitat Loss
  +X Varroa Mite
  -X Improvement (question mark)
  +Y Pesticides
  -Y Improvement (question mark)

Three.js:
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
  new GLTFLoader().load('/models/a_game_of_hives_dice_gtac_glossy.glb', ({scene: die}) => {
    die.position.y = 0.5;
    scene.add(die);
  });

For dice physics use a box collider of size 1 x 1 x 1 and determine the
winning face from its world-space upward normal. The GLB is graphics only.
