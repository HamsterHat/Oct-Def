#define HIGHP

uniform sampler2D u_texture;
uniform vec2 u_offset;
uniform float u_angle;
uniform float u_side;

varying vec2 v_texCoords;
varying vec4 v_color;

void main(){
    vec2 pos = v_texCoords - vec2(0.5);
    float angleRad = radians(u_angle);
    
    float d = (pos.x * cos(angleRad) + pos.y * sin(angleRad));

    if(d * u_side > 0.0){
        discard;
    }

    gl_FragColor = texture2D(u_texture, v_texCoords) * v_color;
}
