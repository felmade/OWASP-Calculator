/**
 * @jest-environment jsdom
 */

import { riskConfigurations, updateRiskLevelMapping } from '../docs/js/script.js';

describe('updateRiskLevelMapping() with testMode enabled', () => {
    let originalLog;

    beforeAll(() => {
        // Speichere das Original von console.log
        originalLog = console.log;

        // Mocke console.log, damit nichts ausgegeben wird
        console.log = jest.fn();
    });

    afterAll(() => {
        // Stelle das Original von console.log wieder her
        console.log = originalLog;
    });
    const testCases = [
        // Default Configuration
        {
            config: 'Default Configuration',
            inputs: { L_score: 2, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Default Configuration',
            inputs: { L_score: 2, I_score: 4 },
            expected: { L_class: 'LOW', I_class: 'MEDIUM', RS: 'LOW' },
        },
        {
            config: 'Default Configuration',
            inputs: { L_score: 5, I_score: 5 },
            expected: { L_class: 'MEDIUM', I_class: 'MEDIUM', RS: 'MEDIUM' },
        },
        {
            config: 'Default Configuration',
            inputs: { L_score: 8, I_score: 8 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
        {
            config: 'Default Configuration',
            inputs: { L_score: 7, I_score: 5 },
            expected: { L_class: 'HIGH', I_class: 'MEDIUM', RS: 'HIGH' },
        },

        // Configuration 1
        {
            config: 'Configuration 1',
            inputs: { L_score: 2, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Configuration 1',
            inputs: { L_score: 4.5, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Configuration 1',
            inputs: { L_score: 6, I_score: 6 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
        {
            config: 'Configuration 1',
            inputs: { L_score: 7.5, I_score: 5.5 },
            expected: { L_class: 'HIGH', I_class: 'MEDIUM', RS: 'HIGH' },
        },

        // Configuration 2
        {
            config: 'Configuration 2',
            inputs: { L_score: 2, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Configuration 2',
            inputs: { L_score: 7, I_score: 7.5 },
            expected: { L_class: 'LOW', I_class: 'MEDIUM', RS: 'LOW' },
        },
        {
            config: 'Configuration 2',
            inputs: { L_score: 8.5, I_score: 9 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
        {
            config: 'Configuration 2',
            inputs: { L_score: 8.5, I_score: 7.5 },
            expected: { L_class: 'HIGH', I_class: 'MEDIUM', RS: 'HIGH' },
        },

        // Configuration 3
        {
            config: 'Configuration 3',
            inputs: { L_score: 2, I_score: 2 },
            expected: { L_class: 'LOW', I_class: 'LOW', RS: 'NOTE' },
        },
        {
            config: 'Configuration 3',
            inputs: { L_score: 6, I_score: 7.5 },
            expected: { L_class: 'LOW', I_class: 'HIGH', RS: 'MEDIUM' },
        },
        {
            config: 'Configuration 3',
            inputs: { L_score: 7.5, I_score: 8.5 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
        {
            config: 'Configuration 3',
            inputs: { L_score: 6.5, I_score: 6.5 },
            expected: { L_class: 'MEDIUM', I_class: 'MEDIUM', RS: 'MEDIUM' },
        },
        {
            config: 'Configuration 3',
            inputs: { L_score: 8, I_score: 7 },
            expected: { L_class: 'HIGH', I_class: 'HIGH', RS: 'CRITICAL' },
        },
    ];

    testCases.forEach(({ config, inputs, expected }, index) => {
        test(`Test Case ${index + 1} for ${config}`, () => {
            const result = updateRiskLevelMapping(
                true, // Aktiviert testMode
                inputs.L_score,
                inputs.I_score,
                config
            );

            expect(result).toEqual(expected);
        });
    });
});
