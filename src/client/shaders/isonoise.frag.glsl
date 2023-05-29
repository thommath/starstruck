
#define ss(a, b, c) smoothstep(a, b, c)
uniform float bloom;
uniform vec3 color1;
uniform vec3 color2;
varying vec3 rPos;
${shader.fragmentShader}
`
    .replace(
        `vec4 diffuseColor = vec4( diffuse, opacity );`,
        `
vec3 col = mix(color1, color2, ss(2., 6., length(rPos)));
vec4 diffuseColor = vec4( col, opacity );
`
    )
    .replace(
        `#include <dithering_fragment>`,
        `#include <dithering_fragment>

//https://madebyevan.com/shaders/grid/
float coord = length(rPos) * 4.;
float line = abs(fract(coord - 0.5) - 0.5) / fwidth(coord) / 1.25;
float grid = 1.0 - min(line, 1.0);
//////////////////////////////////////

gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0), bloom);
gl_FragColor.rgb = mix(gl_FragColor.rgb, col * 2., grid);
