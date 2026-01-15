import * as RalphGPU from '../../src';
import * as RalphTestUtils from './test-utils';

(window as any).RalphGPU = RalphGPU;
(window as any).RalphTestUtils = RalphTestUtils;

console.log('RalphGPU and RalphTestUtils loaded', { RalphGPU, RalphTestUtils });
