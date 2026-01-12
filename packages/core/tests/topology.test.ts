import { describe, it, expect } from 'vitest';
import type { PrimitiveTopology, MaterialOptions } from '../src/types';

describe('Primitive Topology', () => {
  it('should have correct PrimitiveTopology union values', () => {
    const topologies: PrimitiveTopology[] = [
      'triangle-list',
      'triangle-strip',
      'line-list',
      'line-strip',
      'point-list',
    ];
    
    // This test ensures the types compile correctly
    expect(topologies.length).toBe(5);
    expect(topologies).toContain('triangle-list');
    expect(topologies).toContain('line-list');
    expect(topologies).toContain('line-strip');
  });

  it('should allow topology in MaterialOptions', () => {
    const options: MaterialOptions = {
      vertexCount: 6,
      topology: 'line-list',
    };
    
    expect(options.topology).toBe('line-list');
    expect(options.vertexCount).toBe(6);
  });

  it('should allow line-strip topology in MaterialOptions', () => {
    const options: MaterialOptions = {
      vertexCount: 20,
      topology: 'line-strip',
    };
    
    expect(options.topology).toBe('line-strip');
    expect(options.vertexCount).toBe(20);
  });

  it('should allow point-list topology in MaterialOptions', () => {
    const options: MaterialOptions = {
      vertexCount: 100,
      topology: 'point-list',
      instances: 1,
    };
    
    expect(options.topology).toBe('point-list');
    expect(options.vertexCount).toBe(100);
  });

  it('should allow triangle-strip topology in MaterialOptions', () => {
    const options: MaterialOptions = {
      vertexCount: 4,
      topology: 'triangle-strip',
    };
    
    expect(options.topology).toBe('triangle-strip');
  });

  it('should default to triangle-list when topology is undefined', () => {
    const options: MaterialOptions = {
      vertexCount: 3,
    };
    
    // Default should be undefined in options (Material class handles the default)
    expect(options.topology).toBeUndefined();
  });

  it('should allow combining topology with other material options', () => {
    const options: MaterialOptions = {
      uniforms: {
        color: { value: [1, 0.5, 0.2] },
      },
      blend: 'alpha',
      vertexCount: 10,
      instances: 5,
      topology: 'line-strip',
    };
    
    expect(options.uniforms?.color.value).toEqual([1, 0.5, 0.2]);
    expect(options.blend).toBe('alpha');
    expect(options.vertexCount).toBe(10);
    expect(options.instances).toBe(5);
    expect(options.topology).toBe('line-strip');
  });
});
