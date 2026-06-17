import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Brand teal preset for the admin area. Overrides Aura's default-blue primary
 * ramp with the FishMap teal palette so every PrimeNG control (buttons, focus
 * rings, active states, selects, tags) reads brand teal instead of blue.
 * Anchors: 500 = #0E7490 (brand teal), 600 = #0A5566, 700 = #0A4A5C (deep teal);
 * lighter shades derive toward a pale cyan-teal, darker toward the deep navy-teal.
 */
export const FishMapPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#ecfdff',
      100: '#cff8fc',
      200: '#a5eef6',
      300: '#67dded',
      400: '#22c2dc',
      500: '#0e7490',
      600: '#0a5566',
      700: '#0a4a5c',
      800: '#0a3d4c',
      900: '#04222c',
      950: '#021318',
    },
  },
});
