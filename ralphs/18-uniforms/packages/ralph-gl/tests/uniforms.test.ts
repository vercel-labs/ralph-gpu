import { describe, it, expect } from 'vitest';
import {
  extractUniforms,
  injectGlobalUniforms,
  injectCustomUniforms,
  detectUniformType,
  unwrapUniformValue,
  generateUniformDeclaration,
  setUniform,
  UniformDescriptor,
  RenderTarget,
} from '../src/uniforms.js';

describe('Uniforms', () => {
  describe('extractUniforms', () => {
    it('should extract simple float uniform', () => {
      const source = 'uniform float u_time;';
      const uniforms = extractUniforms(source);
      expect(uniforms).toEqual([
        { name: 'u_time', type: 'float' }
      ]);
    });

    it('should extract vec2/vec3/vec4 uniforms', () => {
      const source = `
        uniform vec2 u_resolution;
        uniform vec3 u_color;
        uniform vec4 u_params;
      `;
      const uniforms = extractUniforms(source);
      expect(uniforms).toHaveLength(3);
      expect(uniforms[0]).toEqual({ name: 'u_resolution', type: 'vec2' });
      expect(uniforms[1]).toEqual({ name: 'u_color', type: 'vec3' });
      expect(uniforms[2]).toEqual({ name: 'u_params', type: 'vec4' });
    });

    it('should extract int and ivec uniforms', () => {
      const source = `
        uniform int u_count;
        uniform ivec2 u_size;
        uniform ivec3 u_indices;
        uniform ivec4 u_flags;
      `;
      const uniforms = extractUniforms(source);
      expect(uniforms).toHaveLength(4);
      expect(uniforms[0]).toEqual({ name: 'u_count', type: 'int' });
      expect(uniforms[1]).toEqual({ name: 'u_size', type: 'ivec2' });
      expect(uniforms[2]).toEqual({ name: 'u_indices', type: 'ivec3' });
      expect(uniforms[3]).toEqual({ name: 'u_flags', type: 'ivec4' });
    });

    it('should extract mat2/mat3/mat4 uniforms', () => {
      const source = `
        uniform mat2 u_rotation2D;
        uniform mat3 u_normalMatrix;
        uniform mat4 u_modelViewProjection;
      `;
      const uniforms = extractUniforms(source);
      expect(uniforms).toHaveLength(3);
      expect(uniforms[0]).toEqual({ name: 'u_rotation2D', type: 'mat2' });
      expect(uniforms[1]).toEqual({ name: 'u_normalMatrix', type: 'mat3' });
      expect(uniforms[2]).toEqual({ name: 'u_modelViewProjection', type: 'mat4' });
    });

    it('should extract sampler2D uniforms', () => {
      const source = 'uniform sampler2D u_texture;';
      const uniforms = extractUniforms(source);
      expect(uniforms).toEqual([
        { name: 'u_texture', type: 'sampler2D' }
      ]);
    });

    it('should extract array uniforms', () => {
      const source = 'uniform vec3 u_lights[4];';
      const uniforms = extractUniforms(source);
      expect(uniforms).toEqual([
        { name: 'u_lights', type: 'vec3', arraySize: 4 }
      ]);
    });

    it('should handle full shader with multiple uniforms', () => {
      const source = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform sampler2D u_prevFrame;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  fragColor = texture(u_prevFrame, uv);
}`;
      const uniforms = extractUniforms(source);
      expect(uniforms).toHaveLength(3);
      expect(uniforms.map(u => u.name)).toEqual(['u_time', 'u_resolution', 'u_prevFrame']);
    });
  });

  describe('injectGlobalUniforms', () => {
    it('should inject u_time when used but not declared', () => {
      const source = `#version 300 es
precision highp float;

void main() {
  float t = u_time * 0.5;
}`;
      const result = injectGlobalUniforms(source);
      expect(result).toContain('uniform float u_time;');
    });

    it('should inject u_resolution when used but not declared', () => {
      const source = `#version 300 es
precision highp float;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
}`;
      const result = injectGlobalUniforms(source);
      expect(result).toContain('uniform vec2 u_resolution;');
    });

    it('should not inject when uniform is already declared', () => {
      const source = `#version 300 es
precision highp float;
uniform float u_time;

void main() {
  float t = u_time * 0.5;
}`;
      const result = injectGlobalUniforms(source);
      // Should only have one occurrence of u_time declaration
      const matches = result.match(/uniform float u_time/g);
      expect(matches).toHaveLength(1);
    });

    it('should not inject when uniform is not used', () => {
      const source = `#version 300 es
precision highp float;

void main() {
  float x = 1.0;
}`;
      const result = injectGlobalUniforms(source);
      expect(result).not.toContain('uniform float u_time;');
    });

    it('should inject multiple global uniforms when used', () => {
      const source = `#version 300 es
precision highp float;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time;
  int f = u_frame;
  float dt = u_deltaTime;
}`;
      const result = injectGlobalUniforms(source);
      expect(result).toContain('uniform vec2 u_resolution;');
      expect(result).toContain('uniform float u_time;');
      expect(result).toContain('uniform int u_frame;');
      expect(result).toContain('uniform float u_deltaTime;');
    });

    it('should place declarations after version and precision', () => {
      const source = `#version 300 es
precision highp float;

void main() {
  float t = u_time;
}`;
      const result = injectGlobalUniforms(source);
      const lines = result.split('\n');
      const versionIndex = lines.findIndex(l => l.includes('#version'));
      const precisionIndex = lines.findIndex(l => l.includes('precision'));
      const uniformIndex = lines.findIndex(l => l.includes('uniform float u_time'));
      
      expect(uniformIndex).toBeGreaterThan(versionIndex);
      expect(uniformIndex).toBeGreaterThan(precisionIndex);
    });
  });

  describe('detectUniformType', () => {
    it('should detect number as float', () => {
      expect(detectUniformType(1.5)).toBe('float');
      expect(detectUniformType(0)).toBe('float');
      expect(detectUniformType(-42)).toBe('float');
    });

    it('should detect arrays as vec2/vec3/vec4', () => {
      expect(detectUniformType([1, 2])).toBe('vec2');
      expect(detectUniformType([1, 2, 3])).toBe('vec3');
      expect(detectUniformType([1, 2, 3, 4])).toBe('vec4');
    });

    it('should detect Float32Array by length', () => {
      expect(detectUniformType(new Float32Array(2))).toBe('vec2');
      expect(detectUniformType(new Float32Array(3))).toBe('vec3');
      expect(detectUniformType(new Float32Array(4))).toBe('vec4');
      expect(detectUniformType(new Float32Array(9))).toBe('mat3');
      expect(detectUniformType(new Float32Array(16))).toBe('mat4');
    });

    it('should detect Int32Array by length', () => {
      expect(detectUniformType(new Int32Array(2))).toBe('ivec2');
      expect(detectUniformType(new Int32Array(3))).toBe('ivec3');
      expect(detectUniformType(new Int32Array(4))).toBe('ivec4');
    });

    it('should detect RenderTarget as sampler2D', () => {
      const rt: RenderTarget = { texture: null, width: 512, height: 512 };
      expect(detectUniformType(rt)).toBe('sampler2D');
    });

    it('should throw for unsupported types', () => {
      expect(() => detectUniformType([1] as any)).toThrow();
      expect(() => detectUniformType(new Float32Array(5))).toThrow();
    });
  });

  describe('unwrapUniformValue', () => {
    it('should unwrap { value: X } pattern', () => {
      expect(unwrapUniformValue({ value: 1.5 })).toBe(1.5);
      expect(unwrapUniformValue({ value: [1, 2, 3] })).toEqual([1, 2, 3]);
    });

    it('should pass through raw values', () => {
      expect(unwrapUniformValue(1.5)).toBe(1.5);
      expect(unwrapUniformValue([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('generateUniformDeclaration', () => {
    it('should generate float declaration', () => {
      expect(generateUniformDeclaration('u_time', 1.0)).toBe('uniform float u_time;');
    });

    it('should generate vec declarations', () => {
      expect(generateUniformDeclaration('u_pos', [1, 2])).toBe('uniform vec2 u_pos;');
      expect(generateUniformDeclaration('u_color', [1, 2, 3])).toBe('uniform vec3 u_color;');
      expect(generateUniformDeclaration('u_params', [1, 2, 3, 4])).toBe('uniform vec4 u_params;');
    });

    it('should generate mat declarations', () => {
      expect(generateUniformDeclaration('u_model', new Float32Array(16))).toBe('uniform mat4 u_model;');
      expect(generateUniformDeclaration('u_normal', new Float32Array(9))).toBe('uniform mat3 u_normal;');
    });

    it('should generate sampler2D declaration', () => {
      const rt: RenderTarget = { texture: null, width: 512, height: 512 };
      expect(generateUniformDeclaration('u_tex', rt)).toBe('uniform sampler2D u_tex;');
    });
  });

  describe('injectCustomUniforms', () => {
    it('should inject custom uniforms when used in shader', () => {
      const source = `#version 300 es
precision highp float;

void main() {
  vec3 color = u_baseColor;
  float scale = u_scale;
}`;
      const uniforms = {
        u_baseColor: { value: [1, 0, 0] as [number, number, number] },
        u_scale: { value: 2.0 },
      };
      const result = injectCustomUniforms(source, uniforms);
      expect(result).toContain('uniform vec3 u_baseColor;');
      expect(result).toContain('uniform float u_scale;');
    });

    it('should not inject if uniform is already declared', () => {
      const source = `#version 300 es
precision highp float;
uniform vec3 u_baseColor;

void main() {
  vec3 color = u_baseColor;
}`;
      const uniforms = {
        u_baseColor: { value: [1, 0, 0] as [number, number, number] },
      };
      const result = injectCustomUniforms(source, uniforms);
      const matches = result.match(/uniform vec3 u_baseColor/g);
      expect(matches).toHaveLength(1);
    });

    it('should not inject if uniform is not used', () => {
      const source = `#version 300 es
precision highp float;

void main() {
  float y = 2.0;
}`;
      const uniforms = {
        u_unused: { value: 1.0 },
      };
      const result = injectCustomUniforms(source, uniforms);
      expect(result).not.toContain('uniform float u_unused;');
    });
  });
});
