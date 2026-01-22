import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params

    if (!token) {
        return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    try {
        // Create Supabase admin client at request time (not module level)
        // This avoids build-time errors when env vars aren't available
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Search in both tables and multiple token fields
        const tables = ['contrats', 'devis']
        const tokenFields = ['access_token_contrat', 'access_token_devis', 'access_token']

        let foundItem = null
        let foundMode: 'devis' | 'contrat' = 'contrat'

        for (const table of tables) {
            for (const field of tokenFields) {
                const { data, error } = await supabaseAdmin
                    .from(table)
                    .select('*')
                    .eq(`data->>${field}`, token)
                    .maybeSingle()

                if (error) {
                    console.error(`Error querying ${table} with ${field}:`, error)
                    continue
                }

                if (data) {
                    foundItem = data
                    if (field === 'access_token_devis') foundMode = 'devis'
                    else if (field === 'access_token_contrat') foundMode = 'contrat'
                    else foundMode = data.id?.startsWith('C') ? 'contrat' : 'devis'
                    break
                }
            }
            if (foundItem) break
        }

        if (!foundItem) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Also fetch settings
        const { data: settingsData } = await supabaseAdmin
            .from('settings')
            .select('data')
            .limit(1)
            .maybeSingle()

        return NextResponse.json({
            contract: { ...foundItem, ...foundItem.data, _forcedMode: foundMode },
            settings: settingsData?.data || null
        })

    } catch (err) {
        console.error('Error in sign API:', err)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
