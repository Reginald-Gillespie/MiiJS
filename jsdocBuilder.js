// Generates detailed JSDoc types for decoded Mii fields based on the format JSON

import { writeFileSync } from 'fs';
import { formats, mappings } from './formats';

/**
 * Analyzes a field definition to determine its JavaScript type
 */
function getFieldType(field) {
    if (field.bool) return 'boolean';
    if (field.text) return 'string';
    if (field.hex) return 'string';
    if (field.decoder) return '*'; // Custom decoder could return anything
    if (field.len && !field.word) return 'number';
    return '*';
}

/**
 * Generates documentation for a field, combining info from multiple formats
 */
function getFieldDoc(fields, formatNames) {
    const docs = [];
    const ranges = new Map();
    const maxValues = new Map();

    // Collect all ranges and max values with their format names
    fields.forEach((field, idx) => {
        const formatName = formatNames[idx];

        if (field.min !== undefined && field.max !== undefined) {
            const key = `${field.min}-${field.max}`;
            if (!ranges.has(key)) ranges.set(key, []);
            ranges.get(key).push(formatName);
        } else if (field.max !== undefined) {
            if (!maxValues.has(field.max)) maxValues.set(field.max, []);
            maxValues.get(field.max).push(formatName);
        }
    });

    // Add range documentation
    if (ranges.size > 0) {
        if (ranges.size === 1) {
            docs.push(`Range: ${Array.from(ranges.keys())[0]}`);
        } else {
            const rangeStrs = Array.from(ranges.entries()).map(([range, fmts]) =>
                `${range} (${fmts.join(', ')})`
            );
            docs.push(rangeStrs.join('; '));
        }
    }

    // Add max documentation
    if (maxValues.size > 0 && ranges.size === 0) {
        if (maxValues.size === 1) {
            docs.push(`Max: ${Array.from(maxValues.keys())[0]}`);
        } else {
            const maxStrs = Array.from(maxValues.entries()).map(([max, fmts]) =>
                fmts.length > 2 ? `Max: ${max}` : `Max: ${max} (${fmts.join(', ')})`
            );
            docs.push(maxStrs.join('; '));
        }
    }

    // Add other field attributes (check first field for common attributes)
    const firstField = fields[0];
    if (firstField.bool) {
        docs.push('Boolean value');
    }

    if (firstField.hex) {
        docs.push('Hex string');
    }

    if (firstField.text) {
        docs.push(`Text field (${firstField.text} encoding)`);
    }

    return docs.length > 0 ? ` - ${docs.join('; ')}` : '';
}

/**
 * Collects all field information across formats
 */
function collectFieldInfo() {
    const fieldInfo = new Map();

    for (const formatKey in formats) {
        const format = formats[formatKey];
        if (!format.struct) continue;

        for (const field of format.struct) {
            if (field.word || !field.name) continue;

            const mapping = mappings[field.name];
            if (!mapping || mapping === 'SKIP') continue;

            if (!fieldInfo.has(mapping)) {
                fieldInfo.set(mapping, {
                    types: new Set(),
                    fields: [],
                    formatNames: [],
                    formatCount: 0
                });
            }

            const info = fieldInfo.get(mapping);
            info.types.add(getFieldType(field));
            info.fields.push(field);
            info.formatNames.push(formatKey);
            info.formatCount++;
        }
    }

    return fieldInfo;
}

/**
 * Builds nested object structure from dot-notation paths
 */
function buildNestedStructure(fieldInfo, totalFormats) {
    const root = {};

    for (const [path, info] of fieldInfo.entries()) {
        const parts = path.split('.');
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;

            if (isLast) {
                current[part] = {
                    ...info,
                    optional: info.formatCount < totalFormats,
                    isLeaf: true
                };
            } else {
                if (!current[part]) {
                    current[part] = { isLeaf: false };
                }
                current = current[part];
            }
        }
    }

    return root;
}

/**
 * Helper to check if any field in a tree is optional
 */
