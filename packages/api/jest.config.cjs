/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    moduleNameMapper: {
        '^@inventory-system/shared-types$': '<rootDir>/../shared-types/src/index.ts',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
