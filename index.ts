import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { PersonNames } from './data/names.js'

const server = new McpServer({ name: 'char-gen-mcp', version: '1.0.0' })
const personNameDemographic = Object.keys(PersonNames) as [string, ...string[]]

function getRandomElement<T>(array: T[]): T {
    if (array.length === 0) {
        throw new Error('Cannot get random element from empty array')
    }
    return array[Math.floor(Math.random() * array.length)]!
}

interface NameResult {
    firstName: string
    lastName?: string
}

function generateName(language: string, omitLastName: boolean): NameResult {
    const nameData = PersonNames[language as keyof typeof PersonNames]
    
    const useFemale = Math.random() < 0.5
    
    const firstNamePool = useFemale ? nameData.Female : nameData.Male
    const firstName = getRandomElement(firstNamePool)
    
    if (omitLastName) {
        return { firstName }
    }
    
    const lastNamePool = [...nameData.Female, ...nameData.Male]
    
    let lastName = getRandomElement(lastNamePool)
    let attempts = 0
    const maxAttempts = 10
    
    while (lastName === firstName && attempts < maxAttempts) {
        lastName = getRandomElement(lastNamePool)
        attempts++
    }
    
    if (language === 'JP') {
        return {
            firstName: lastName,
            lastName: firstName
        }
    }
    
    return { firstName, lastName }
}

server.registerTool(
    'generate-character',
    {
        title: 'Generate Random Character Name',
        description: 
            'Generates a random character name based on the specified language demography. ' +
            'This tool creates realistic names by randomly selecting from gender-specific given name pools ' +
            'and combined family name pools. ' +
            'Supports English (EN), French (FR), German (DE), and Japanese (JP) names. ' +
            'Note: Japanese names are returned in traditional format (family name before given name), ' +
            'while Western names use the standard format (given name before family name). ' +
            'The returned firstName field always contains the actual given name, and lastName contains the family name.',
        inputSchema: {
            languageDemography: z.enum(personNameDemographic)
                .describe(
                    `The cultural/linguistic background for the character's name. ` +
                    `This determines the naming pool and format. ` +
                    `Available options: EN (English), FR (French), DE (German), JP (Japanese). ` +
                    `Example: "JP" for a Japanese character, "EN" for an English character.`
                ),
            omitLastName: z.boolean()
                .describe(
                    'Set to true to generate only a given name without a family name. ' +
                    'Useful for mononymous characters or when only a first name is needed. ' +
                    'Default is false (includes both given and family names).'
                )
                .default(false)
                .optional()
        },
        outputSchema: {
            firstName: z.string()
                .describe(
                    'The given name (first name) of the generated character. ' +
                    'For Japanese names, this is the given name (not the family name), ' +
                    'even though Japanese convention places family name first.'
                ),
            lastName: z.string()
                .describe(
                    'The family name (surname/last name) of the generated character. ' +
                    'Only included when omitLastName is false. ' +
                    'For Japanese names, this is the family name (myōji), ' +
                    'which is traditionally placed before the given name in Japanese text.'
                )
                .optional()
        }
    },
    async (input) => {
        const { languageDemography, omitLastName = false } = input
        const result = generateName(languageDemography, omitLastName)
        
        return {
            content: [
                {
                    type: 'text' as const,
                    text: JSON.stringify(result)
                }
            ]
        }
    }
)

const transport = new StdioServerTransport()
await server.connect(transport)
