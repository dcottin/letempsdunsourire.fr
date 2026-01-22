
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createNotificationsTable() {
    const sql = `
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now(),
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read BOOLEAN DEFAULT false,
      document_id TEXT,
      document_type TEXT
    );

    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Allow all for authenticated users" ON notifications
      FOR ALL USING (auth.role() = 'authenticated');
  `

    const { error } = await supabase.rpc('execute_sql', { sql_query: sql })
    if (error) {
        // If rpc execute_sql doesn't exist, we might have to do it differently
        // Usually it doesn't exist by default.
        console.error('Error creating table via RPC:', error)
    } else {
        console.log('Notifications table created successfully')
    }
}

createNotificationsTable()