function hasOptionalInTree(node) {
    for (const key in node) {
        if (key === 'isLeaf') continue;
        const child = node[key];
        if (child.optional) return true;
        if (!child.isLeaf && hasOptionalInTree(child)) return true;
    }
    return false;
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Collects all nested typedefs that need to be generated
 */
function collectNestedTypedefs(structure, path = 'Mii', typedefs = new Map()) {
    const keys = Object.keys(structure).filter(k => k !== 'isLeaf').sort();

    for (const key of keys) {
        const value = structure[key];

        if (!value.isLeaf) {
            // This is a nested object - needs its own typedef
            const typedefName = `${path}${capitalize(key)}`;
            const fullPath = path === 'Mii' ? key : `${path.replace(/^Mii/, '')}.${key}`;

            typedefs.set(typedefName, {
                name: typedefName,
                path: fullPath,
                structure: value,
                hasOptionalChildren: hasOptionalInTree(value)
            });

            // Recursively collect nested typedefs
            collectNestedTypedefs(value, typedefName, typedefs);
        }
    }

    return typedefs;
}

/**
 * Generates a single typedef for a structure
 */
function generateSingleTypedef(name, structure, nestedTypedefs) {
    const lines = [];
    const keys = Object.keys(structure).filter(k => k !== 'isLeaf').sort();

    lines.push('/**');
    lines.push(` * @typedef {Object} ${name}`);

    for (const key of keys) {
        const value = structure[key];

        if (value.isLeaf) {
            // Leaf node - actual field
            const types = Array.from(value.types);
            const typeStr = types.length === 1 ? types[0] : `(${types.join('|')})`;
            const optional = value.optional ? '?' : '';
            const docStr = getFieldDoc(value.fields, value.formatNames);

            lines.push(` * @property {${typeStr}} ${key}${optional}${docStr}`);
        } else {
            // Branch node - reference to nested typedef
            const nestedTypedefName = `${name}${capitalize(key)}`;
            const optional = hasOptionalInTree(value) ? '?' : '';

            lines.push(` * @property {${nestedTypedefName}} ${key}${optional}`);
        }
    }

    lines.push(' */');

    return lines.join('\n');
}

/**
 * Main generation function
 */
function generateTypedef() {
    const fieldInfo = collectFieldInfo();
    const totalFormats = Object.keys(formats).filter(k => formats[k].struct).length;
    const structure = buildNestedStructure(fieldInfo, totalFormats);

    // Collect all nested typedefs
    const nestedTypedefs = collectNestedTypedefs(structure);

    // Generate all nested typedefs first (in dependency order - deepest first)
    const typedefArray = Array.from(nestedTypedefs.values());
    typedefArray.sort((a, b) => {
        // Sort by depth (deeper first) then alphabetically
        const depthA = (a.name.match(/[A-Z]/g) || []).length;
        const depthB = (b.name.match(/[A-Z]/g) || []).length;
        if (depthB !== depthA) return depthB - depthA;
        return a.name.localeCompare(b.name);
    });

    const nestedTypedefStrings = typedefArray.map(td =>
        generateSingleTypedef(td.name, td.structure, nestedTypedefs)
    );

    // Generate main typedef
    const mainTypedef = generateSingleTypedef('Mii', structure, nestedTypedefs);

    const output = [
        '// Auto-generated JSDoc type definitions for Mii data structures',
        '// Generated: ' + new Date().toISOString(),
        '',
        '// Nested type definitions',
        ...nestedTypedefStrings,
        '',
        '// Main Mii type',
        mainTypedef,
        '',
        'module.exports = {};'
    ].join('\n');

    writeFileSync('mii-jsdoc.js', output);
    console.log('✓ Generated mii-jsdoc.js');
    console.log(`  - ${fieldInfo.size} unique properties`);
    console.log(`  - ${typedefArray.length + 1} type definitions`);
    console.log(`  - Analyzed ${totalFormats} format structures`);
}

// Run if called directly
if (require.main === module) {
    try {
        generateTypedef();
    } catch (error) {
        console.error('Error generating typedef:', error);
        process.exit(1);
    }
}

export default { generateTypedef };