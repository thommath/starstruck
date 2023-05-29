precision mediump float;
#include "./3d-voronoi.glsl";

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vModPosition;

uniform float uTime;

uniform vec3 color;

void main() {

    vec3 x = dFdx(vPosition);
    vec3 y = dFdy(vPosition);
    vec3 n = normalize(cross(x, y));

    vec3 low = voronoi3d(.1 * n);
    vec3 med = voronoi3d(3.1 * n);
    vec3 high = voronoi3d(10.1 * n);

    vec3 noise = pow((low + med + high) / 3., vec3(2.4)) * 1.;
    //vec3 mask = vec3(0.3, 0.3, 1.0);
    vec3 mask = vec3(1., 1.0, 1.);

    noise.z = noise.y;
    noise.y = noise.x;

    gl_FragColor = vec4(noise * mask * color, 1.);
}