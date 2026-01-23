'use server'

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"

export async function signContract(token: string, signatureBase64: string) {
    if (!token || !signatureBase64) {
        return { error: "Token ou signature manquant" }
    }

    // Use admin client to bypass RLS for public signature links
    const supabase = await createAdminClient()

    // 1. Fetch record by token in any of the potential fields
    const tables = ['contrats', 'devis'];
    const tokenFields = ['access_token_contrat', 'access_token_devis', 'access_token'];

    let record = null;
    let table: 'contrats' | 'devis' = 'contrats';
    let matchedField = '';

    for (const t of tables) {
        for (const field of tokenFields) {
            const { data, error } = await supabase
                .from(t)
                .select('id, data, nom_client, prix_total, date_debut')
                .eq(`data->>${field}`, token)
                .maybeSingle();

            if (data) {
                record = data;
                table = t as 'contrats' | 'devis';
                matchedField = field;
                break;
            }
        }
        if (record) break;
    }

    if (!record) {
        return { error: "Document introuvable ou lien invalide." }
    }

    // 2. Prepare new data with signature
    const date = new Date().toISOString()
    const isDevisToken = matchedField === 'access_token_devis';

    // If it's a devis token, we mark devis_signe, otherwise contrat_signe
    const newData = {
        ...(record.data || {}),
        [isDevisToken ? 'devis_signe' : 'contrat_signe']: true,
        signature_client_base64: signatureBase64,
        date_signature_client: date,
        [isDevisToken ? 'date_signature_devis' : 'date_signature_contrat']: date,
        // Preserve the token used for identification
        access_token: token
    }

    // 3. Update or Migrate record
    if (table === 'devis' && isDevisToken) {
        // MIGRATION: Devis -> Contrat
        // Replace D- with C- in the ID
        const newId = record.id.startsWith('D-') ? record.id.replace('D-', 'C-') : `C-${record.id}`;

        // 1. Insert into contrats
        const { error: insertError } = await supabase
            .from('contrats')
            .insert([{
                id: newId,
                nom_client: record.nom_client,
                prix_total: record.prix_total,
                date_debut: record.date_debut,
                data: {
                    ...newData,
                    reference: newId,
                    contrat_signe: true // Signing devis counts as signing contract
                },
                etat: 'Signé'
            }]);

        if (insertError) {
            console.error("Migration insert error:", insertError);
            // Fallback: just update the devis
            await supabase.from('devis').update({ data: newData, etat: 'Signé' }).eq('id', record.id);
        } else {
            // 2. Delete from devis
            const { error: deleteError } = await supabase
                .from('devis')
                .delete()
                .eq('id', record.id);

            if (deleteError) {
                console.error("Migration delete error (insert succeeded):", deleteError);
            }
        }
    } else {
        // Standard Update for existing Contract or legacy token
        const { error: updateError } = await supabase
            .from(table)
            .update({
                data: newData,
                etat: 'Signé'
            })
            .eq('id', record.id)

        if (updateError) {
            console.error(`Error signing ${table}:`, updateError)
            return { error: "Erreur lors de la signature. Veuillez réessayer." }
        }
    }

    // 4. Create Notification
    try {
        const docLabel = (table === 'devis' && isDevisToken) ? 'un Devis' : 'un Contrat';

        await supabase
            .from('notifications')
            .insert([{
                message: `Le client ${record.nom_client || 'Inconnu'} a signé ${docLabel} (${record.id})`,
                type: 'signature',
                document_id: record.id,
                document_type: table === 'devis' && isDevisToken ? 'devis' : 'contrat'
            }]);
    } catch (notificationError) {
        console.error("Failed to create notification:", notificationError);
        // We don't block the signature if notification fails
    }

    revalidatePath(`/sign/${token}`)
    return { success: true }
}
